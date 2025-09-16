import { prisma } from "@/lib/prisma";
import {
  isTeacherAbsent,
  getAbsenceDeductionConfig,
} from "@/lib/absence-utils";
import { format } from "date-fns";

export async function calculateTeacherSalary(
  teacherId: string,
  fromDate: Date,
  toDate: Date
) {
  // Get package-based salary configuration
  const packageSalaries = await prisma.packageSalary.findMany();
  const salaryMap: Record<string, number> = {};
  packageSalaries.forEach((pkg) => {
    salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
  });

  // Get working days configuration
  const workingDaysConfig = await prisma.setting.findUnique({
    where: { key: "include_sundays_in_salary" },
  });
  const includeSundays = workingDaysConfig?.value === "true" || false;

  // Calculate working days in the selected month
  const daysInMonth = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    0
  ).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(fromDate.getFullYear(), fromDate.getMonth(), day);
    if (includeSundays || date.getDay() !== 0) {
      workingDays++;
    }
  }

  // Get current students with zoom links
  const currentStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: { ustaz: teacherId, status: { in: ["active", "Active"] } },
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

  // === STEP 1: CALCULATE BASE SALARY ===
  let baseSalary = 0;
  let totalTeachingDays = 0;
  const dailyEarnings = new Map();
  const dailyBreakdown = [];

  for (const student of currentStudents) {
    if (!student.package || !salaryMap[student.package]) continue;

    const monthlyPackageSalary = Math.round(salaryMap[student.package] || 0);
    const dailyRate = Math.round(monthlyPackageSalary / workingDays);

    // Count actual teaching days for this student (only one per day)
    const teachingDates = new Set();
    const dailyLinks = new Map();

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

    dailyLinks.forEach((_, dateStr) => {
      teachingDates.add(dateStr);
    });

    // Add to daily earnings
    teachingDates.forEach((dateStr) => {
      if (!dailyEarnings.has(dateStr)) {
        dailyEarnings.set(dateStr, 0);
      }
      dailyEarnings.set(dateStr, dailyEarnings.get(dateStr) + dailyRate);
    });

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

  baseSalary = Array.from(dailyEarnings.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  totalTeachingDays = dailyEarnings.size;
  baseSalary = Math.round(baseSalary);

  // === STEP 2: CALCULATE LATENESS DEDUCTIONS ===
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

  // Default fallback for packages without specific deduction amounts
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

    // Get all students with zoom links and time slots
    const allStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: teacherId },
      include: {
        zoom_links: {
          where: {
            sent_time: { gte: fromDate, lte: toDate },
          },
        },
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
      if (date < fromDate || date > toDate) continue;

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
            const match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
            if (match) {
              let hour = parseInt(match[1]);
              const minute = match[2];
              const period = match[3].toUpperCase();

              if (period === "PM" && hour !== 12) hour += 12;
              if (period === "AM" && hour === 12) hour = 0;

              return `${hour.toString().padStart(2, "0")}:${minute}`;
            }
          }

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
          const student = allStudents.find((s) => s.wdt_ID === link.studentId);
          const studentPackage = student?.package || "";
          const baseDeductionAmount =
            packageDeductionMap[studentPackage]?.lateness ||
            defaultBaseDeductionAmount;

          // Find appropriate tier
          for (const [i, t] of tiers.entries()) {
            if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
              deduction = Math.round(baseDeductionAmount * (t.percent / 100));
              tier = `Tier ${i + 1} (${t.percent}%) - ${studentPackage}`;
              break;
            }
          }

          // Check for waiver (only in admin context)
          try {
            const { isDeductionWaived } = await import(
              "@/lib/deduction-waivers"
            );
            const isWaived = await isDeductionWaived(
              teacherId,
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

  // === STEP 3: CALCULATE ABSENCE DEDUCTIONS ===
  let absenceDeduction = 0;
  const absenceBreakdown = [];
  const absenceConfig = await getAbsenceDeductionConfig();

  // Get time-slot based deduction config (fallback)
  const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
    where: { configType: "absence", key: "deduction_per_time_slot" },
  });
  const defaultDeductionPerTimeSlot = timeSlotDeductionConfig
    ? Number(timeSlotDeductionConfig.value)
    : 25;

  // Get teacher's occupied times for day-based calculations
  const teacherOccupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
    where: { ustaz_id: teacherId },
    include: {
      student: {
        select: { daypackages: true, package: true },
      },
    },
  });

  if (currentStudents.length > 0) {
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const monthNumber = String(d.getMonth() + 1);
      if (
        absenceConfig.effectiveMonths.length > 0 &&
        !absenceConfig.effectiveMonths.includes(monthNumber)
      ) {
        continue;
      }

      // Skip Sundays if not included in working days
      if (!includeSundays && d.getDay() === 0) {
        continue;
      }

      const absenceResult = await isTeacherAbsent(teacherId, new Date(d));
      if (absenceResult.isAbsent) {
        // Calculate time-slot based deduction
        const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

        const dayTimeSlots = teacherOccupiedTimes.filter((ot) => {
          const studentDayPackages = ot.student.daypackages;
          return (
            studentDayPackages &&
            (studentDayPackages.includes("All days") ||
              (studentDayPackages.includes("MWF") &&
                ["Monday", "Wednesday", "Friday"].includes(dayName)) ||
              (studentDayPackages.includes("TTS") &&
                ["Tuesday", "Thursday", "Saturday"].includes(dayName)))
          );
        });

        // Calculate package-weighted deduction
        let dailyDeduction = 0;
        let deductionReason = "No zoom link sent";

        if (dayTimeSlots.length > 0) {
          const uniqueTimeSlots = [
            ...new Set(dayTimeSlots.map((ot) => ot.time_slot)),
          ];

          // Calculate deduction based on student packages for each time slot
          const packageCounts = new Map<string, number>();
          dayTimeSlots.forEach((ot) => {
            const studentPackage = ot.student.package || "default";
            packageCounts.set(
              studentPackage,
              (packageCounts.get(studentPackage) || 0) + 1
            );
          });

          // Sum deductions for each package
          for (const [pkg, count] of packageCounts.entries()) {
            const packageDeduction =
              packageDeductionMap[pkg]?.absence || defaultDeductionPerTimeSlot;
            dailyDeduction += packageDeduction * count;
          }

          deductionReason = `No zoom link sent (${uniqueTimeSlots.length} time slots, package-based)`;
        } else {
          dailyDeduction = absenceConfig.deductionAmount;
          deductionReason = "No zoom link sent (whole day)";
        }

        // Check for waiver (only in admin context)
        try {
          const { isDeductionWaived } = await import("@/lib/deduction-waivers");
          const isWaived = await isDeductionWaived(
            teacherId,
            new Date(d),
            "absence"
          );
          if (isWaived) {
            dailyDeduction = 0;
            deductionReason = `${deductionReason} (WAIVED)`;
          }
        } catch (error) {
          // Continue without waiver check if module not available
        }

        if (dailyDeduction > 0) {
          absenceDeduction += Math.round(dailyDeduction);
          absenceBreakdown.push({
            date: format(d, "yyyy-MM-dd"),
            reason: deductionReason,
            deduction: Math.round(dailyDeduction),
            timeSlots: dayTimeSlots.length > 0 ? dayTimeSlots.length : null,
          });
        }
      }
    }
  }

  // === STEP 4: CALCULATE BONUSES ===
  const bonuses = await prisma.qualityassessment.aggregate({
    where: {
      teacherId: teacherId,
      weekStart: { gte: fromDate, lte: toDate },
      managerApproved: true,
    },
    _sum: { bonusAwarded: true },
  });
  const bonusAmount = Math.round(bonuses._sum?.bonusAwarded ?? 0);

  // === STEP 5: CALCULATE FINAL TOTALS ===
  const finalBaseSalary = Math.round(baseSalary);
  const finalLatenessDeduction = Math.round(latenessDeduction);
  const finalAbsenceDeduction = Math.round(absenceDeduction);
  const finalBonusAmount = Math.round(bonusAmount);
  const totalSalary =
    finalBaseSalary -
    finalLatenessDeduction -
    finalAbsenceDeduction +
    finalBonusAmount;

  return {
    baseSalary: finalBaseSalary,
    latenessDeduction: finalLatenessDeduction,
    absenceDeduction: finalAbsenceDeduction,
    bonuses: finalBonusAmount,
    totalSalary,
    numStudents: currentStudents.length,
    teachingDays: totalTeachingDays,
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
        totalDeductions: finalLatenessDeduction + finalAbsenceDeduction,
        netSalary: totalSalary,
      },
    },
  };
}
