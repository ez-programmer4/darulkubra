export const DAY_PACKAGES = {
  "All Day Package": "All Day Package",
  "Monday, Wednesday, Friday": "Monday, Wednesday, Friday",
  "Tuesday, Thursday, Saturday": "Tuesday, Thursday, Saturday",
} as const;

export type DayPackage = keyof typeof DAY_PACKAGES;

export function isValidAttendanceDay(
  dayPackage: DayPackage,
  date: Date
): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  switch (dayPackage) {
    case "All Day Package":
      return true;
    case "Monday, Wednesday, Friday":
      return day === 1 || day === 3 || day === 5;
    case "Tuesday, Thursday, Saturday":
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
