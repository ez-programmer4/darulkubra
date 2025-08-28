// Comprehensive Time Management Utilities
// Hybrid Approach: 24-hour storage, 12-hour display

export interface TimeSlot {
  id: string;
  time: string; // 12-hour format for display
  category: string; // Prayer time category
}

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

// Updated prayer times with new ranges
export const DEFAULT_PRAYER_TIMES: PrayerTimes = {
  Fajr: "06:00",     // 6:00-12:30 (Fajr to Zuhur)
  Dhuhr: "13:00",    // 1:00-3:30 (Zuhur)
  Asr: "16:00",      // 4:00-6:30 (Asr)
  Maghrib: "19:00",  // 7:00-8:00 (Maghrib)
  Isha: "20:30",     // 8:30-11:30 (Isha)
};

// New prayer time ranges
export const PRAYER_TIME_RANGES = {
  Midnight: { start: "00:00", end: "05:30" }, // 12:00-5:30
  Fajr: { start: "06:00", end: "12:30" },     // 6:00-12:30
  Zuhur: { start: "13:00", end: "15:30" },    // 1:00-3:30
  Asr: { start: "16:00", end: "18:30" },      // 4:00-6:30
  Maghrib: { start: "19:00", end: "20:00" },  // 7:00-8:00
  Isha: { start: "20:30", end: "23:30" },     // 8:30-11:30
};

