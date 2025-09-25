import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { format } from "date-fns";

// Helper function to check if a student is scheduled for a specific day
async function checkIfStudentScheduledForDay(
  studentId: number,
  dayOfWeek: number
): Promise<boolean> {
  // TODO: Implement day-specific scheduling when schema supports it
  return true;
}

// Payment integration function
async function processPayment(
  teacherId: string,
  amount: number,
  period: string
) {
  try {
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { ustazname: true, phone: true },
    });

    if (!teacher) throw new Error("Teacher not found");

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
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const teacherId = url.searchParams.get("teacherId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    const from = new Date(startDate);
    const to = new Date(endDate);

    // Validate date range
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    // Handle detailed view for a specific teacher
    if (url.pathname.endsWith("/details") || teacherId) {
      if (!teacherId) {
        return NextResponse.json(
          { error: "Missing teacherId for details" },
          { status: 400 }
        );
      }

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

      const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
        orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
      });

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

      // Fetch assignments for the teacher
      const assignments = await prisma.wpos_ustaz_occupied_times.findMany({
        where: {
          ustaz_id: teacherId,
          occupied_at: { lte: to },
          OR: [{ end_at: null }, { end_at: { gte: from } }],
        },
        include: {
          student: {
            select: { wdt_ID: true, name: true, package: true },
          },
        },
      });

      const latenessRecords = [];
      for (const assignment of assignments) {
        const student = assignment.student;
        const timeSlot = assignment.time_slot;
        if (!timeSlot) continue;

        const zoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacherId,
            studentid: student.wdt_ID,
            sent_time: { 
              gte: assignment.occupied_at || from, 
              lte: assignment.end_at || to 
            },
          },
          select: { sent_time: true },
        });

        const startDate = assignment.occupied_at && assignment.occupied_at > from ? assignment.occupied_at : from;
        const endDate = assignment.end_at && assignment.end_at < to ? assignment.end_at : to;
        
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const dateStr = format(d, "yyyy-MM-dd");
          const time24 = timeSlot.includes("AM") || timeSlot.includes("PM")
            ? timeSlot.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
              ? (() => {
                  const [, hour, minute, period] = timeSlot.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)!;
                  let h = parseInt(hour);
                  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
                  if (period.toUpperCase() === "AM" && h === 12) h = 0;
                  return `${h.toString().padStart(2, "0")}:${minute}`;
                })()
              : "00:00"
            : timeSlot.split(":").slice(0, 2).join(":");
          const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);

          const sentTimes = zoomLinks
            .filter((zl) => zl.sent_time && format(zl.sent_time, "yyyy-MM-dd") === dateStr)
            .sort((a, b) => a.sent_time!.getTime() - b.sent_time!.getTime());

          const actualStartTime = sentTimes[0]?.sent_time || null;
          if (!actualStartTime) continue;

          const latenessMinutes = Math.max(
            0,
            Math.round(
              (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
            )
          );

          let deductionApplied = 0;
          let deductionTier = "Excused";
          let isWaived = false;

          if (latenessMinutes > excusedThreshold) {
            const baseDeductionAmount =
              packageDeductionMap[student.package || ""]?.lateness || defaultBaseDeductionAmount;

            let foundTier = false;
            for (const [i, tier] of tiers.entries()) {
              if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
                deductionApplied = baseDeductionAmount * (tier.percent / 100);
                deductionTier = `Tier ${i + 1} (${tier.percent}%) - ${student.package || "Unknown"}`;
                foundTier = true;
                break;
              }
            }
            if (!foundTier && latenessMinutes > maxTierEnd) {
              deductionApplied = baseDeductionAmount;
              deductionTier = `> Max Tier - ${student.package || "Unknown"}`;
            }

            const { isDeductionWaived } = await import("@/lib/deduction-waivers").catch(() => ({ isDeductionWaived: () => false }));
            isWaived = await isDeductionWaived(teacherId, scheduledTime, "lateness");
            if (isWaived) {
              deductionApplied = 0;
              deductionTier = `${deductionTier} (WAIVED)`;
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
            isWaived,
          });
        }
      }

      const bonusRecords = await prisma.bonusrecord.findMany({
        where: { teacherId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "asc" },
      });

      const absenceWaivers = await prisma.deduction_waivers.findMany({
        where: {
          teacherId,
          deductionType: "absence",
          deductionDate: { gte: from, lte: to },
        },
      });
      const waivedDates = new Set(
        absenceWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
      );

      const computedAbsences = [];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      const endProcessDate = new Date(Math.min(to.getTime(), yesterday.getTime()));
      const workingDaysConfig = await prisma.setting.findUnique({
        where: { key: "include_sundays_in_salary" },
      });
      const includeSundays = workingDaysConfig?.value === "true" || false;

      for (const assignment of assignments) {
        const student = assignment.student;
        const absenceStartDate = assignment.occupied_at && assignment.occupied_at > from ? assignment.occupied_at : from;
        const absenceEndDate = assignment.end_at && assignment.end_at < endProcessDate ? assignment.end_at : endProcessDate;
        
        for (
          let d = new Date(absenceStartDate);
          d <= absenceEndDate;
          d.setDate(d.getDate() + 1)
        ) {
          if (!includeSundays && d.getDay() === 0) continue;
          const dateStr = format(d, "yyyy-MM-dd");
          if (waivedDates.has(dateStr)) continue;

          const studentScheduled = await checkIfStudentScheduledForDay(student.wdt_ID, d.getDay());
          if (!studentScheduled) continue;

          const hasZoomLink = await prisma.wpos_zoom_links.count({
            where: {
              ustazid: teacherId,
              studentid: student.wdt_ID,
              sent_time: {
                gte: new Date(`${dateStr}T00:00:00.000Z`),
                lte: new Date(`${dateStr}T23:59:59.999Z`),
              },
            },
          });

          if (!hasZoomLink) {
            const packageRate = packageDeductionMap[student.package || ""]?.absence || 25;
            computedAbsences.push({
              id: 0,
              teacherId,
              classDate: new Date(d),
              timeSlots: [`${student.name} (${student.package})`],
              packageBreakdown: [{
                studentId: student.wdt_ID,
                studentName: student.name,
                package: student.package || "Unknown",
                ratePerSlot: packageRate,
                timeSlots: 1,
                total: packageRate,
              }],
              uniqueTimeSlots: [`${student.name} (${student.package})`],
              permitted: false,
              permissionRequestId: null,
              deductionApplied: packageRate,
              reviewedByManager: true,
              reviewNotes: `Absence for ${student.name} (${student.package}): ${packageRate}ETB`,
            });
          }
        }
      }

      return NextResponse.json({
        latenessRecords,
        absenceRecords: computedAbsences,
        bonusRecords,
      });
    }

    // Main table view: Calculate salaries for all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: { ustazid: true, ustazname: true },
    });

    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;

    const results = await Promise.all(
      teachers.map(async (t) => {
        // Fetch assignments
        const assignments = await prisma.wpos_ustaz_occupied_times.findMany({
          where: {
            ustaz_id: t.ustazid,
            occupied_at: { lte: to },
            OR: [{ end_at: null }, { end_at: { gte: from } }],
          },
          include: {
            student: {
              select: { wdt_ID: true, name: true, package: true },
            },
          },
        });

        if (assignments.length === 0) return null;

        // Calculate base salary from zoom links with package rates
        let baseSalary = 0;
        const dailyBreakdown = [];
        const dailyEarnings = new Map();
        
        for (const assignment of assignments) {
          const assignmentStart = assignment.occupied_at && assignment.occupied_at > from ? assignment.occupied_at : from;
          const assignmentEnd = assignment.end_at && assignment.end_at < to ? assignment.end_at : to;
          const student = assignment.student;
          
          if (!student?.package || !salaryMap[student.package]) continue;
          
          const monthlyPackageSalary = Math.round(salaryMap[student.package] || 0);
          const workingDays = 26; // Default working days per month
          const dailyRate = Math.round(monthlyPackageSalary / workingDays);

          const zoomLinks = await prisma.wpos_zoom_links.findMany({
            where: {
              ustazid: t.ustazid,
              studentid: assignment.student_id,
              sent_time: { gte: assignmentStart, lte: assignmentEnd },
            },
            select: { sent_time: true, packageRate: true },
          });

          // Use stored package rates from zoom links (handles mid-month changes)
          const studentEarnings = zoomLinks.reduce((sum, link) => {
            return sum + Number(link.packageRate || dailyRate);
          }, 0);
          baseSalary += studentEarnings;

          if (zoomLinks.length > 0) {
            dailyBreakdown.push({
              studentName: student.name || "Unknown",
              package: student.package || "Unknown",
              monthlyRate: monthlyPackageSalary,
              dailyRate: dailyRate,
              daysWorked: zoomLinks.length,
              totalEarned: studentEarnings,
            });
          }
        }

        baseSalary = Math.round(baseSalary);

        // Calculate lateness deductions
        let latenessDeduction = 0;
        const latenessBreakdown = [];
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

        const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
          orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
        });

        if (latenessConfigs.length > 0) {
          const excusedThreshold = Math.min(
            ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
          );
          const tiers = latenessConfigs.map((c) => ({
            start: c.startMinute,
            end: c.endMinute,
            percent: c.deductionPercent,
          }));
          const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));

          const latenessWaivers = await prisma.deduction_waivers.findMany({
            where: {
              teacherId: t.ustazid,
              deductionType: "lateness",
              deductionDate: { gte: from, lte: to },
            },
          });
          const waivedLatenessDates = new Set(
            latenessWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
          );

          // Only get students from ACTIVE assignments (not ended ones)
          const activeAssignments = assignments.filter(a => !a.end_at || a.end_at > from);
          const activeStudentIds = activeAssignments.map(a => a.student_id);
          
          const allStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: { 
              ustaz: t.ustazid,
              wdt_ID: { in: activeStudentIds } // Only active students
            },
            select: {
              wdt_ID: true,
              name: true,
              package: true,
              zoom_links: {
                where: { sent_time: { gte: from, lte: to } },
              },
              occupiedTimes: { 
                where: { end_at: null }, // Only active assignments
                select: { time_slot: true } 
              },
            },
          });

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

          for (const [dateStr, links] of dailyZoomLinks.entries()) {
            const date = new Date(dateStr);
            if (date < from || date > to) continue;

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

            for (const link of studentLinks.values()) {
              if (!link.timeSlot) continue;

              const time24 = link.timeSlot.includes("AM") || link.timeSlot.includes("PM")
                ? link.timeSlot.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
                  ? (() => {
                      const [, hour, minute, period] = link.timeSlot.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)!;
                      let h = parseInt(hour);
                      if (period.toUpperCase() === "PM" && h !== 12) h += 12;
                      if (period.toUpperCase() === "AM" && h === 12) h = 0;
                      return `${h.toString().padStart(2, "0")}:${minute}`;
                    })()
                  : "00:00"
                : link.timeSlot.split(":").slice(0, 2).join(":");

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
                const student = allStudents.find((s) => s.wdt_ID === link.studentId);
                const studentPackage = student?.package || "";
                const baseDeductionAmount =
                  packageDeductionMap[studentPackage]?.lateness || defaultBaseDeductionAmount;

                for (const [i, t] of tiers.entries()) {
                  if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
                    deduction = Math.round(baseDeductionAmount * (t.percent / 100));
                    tier = `Tier ${i + 1} (${t.percent}%) - ${studentPackage}`;
                    break;
                  }
                }
                if (latenessMinutes > maxTierEnd) {
                  deduction = baseDeductionAmount;
                  tier = `> Max Tier - ${studentPackage}`;
                }

                const { isDeductionWaived } = await import("@/lib/deduction-waivers").catch(() => ({ isDeductionWaived: () => false }));
                const isWaived = await isDeductionWaived(t.ustazid, scheduledTime, "lateness");
                if (isWaived || waivedLatenessDates.has(dateStr)) {
                  deduction = 0;
                  tier = `${tier} (WAIVED)`;
                }

                if (deduction > 0) {
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
                }
              }
            }
          }
        }

        // Calculate absence deductions
        let absenceDeduction = 0;
        const absenceBreakdown = [];
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

        for (const assignment of assignments) {
          const student = assignment.student;
          const absenceStartDate = assignment.occupied_at && assignment.occupied_at > from ? assignment.occupied_at : from;
          const absenceEndDate = assignment.end_at && assignment.end_at < endProcessDate ? assignment.end_at : endProcessDate;
          
          for (
            let d = new Date(absenceStartDate);
            d <= absenceEndDate;
            d.setDate(d.getDate() + 1)
          ) {
            if (!includeSundays && d.getDay() === 0) continue;
            const dateStr = format(d, "yyyy-MM-dd");
            if (waivedDates.has(dateStr)) continue;

            const studentScheduled = await checkIfStudentScheduledForDay(student.wdt_ID, d.getDay());
            if (!studentScheduled) continue;

            const hasZoomLink = await prisma.wpos_zoom_links.count({
              where: {
                ustazid: t.ustazid,
                studentid: student.wdt_ID,
                sent_time: {
                  gte: new Date(`${dateStr}T00:00:00.000Z`),
                  lte: new Date(`${dateStr}T23:59:59.999Z`),
                },
              },
            });

            if (!hasZoomLink) {
              const packageRate = packageDeductionMap[student.package || ""]?.absence || 25;
              absenceDeduction += packageRate;
              absenceBreakdown.push({
                date: dateStr,
                reason: `Absence for ${student.name} (${student.package})`,
                deduction: packageRate,
                timeSlots: [`${student.name} (${student.package})`],
                uniqueTimeSlots: [`${student.name} (${student.package})`],
                permitted: false,
                reviewNotes: `Absence for ${student.name} (${student.package}): ${packageRate}ETB`,
              });
            }
          }
        }

        // Calculate bonuses
        const bonuses = await prisma.qualityassessment.aggregate({
          where: {
            teacherId: t.ustazid,
            weekStart: { gte: from, lte: to },
            managerApproved: true,
          },
          _sum: { bonusAwarded: true },
        });
        const bonusAmount = Math.round(bonuses._sum?.bonusAwarded ?? 0);

        // Final calculations
        const finalBaseSalary = Math.round(baseSalary);
        const finalLatenessDeduction = Math.round(latenessDeduction);
        const finalAbsenceDeduction = Math.round(absenceDeduction);
        const finalBonusAmount = Math.round(bonusAmount);
        // Base salary already reflects actual work (Zoom links sent)
        // Absence deduction is informational only - not subtracted from salary
        const totalSalary = Math.round(
          finalBaseSalary - finalLatenessDeduction + finalBonusAmount
        );
        
        // Log teacher change handling
        console.log(`💼 ${t.ustazname}: Salary calculated with teacher change protection`);

        const period = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
        const payment = await prisma.teachersalarypayment.findUnique({
          where: { teacherId_period: { teacherId: t.ustazid, period } },
          select: { status: true },
        });

        return {
          id: t.ustazid,
          name: t.ustazname,
          baseSalary: finalBaseSalary,
          latenessDeduction: finalLatenessDeduction,
          absenceDeduction: finalAbsenceDeduction,
          bonuses: finalBonusAmount,
          totalSalary,
          numStudents: assignments.length,
          teachingDays: dailyBreakdown.length,
          status: payment?.status || "Unpaid",
          breakdown: {
            dailyEarnings: dailyBreakdown.map((b, index) => ({
              date: `Day ${index + 1}`,
              amount: b.totalEarned,
            })),
            studentBreakdown: dailyBreakdown,
            latenessBreakdown,
            absenceBreakdown,
            summary: {
              workingDaysInMonth: dailyBreakdown.length,
              actualTeachingDays: dailyBreakdown.length,
              averageDailyEarning: dailyBreakdown.length > 0
                ? Math.round(finalBaseSalary / dailyBreakdown.length)
                : 0,
              totalDeductions: finalLatenessDeduction, // Only lateness affects salary
              netSalary: totalSalary,
            },
          },
        };
      })
    );

    return NextResponse.json(results.filter(Boolean));
  } catch (error: any) {
    console.error("Error fetching teacher payments:", error);
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

    if (processPaymentNow && status === "Paid" && totalSalary > 0) {
      paymentResult = await processPayment(teacherId, totalSalary, period);
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: `Payment failed: ${paymentResult.error}` },
          { status: 400 }
        );
      }
      transactionId = paymentResult.transactionId;
    }

    const payment = await prisma.teachersalarypayment.upsert({
      where: {
        teacherId_period: { teacherId, period },
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
        ? { transactionId, status: paymentResult.status }
        : null,
    });
  } catch (err) {
    console.error("Error updating salary status:", err);
    return NextResponse.json(
      { error: "Failed to update salary status" },
      { status: 500 }
    );
  }
}