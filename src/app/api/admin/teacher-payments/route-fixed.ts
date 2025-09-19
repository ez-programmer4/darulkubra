import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    
    // Detail view for specific teacher
    if (url.searchParams.has("teacherId")) {
      return await getTeacherDetails(req);
    }
    
    // Main table view
    return await getTeacherPayments(req);
  } catch (error) {
    console.error("Teacher payments API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getTeacherDetails(req: NextRequest) {
  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!teacherId || !from || !to) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Get package rates
  const packageDeductions = await prisma.packageDeduction.findMany();
  const packageRates = new Map();
  packageDeductions.forEach(pkg => {
    packageRates.set(pkg.packageName, {
      lateness: Number(pkg.latenessBaseAmount) || 30,
      absence: Number(pkg.absenceBaseAmount) || 25
    });
  });

  // Get lateness config
  const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
    orderBy: { startMinute: "asc" }
  });

  // Calculate lateness records
  const latenessRecords = await calculateLatenessRecords(
    teacherId, fromDate, toDate, packageRates, latenessConfigs
  );

  // Get existing absence records
  const absenceRecords = await prisma.absencerecord.findMany({
    where: {
      teacherId,
      classDate: { gte: fromDate, lte: toDate }
    },
    orderBy: { classDate: "asc" }
  });

  // Calculate computed absences
  const computedAbsences = await calculateComputedAbsences(
    teacherId, fromDate, toDate, packageRates, absenceRecords
  );

  // Get bonus records
  const bonusRecords = await prisma.bonusrecord.findMany({
    where: {
      teacherId,
      createdAt: { gte: fromDate, lte: toDate }
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({
    latenessRecords,
    absenceRecords: [...absenceRecords, ...computedAbsences],
    bonusRecords
  });
}

async function getTeacherPayments(req: NextRequest) {
  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing date range" }, { status: 400 });
  }

  const from = new Date(startDate);
  const to = new Date(endDate);

  // Get all teachers
  const teachers = await prisma.wpos_wpdatatable_24.findMany({
    select: { ustazid: true, ustazname: true }
  });

  // Get package configurations
  const [packageSalaries, packageDeductions] = await Promise.all([
    prisma.packageSalary.findMany(),
    prisma.packageDeduction.findMany()
  ]);

  const salaryMap = new Map();
  packageSalaries.forEach(pkg => {
    salaryMap.set(pkg.packageName, Number(pkg.salaryPerStudent));
  });

  const packageRates = new Map();
  packageDeductions.forEach(pkg => {
    packageRates.set(pkg.packageName, {
      lateness: Number(pkg.latenessBaseAmount) || 30,
      absence: Number(pkg.absenceBaseAmount) || 25
    });
  });

  // Get settings
  const workingDaysConfig = await prisma.setting.findUnique({
    where: { key: "include_sundays_in_salary" }
  });
  const includeSundays = workingDaysConfig?.value === "true";

  // Calculate working days
  const workingDays = calculateWorkingDays(from, to, includeSundays);

  const results = await Promise.all(
    teachers.map(async (teacher) => {
      return await calculateTeacherPayment(
        teacher, from, to, salaryMap, packageRates, workingDays, includeSundays
      );
    })
  );

  return NextResponse.json(results.filter(Boolean));
}

async function calculateTeacherPayment(
  teacher: any, from: Date, to: Date, salaryMap: Map<string, number>, 
  packageRates: Map<string, any>, workingDays: number, includeSundays: boolean
) {
  // Get teacher's students
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      ustaz: teacher.ustazid,
      status: { in: ["active", "Active"] }
    },
    select: {
      wdt_ID: true,
      name: true,
      package: true,
      zoom_links: {
        where: { sent_time: { gte: from, lte: to } },
        select: { sent_time: true }
      }
    }
  });

  if (students.length === 0) return null;

  // Calculate base salary
  let baseSalary = 0;
  let teachingDays = 0;

  for (const student of students) {
    const packageSalary = salaryMap.get(student.package || "") || 0;
    const dailyRate = packageSalary / workingDays;
    
    // Count unique teaching days for this student
    const uniqueDays = new Set();
    student.zoom_links.forEach(link => {
      if (link.sent_time) {
        const date = startOfDay(link.sent_time);
        if (includeSundays || date.getDay() !== 0) {
          uniqueDays.add(date.toISOString());
        }
      }
    });
    
    baseSalary += dailyRate * uniqueDays.size;
    teachingDays = Math.max(teachingDays, uniqueDays.size);
  }

  // Calculate deductions
  const latenessDeduction = await calculateLatenessDeduction(
    teacher.ustazid, from, to, packageRates
  );
  
  const absenceDeduction = await calculateAbsenceDeduction(
    teacher.ustazid, from, to, students, packageRates, includeSundays
  );

  // Calculate bonuses
  const bonuses = await prisma.bonusrecord.findMany({
    where: {
      teacherId: teacher.ustazid,
      createdAt: { gte: from, lte: to }
    }
  });
  const totalBonuses = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

  const totalSalary = Math.round(baseSalary - latenessDeduction - absenceDeduction + totalBonuses);

  return {
    id: teacher.ustazid,
    name: teacher.ustazname,
    numStudents: students.length,
    baseSalary: Math.round(baseSalary),
    latenessDeduction: Math.round(latenessDeduction),
    absenceDeduction: Math.round(absenceDeduction),
    bonuses: Math.round(totalBonuses),
    totalSalary,
    teachingDays
  };
}

