/**
 * Duration Tracking Service
 *
 * This service handles all business logic related to teacher duration tracking,
 * including calculations, aggregations, and analytics. Use this service layer
 * to maintain consistency across the application.
 */

import { prisma } from "@/lib/prisma";
import {
  MeetingDetails,
  TeacherStatistics,
  OverallStatistics,
  DurationReportResponse,
  DurationFilters,
  SortConfig,
  MeetingQueryResult,
  PunctualityStatus,
  DurationAnalytics as DurationAnalyticsInterface,
  AnalyticsInsight,
  TeacherComparison,
  DurationTrend,
} from "@/types/duration-tracking";

// ============================================================================
// DURATION CALCULATIONS
// ============================================================================

export class DurationCalculator {
  /**
   * Calculate duration in minutes between two dates
   */
  static calculateDuration(
    start: Date | null,
    end: Date | null
  ): number | null {
    if (!start || !end) return null;
    const ms = end.getTime() - start.getTime();
    return Math.round(ms / (1000 * 60));
  }

  /**
   * Calculate punctuality status based on join times
   */
  static calculatePunctuality(
    hostJoinedAt: Date | null,
    studentJoinedAt: Date | null,
    thresholdMinutes: number = 5
  ): PunctualityStatus {
    if (!hostJoinedAt || !studentJoinedAt) return "unknown";

    const diff = studentJoinedAt.getTime() - hostJoinedAt.getTime();
    const diffMinutes = diff / (1000 * 60);

    if (diffMinutes <= thresholdMinutes) return "on_time";
    if (diffMinutes <= 10) return "late";
    return "very_late";
  }

  /**
   * Calculate attendance rate (student duration / teacher duration * 100)
   */
  static calculateAttendanceRate(
    studentDuration: number | null,
    teacherDuration: number | null
  ): number {
    if (!studentDuration || !teacherDuration || teacherDuration === 0) return 0;
    return Math.round((studentDuration / teacherDuration) * 100);
  }

  /**
   * Convert minutes to hours (rounded to 1 decimal)
   */
  static minutesToHours(minutes: number): number {
    return Math.round((minutes / 60) * 10) / 10;
  }

  /**
   * Calculate time difference between teacher and student durations
   */
  static calculateTimeDifference(
    teacherDuration: number | null,
    studentDuration: number | null
  ): number {
    if (!teacherDuration || !studentDuration) return 0;
    return Math.abs(teacherDuration - studentDuration);
  }
}

// ============================================================================
// DATA AGGREGATION
// ============================================================================

export class DurationAggregator {
  /**
   * Transform database meeting to MeetingDetails
   */
  static transformMeeting(meeting: MeetingQueryResult): MeetingDetails {
    // Use zoom_actual_duration if available, otherwise use teacher duration as fallback
    const totalDuration =
      meeting.zoom_actual_duration || meeting.teacher_duration_minutes || null;

    return {
      id: meeting.id,
      zoomMeetingId: meeting.zoom_meeting_id,
      date: meeting.sent_time || new Date(),
      studentName: meeting.wpos_wpdatatable_23?.name || null,
      totalDuration: totalDuration,
      teacherDuration: meeting.teacher_duration_minutes,
      studentDuration: meeting.student_duration_minutes,
      status: meeting.session_status as any,
      createdViaApi: meeting.created_via_api,
      topic: meeting.meeting_topic,
      hostJoinedAt: meeting.host_joined_at,
      hostLeftAt: meeting.host_left_at,
      studentJoinedAt: meeting.student_joined_at,
      studentLeftAt: meeting.student_left_at,
      punctuality: DurationCalculator.calculatePunctuality(
        meeting.host_joined_at,
        meeting.student_joined_at
      ),
      completionRate: DurationCalculator.calculateAttendanceRate(
        meeting.student_duration_minutes,
        meeting.teacher_duration_minutes
      ),
      timeDifference: DurationCalculator.calculateTimeDifference(
        meeting.teacher_duration_minutes,
        meeting.student_duration_minutes
      ),
    };
  }