export const to24Hour = (time: string): string => {
  if (!time) return "";

  // Remove any extra spaces
  time = time.trim();

  // If already in 24-hour format (no AM/PM), normalize it
  if (!time.includes("AM") && !time.includes("PM")) {
    const parts = time.split(":");
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, "0");
      const minutes = parts[1].padStart(2, "0");
      // Return HH:MM format (without seconds for consistency)
      return `${hours}:${minutes}`;
    }
    return time;
  }

  // Handle 12-hour format with AM/PM
  const [timePart, period] = time.split(" ");
  if (!period) return time;

  const [hours, minutes] = timePart.split(":").map(Number);
  let hour24 = hours;

  if (period.toUpperCase() === "PM" && hours !== 12) {
    hour24 = hours + 12;
  } else if (period.toUpperCase() === "AM" && hours === 12) {
    hour24 = 0;
  }

  return `${hour24.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

export const to12Hour = (time: string): string => {
  if (!time) return "";

  // If already in 12-hour format, return as is
  if (time.includes("AM") || time.includes("PM")) {
    return time;
  }

  // Handle both HH:MM and HH:MM:SS formats
  const parts = time.split(":");
  if (parts.length < 2) return time;
  
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

/**
 * Validate time format (accepts both 12 and 24 hour)
 */
export function validateTime(time: string): boolean {
  try {
    to24Hour(time);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format time for display (configurable format)
 */
export function formatTime(
  time: string,
  format: "12h" | "24h" = "12h"
): string {
  const time24 = to24Hour(time);

  if (format === "12h") {
    return to12Hour(time24);
  }

  return time24;
}

/**
 * Parse time into hours and minutes (handles HH:MM:SS format)
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const time24 = to24Hour(time);
  const parts = time24.split(":");
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  return { hours, minutes };
}

/**
 * Check if two times conflict (same time) - handles all formats
 */
export function isTimeConflict(time1: string, time2: string): boolean {
  return timesMatch(time1, time2);
}

/**
 * Categorize time based on new prayer periods
 */
export function categorizeTime(time: string): string {
  const time24 = to24Hour(time);
  const { hours, minutes } = parseTime(time24);
  const timeMinutes = hours * 60 + minutes;

  // Convert ranges to minutes
  const ranges = {
    Midnight: { start: 0, end: 5 * 60 + 30 },        // 00:00-05:30
    Fajr: { start: 6 * 60, end: 12 * 60 + 30 },      // 06:00-12:30
    Zuhur: { start: 13 * 60, end: 15 * 60 + 30 },    // 13:00-15:30
    Asr: { start: 16 * 60, end: 18 * 60 + 30 },      // 16:00-18:30
    Maghrib: { start: 19 * 60, end: 20 * 60 },       // 19:00-20:00
    Isha: { start: 20 * 60 + 30, end: 23 * 60 + 30 }, // 20:30-23:30
  };

  for (const [period, range] of Object.entries(ranges)) {
    if (timeMinutes >= range.start && timeMinutes <= range.end) {
      return period;
    }
  }

  return "General";
}

/**
 * Generate time slots from schedule string
 */
export const generateTimeSlots = (
  schedule: string,
  prayerTimes: PrayerTimes
): TimeSlot[] => {
  if (!schedule) return [];

  const times = schedule
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  const slots: TimeSlot[] = [];

  times.forEach((time, index) => {
    const time24 = to24Hour(time);
    const time12 = to12Hour(time24);

    // Determine category based on prayer times
    const category = getTimeCategory(time24, prayerTimes);

    slots.push({
      id: `slot-${index + 1}`,
      time: time12, // Store in 12-hour format for display
      category,
    });
  });

  return slots;
};

const getTimeCategory = (time24: string, prayerTimes: PrayerTimes): string => {
  const [hours, minutes] = time24.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;

  // Convert prayer times to minutes for comparison
  const fajrMinutes = convertTimeToMinutes(prayerTimes.Fajr);
  const dhuhrMinutes = convertTimeToMinutes(prayerTimes.Dhuhr);
  const asrMinutes = convertTimeToMinutes(prayerTimes.Asr);
  const maghribMinutes = convertTimeToMinutes(prayerTimes.Maghrib);
  const ishaMinutes = convertTimeToMinutes(prayerTimes.Isha);

  if (totalMinutes >= fajrMinutes && totalMinutes < dhuhrMinutes) {
    return "Fajr";
  } else if (totalMinutes >= dhuhrMinutes && totalMinutes < asrMinutes) {
    return "Dhuhr";
  } else if (totalMinutes >= asrMinutes && totalMinutes < maghribMinutes) {
    return "Asr";
  } else if (totalMinutes >= maghribMinutes && totalMinutes < ishaMinutes) {
    return "Maghrib";
  } else {
    return "Isha";
  }
};

const convertTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Get prayer time categories for UI
 */
export function getPrayerCategories(): string[] {
  return ["Midnight", "Fajr", "Zuhur", "Asr", "Maghrib", "Isha"];
}

/**
 * Get prayer time ranges with descriptions
 */
export function getPrayerRanges(): Record<string, { range: string; description: string }> {
  return {
    Midnight: { range: "12:00 AM - 5:30 AM", description: "Midnight to Fajr" },
    Fajr: { range: "6:00 AM - 12:30 PM", description: "Fajr to Zuhur" },
    Zuhur: { range: "1:00 PM - 3:30 PM", description: "Zuhur period" },
    Asr: { range: "4:00 PM - 6:30 PM", description: "Asr period" },
    Maghrib: { range: "7:00 PM - 8:00 PM", description: "Maghrib period" },
    Isha: { range: "8:30 PM - 11:30 PM", description: "Isha period" },
  };
}

/**
 * Convert time to minutes for sorting
 */
export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

/**
 * Sort time slots by time
 */
export function sortTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );
}

/**
 * Group time slots by prayer category
 */
export function groupSlotsByCategory(
  slots: TimeSlot[]
): Record<string, TimeSlot[]> {
  const grouped: Record<string, TimeSlot[]> = {};

  getPrayerCategories().forEach((category) => {
    grouped[category] = [];
  });

  slots.forEach((slot) => {
    if (grouped[slot.category]) {
      grouped[slot.category].push(slot);
    }
  });

  return grouped;
}

/**
 * Convert time to database format (HH:MM:SS)
 */
export function toDbFormat(time: string): string {
  if (!time) return "";
  
  const time24 = to24Hour(time);
  // Add seconds if not present
  if (time24.split(":").length === 2) {
    return `${time24}:00`;
  }
  return time24;
}

/**
 * Convert from database format (HH:MM:SS) to display format
 */
export function fromDbFormat(time: string, format: "12h" | "24h" = "12h"): string {
  if (!time) return "";
  
  // Remove seconds for display
  const parts = time.split(":");
  const timeWithoutSeconds = `${parts[0]}:${parts[1] || "00"}`;
  
  return format === "12h" ? to12Hour(timeWithoutSeconds) : timeWithoutSeconds;
}

/**
 * Check if two times match (handles different formats)
 */
export function timesMatch(time1: string, time2: string): boolean {
  if (!time1 || !time2) return false;
  
  try {
    const t1 = to24Hour(time1);
    const t2 = to24Hour(time2);
    return t1 === t2;
  } catch {
    return false;
  }
}

/**
 * Search time slots by time (handles both formats)
 */
export function searchTimeSlots(slots: TimeSlot[], searchTime: string): TimeSlot[] {
  if (!searchTime) return slots;
  
  const normalizedSearch = to24Hour(searchTime.trim());
  
  return slots.filter(slot => {
    const slotTime24 = to24Hour(slot.time);
    return slotTime24.includes(normalizedSearch) || 
           slot.time.toLowerCase().includes(searchTime.toLowerCase());
  });
}
