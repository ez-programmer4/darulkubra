import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import {
  isTeacherAbsent,
  getAbsenceDeductionConfig,
} from "@/lib/absence-utils";
import { format } from "date-fns";

// Helper function to check if a student is scheduled for a specific day
// For now, return true for all students (no day-specific filtering)
// This can be enhanced later when the schema supports day-specific scheduling
async function checkIfStudentScheduledForDay(
  studentId: number,
  dayOfWeek: number
): Promise<boolean> {
  // TODO: Implement day-specific scheduling when schema is available
  // For now, assume all students are scheduled for all days
  return true;
}

// Payment integration function
async function processPayment(
  teacherId: string,
  amount: number,
  period: string
) {
  try {
    // Get teacher details for payment
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazname: true, phone: true },
    });

    if (!teacher) throw new Error("Teacher not found");

    // Call external payment API
    const paymentResponse = await fetch(process.env.PAYMENT_API_URL || "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
      },
      body: JSON.stringify({
        recipient: {
          id: teacherId,
          name: teacher.ustazname,
          phone: teacher.phone,
          email: teacher.phone
            ? `${teacher.phone}@darulkubra.com`
            : `teacher_${teacherId}@darulkubra.com`,
        },
        amount: amount,
        currency: "ETB",
        reference: `salary_${teacherId}_${period}`,
        description: `Teacher salary payment for ${period}`,
      }),
    });

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
      throw new Error(paymentResult.message || "Payment failed");
    }

    return {
      success: true,
      transactionId: paymentResult.transactionId,
      status: paymentResult.status,
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // If details query, return detailed breakdown
    if (
      url.pathname.endsWith("/details") ||
      url.searchParams.has("teacherId")
    ) {
      const teacherId = url.searchParams.get("teacherId");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!teacherId || !from || !to) {
        return NextResponse.json(
          { error: "Missing teacherId, from, or to" },
          { status: 400 }
        );
      }
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Get package-specific deduction configurations
      const packageDeductions = await prisma.packageDeduction.findMany();
      const packageDeductionMap: Record<
        string,
        { lateness: number; absence: number }
      > = {};
      packageDeductions.forEach((pkg) => {
        packageDeductionMap[pkg.packageName] = {
          lateness: Number(pkg.latenessBaseAmount),
          absence: Number(pkg.absenceBaseAmount),
        };
      });
      const defaultBaseDeductionAmount = 30;

      // Fetch lateness deduction config from DB - no fallback tiers
      const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
        orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
      });

      // Only use database configuration, no predefined tiers
      if (latenessConfigs.length === 0) {
        return NextResponse.json({
          latenessRecords: [],
          absenceRecords: [],
          bonusRecords: [],
        });
      }

      const excusedThreshold = Math.min(
        ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
      );
      const tiers = latenessConfigs.map((c) => ({
        start: c.startMinute,
        end: c.endMinute,
        percent: c.deductionPercent,
      }));
      const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
      // Get all students for this teacher in the date range
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: { ustaz: teacherId },
        select: {
          wdt_ID: true,
          name: true,
          package: true,
          zoom_links: true,
          occupiedTimes: {
            select: {
              time_slot: true,
            },
          },
        },
      });
      // For each day in the range, calculate lateness for each student
      const latenessRecords = [];
      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = format(d, "yyyy-MM-dd");
        for (const student of students) {
          const timeSlot = student.occupiedTimes?.[0]?.time_slot;
          if (!timeSlot) continue;
          // Convert selectedTime (12h or 24h) to Date for the day
          function to24Hour(time12h: string) {
            if (!time12h) return "00:00";

            // Handle AM/PM format
            if (time12h.includes("AM") || time12h.includes("PM")) {
              const [time, modifier] = time12h.split(" ");
              let [hours, minutes] = time.split(":");
              if (hours === "12") hours = modifier === "AM" ? "00" : "12";
              else if (modifier === "PM")
                hours = String(parseInt(hours, 10) + 12);
              return `${hours.padStart(2, "0")}:${minutes}`;
            }

            // Handle existing 24-hour format (HH:MM:SS or HH:MM)
            if (time12h.includes(":")) {
              const parts = time12h.split(":");
              const hours = parts[0].padStart(2, "0");
              const minutes = (parts[1] || "00").padStart(2, "0");
              return `${hours}:${minutes}`;
            }

            return "00:00"; // fallback
          }
          const time24 = to24Hour(timeSlot);
          const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
          // Find the earliest sent_time for this student/date
          const sentTimes = (student.zoom_links || [])
            .filter(
              (zl) =>
                zl.sent_time &&
                format(zl.sent_time as Date, "yyyy-MM-dd") === dateStr
            )
            .map((zl) => zl.sent_time)
            .sort((a, b) => {
              if (!a && !b) return 0;
              if (!a) return 1;
              if (!b) return -1;
              return a.getTime() - b.getTime();
            });
          const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
          if (!actualStartTime) continue;
          const latenessMinutes = Math.max(
            0,
            Math.round(
              (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
            )
          );
          // Deduction logic with waiver check
          let deductionApplied = 0;
          let deductionTier = "Excused";
          let isWaived = false;

          if (latenessMinutes > excusedThreshold) {
            // Get student's package for package-specific deduction
            const studentPackage = student.package || "";
            const baseDeductionAmount =
              packageDeductionMap[studentPackage]?.lateness ||
              defaultBaseDeductionAmount;

            let foundTier = false;
            for (const [i, tier] of tiers.entries()) {
              if (
                latenessMinutes >= tier.start &&
                latenessMinutes <= tier.end
              ) {
                deductionApplied = baseDeductionAmount * (tier.percent / 100);
                deductionTier = `Tier ${i + 1} (${
                  tier.percent
                }%) - ${studentPackage}`;
                foundTier = true;
                break;
              }
            }
            if (!foundTier && latenessMinutes > maxTierEnd) {
              deductionApplied = baseDeductionAmount;
              deductionTier = `> Max Tier - ${studentPackage}`;
            }

            // Check for waiver
            try {
              const { isDeductionWaived } = await import(
                "@/lib/deduction-waivers"
              );
              isWaived = await isDeductionWaived(
                teacherId as string,
                scheduledTime,
                "lateness"
              );
              if (isWaived) {
                deductionApplied = 0;
                deductionTier = `${deductionTier} (WAIVED)`;
              }
            } catch (error) {
              console.error("Error checking waiver:", error);
            }
          }
          latenessRecords.push({
            studentId: student.wdt_ID,
            studentName: student.name,
            classDate: scheduledTime,
            scheduledTime,
            actualStartTime,
            latenessMinutes,
            deductionApplied,
            deductionTier,
            isWaived: isWaived || false,
          });
        }
      }
      // Get bonus records
      let bonusRecords: any[] = [];
      if (typeof teacherId === "string") {
        bonusRecords = await prisma.bonusrecord.findMany({
          where: {
            teacherId,
            createdAt: { gte: fromDate, lte: toDate },
          },
          orderBy: { createdAt: "asc" },
        });
      }
      // ZOOM-BASED ABSENCE CALCULATION
      // Get package deduction rates
      const detailPackageDeductions = await prisma.packageDeduction.findMany();
      const detailPackageDeductionMap: Record<
        string,
        { lateness: number; absence: number }
      > = {};
      detailPackageDeductions.forEach((pkg) => {
        detailPackageDeductionMap[pkg.packageName] = {
          lateness: Number(pkg.latenessBaseAmount),
          absence: Number(pkg.absenceBaseAmount),
        };
      });

      // Get Sunday configuration
      const workingDaysConfig = await prisma.setting.findUnique({
        where: { key: "include_sundays_in_salary" },
      });
      const includeSundays = workingDaysConfig?.value === "true" || false;

      // Get absence waivers
      const absenceWaivers = await prisma.deduction_waivers.findMany({
        where: {
          teacherId: teacherId as string,
          deductionType: "absence",
          deductionDate: { gte: fromDate, lte: toDate },
        },
      });

      const waivedDates = new Set(
        absenceWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
      );

      const computedAbsences: any[] = [];

      // Get teacher's current students for absence calculation
      const teacherStudents = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          ustaz: teacherId as string,
          status: { in: ["active", "Active", "Not yet", "not yet"] },
        },
        select: {
          wdt_ID: true,
          name: true,
          package: true,
          zoom_links: {
            where: {
              sent_time: { gte: fromDate, lte: toDate },
            },
            select: { sent_time: true },
          },
        },
      });
      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setDate(d.getDate() + 1)
      ) {
        // Skip future dates - only process past dates
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        if (d > yesterday) continue;

        const dateKey = d.toISOString().split("T")[0];
        
        // Skip Sundays based on configuration
        if (!includeSundays && d.getDay() === 0) continue;

        // Check if teacher sent any zoom links on this day (same logic as main table)
        const dayHasZoomLinks = teacherStudents.some((student) =>
          student.zoom_links.some((link) => {
            if (!link.sent_time) return false;
            const linkDate = format(link.sent_time, "yyyy-MM-dd");
            return linkDate === dateKey;
          })
        );

        // NEW: Check per-schedule absences instead of whole-day
        let calculatedDeduction = 0;
        const packageBreakdown = [];
        const affectedTimeSlots = [];
        const dayOfWeek = d.getDay();

        for (const student of teacherStudents) {
          // Check if student is scheduled for this day
          const shouldDeductForThisDay = await checkIfStudentScheduledForDay(
            student.wdt_ID,
            dayOfWeek
          );

          if (!shouldDeductForThisDay) continue;

          // Check if student has zoom link on this specific day
          const studentZoomLinks = student.zoom_links.filter((link) => {
            if (!link.sent_time) return false;
            const linkDate = format(link.sent_time, "yyyy-MM-dd");
            return linkDate === dateKey;
          });

          // If no zoom link for this student on this day, deduct
          if (studentZoomLinks.length === 0) {
            const studentPackage = student.package || "";
            const packageRate = detailPackageDeductionMap[studentPackage]?.absence || 25;
            calculatedDeduction += packageRate;
            affectedTimeSlots.push(`${student.name} (${studentPackage})`);

            packageBreakdown.push({
              studentId: student.wdt_ID,
              studentName: student.name,
              package: studentPackage || "Unknown",
              ratePerSlot: packageRate,
              timeSlots: 1,
              total: packageRate,
            });
          }
        }

        // Apply absence deduction if students were absent
        if (calculatedDeduction > 0) {
          computedAbsences.push({
            id: `absence_${dateKey}_${teacherId}`,
            teacherId,
            classDate: new Date(d),
            timeSlots: affectedTimeSlots,
            packageBreakdown: packageBreakdown,
            uniqueTimeSlots: affectedTimeSlots,
            permitted: false,
            permissionRequestId: null,
            deductionApplied: calculatedDeduction,
            reviewedByManager: true,
            reviewNotes: `Student absence - ${packageBreakdown.length} students affected: ${packageBreakdown.map(p => `${p.studentName}(${p.package}): ${p.total}ETB`).join(", ")}`,
          });
        }
      }
      return NextResponse.json({
        latenessRecords,
        absenceRecords: computedAbsences,
        bonusRecords,
      });
    }
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 }
      );
    }
    const from = new Date(startDate);
    const to = new Date(endDate);

    // Get all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    // Get package-based salary configuration from dedicated table
    const packageSalaries = await prisma.packageSalary.findMany();

    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Get working days configuration (default: exclude Sundays)
    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;

    // Calculate working days in the selected month
    const daysInMonth = new Date(
      from.getFullYear(),
      from.getMonth() + 1,
      0
    ).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(from.getFullYear(), from.getMonth(), day);
      // Include/exclude Sundays based on configuration
      if (includeSundays || date.getDay() !== 0) {
        workingDays++;
      }
    }

    // For each teacher, calculate deductions and bonuses
    // Helper to get all periods in the date range
    function getPeriodsInRange(from: Date, to: Date): string[] {
      const periods = new Set<string>();
      let d = new Date(from.getFullYear(), from.getMonth(), 1);
      while (d <= to) {
        periods.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
        d.setMonth(d.getMonth() + 1);
      }
      return Array.from(periods) as string[];
    }
    const periodsInRange: string[] = getPeriodsInRange(from, to);

    // Fetch absence config once
    const absenceConfig = await getAbsenceDeductionConfig();

    const results = (
      await Promise.all(
        teachers.map(async (t) => {
          // === STEP 1: GET TEACHER'S STUDENTS AND BASIC INFO ===
          const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: {
              ustaz: t.ustazid,
              status: { in: ["active", "Active", "Not yet", "not yet"] },
            },
            select: {
              wdt_ID: true,
              name: true,
              package: true,
              status: true,
              zoom_links: {
                where: {
                  sent_time: { gte: from, lte: to },
                },
                select: { sent_time: true },
              },
            },
          });
          
          // DEBUG: Log student data for debug teachers
          const isDebugTeacher = t.ustazname?.includes("CHALTU") || t.ustazname?.includes("SEADA") || t.ustazname?.includes("ABDULJELIL") || false;
          
          if (isDebugTeacher) {
            console.log(`\n📊 STUDENT DATA FOR ${t.ustazname}:`);
            console.log(`  Date range: ${format(from, "yyyy-MM-dd")} to ${format(to, "yyyy-MM-dd")}`);
            console.log(`  Students found: ${currentStudents.length}`);
            
            // Show student status distribution
            const statusCounts: Record<string, number> = {};
            currentStudents.forEach(student => {
              const status = student.status || 'undefined';
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            console.log(`  Student statuses:`, statusCounts);
            
            // Show zoom link summary
            const studentsWithLinks = currentStudents.filter(s => s.zoom_links.length > 0).length;
            const studentsWithoutLinks = currentStudents.length - studentsWithLinks;
            console.log(`  Students with zoom links: ${studentsWithLinks}`);
            console.log(`  Students without zoom links: ${studentsWithoutLinks}`);
            
            // Show sample students without links
            const studentsNoLinks = currentStudents.filter(s => s.zoom_links.length === 0).slice(0, 3);
            if (studentsNoLinks.length > 0) {
              console.log(`  Sample students with NO zoom links:`);
              studentsNoLinks.forEach((student, i) => {
                console.log(`    ${i + 1}. ${student.name} (${student.package}) [${student.status}]`);
              });
            }
          }

          const numStudents = currentStudents.length;

          // Skip teachers with no students
          if (numStudents === 0) {
            return null;
          }

          // === STEP 2: CALCULATE BASE SALARY (Zoom-link dependent) ===
          let baseSalary = 0;
          let totalTeachingDays = 0;
          const dailyBreakdown = [];
          const dailyEarnings = new Map();

          for (const student of currentStudents) {
            if (!student.package || !salaryMap[student.package]) continue;

            const monthlyPackageSalary = Math.round(
              salaryMap[student.package] || 0
            );
            const dailyRate = Math.round(monthlyPackageSalary / workingDays);

            // Count actual teaching days for this student (zoom link days)
            const teachingDates = new Set();
            const dailyLinks = new Map();

            // Group zoom links by date and keep only the earliest one per day
            student.zoom_links.forEach((link) => {
              if (link.sent_time) {
                const linkDate = new Date(link.sent_time);
                if (includeSundays || linkDate.getDay() !== 0) {
                  const dateStr = link.sent_time.toISOString().split("T")[0];

                  if (
                    !dailyLinks.has(dateStr) ||
                    link.sent_time < dailyLinks.get(dateStr)
                  ) {
                    dailyLinks.set(dateStr, link.sent_time);
                  }
                }
              }
            });

            // Add unique teaching dates
            dailyLinks.forEach((_, dateStr) => {
              teachingDates.add(dateStr);
            });

            // Add to daily earnings
            teachingDates.forEach((dateStr) => {
              if (!dailyEarnings.has(dateStr)) {
                dailyEarnings.set(dateStr, 0);
              }
              dailyEarnings.set(
                dateStr,
                dailyEarnings.get(dateStr) + dailyRate
              );
            });

            // Add to breakdown for transparency
            if (teachingDates.size > 0) {
              dailyBreakdown.push({
                studentName: student.name,
                package: student.package,
                monthlyRate: monthlyPackageSalary,
                dailyRate: dailyRate,
                daysWorked: teachingDates.size,
                totalEarned: dailyRate * teachingDates.size,
              });
            }
          }

          // Calculate totals
          baseSalary = Array.from(dailyEarnings.values()).reduce(
            (sum, amount) => sum + amount,
            0
          );
          totalTeachingDays = dailyEarnings.size;
          baseSalary = Math.round(baseSalary);

          // === STEP 3: CALCULATE LATENESS DEDUCTIONS ===
          let latenessDeduction = 0;
          const latenessBreakdown = [];

          // Get package-specific deduction configurations
          const packageDeductions = await prisma.packageDeduction.findMany();
          const packageDeductionMap: Record<
            string,
            { lateness: number; absence: number }
          > = {};
          packageDeductions.forEach((pkg) => {
            packageDeductionMap[pkg.packageName] = {
              lateness: Number(pkg.latenessBaseAmount),
              absence: Number(pkg.absenceBaseAmount),
            };
          });
          


          // Get lateness waiver records for this teacher and period
          const latenessWaivers = await prisma.deduction_waivers.findMany({
            where: {
              teacherId: t.ustazid,
              deductionType: "lateness",
              deductionDate: { gte: from, lte: to },
            },
          });

          const waivedLatenessDates = new Set(
            latenessWaivers.map(
              (w) => w.deductionDate.toISOString().split("T")[0]
            )
          );
          const defaultBaseDeductionAmount = 30;

          const latenessConfigs = await prisma.latenessdeductionconfig.findMany(
            {
              orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
            }
          );

          if (latenessConfigs.length > 0) {
            const excusedThreshold = Math.min(
              ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
            );
            const tiers = latenessConfigs.map((c) => ({
              start: c.startMinute,
              end: c.endMinute,
              percent: c.deductionPercent,
            }));

            // Calculate lateness for each day and student
            const allStudents = await prisma.wpos_wpdatatable_23.findMany({
              where: { ustaz: t.ustazid },
              select: {
                wdt_ID: true,
                name: true,
                package: true,
                zoom_links: true,
                occupiedTimes: { select: { time_slot: true } },
              },
            });

            // Group zoom links by date to avoid duplicate deductions
            const dailyZoomLinks = new Map();

            for (const student of allStudents) {
              student.zoom_links.forEach((link) => {
                if (link.sent_time) {
                  const dateStr = format(link.sent_time, "yyyy-MM-dd");
                  if (!dailyZoomLinks.has(dateStr)) {
                    dailyZoomLinks.set(dateStr, []);
                  }
                  dailyZoomLinks.get(dateStr).push({
                    ...link,
                    studentId: student.wdt_ID,
                    studentName: student.name,
                    timeSlot: student.occupiedTimes?.[0]?.time_slot,
                  });
                }
              });
            }

            // Calculate lateness for each day (only earliest link per day)
            for (const [dateStr, links] of dailyZoomLinks.entries()) {
              const date = new Date(dateStr);
              if (date < from || date > to) continue;

              // Group by student and take earliest link per student per day
              const studentLinks = new Map<number, any>();
              links.forEach((link: any) => {
                const key = link.studentId;
                if (
                  !studentLinks.has(key) ||
                  link.sent_time < studentLinks.get(key).sent_time
                ) {
                  studentLinks.set(key, link);
                }
              });

              // Calculate lateness for each student's earliest link
              for (const link of studentLinks.values()) {
                if (!link.timeSlot) continue;

                // Convert time to 24-hour format
                function convertTo24Hour(timeStr: string): string {
                  if (!timeStr) return "00:00";

                  if (timeStr.includes("AM") || timeStr.includes("PM")) {
                    const match = timeStr.match(
                      /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i
                    );
                    if (match) {
                      let hour = parseInt(match[1]);
                      const minute = match[2];
                      const period = match[3].toUpperCase();

                      if (period === "PM" && hour !== 12) hour += 12;
                      if (period === "AM" && hour === 12) hour = 0;

                      return `${hour.toString().padStart(2, "0")}:${minute}`;
                    }
                  }

                  // Already 24-hour or other format
                  return timeStr.includes(":")
                    ? timeStr.split(":").slice(0, 2).join(":")
                    : "00:00";
                }

                const time24 = convertTo24Hour(link.timeSlot);
                const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);

                const latenessMinutes = Math.max(
                  0,
                  Math.round(
                    (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
                  )
                );

                if (latenessMinutes > excusedThreshold) {
                  let deduction = 0;
                  let tier = "No Tier";

                  // Get student's package for package-specific deduction
                  const student = allStudents.find(
                    (s) => s.wdt_ID === link.studentId
                  );
                  const studentPackage = student?.package || "";
                  const baseDeductionAmount =
                    packageDeductionMap[studentPackage]?.lateness ||
                    defaultBaseDeductionAmount;

                  // Find appropriate tier
                  for (const [i, t] of tiers.entries()) {
                    if (
                      latenessMinutes >= t.start &&
                      latenessMinutes <= t.end
                    ) {
                      deduction = Math.round(
                        baseDeductionAmount * (t.percent / 100)
                      );
                      tier = `Tier ${i + 1} (${
                        t.percent
                      }%) - ${studentPackage}`;
                      break;
                    }
                  }

                  // Check for waiver
                  try {
                    const { isDeductionWaived } = await import(
                      "@/lib/deduction-waivers"
                    );
                    const isWaived = await isDeductionWaived(
                      t.ustazid,
                      scheduledTime,
                      "lateness"
                    );
                    if (isWaived) {
                      deduction = 0;
                      tier = `${tier} (WAIVED)`;
                    }
                  } catch (error) {
                    // Continue without waiver check if module not available
                  }

                  if (deduction > 0) {
                    // Check if this date is waived for lateness
                    if (!waivedLatenessDates.has(dateStr)) {
                      latenessDeduction += deduction;
                      latenessBreakdown.push({
                        date: dateStr,
                        studentName: link.studentName,
                        scheduledTime: link.timeSlot,
                        actualTime: format(link.sent_time, "HH:mm"),
                        latenessMinutes,
                        tier,
                        deduction,
                      });
                    } else {
                      // Add waived lateness to breakdown with 0 deduction
                      latenessBreakdown.push({
                        date: dateStr,
                        studentName: link.studentName,
                        scheduledTime: link.timeSlot,
                        actualTime: format(link.sent_time, "HH:mm"),
                        latenessMinutes,
                        tier: tier + " (WAIVED)",
                        deduction: 0,
                      });
                    }
                  }
                }
              }
            }
          }

          // === STEP 4: CALCULATE ABSENCE DEDUCTIONS ===
          let absenceDeduction = 0;
          const absenceBreakdown: any[] = [];

          // Use existing packageDeductionMap from lateness section

          // Get absence waivers
          const absenceWaivers = await prisma.deduction_waivers.findMany({
            where: {
              teacherId: t.ustazid,
              deductionType: "absence",
              deductionDate: { gte: from, lte: to },
            },
          });

          const waivedDates = new Set(
            absenceWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
          );

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          
          const endProcessDate = new Date(Math.min(to.getTime(), yesterday.getTime()));

          for (let d = new Date(from); d <= endProcessDate; d.setDate(d.getDate() + 1)) {
            if (!includeSundays && d.getDay() === 0) continue;

            const dateStr = format(d, "yyyy-MM-dd");
            
            if (currentStudents.length > 0) {
              let dailyDeduction = 0;
              const affectedStudents = [];
              
              for (const student of currentStudents) {
                const studentZoomLinks = student.zoom_links.filter((link) => {
                  if (!link.sent_time) return false;
                  const linkDate = format(link.sent_time, "yyyy-MM-dd");
                  return linkDate === dateStr;
                });
                
                if (studentZoomLinks.length === 0) {
                  // Student was absent - calculate deduction for display only
                  if (!waivedDates.has(dateStr)) {
                    const studentPackage = student.package || "";
                    const packageRate = packageDeductionMap[studentPackage]?.absence || 25;
                    dailyDeduction += packageRate;
                    affectedStudents.push({
                      name: student.name,
                      package: studentPackage || "Unknown",
                      rate: packageRate,
                    });
                  }
                }
              }
              
              if (affectedStudents.length > 0) {
                absenceDeduction += dailyDeduction;
                absenceBreakdown.push({
                  id: `absence_${dateStr}_${t.ustazid}`,
                  teacherId: t.ustazid,
                  classDate: new Date(dateStr),
                  date: dateStr,
                  reason: `Student absence (${affectedStudents.length}/${currentStudents.length} students absent)`,
                  deductionApplied: dailyDeduction,
                  deduction: dailyDeduction,
                  timeSlots: affectedStudents.length,
                  uniqueTimeSlots: affectedStudents.map(s => `${s.name} (${s.package})`),
                  packageBreakdown: affectedStudents.map(s => ({
                    studentName: s.name,
                    package: s.package,
                    ratePerSlot: s.rate,
                    timeSlots: 1,
                    total: s.rate
                  })),
                  permitted: false,
                  reviewedByManager: true,
                  reviewNotes: `Absent students: ${affectedStudents.map(s => `${s.name}: ${s.rate}ETB`).join(", ")}`,
                });
              }
            }
          }

          const actualDeductions = absenceBreakdown.filter(a => a.deduction > 0).length;
          
          console.log(
            `Teacher ${t.ustazname || 'Unknown'}: Zoom-based absences=${actualDeductions}, Total=${absenceDeduction} ETB (PER-STUDENT, PAST DATES ONLY)`
          );

          // === STEP 5: CALCULATE BONUSES ===
          const bonuses = await prisma.qualityassessment.aggregate({
            where: {
              teacherId: t.ustazid,
              weekStart: { gte: from, lte: to },
              managerApproved: true,
            },
            _sum: { bonusAwarded: true },
          });
          const bonusAmount = Math.round(bonuses._sum?.bonusAwarded ?? 0);

          // === STEP 6: CALCULATE FINAL TOTALS ===
          const finalBaseSalary = Math.round(baseSalary);
          const finalLatenessDeduction = Math.round(latenessDeduction);
          const finalAbsenceDeduction = Math.round(absenceDeduction);
          const finalBonusAmount = Math.round(bonusAmount);
          const totalSalary = Math.round(
            finalBaseSalary -
              finalLatenessDeduction +
              finalBonusAmount
          );
          
          // Simple debug summary
          if (isDebugTeacher && finalAbsenceDeduction > 0) {
            console.log(`\n🔍 ${t.ustazname}: ${currentStudents.length} students, ${actualDeductions} absence days, ${finalAbsenceDeduction} ETB total`);
          }

          // Debug log for fixed absence deduction
          const actualAbsenceCount = absenceBreakdown.filter(a => a.deduction > 0).length;
          if (finalAbsenceDeduction > 0) {
            console.log(
              `✅ ${t.ustazname || 'Unknown'}: DETAILED ABSENCE DEDUCTION = ${finalAbsenceDeduction} ETB (${actualAbsenceCount} absences, PER-STUDENT TRACKING)`
            );
          } else {
            console.log(`✅ ${t.ustazname || 'Unknown'}: NO ABSENCE DEDUCTIONS (${absenceBreakdown.length} records checked, PER-STUDENT TRACKING)`);
          }

          // === STEP 7: GET PAYMENT STATUS ===
          let status: "Paid" | "Unpaid" = "Unpaid";
          if (periodsInRange.length > 0) {
            const payment = await prisma.teachersalarypayment.findUnique({
              where: {
                teacherId_period: {
                  teacherId: t.ustazid,
                  period: periodsInRange[0],
                },
              },
              select: { status: true },
            });
            if (payment?.status) {
              status = payment.status as "Paid" | "Unpaid";
            }
          }

          return {
            id: t.ustazid,
            name: t.ustazname,
            baseSalary: finalBaseSalary,
            latenessDeduction: finalLatenessDeduction,
            absenceDeduction: finalAbsenceDeduction,
            bonuses: finalBonusAmount,
            totalSalary,
            numStudents,
            teachingDays: totalTeachingDays,
            status,
            // Detailed breakdown for transparency
            breakdown: {
              dailyEarnings: Array.from(dailyEarnings.entries()).map(
                ([date, amount]) => ({
                  date,
                  amount: Math.round(amount),
                })
              ),
              studentBreakdown: dailyBreakdown,
              latenessBreakdown,
              absenceBreakdown,
              summary: {
                workingDaysInMonth: workingDays,
                actualTeachingDays: totalTeachingDays,
                averageDailyEarning:
                  totalTeachingDays > 0
                    ? Math.round(finalBaseSalary / totalTeachingDays)
                    : 0,
                totalDeductions: finalLatenessDeduction,
                netSalary: totalSalary,
              },
            },
          };
        })
      )
    ).filter(Boolean);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teacherId,
      period,
      status,
      totalSalary,
      latenessDeduction,
      absenceDeduction,
      bonuses,
      processPaymentNow = false,
    } = body;
    // Auth: Only admin or controller
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (
      !session ||
      (session.role !== "admin" && session.role !== "controller")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminId = session.id || undefined;
    if (!teacherId || !period || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let paymentResult = null;
    let transactionId = null;

    // Process payment if requested and status is Paid
    if (processPaymentNow && status === "Paid" && totalSalary > 0) {
      paymentResult = await processPayment(teacherId, totalSalary, period);
      if (paymentResult.success) {
        transactionId = paymentResult.transactionId;
      } else {
        return NextResponse.json(
          { error: `Payment failed: ${paymentResult.error}` },
          { status: 400 }
        );
      }
    }

    // Upsert salary payment record
    const payment = await prisma.teachersalarypayment.upsert({
      where: {
        teacherId_period: {
          teacherId,
          period,
        },
      },
      update: {
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
      create: {
        teacherId,
        period,
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
    });
    // Log to AuditLog
    await prisma.auditlog.create({
      data: {
        actionType: "teacher_salary_status_update",
        adminId: adminId || null,
        targetId: payment.id,
        details: JSON.stringify({
          teacherId,
          period,
          status,
          paymentProcessed: !!paymentResult?.success,
          transactionId,
        }),
      },
    });
    return NextResponse.json({
      success: true,
      payment,
      paymentResult: paymentResult?.success
        ? {
            transactionId,
            status: paymentResult.status,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update salary status" },
      { status: 500 }
    );
  }
}
