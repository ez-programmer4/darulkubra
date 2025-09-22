 import { prisma } from "@/lib/prisma";
import { format, parse, isWithinInterval, addMinutes, isBefore, isAfter, parseISO } from "date-fns";

export interface StudentAbsenceResult {
  studentId: number;
  studentName: string;
  package: string;
  timeSlot: string;
  isAbsent: boolean;
  deductionRate: number;
  scheduledTime?: Date;
  actualTime?: Date | null;
}

export interface TeacherAbsenceResult {
  hasAbsences: boolean;
  totalDeduction: number;
  studentAbsences: StudentAbsenceResult[];
  reason?: string;
}

/**
 * Parse time string (HH:MM) to Date object
 */
function parseTimeString(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Check if a time falls within a time slot
 */
function isWithinTimeSlot(timeToCheck: Date | null, timeSlot: string | null, bufferMinutes = 30): boolean {
  if (!timeToCheck || !timeSlot) return false;
  
  try {
    const [startStr, endStr] = timeSlot.split('-');
    if (!startStr || !endStr) return false;

    const startTime = parseTimeString(startStr.trim(), timeToCheck);
    const endTime = parseTimeString(endStr.trim(), timeToCheck);
    
    // Add buffer to start time (teacher can be early)
    const bufferedStart = addMinutes(startTime, -bufferMinutes);
    
    return isWithinInterval(timeToCheck, {
      start: bufferedStart,
      end: endTime
    });
  } catch (error) {
    console.error('Error in isWithinTimeSlot:', error);
    return false;
  }
}

/**
 * Get teacher's schedule for a specific day of week
 */
async function getTeacherSchedule(teacherId: string, dayOfWeek: number) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayOfWeek];
  
  // First get the occupied times
  const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
    where: {
      ustaz_id: teacherId,
      daypackage: {
        contains: dayName
      }
    }
  });

  // Then get student details in a single query
  const studentIds = [...new Set(occupiedTimes.map(ot => ot.student_id))];
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      wdt_ID: { in: studentIds }
    },
    select: {
      wdt_ID: true,
      name: true,
      package: true
    }
  });

  // Combine the data
  return occupiedTimes.map(ot => ({
    ...ot,
    student: students.find(s => s.wdt_ID === ot.student_id) || {
      wdt_ID: ot.student_id,
      name: 'Unknown Student',
      package: 'Unknown'
    }
  }));
}

/**
 * Get package-specific deduction rate
 */
async function getPackageDeductionRate(packageName: string | null): Promise<number> {
  if (!packageName) return 25; // Default rate
  
  const pkg = await prisma.packageDeduction.findFirst({
    where: { packageName }
  });
  
  return pkg ? Number(pkg.absenceBaseAmount) : 25;
}

/**
 * Per-student absence detection with package-based deductions and time slot validation
 */
export async function detectTeacherAbsences(
  teacherId: string,
  date: Date
): Promise<TeacherAbsenceResult> {
  const dateStr = format(date, "yyyy-MM-dd");
  const today = new Date();
  today.setDate(today.getDate() - 1); // Only process past dates
  today.setHours(23, 59, 59, 999);

  // Don't process future dates or today
  if (date > today) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "Future date" };
  }

  // Check Sunday inclusion setting
  const workingDaysConfig = await prisma.setting.findUnique({
    where: { key: "include_sundays_in_salary" },
  });
  const includeSundays = workingDaysConfig?.value === "true" || false;

  if (!includeSundays && date.getDay() === 0) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "Sunday excluded" };
  }
  
  // Get teacher's schedule for this day of week
  const schedule = await getTeacherSchedule(teacherId, date.getDay());
  if (schedule.length === 0) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "No scheduled classes" };
  }

  // Get all zoom links for this teacher on this date
  const zoomLinks = await prisma.wpos_zoom_links.findMany({
    where: {
      ustazid: teacherId,
      sent_time: {
        gte: new Date(dateStr + "T00:00:00.000Z"),
        lt: new Date(dateStr + "T23:59:59.999Z"),
      },
    },
    orderBy: {
      sent_time: 'asc'
    }
  });

  // Check for waivers
  const waivers = await prisma.deduction_waivers.findMany({
    where: {
      teacherId,
      deductionType: "absence",
      deductionDate: date,
    },
  });
  const isWaived = waivers.length > 0;

  if (isWaived) {
    return { hasAbsences: false, totalDeduction: 0, studentAbsences: [], reason: "Waived by admin" };
  }

  // Check each scheduled time slot for absence
  const studentAbsences: StudentAbsenceResult[] = [];
  let totalDeduction = 0;
  const processedSlots = new Set<string>();
  const studentMap = new Map<number, { wdt_ID: number; name: string | null; package: string | null }>();

  // Create a map of student details for quick lookup
  for (const slot of schedule) {
    if (!slot.time_slot) continue;
    
    const slotKey = `${slot.time_slot}_${slot.student_id}`;
    if (processedSlots.has(slotKey)) continue;
    
    processedSlots.add(slotKey);
    
    // Get or fetch student details
    let student = studentMap.get(slot.student_id);
    if (!student) {
      const studentData = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: slot.student_id },
        select: { wdt_ID: true, name: true, package: true }
      });
      
      student = studentData || {
        wdt_ID: slot.student_id,
        name: 'Unknown Student',
        package: 'Unknown'
      };
      studentMap.set(slot.student_id, student);
    }
    
    // Find matching zoom link for this time slot
    const matchingLink = zoomLinks.find(link => {
      if (!link.sent_time) return false;
      return link.studentid === slot.student_id && 
             isWithinTimeSlot(link.sent_time, slot.time_slot);
    });
    
    if (!matchingLink) {
      const packageRate = await getPackageDeductionRate(student.package || null);
      const [startTime] = slot.time_slot.split('-').map(t => t.trim());
      const scheduledTime = parseTimeString(startTime, date);
      
      studentAbsences.push({
        studentId: student.wdt_ID,
        studentName: student.name || "Unknown Student",
        package: student.package || "Unknown",
        timeSlot: slot.time_slot,
        scheduledTime,
        isAbsent: true,
        deductionRate: packageRate
      });
      totalDeduction += packageRate;
    }
  }

  return {
    hasAbsences: studentAbsences.length > 0,
    totalDeduction,
    studentAbsences,
    reason: studentAbsences.length > 0 
      ? `${studentAbsences.length} absence(s) detected` 
      : "No absences detected"
  };
}

/**
 * Get absence deduction configuration
 */
export async function getAbsenceDeductionConfig() {
  // Get Sunday inclusion setting
  const workingDaysConfig = await prisma.setting.findUnique({
    where: { key: "include_sundays_in_salary" },
  });
  const includeSundays = workingDaysConfig?.value === "true" || false;

  // Get package deduction rates
  const packageDeductions = await prisma.packageDeduction.findMany();
  const packageRates: Record<string, number> = {};
  packageDeductions.forEach((pkg) => {
    packageRates[pkg.packageName] = Number(pkg.absenceBaseAmount);
  });

  return {
    includeSundays,
    packageRates,
    defaultRate: 25, // Default rate if package not found
  };
}

/**
 * Legacy function for backward compatibility
 */
export async function isTeacherAbsent(
  teacherId: string,
  date: Date
): Promise<{ isAbsent: boolean; reason?: string }> {
  const result = await detectTeacherAbsences(teacherId, date);
  return {
    isAbsent: result.hasAbsences,
    reason: result.reason || (result.hasAbsences ? "Per-student absences detected" : "No absences"),
  };
}