async function calculateLatenessDeduction(
  teacherId: string, from: Date, to: Date, packageRates: Map<string, any>
): Promise<number> {
  // Get existing lateness records
  const latenessRecords = await prisma.latenessrecord.findMany({
    where: {
      teacherId,
      classDate: { gte: from, lte: to }
    }
  });

  return latenessRecords.reduce((sum, record) => sum + record.deductionApplied, 0);
}

async function calculateAbsenceDeduction(
  teacherId: string, from: Date, to: Date, students: any[], 
  packageRates: Map<string, any>, includeSundays: boolean
): Promise<number> {
  let totalDeduction = 0;

  // Get existing absence records
  const existingRecords = await prisma.absencerecord.findMany({
    where: {
      teacherId,
      classDate: { gte: from, lte: to }
    }
  });

  // Add deductions from existing records
  totalDeduction += existingRecords.reduce((sum, record) => sum + record.deductionApplied, 0);

  // Calculate computed absences
  const existingDates = new Set(
    existingRecords.map(record => format(record.classDate, "yyyy-MM-dd"))
  );

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Check each day for absences
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    // Only process past dates
    if (d > today) continue;
    if (!includeSundays && d.getDay() === 0) continue;

    const dateStr = format(d, "yyyy-MM-dd");
    if (existingDates.has(dateStr)) continue;

    // Check if teacher sent any zoom links this day
    const hasZoomLinks = students.some(student =>
      student.zoom_links.some(link => {
        if (!link.sent_time) return false;
        return format(link.sent_time, "yyyy-MM-dd") === dateStr;
      })
    );

    // If no zoom links sent = absence
    if (!hasZoomLinks && students.length > 0) {
      for (const student of students) {
        const rates = packageRates.get(student.package || "") || { absence: 25 };
        totalDeduction += rates.absence;
      }
    }
  }

  return totalDeduction;
}

async function calculateLatenessRecords(
  teacherId: string, fromDate: Date, toDate: Date, 
  packageRates: Map<string, any>, latenessConfigs: any[]
) {
  // Get students with their scheduled times and zoom links
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: { ustaz: teacherId },
    select: {
      wdt_ID: true,
      name: true,
      package: true,
      occupiedTimes: {
        select: { time_slot: true }
      },
      zoom_links: {
        where: { sent_time: { gte: fromDate, lte: toDate } },
        select: { sent_time: true }
      }
    }
  });

  const latenessRecords = [];

  for (const student of students) {
    const timeSlot = student.occupiedTimes?.[0]?.time_slot;
    if (!timeSlot) continue;

    // Group zoom links by date
    const linksByDate = new Map();
    student.zoom_links.forEach(link => {
      if (link.sent_time) {
        const dateStr = format(link.sent_time, "yyyy-MM-dd");
        if (!linksByDate.has(dateStr)) {
          linksByDate.set(dateStr, []);
        }
        linksByDate.get(dateStr).push(link.sent_time);
      }
    });

    // Process each date
    for (const [dateStr, links] of linksByDate) {
      const scheduledTime = parseTimeSlot(timeSlot, dateStr);
      const actualTime = links.sort((a, b) => a.getTime() - b.getTime())[0];
      
      const latenessMinutes = Math.max(0, 
        Math.round((actualTime.getTime() - scheduledTime.getTime()) / 60000)
      );

      if (latenessMinutes > 0) {
        const deduction = calculateLatenessDeduction(
          latenessMinutes, student.package, packageRates, latenessConfigs
        );

        latenessRecords.push({
          studentId: student.wdt_ID,
          studentName: student.name,
          classDate: scheduledTime,
          scheduledTime,
          actualStartTime: actualTime,
          latenessMinutes,
          deductionApplied: deduction,
          deductionTier: `${latenessMinutes} min late`
        });
      }
    }
  }

  return latenessRecords;
}

