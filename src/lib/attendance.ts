import { prisma } from "@/lib/prisma";

export const DAY_PACKAGES = {
  "All days": "All days",
  MWF: "MWF",
  TTS: "TTS",
} as const;

export type DayPackage = keyof typeof DAY_PACKAGES;

export function isValidAttendanceDay(
  dayPackage: DayPackage,
  date: Date
): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  switch (dayPackage) {
    case "All days":
      return true;
    case "MWF":
      return day === 1 || day === 3 || day === 5;
    case "TTS":
      return day === 2 || day === 4 || day === 6;
    default:
      return false;
  }
}

export function getNextValidAttendanceDate(
  dayPackage: DayPackage,
  fromDate: Date
): Date {
  const date = new Date(fromDate);
  while (!isValidAttendanceDay(dayPackage, date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

export function getValidAttendanceDates(
  dayPackage: DayPackage,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isValidAttendanceDay(dayPackage, currentDate)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export function formatAttendanceDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseAttendanceDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Calculates lateness, deduction, and tier for a teacher's class based on student scheduled time and zoom link sent time.
 * @param teacherId - The teacher's ID
 * @param classDate - The class date (YYYY-MM-DD string or Date)
 * @param students - Array of students with selectedTime and zoom_links for the date
 * @returns Array of lateness record data (to be stored in DB)
 */
export async function calculateLatenessAndDeduction({
  teacherId,
  classDate,
  students,
}: {
  teacherId: string;
  classDate: string | Date;
  students: Array<{
    studentId: number;
    selectedTime: string | null;
    zoom_links: Array<{ sent_time: Date | null }>;
  }>;
}) {
  // Fetch lateness config from latenessDeductionConfig
  const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
    orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
  });

  // Get package-specific deduction configurations
  const packageDeductions = await prisma.packageDeduction.findMany();
  const packageDeductionMap: Record<string, number> = {};
  packageDeductions.forEach((pkg) => {
    packageDeductionMap[pkg.packageName] = Number(pkg.latenessBaseAmount);
  });
  const defaultBaseDeductionAmount = 30;

  let excusedThreshold = 3;
  let tiers: Array<{ start: number; end: number; percent: number }> = [
    { start: 4, end: 7, percent: 10 },
    { start: 8, end: 14, percent: 20 },
    { start: 15, end: 21, percent: 30 },
  ];
  let maxTierEnd = 21;
  if (latenessConfigs.length > 0) {
    excusedThreshold = Math.min(
      ...latenessConfigs.map((c) => c.excusedThreshold ?? 3)
    );
    tiers = latenessConfigs.map((c) => ({
      start: c.startMinute,
      end: c.endMinute,
      percent: c.deductionPercent,
    }));
    maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));
  }

  // For each student, calculate lateness and deduction
  const latenessRecords = students
    .map((student) => {
      if (!student.selectedTime) return null;
      // Convert selectedTime (12h or 24h) to Date for the classDate
      function to24Hour(time12h: string) {
        if (!time12h) return "00:00";
        if (
          time12h.includes(":") &&
          (time12h.includes("AM") || time12h.includes("PM"))
        ) {
          const [time, modifier] = time12h.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") hours = modifier === "AM" ? "00" : "12";
          else if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
          return `${hours.padStart(2, "0")}:${minutes}`;
        }
        return time12h; // already 24h
      }
      const dateStr =
        typeof classDate === "string"
          ? classDate
          : classDate.toISOString().split("T")[0];
      const time24 = to24Hour(student.selectedTime);
      const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
      // Find the earliest sent_time for this student on this date
      const sentTimes = student.zoom_links
        .filter((zl) => zl.sent_time)
        .map((zl) => zl.sent_time as Date)
        .sort((a, b) => a.getTime() - b.getTime());
      const actualStartTime = sentTimes.length > 0 ? sentTimes[0] : null;
      if (!actualStartTime) return null;
      const latenessMinutes = Math.max(
        0,
        Math.round(
          (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
        )
      );
      // Determine deduction and tier (package-specific base amount)
      let deductionApplied = 0;
      let deductionTier = "Excused";
      if (latenessMinutes > excusedThreshold) {
        // Use default base amount since we don't have student package info in this function
        const baseDeductionAmount = defaultBaseDeductionAmount;

        let foundTier = false;
        for (const [i, tier] of tiers.entries()) {
          if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
            deductionApplied = baseDeductionAmount * (tier.percent / 100);
            deductionTier = `Tier ${i + 1}`;
            foundTier = true;
            break;
          }
        }
        if (!foundTier && latenessMinutes > maxTierEnd) {
          deductionApplied = baseDeductionAmount;
          deductionTier = "> Max Tier";
        }
      }
      return {
        teacherId,
        classDate: new Date(dateStr),
        scheduledTime,
        actualStartTime,
        latenessMinutes,
        deductionApplied,
        deductionTier,
      };
    })
    .filter(
      (
        rec
      ): rec is {
        teacherId: string;
        classDate: Date;
        scheduledTime: Date;
        actualStartTime: Date;
        latenessMinutes: number;
        deductionApplied: number;
        deductionTier: string;
      } => rec !== null
    );
  return latenessRecords;
}

const dayPackageMap: { [key: string]: string } = {
  "All days": "All days",
  MWF: "MWF",
  TTS: "TTS",
};

export function getDayPackageDisplayName(dayPackage: string): string {
  return dayPackageMap[dayPackage] || dayPackage;
}

export function getDayPackageDays(dayPackage: string): string[] {
  switch (dayPackage) {
    case "All days":
      return [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
    case "MWF":
      return ["Monday", "Wednesday", "Friday"];
    case "TTS":
      return ["Tuesday", "Thursday", "Saturday"];
    default:
      return [];
  }
}
