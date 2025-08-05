import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface UstazRatingCalculation {
  ustazid: string;
  date: Date;
  scheduled_time: string;
  sent_time: Date | null;
  expected_deadline: Date;
  is_on_time: boolean;
  delay_minutes: number | null;
  total_students: number;
  students_present: number;
  students_absent: number;
  attendance_rate: number;
  rating_score: number;
}

export async function calculateUstazAttendanceRating(
  ustazId: string,
  date: Date
): Promise<UstazRatingCalculation | null> {
  try {
    // Get all active students for this ustaz on this date
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        ustaz: ustazId,
        daypackages: {
          contains: date.toLocaleDateString("en-US", { weekday: "long" }),
        },
        status: { equals: "active" }, // Only active students
      },
      include: {
        attendance_progress: {
          where: {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
        zoom_links: {
          where: {
            sent_time: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
    });

    if (students.length === 0) {
      return null;
    }

    // Calculate attendance statistics
    let totalStudents = students.length;
    let studentsPresent = 0;
    let studentsAbsent = 0;
    let totalAttendanceRate = 0;

    students.forEach((student) => {
      const attendance = student.attendance_progress[0];
      if (attendance) {
        if (attendance.attendance_status === "Present") {
          studentsPresent++;
        } else if (attendance.attendance_status === "Absent") {
          studentsAbsent++;
        }
      }
    });

    totalAttendanceRate =
      totalStudents > 0 ? (studentsPresent / totalStudents) * 100 : 0;

    // Find the earliest sent time for this ustaz on this date
    const allZoomLinks = students.flatMap((student) => student.zoom_links);
    const sentTimes = allZoomLinks
      .filter((link) => link.sent_time)
      .map((link) => new Date(link.sent_time!))
      .sort((a, b) => a.getTime() - b.getTime());

    const earliestSentTime = sentTimes.length > 0 ? sentTimes[0] : null;

    // Calculate timing metrics
    let isOnTime = false;
    let delayMinutes = null;
    let scheduledTime = "00:00";
    let expectedDeadline = new Date(date);

    if (students.length > 0 && students[0].occupiedTimes?.[0]?.time_slot) {
      scheduledTime = students[0].occupiedTimes[0].time_slot;
      const [hours, minutes] = scheduledTime.split(":");
      expectedDeadline = new Date(date);
      expectedDeadline.setHours(parseInt(hours), parseInt(minutes) + 15, 0, 0); // 15 minutes after scheduled time

      if (earliestSentTime) {
        isOnTime = earliestSentTime <= expectedDeadline;
        if (!isOnTime) {
          delayMinutes = Math.floor(
            (earliestSentTime.getTime() - expectedDeadline.getTime()) /
              (1000 * 60)
          );
        }
      }
    }

    // Calculate rating score (0-100)
    let ratingScore = 0;

    // Base score from attendance rate (60% weight)
    ratingScore += (totalAttendanceRate / 100) * 60;

    // Timing score (40% weight)
    if (earliestSentTime) {
      if (isOnTime) {
        ratingScore += 40; // Full points for being on time
      } else {
        // Deduct points based on delay, max 40 points deduction
        const maxDeduction = 40;
        const deduction = Math.min(delayMinutes || 0, maxDeduction);
        ratingScore += Math.max(0, 40 - deduction);
      }
    }

    return {
      ustazid: ustazId,
      date: new Date(date),
      scheduled_time: scheduledTime,
      sent_time: earliestSentTime,
      expected_deadline: expectedDeadline,
      is_on_time: isOnTime,
      delay_minutes: delayMinutes,
      total_students: totalStudents,
      students_present: studentsPresent,
      students_absent: studentsAbsent,
      attendance_rate: totalAttendanceRate,
      rating_score: ratingScore,
    };
  } catch (error) {
    return null;
  }
}

export async function updateUstazAttendanceRating(
  ustazId: string,
  date: Date
): Promise<boolean> {
  try {
    const ratingData = await calculateUstazAttendanceRating(ustazId, date);

    if (!ratingData) {
      return false;
    }

    // Create or update the rating record

    return true;
  } catch (error) {
    return false;
  }
}

export async function recalculateAllUstazRatings(
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    // Get all ustaz who had students during this period
    const ustazWithStudents = await prisma.wpos_wpdatatable_24.findMany({
      where: {
        students: {
          some: {
            attendance_progress: {
              some: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        },
      },
      select: {
        ustazid: true,
      },
    });

    let updatedCount = 0;
    const currentDate = new Date(startDate);

    // Calculate ratings for each ustaz for each day in the range
    while (currentDate <= endDate) {
      for (const ustaz of ustazWithStudents) {
        const success = await updateUstazAttendanceRating(
          ustaz.ustazid,
          new Date(currentDate)
        );
        if (success) {
          updatedCount++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return updatedCount;
  } catch (error) {
    return 0;
  }
}
