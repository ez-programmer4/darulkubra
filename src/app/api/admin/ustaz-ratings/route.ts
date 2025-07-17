import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Date range is required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999); // End of day

    // Get all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    const ratings = [];

    console.log("Ustaz Rating Debug - Processing teachers:", teachers.length);

    for (const teacher of teachers) {
      // Get zoom links for this teacher in the date range
      const zoomLinks = await prisma.wpos_zoom_links.findMany({
        where: {
          ustazid: teacher.ustazid,
          sent_time: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: {
          wpos_wpdatatable_23: {
            select: {
              selectedTime: true,
            },
          },
        },
        orderBy: {
          sent_time: "desc",
        },
      });

      if (zoomLinks.length === 0) {
        ratings.push({
          ustazid: teacher.ustazid,
          ustazname: teacher.ustazname,
          total_sessions: 0,
          on_time_sessions: 0,
          late_sessions: 0,
          absence_sessions: 0,
          three_minutes_late: 0,
          five_minutes_late: 0,
          seven_minutes_late: 0,
          more_than_seven_minutes_late: 0,
          total_students: 0,
          average_attendance_rate: 0,
          rating_score: 0,
          recent_performance: [],
          lateness_details: {
            average_lateness_minutes: 0,
            total_late_minutes: 0,
            lateness_breakdown: {
              "0-3 minutes": 0,
              "4-5 minutes": 0,
              "6-7 minutes": 0,
              "8+ minutes": 0,
            },
          },
        });
        continue;
      }

      console.log(
        `Ustaz Rating Debug - ${teacher.ustazname}: Found ${zoomLinks.length} zoom links`
      );

      if (zoomLinks.length > 0) {
        const sampleLink = zoomLinks[0];
        console.log(
          `Ustaz Rating Debug - Sample link for ${teacher.ustazname}:`,
          {
            id: sampleLink.id,
            sent_time: sampleLink.sent_time?.toISOString(),
            studentId: sampleLink.studentid,
            studentTime: sampleLink.wpos_wpdatatable_23.selectedTime,
          }
        );
      }

      // Group zoom links by date
      const linksByDate = new Map<string, typeof zoomLinks>();
      zoomLinks.forEach((link) => {
        if (!link.sent_time || isNaN(link.sent_time.getTime())) {
          console.log(
            `Ustaz Rating Debug - Skipping link ${link.id} with invalid sent_time`
          );
          return;
        }

        const dateKey = link.sent_time.toISOString().split("T")[0];
        if (!linksByDate.has(dateKey)) {
          linksByDate.set(dateKey, []);
        }
        linksByDate.get(dateKey)!.push(link);
      });

      let totalSessions = 0;
      let onTimeSessions = 0;
      let lateSessions = 0;
      let absenceSessions = 0;
      let threeMinutesLate = 0;
      let fiveMinutesLate = 0;
      let sevenMinutesLate = 0;
      let moreThanSevenMinutesLate = 0;
      let totalStudents = 0;
      let totalAttendanceRate = 0;
      const recentPerformance: any[] = [];

      for (const [dateKey, links] of linksByDate) {
        // Validate dateKey
        if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          console.log(`Ustaz Rating Debug - Invalid date key: ${dateKey}`);
          continue;
        }

        totalSessions++;

        // Get the latest link for this date (most recent sent_time)
        const latestLink = links[0];
        const sentTime = latestLink.sent_time!;

        // Validate sent time
        if (!sentTime || isNaN(sentTime.getTime())) {
          console.log(
            `Ustaz Rating Debug - Invalid sent time for link ${latestLink.id}`
          );
          continue;
        }

        // Calculate expected time based on student's selected time
        const studentTime = latestLink.wpos_wpdatatable_23.selectedTime;
        if (!studentTime) {
          console.log(
            `Ustaz Rating Debug - No selected time for student ${latestLink.studentid}`
          );
          continue;
        }

        // Convert 12-hour format to 24-hour format (like attendance list page)
        function to24Hour(time12h: string) {
          if (!time12h) return "00:00";
          const [time, modifier] = time12h.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") {
            hours = modifier === "AM" ? "00" : "12";
          } else if (modifier === "PM") {
            hours = String(parseInt(hours, 10) + 12);
          }
          return `${hours.padStart(2, "0")}:${minutes}`;
        }

        const time24 = to24Hour(studentTime);
        const [hours, minutes] = time24.split(":").map(Number);

        // Validate time components
        if (
          isNaN(hours) ||
          isNaN(minutes) ||
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59
        ) {
          console.log(
            `Ustaz Rating Debug - Invalid time format: ${studentTime} (converted: ${time24}) for student ${latestLink.studentid}`
          );
          continue;
        }

        // Create the scheduled time for the specific date (like attendance list page)
        const scheduledAt = `${dateKey}T${time24}:00.000Z`;
        const expectedTime = new Date(scheduledAt);

        // Validate the expected time
        if (isNaN(expectedTime.getTime())) {
          console.log(
            `Ustaz Rating Debug - Invalid expected time for date: ${dateKey}, time: ${studentTime} (converted: ${time24})`
          );
          continue;
        }

        // Calculate delay in minutes (same logic as attendance list page)
        const delayMinutes = Math.floor(
          (sentTime.getTime() - expectedTime.getTime()) / (1000 * 60)
        );

        console.log(
          `Ustaz Rating Debug - ${teacher.ustazname} on ${dateKey}:`,
          {
            studentTime,
            time24,
            scheduledAt,
            sentTime: sentTime.toISOString(),
            expectedTime: expectedTime.toISOString(),
            delayMinutes,
            studentId: latestLink.studentid,
          }
        );

        // Classify lateness
        if (delayMinutes <= 0) {
          onTimeSessions++;
        } else if (delayMinutes <= 3) {
          threeMinutesLate++;
          lateSessions++;
        } else if (delayMinutes <= 5) {
          fiveMinutesLate++;
          lateSessions++;
        } else if (delayMinutes <= 7) {
          sevenMinutesLate++;
          lateSessions++;
        } else {
          moreThanSevenMinutesLate++;
          lateSessions++;
        }

        // Calculate attendance rate for this specific session date
        const sessionDate = new Date(dateKey);
        const attendanceRecords =
          await prisma.student_attendance_progress.findMany({
            where: {
              student_id: latestLink.studentid,
              date: {
                gte: new Date(
                  sessionDate.getFullYear(),
                  sessionDate.getMonth(),
                  sessionDate.getDate()
                ),
                lt: new Date(
                  sessionDate.getFullYear(),
                  sessionDate.getMonth(),
                  sessionDate.getDate() + 1
                ),
              },
            },
          });

        const presentCount = attendanceRecords.filter(
          (record) => record.attendance_status === "present"
        ).length;
        const attendanceRate =
          attendanceRecords.length > 0
            ? presentCount / attendanceRecords.length
            : 0;

        totalAttendanceRate += attendanceRate;
        totalStudents++;

        // Add to recent performance (last 5 sessions)
        if (recentPerformance.length < 5) {
          recentPerformance.push({
            date: dateKey,
            is_on_time: delayMinutes <= 0,
            delay_minutes: delayMinutes > 0 ? delayMinutes : 0,
            attendance_rate: attendanceRate,
            lateness_level:
              delayMinutes <= 0
                ? "On Time"
                : delayMinutes <= 3
                ? "3 Minutes Late"
                : delayMinutes <= 5
                ? "5 Minutes Late"
                : delayMinutes <= 7
                ? "7 Minutes Late"
                : "More than 7 Minutes Late",
          });
        }
      }

      console.log(
        `Ustaz Rating Debug - ${teacher.ustazname}: Processed ${totalSessions} sessions`
      );

      if (totalSessions === 0) continue;

      const averageAttendanceRate =
        totalStudents > 0 ? totalAttendanceRate / totalStudents : 0;

      // Calculate rating score based on new classification
      // 40% for attendance management (on time vs late)
      // 30% for lateness levels (penalty for higher lateness)
      // 30% for attendance rate

      const attendanceManagementScore = (onTimeSessions / totalSessions) * 40;

      // Lateness penalty: 3min=5%, 5min=10%, 7min=15%, >7min=20%
      const latenessPenalty =
        ((threeMinutesLate * 0.05 +
          fiveMinutesLate * 0.1 +
          sevenMinutesLate * 0.15 +
          moreThanSevenMinutesLate * 0.2) /
          totalSessions) *
        30;

      const latenessScore = Math.max(0, 30 - latenessPenalty);
      const attendanceRateScore = averageAttendanceRate * 30;

      const ratingScore = Math.min(
        100,
        attendanceManagementScore + latenessScore + attendanceRateScore
      );

      // Calculate average lateness minutes for better understanding
      const totalLateMinutes =
        threeMinutesLate * 2 +
        fiveMinutesLate * 4 +
        sevenMinutesLate * 6 +
        moreThanSevenMinutesLate * 10; // Approximate averages
      const averageLatenessMinutes =
        lateSessions > 0 ? totalLateMinutes / lateSessions : 0;

      ratings.push({
        ustazid: teacher.ustazid,
        ustazname: teacher.ustazname,
        total_sessions: totalSessions,
        on_time_sessions: onTimeSessions,
        late_sessions: lateSessions,
        absence_sessions: absenceSessions,
        three_minutes_late: threeMinutesLate,
        five_minutes_late: fiveMinutesLate,
        seven_minutes_late: sevenMinutesLate,
        more_than_seven_minutes_late: moreThanSevenMinutesLate,
        total_students: totalStudents,
        average_attendance_rate: averageAttendanceRate,
        rating_score: ratingScore,
        recent_performance: recentPerformance,
        // Add lateness details for better understanding
        lateness_details: {
          average_lateness_minutes:
            Math.round(averageLatenessMinutes * 10) / 10,
          total_late_minutes: totalLateMinutes,
          lateness_breakdown: {
            "0-3 minutes": threeMinutesLate,
            "4-5 minutes": fiveMinutesLate,
            "6-7 minutes": sevenMinutesLate,
            "8+ minutes": moreThanSevenMinutesLate,
          },
        },
      });
    }

    // Sort by rating score (highest first)
    ratings.sort((a, b) => b.rating_score - a.rating_score);

    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Error fetching ustaz ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ustaz ratings" },
      { status: 500 }
    );
  }
}
