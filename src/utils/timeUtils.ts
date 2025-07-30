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

// Default prayer times for Addis Ababa
export const DEFAULT_PRAYER_TIMES: PrayerTimes = {
  Fajr: "05:00",
  Dhuhr: "12:00",
  Asr: "15:00",
  Maghrib: "18:00",
  Isha: "19:30",
};

export const to24Hour = (time: string): string => {
  if (!time) return "";

  // Remove any extra spaces
  time = time.trim();

  // If already in 24-hour format (no AM/PM), return as is
  if (!time.includes("AM") && !time.includes("PM")) {
    // Handle times without leading zeros (e.g., "4:00" -> "04:00")
    const parts = time.split(":");
    if (parts.length === 2) {
      const hours = parts[0].padStart(2, "0");
      const minutes = parts[1].padStart(2, "0");
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

  // Convert 24-hour to 12-hour
  const [hours, minutes] = time.split(":").map(Number);
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
 * Parse time into hours and minutes
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const time24 = to24Hour(time);
  const [hours, minutes] = time24.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Check if two times conflict (same time)
 */
export function isTimeConflict(time1: string, time2: string): boolean {
  try {
    const t1 = to24Hour(time1);
    const t2 = to24Hour(time2);
    return t1 === t2;
  } catch {
    return false;
  }
}

/**
 * Categorize time based on prayer periods
 */
export function categorizeTime(
  time: string,
  prayerTimes: PrayerTimes = DEFAULT_PRAYER_TIMES
): string {
  const time24 = to24Hour(time);
  const { hours, minutes } = parseTime(time24);
  const timeMinutes = hours * 60 + minutes;

  const fajrMinutes =
    parseTime(prayerTimes.Fajr).hours * 60 +
    parseTime(prayerTimes.Fajr).minutes;
  const dhuhrMinutes =
    parseTime(prayerTimes.Dhuhr).hours * 60 +
    parseTime(prayerTimes.Dhuhr).minutes;
  const asrMinutes =
    parseTime(prayerTimes.Asr).hours * 60 + parseTime(prayerTimes.Asr).minutes;
  const maghribMinutes =
    parseTime(prayerTimes.Maghrib).hours * 60 +
    parseTime(prayerTimes.Maghrib).minutes;
  const ishaMinutes =
    parseTime(prayerTimes.Isha).hours * 60 +
    parseTime(prayerTimes.Isha).minutes;

  if (timeMinutes >= fajrMinutes && timeMinutes < dhuhrMinutes) {
    return "After Fajr";
  } else if (timeMinutes >= dhuhrMinutes && timeMinutes < asrMinutes) {
    return "After Dhuhr";
  } else if (timeMinutes >= asrMinutes && timeMinutes < maghribMinutes) {
    return "After Asr";
  } else if (timeMinutes >= maghribMinutes && timeMinutes < ishaMinutes) {
    return "After Maghrib";
  } else {
    return "After Isha";
  }
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
  return [
    "After Fajr",
    "After Dhuhr",
    "After Asr",
    "After Maghrib",
    "After Isha",
  ];
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