  /**
   * Aggregate meetings by teacher
   */
  static aggregateByTeacher(
    meetings: MeetingQueryResult[]
  ): Map<string, TeacherStatistics> {
    const teacherMap = new Map<string, TeacherStatistics>();

    meetings.forEach((meeting) => {
      const teacherId = meeting.ustazid || "unknown";

      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacherId,
          teacherName: meeting.wpos_wpdatatable_24?.ustazname || "Unknown",
          totalMeetings: 0,
          completedMeetings: 0,
          activeMeetings: 0,
          totalMinutes: 0,
          totalHours: 0,
          teacherTotalMinutes: 0,
          studentTotalMinutes: 0,
          averageDuration: 0,
          averageTeacherDuration: 0,
          averageStudentDuration: 0,
          attendanceRate: 0,
          punctualityRate: 0,
          meetings: [],
        });
      }

      const stats = teacherMap.get(teacherId)!;
      stats.totalMeetings++;

      const teacherDuration = meeting.teacher_duration_minutes || 0;
      const studentDuration = meeting.student_duration_minutes || 0;
      // Use zoom_actual_duration if available, otherwise use teacher duration as fallback
      const duration = meeting.zoom_actual_duration || teacherDuration || 0;

      if (meeting.session_status === "ended" && duration > 0) {
        stats.completedMeetings++;
        stats.totalMinutes += duration;

        if (teacherDuration > 0) {
          stats.teacherTotalMinutes += teacherDuration;
        }
        if (studentDuration > 0) {
          stats.studentTotalMinutes += studentDuration;
        }
      } else if (meeting.session_status === "active") {
        stats.activeMeetings++;
      }

      stats.meetings.push(this.transformMeeting(meeting));
    });

    // Calculate averages and rates
    teacherMap.forEach((stats) => {
      this.calculateTeacherMetrics(stats);
    });

    return teacherMap;
  }

  /**
   * Calculate all metrics for a teacher
   */
  static calculateTeacherMetrics(stats: TeacherStatistics): void {
    stats.totalHours = DurationCalculator.minutesToHours(stats.totalMinutes);

    if (stats.completedMeetings > 0) {
      stats.averageDuration = Math.round(
        stats.totalMinutes / stats.completedMeetings
      );
      stats.averageTeacherDuration = Math.round(
        stats.teacherTotalMinutes / stats.completedMeetings
      );
      stats.averageStudentDuration = Math.round(
        stats.studentTotalMinutes / stats.completedMeetings
      );
      stats.attendanceRate = DurationCalculator.calculateAttendanceRate(
        stats.studentTotalMinutes,
        stats.teacherTotalMinutes
      );
    }

    // Calculate punctuality rate
    const completedMeetingsWithTimestamps = stats.meetings.filter(
      (m) => m.status === "ended" && m.hostJoinedAt && m.studentJoinedAt
    );

    if (completedMeetingsWithTimestamps.length > 0) {
      const onTimeMeetings = completedMeetingsWithTimestamps.filter(
        (m) => m.punctuality === "on_time"
      ).length;
      stats.punctualityRate = Math.round(
        (onTimeMeetings / completedMeetingsWithTimestamps.length) * 100
      );
    }
  }

  /**
   * Calculate overall statistics
   */
  static calculateOverallStats(
    teachers: TeacherStatistics[]
  ): OverallStatistics {
    const stats: OverallStatistics = {
      totalTeachers: teachers.length,
      totalMeetings: 0,
      totalCompletedMeetings: 0,
      totalActiveMeetings: 0,
      totalMinutes: 0,
      totalHours: 0,
      totalTeacherMinutes: 0,
      totalStudentMinutes: 0,
      averageDurationPerMeeting: 0,
      averageTeacherDuration: 0,
      averageStudentDuration: 0,
      overallAttendanceRate: 0,
      overallPunctualityRate: 0,
    };

    teachers.forEach((teacher) => {
      stats.totalMeetings += teacher.totalMeetings;
      stats.totalCompletedMeetings += teacher.completedMeetings;
      stats.totalActiveMeetings += teacher.activeMeetings;
      stats.totalMinutes += teacher.totalMinutes;
      stats.totalTeacherMinutes += teacher.teacherTotalMinutes;
      stats.totalStudentMinutes += teacher.studentTotalMinutes;
    });

    stats.totalHours = DurationCalculator.minutesToHours(stats.totalMinutes);

    if (stats.totalCompletedMeetings > 0) {
      stats.averageDurationPerMeeting = Math.round(
        stats.totalMinutes / stats.totalCompletedMeetings
      );
      stats.averageTeacherDuration = Math.round(
        stats.totalTeacherMinutes / stats.totalCompletedMeetings
      );
      stats.averageStudentDuration = Math.round(
        stats.totalStudentMinutes / stats.totalCompletedMeetings
      );
      stats.overallAttendanceRate = DurationCalculator.calculateAttendanceRate(
        stats.totalStudentMinutes,
        stats.totalTeacherMinutes
      );
    }

    // Calculate overall punctuality rate
    if (teachers.length > 0) {
      const totalPunctuality = teachers.reduce(
        (sum, t) => sum + t.punctualityRate,
        0
      );
      stats.overallPunctualityRate = Math.round(
        totalPunctuality / teachers.length
      );
    }

    return stats;
  }
}

