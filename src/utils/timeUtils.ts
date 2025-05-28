export function convertTimeTo24Hour(timeStr: string): string {
  let startTime = timeStr;
  if (timeStr.includes(" - ")) {
    startTime = startTime.split(" - ")[0].trim();
  }

  let hours: string, minutes: string;

  // Check if the time is in 24-hour format (e.g., "18:00")
  if (!startTime.includes("AM") && !startTime.includes("PM")) {
    [hours, minutes] = startTime.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  // Handle 12-hour format (e.g., "06:00 PM")
  const [time, period] = startTime.split(/(?<=:\d{2})\s/);
  [hours, minutes] = time.split(":");
  hours = parseInt(hours).toString();
  if (period === "PM" && hours !== "12")
    hours = (parseInt(hours) + 12).toString();
  if (period === "AM" && hours === "12") hours = "00";

  return `${hours.padStart(2, "0")}:${minutes}`;
}

export function convertTo12Hour(timeStr: string): string {
  let startTime = timeStr;
  if (timeStr.includes(" - ")) {
    startTime = timeStr.split(" - ")[0].trim();
  }

  let hours: number, minutes: number;
  if (!startTime.includes("AM") && !startTime.includes("PM")) {
    // 24-hour format (e.g., "18:00")
    [hours, minutes] = startTime.split(":").map(Number);
  } else {
    // 12-hour format (e.g., "06:00 PM")
    const [time, period] = startTime.split(/(?<=:\d{2})\s/);
    hours = parseInt(time.split(":")[0]);
    minutes = parseInt(time.split(":")[1]);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  const period = hours >= 12 ? "PM" : "AM"; // <-- use const
  const displayHours = hours % 12 || 12; // Convert 0 or 12 to 12 for 12-hour format
  return `${displayHours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${period}`;
}