async function calculateComputedAbsences(
  teacherId: string, fromDate: Date, toDate: Date, 
  packageRates: Map<string, any>, existingRecords: any[]
) {
  const existingDates = new Set(
    existingRecords.map(record => format(record.classDate, "yyyy-MM-dd"))
  );

  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      ustaz: teacherId,
      status: { in: ["active", "Active"] }
    },
    select: {
      wdt_ID: true,
      name: true,
      package: true,
      zoom_links: {
        where: { sent_time: { gte: fromDate, lte: toDate } },
        select: { sent_time: true }
      }
    }
  });

  const computedAbsences = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    if (d > today) continue;
    if (d.getDay() === 0) continue; // Skip Sundays

    const dateStr = format(d, "yyyy-MM-dd");
    if (existingDates.has(dateStr)) continue;

    const hasZoomLinks = students.some(student =>
      student.zoom_links.some(link => {
        if (!link.sent_time) return false;
        return format(link.sent_time, "yyyy-MM-dd") === dateStr;
      })
    );

    if (!hasZoomLinks && students.length > 0) {
      let totalDeduction = 0;
      const packageBreakdown = [];

      for (const student of students) {
        const rates = packageRates.get(student.package || "") || { absence: 25 };
        totalDeduction += rates.absence;
        packageBreakdown.push({
          studentId: student.wdt_ID,
          studentName: student.name,
          package: student.package || "Unknown",
          ratePerSlot: rates.absence,
          total: rates.absence
        });
      }

      computedAbsences.push({
        id: `computed-${dateStr}`,
        teacherId,
        classDate: new Date(d),
        timeSlots: ["Whole Day"],
        packageBreakdown,
        deductionApplied: totalDeduction,
        reviewNotes: `Auto-detected: ${students.length} students, no zoom links sent`
      });
    }
  }

  return computedAbsences;
}

function calculateWorkingDays(from: Date, to: Date, includeSundays: boolean): number {
  let workingDays = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (includeSundays || d.getDay() !== 0) {
      workingDays++;
    }
  }
  return workingDays;
}

function parseTimeSlot(timeSlot: string, dateStr: string): Date {
  // Convert time slot to 24-hour format
  let time24 = timeSlot;
  
  if (timeSlot.includes("AM") || timeSlot.includes("PM")) {
    const [time, modifier] = timeSlot.split(" ");
    let [hours, minutes] = time.split(":");
    
    if (hours === "12") {
      hours = modifier === "AM" ? "00" : "12";
    } else if (modifier === "PM") {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    time24 = `${hours.padStart(2, "0")}:${minutes || "00"}`;
  }
  
  return new Date(`${dateStr}T${time24}:00.000Z`);
}

function calculateLatenessDeduction(
  latenessMinutes: number, packageName: string, 
  packageRates: Map<string, any>, latenessConfigs: any[]
): number {
  const rates = packageRates.get(packageName || "") || { lateness: 30 };
  const baseAmount = rates.lateness;
  
  // Find applicable tier
  for (const config of latenessConfigs) {
    if (latenessMinutes >= config.startMinute && latenessMinutes <= config.endMinute) {
      return baseAmount * (config.deductionPercent / 100);
    }
  }
  
  // Default to full deduction if no tier matches
  return baseAmount;
}