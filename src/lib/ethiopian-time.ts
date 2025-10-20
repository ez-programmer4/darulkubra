/**
 * Utility functions for Ethiopian timezone (UTC+3)
 */

/**
 * Get current Ethiopian local time (UTC+3)
 * @returns Date object adjusted to Ethiopian timezone
 */
export function getEthiopianTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + 3 * 60 * 60 * 1000);
}

/**
 * Convert a UTC date to Ethiopian local time (UTC+3)
 * @param utcDate - Date in UTC or ISO string
 * @returns Date object adjusted to Ethiopian timezone
 */
export function toEthiopianTime(utcDate: Date | string): Date {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + 3 * 60 * 60 * 1000);
}
