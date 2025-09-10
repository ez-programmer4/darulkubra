import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  isTeacherAbsent,
  getAbsenceDeductionConfig,
} from "@/lib/absence-utils";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;
    const role = session?.role || session?.user?.role;
    if (!session || role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = String(session?.user?.id || session?.id || "");
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if teacher salary visibility is enabled
    const visibilitySetting = await prisma.setting.findUnique({
      where: { key: "teacher_salary_visible" },
    });
    
    if (visibilitySetting && visibilitySetting.value === "false") {
      return NextResponse.json({ error: "Salary access disabled" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from or to parameters" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const period = `${toDate.getFullYear()}-${String(
      toDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // Get teacher info and active students
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get package-based salary configuration
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    // Get working days configuration
    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" }
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;
    
    // Calculate working days in the selected month
    const daysInMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0).getDate();
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
            sent_time: { gte: fromDate, lte: toDate }
          },
          select: { sent_time: true }
        }
      },
    });

    // Calculate base salary using daily earnings approach
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
      
      student.zoom_links.forEach(link => {
        if (link.sent_time) {
          const linkDate = new Date(link.sent_time);
          if (includeSundays || linkDate.getDay() !== 0) {
            const dateStr = link.sent_time.toISOString().split('T')[0];
            
            if (!dailyLinks.has(dateStr) || link.sent_time < dailyLinks.get(dateStr)) {
              dailyLinks.set(dateStr, link.sent_time);
            }
          }
        }
      });
      
      dailyLinks.forEach((_, dateStr) => {
        teachingDates.add(dateStr);
      });
      
      // Add to daily earnings
      teachingDates.forEach(dateStr => {
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
          totalEarned: dailyRate * teachingDates.size
        });
      }
    }
    
    baseSalary = Array.from(dailyEarnings.values()).reduce((sum, amount) => sum + amount, 0);
    totalTeachingDays = dailyEarnings.size;
    baseSalary = Math.round(baseSalary);
    const numStudents = currentStudents.length;

    // Calculate lateness deduction using same logic as admin
    let latenessDeduction = 0;
    const latenessBreakdown = [];
    
    // Get lateness configuration
    const latenessConfig = await prisma.latenessdeductionconfig.findFirst();
    const baseDeductionAmount = Math.round(Number(latenessConfig?.baseDeductionAmount) || 30);
    
    const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });
    
    if (latenessConfigs.length > 0) {
      const excusedThreshold = Math.min(...latenessConfigs.map(c => c.excusedThreshold ?? 0));
      const tiers = latenessConfigs.map(c => ({
        start: c.startMinute,
        end: c.endMinute,
        percent: c.deductionPercent,
      }));
      
      // Group zoom links by date to avoid duplicate deductions
      const dailyZoomLinks = new Map();
      
      for (const student of currentStudents) {
        const studentWithLinks = await prisma.wpos_wpdatatable_23.findUnique({
          where: { wdt_ID: student.wdt_ID },
          include: {
            zoom_links: {
              where: {
                sent_time: { gte: fromDate, lte: toDate }
              }
            },
            occupiedTimes: { select: { time_slot: true } }
          }
        });
        
        if (studentWithLinks) {
          studentWithLinks.zoom_links.forEach(link => {
            if (link.sent_time) {
              const dateStr = link.sent_time.toISOString().split('T')[0];
              if (!dailyZoomLinks.has(dateStr)) {
                dailyZoomLinks.set(dateStr, []);
              }
              dailyZoomLinks.get(dateStr).push({
                ...link,
                studentId: studentWithLinks.wdt_ID,
                studentName: studentWithLinks.name,
                timeSlot: studentWithLinks.occupiedTimes?.[0]?.time_slot
              });
            }
          });
        }
      }
      
      // Calculate lateness for each day (only earliest link per day)
      for (const [dateStr, links] of dailyZoomLinks.entries()) {
        const date = new Date(dateStr);
        if (date < fromDate || date > toDate) continue;
        
        // Group by student and take earliest link per student per day
        const studentLinks = new Map<number, any>();
        links.forEach((link: any) => {
          const key = link.studentId;
          if (!studentLinks.has(key) || link.sent_time < studentLinks.get(key).sent_time) {
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
                
                return `${hour.toString().padStart(2, '0')}:${minute}`;
              }
            }
            
            return timeStr.includes(":") ? timeStr.split(":").slice(0, 2).join(":") : "00:00";
          }
          
          const time24 = convertTo24Hour(link.timeSlot);
          const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
          
          const latenessMinutes = Math.max(0, 
            Math.round((link.sent_time.getTime() - scheduledTime.getTime()) / 60000)
          );
          
          if (latenessMinutes > excusedThreshold) {
            let deduction = 0;
            let tier = "No Tier";
            
            // Find appropriate tier
            for (const [i, t] of tiers.entries()) {
              if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
                deduction = Math.round(baseDeductionAmount * (t.percent / 100));
                tier = `Tier ${i + 1} (${t.percent}%)`;
                break;
              }
            }
            
            if (deduction > 0) {
              latenessDeduction += deduction;
              latenessBreakdown.push({
                date: dateStr,
                studentName: link.studentName,
                scheduledTime: link.timeSlot,
                actualTime: new Date(link.sent_time).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
                latenessMinutes,
                tier,
                deduction
              });
            }
          }
        }
      }
    }

    // Calculate absence deduction using same logic as admin
    let absenceDeduction = 0;
    const absenceBreakdown = [];
    const absenceConfig = await getAbsenceDeductionConfig();
    
    // Get time-slot based deduction config
    const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "deduction_per_time_slot" },
    });
    const deductionPerTimeSlot = timeSlotDeductionConfig ? Number(timeSlotDeductionConfig.value) : 25;
    
    // Get teacher's occupied times for day-based calculations
    const teacherOccupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: { ustaz_id: teacherId },
      include: {
        student: {
          select: { daypackages: true }
        }
      }
    });
    
    if (numStudents > 0) {
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
          const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
          
          const dayTimeSlots = teacherOccupiedTimes.filter(ot => {
            const studentDayPackages = ot.student.daypackages;
            return studentDayPackages && (
              studentDayPackages.includes('All days') || 
              (studentDayPackages.includes('MWF') && ['Monday', 'Wednesday', 'Friday'].includes(dayName)) ||
              (studentDayPackages.includes('TTS') && ['Tuesday', 'Thursday', 'Saturday'].includes(dayName))
            );
          });
          
          let dailyDeduction = absenceConfig.deductionAmount;
          let deductionReason = "No zoom link sent (whole day)";
          
          if (dayTimeSlots.length > 0) {
            const uniqueTimeSlots = [...new Set(dayTimeSlots.map(ot => ot.time_slot))];
            dailyDeduction = deductionPerTimeSlot * uniqueTimeSlots.length;
            deductionReason = `No zoom link sent (${uniqueTimeSlots.length} time slots)`;
          }
          
          if (dailyDeduction > 0) {
            absenceDeduction += Math.round(dailyDeduction);
            absenceBreakdown.push({
              date: d.toISOString().split('T')[0],
              reason: deductionReason,
              deduction: Math.round(dailyDeduction),
              timeSlots: dayTimeSlots.length > 0 ? dayTimeSlots.length : null
            });
          }
        }
      }
    }

    // Calculate bonuses from QualityAssessment (same as admin)
    const bonuses = await prisma.qualityassessment.aggregate({
      where: {
        teacherId: teacherId,
        weekStart: { gte: fromDate, lte: toDate },
        managerApproved: true,
      },
      _sum: { bonusAwarded: true },
    });
    const bonusAmount = bonuses._sum?.bonusAwarded ?? 0;

    const finalBaseSalary = Math.round(baseSalary);
    const finalLatenessDeduction = Math.round(latenessDeduction);
    const finalAbsenceDeduction = Math.round(absenceDeduction);
    const finalBonusAmount = Math.round(bonusAmount);
    const totalSalary = finalBaseSalary - finalLatenessDeduction - finalAbsenceDeduction + finalBonusAmount;

    // Get payment status
    const salaryPayment = await prisma.teachersalarypayment.findFirst({
      where: {
        teacherId: teacherId,
        period: period,
      },
    });

    const status = salaryPayment?.status || "Unpaid";

    const response = {
      id: teacherId,
      name: teacher.ustazname || "Unknown",
      baseSalary: finalBaseSalary,
      latenessDeduction: finalLatenessDeduction,
      absenceDeduction: finalAbsenceDeduction,
      bonuses: finalBonusAmount,
      totalSalary: totalSalary,
      numStudents: numStudents,
      teachingDays: totalTeachingDays,
      status: status as "Paid" | "Unpaid",
      // Detailed breakdown for transparency
      breakdown: {
        dailyEarnings: Array.from(dailyEarnings.entries()).map(([date, amount]) => ({
          date,
          amount: Math.round(amount)
        })),
        studentBreakdown: dailyBreakdown,
        latenessBreakdown,
        absenceBreakdown,
        summary: {
          workingDaysInMonth: workingDays,
          actualTeachingDays: totalTeachingDays,
          averageDailyEarning: totalTeachingDays > 0 ? Math.round(finalBaseSalary / totalTeachingDays) : 0,
          totalDeductions: finalLatenessDeduction + finalAbsenceDeduction,
          netSalary: totalSalary
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Teacher salary API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