// ============================================================================
// DATA FILTERING
// ============================================================================

export class DurationFilter {
  /**
   * Apply filters to meetings
   */
  static applyFilters(
    meetings: MeetingQueryResult[],
    filters: DurationFilters
  ): MeetingQueryResult[] {
    return meetings.filter((meeting) => {
      // Teacher filter
      if (filters.teacherId && meeting.ustazid !== filters.teacherId) {
        return false;
      }

      // Student filter
      if (filters.studentId && meeting.studentid !== filters.studentId) {
        return false;
      }

      // Date range filter
      if (filters.startDate && meeting.sent_time) {
        if (meeting.sent_time < filters.startDate) {
          return false;
        }
      }
      if (filters.endDate && meeting.sent_time) {
        if (meeting.sent_time > filters.endDate) {
          return false;
        }
      }

      // Status filter
      if (filters.status && meeting.session_status !== filters.status) {
        return false;
      }

      // Duration filter
      if (filters.minDuration && meeting.zoom_actual_duration) {
        if (meeting.zoom_actual_duration < filters.minDuration) {
          return false;
        }
      }
      if (filters.maxDuration && meeting.zoom_actual_duration) {
        if (meeting.zoom_actual_duration > filters.maxDuration) {
          return false;
        }
      }

      // API creation filter
      if (
        filters.createdViaApi !== undefined &&
        meeting.created_via_api !== filters.createdViaApi
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort teachers by specified field
   */
  static sortTeachers(
    teachers: TeacherStatistics[],
    sortConfig: SortConfig
  ): TeacherStatistics[] {
    const sorted = [...teachers].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortConfig.field) {
        case "teacherName":
          aValue = a.teacherName;
          bValue = b.teacherName;
          break;
        case "totalMeetings":
          aValue = a.totalMeetings;
          bValue = b.totalMeetings;
          break;
        case "totalHours":
          aValue = a.totalHours;
          bValue = b.totalHours;
          break;
        case "averageDuration":
          aValue = a.averageDuration;
          bValue = b.averageDuration;
          break;
        case "attendanceRate":
          aValue = a.attendanceRate;
          bValue = b.attendanceRate;
          break;
        case "punctualityRate":
          aValue = a.punctualityRate;
          bValue = b.punctualityRate;
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.order === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.order === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export class DurationAnalytics {
  /**
   * Generate insights from teacher statistics
   */
  static generateInsights(
    teachers: TeacherStatistics[],
    overallStats: OverallStatistics
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Low attendance insight
    const lowAttendanceTeachers = teachers.filter(
      (t) => t.attendanceRate < 80 && t.completedMeetings >= 5
    );
    if (lowAttendanceTeachers.length > 0) {
      insights.push({
        type: "low_attendance",
        severity: "warning",
        title: "Low Student Attendance",
        description: `${lowAttendanceTeachers.length} teacher(s) have student attendance below 80%`,
        affectedTeachers: lowAttendanceTeachers.map((t) => t.teacherId),
        recommendation:
          "Review meeting schedules and student engagement strategies",
      });
    }

    // Frequent lateness insight
    const lateTeachers = teachers.filter(
      (t) => t.punctualityRate < 60 && t.completedMeetings >= 5
    );
    if (lateTeachers.length > 0) {
      insights.push({
        type: "frequent_lateness",
        severity: "warning",
        title: "Frequent Student Lateness",
        description: `${lateTeachers.length} teacher(s) have students joining late frequently`,
        affectedTeachers: lateTeachers.map((t) => t.teacherId),
        recommendation:
          "Send earlier reminders or review meeting times with students",
      });
    }

    // Short sessions insight
    const shortSessionTeachers = teachers.filter(
      (t) => t.averageTeacherDuration < 30 && t.completedMeetings >= 5
    );
    if (shortSessionTeachers.length > 0) {
      insights.push({
        type: "short_sessions",
        severity: "warning",
        title: "Short Teaching Sessions",
        description: `${shortSessionTeachers.length} teacher(s) have average session duration below 30 minutes`,
        affectedTeachers: shortSessionTeachers.map((t) => t.teacherId),
        recommendation: "Review if sessions are ending prematurely",
      });
    }

    // High performance insight
    const highPerformanceTeachers = teachers.filter(
      (t) =>
        t.attendanceRate >= 95 &&
        t.punctualityRate >= 90 &&
        t.completedMeetings >= 10
    );
    if (highPerformanceTeachers.length > 0) {
      insights.push({
        type: "high_performance",
        severity: "info",
        title: "Excellent Performance",
        description: `${highPerformanceTeachers.length} teacher(s) have excellent attendance and punctuality rates`,
        affectedTeachers: highPerformanceTeachers.map((t) => t.teacherId),
        recommendation: "Consider these teachers as best practice examples",
      });
    }

    return insights;
  }

  /**
   * Compare teachers and generate rankings
   */
  static compareTeachers(teachers: TeacherStatistics[]): TeacherComparison[] {
    // Calculate performance scores
    const teachersWithScores = teachers
      .filter((t) => t.completedMeetings >= 3) // Minimum 3 meetings for comparison
      .map((teacher) => {
        const score = this.calculatePerformanceScore(teacher);
        const strengths: string[] = [];
        const improvements: string[] = [];

        // Identify strengths
        if (teacher.attendanceRate >= 95) {
          strengths.push("High student attendance");
        }
        if (teacher.punctualityRate >= 90) {
          strengths.push("Excellent punctuality");
        }
        if (teacher.averageTeacherDuration >= 45) {
          strengths.push("Full-length sessions");
        }
        if (teacher.totalMeetings >= 20) {
          strengths.push("Consistent teaching schedule");
        }

        // Identify improvements
        if (teacher.attendanceRate < 85) {
          improvements.push("Improve student attendance");
        }
        if (teacher.punctualityRate < 70) {
          improvements.push("Address student lateness");
        }
        if (teacher.averageTeacherDuration < 35) {
          improvements.push("Extend session durations");
        }

        return {
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          performanceScore: score,
          rank: 0, // Will be set after sorting
          strengths,
          improvements,
        };
      });

    // Sort by score and assign ranks
    teachersWithScores.sort((a, b) => b.performanceScore - a.performanceScore);
    teachersWithScores.forEach((teacher, index) => {
      teacher.rank = index + 1;
    });

    return teachersWithScores;
  }

  /**
   * Calculate performance score (0-100)
   */
  private static calculatePerformanceScore(teacher: TeacherStatistics): number {
    const weights = {
      attendance: 0.4,
      punctuality: 0.3,
      duration: 0.2,
      consistency: 0.1,
    };

    const attendanceScore = teacher.attendanceRate;
    const punctualityScore = teacher.punctualityRate;

    // Duration score: normalize 45 min as 100%
    const durationScore = Math.min(
      (teacher.averageTeacherDuration / 45) * 100,
      100
    );

    // Consistency score: based on completed meetings
    const consistencyScore = Math.min(
      (teacher.completedMeetings / 20) * 100,
      100
    );

    const totalScore =
      attendanceScore * weights.attendance +
      punctualityScore * weights.punctuality +
      durationScore * weights.duration +
      consistencyScore * weights.consistency;

    return Math.round(totalScore);
  }
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class DurationService {
  /**
   * Fetch meetings from database with filters
   */
  static async fetchMeetings(
    startDate: Date,
    endDate: Date,
    filters?: Partial<DurationFilters>
  ): Promise<MeetingQueryResult[]> {
    const whereClause: any = {
      sent_time: {
        gte: startDate,
        lte: endDate,
      },
      // Include both ended and active meetings to show current sessions
      session_status: {
        in: ["ended", "active"],
      },
    };

    // Apply additional filters
    if (filters?.teacherId) {
      whereClause.ustazid = filters.teacherId;
    }
    if (filters?.studentId) {
      whereClause.studentid = filters.studentId;
    }
    if (filters?.status) {
      whereClause.session_status = filters.status; // Override if specific status requested
    }
    if (filters?.createdViaApi !== undefined) {
      whereClause.created_via_api = filters.createdViaApi;
    }

    const meetings = (await prisma.wpos_zoom_links.findMany({
      where: whereClause,
      select: {
        id: true,
        ustazid: true,
        studentid: true,
        sent_time: true,
        session_status: true,
        created_via_api: true,
        session_ended_at: true,
        host_joined_at: true,
        host_left_at: true,
        student_joined_at: true,
        student_left_at: true,
        teacher_duration_minutes: true,
        student_duration_minutes: true,
        wpos_wpdatatable_23: {
          select: {
            name: true,
          },
        },
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: {
        sent_time: "desc",
      },
      take: 1000, // Limit to 1000 most recent meetings for performance
    })) as any;

    return meetings;
  }

  /**
   * Generate complete duration report
   */
  static async generateReport(
    startDate: Date,
    endDate: Date,
    filters?: Partial<DurationFilters>,
    sortConfig?: SortConfig
  ): Promise<DurationReportResponse> {
    // Fetch meetings
    let meetings = await this.fetchMeetings(startDate, endDate, filters);

    // Apply additional filters
    if (filters) {
      meetings = DurationFilter.applyFilters(
        meetings,
        filters as DurationFilters
      );
    }

    // Aggregate by teacher
    const teacherMap = DurationAggregator.aggregateByTeacher(meetings);
    let teachers = Array.from(teacherMap.values());

    // Apply sorting
    if (sortConfig) {
      teachers = DurationFilter.sortTeachers(teachers, sortConfig);
    } else {
      // Default sort by total hours
      teachers.sort((a, b) => b.totalHours - a.totalHours);
    }

    // Calculate overall stats
    const overallStats = DurationAggregator.calculateOverallStats(teachers);

    const month = `${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1
    ).padStart(2, "0")}`;

    return {
      month,
      overallStats,
      teachers,
    };
  }

  /**
   * Generate analytics for a period
   */
  static async generateAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<DurationAnalytics> {
    const report = await this.generateReport(startDate, endDate);

    const insights = DurationAnalytics.generateInsights(
      report.teachers,
      report.overallStats
    );

    const comparisons = DurationAnalytics.compareTeachers(report.teachers);

    // For trends, we'd need historical data - placeholder for now
    const trends: DurationTrend[] = [];

    return {
      trends,
      insights,
      comparisons,
    };
  }
}
