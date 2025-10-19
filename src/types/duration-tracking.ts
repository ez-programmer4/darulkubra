/**
 * Duration Tracking Types
 *
 * This file contains all TypeScript types and interfaces for the teacher
 * duration tracking system. Use these types across the application for
 * type safety and consistency.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface MeetingTimestamps {
  hostJoinedAt: Date | null;
  hostLeftAt: Date | null;
  studentJoinedAt: Date | null;
  studentLeftAt: Date | null;
}

export interface MeetingDurations {
  totalDuration: number | null;
  teacherDuration: number | null;
  studentDuration: number | null;
}

export interface MeetingMetadata {
  id: number;
  zoomMeetingId: string | null;
  studentName: string | null;
  date: Date;
  status: SessionStatus;
  createdViaApi: boolean | null;
  topic: string | null;
}

export type SessionStatus = "active" | "ended" | "timeout";

// ============================================================================
// MEETING DETAILS
// ============================================================================

export interface MeetingDetails
  extends MeetingMetadata,
    MeetingTimestamps,
    MeetingDurations {
  // Computed fields
  punctuality?: PunctualityStatus;
  completionRate?: number;
  timeDifference?: number;
}

export type PunctualityStatus = "on_time" | "late" | "very_late" | "unknown";

// ============================================================================
// TEACHER STATISTICS
// ============================================================================

export interface TeacherStatistics {
  teacherId: string;
  teacherName: string;
  totalMeetings: number;
  completedMeetings: number;
  activeMeetings: number;

  // Duration stats
  totalMinutes: number;
  totalHours: number;
  teacherTotalMinutes: number;
  studentTotalMinutes: number;

  // Averages
  averageDuration: number;
  averageTeacherDuration: number;
  averageStudentDuration: number;

  // Attendance metrics
  attendanceRate: number; // percentage
  punctualityRate: number; // percentage

  meetings: MeetingDetails[];
}

// ============================================================================
// OVERALL STATISTICS
// ============================================================================

export interface OverallStatistics {
  totalTeachers: number;
  totalMeetings: number;
  totalCompletedMeetings: number;
  totalActiveMeetings: number;

  // Duration totals
  totalMinutes: number;
  totalHours: number;
  totalTeacherMinutes: number;
  totalStudentMinutes: number;

  // Averages
  averageDurationPerMeeting: number;
  averageTeacherDuration: number;
  averageStudentDuration: number;

  // Rates
  overallAttendanceRate: number;
  overallPunctualityRate: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface DurationReportResponse {
  month: string; // YYYY-MM format
  overallStats: OverallStatistics;
  teachers: TeacherStatistics[];
}

// ============================================================================
// FILTERING & SORTING
// ============================================================================

export interface DurationFilters {
  teacherId?: string;
  studentId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: SessionStatus;
  minDuration?: number;
  maxDuration?: number;
  createdViaApi?: boolean;
}

export type SortField =
  | "teacherName"
  | "totalMeetings"
  | "totalHours"
  | "averageDuration"
  | "attendanceRate"
  | "punctualityRate";

export type SortOrder = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface DurationAnalytics {
  trends: DurationTrend[];
  insights: AnalyticsInsight[];
  comparisons: TeacherComparison[];
}

export interface DurationTrend {
  period: string; // YYYY-MM or YYYY-WW
  totalHours: number;
  averageDuration: number;
  completionRate: number;
  attendanceRate: number;
}

export interface AnalyticsInsight {
  type: InsightType;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affectedTeachers?: string[];
  recommendation?: string;
}

export type InsightType =
  | "low_attendance"
  | "frequent_lateness"
  | "short_sessions"
  | "high_performance"
  | "declining_trend"
  | "inconsistent_schedule";

export interface TeacherComparison {
  teacherId: string;
  teacherName: string;
  performanceScore: number; // 0-100
  rank: number;
  strengths: string[];
  improvements: string[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ExportFormat = "csv" | "excel" | "pdf" | "json";

export interface ExportConfig {
  format: ExportFormat;
  includeCharts?: boolean;
  includeAnalytics?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  teachers?: string[]; // specific teachers to export
}

export interface ExportResult {
  filename: string;
  content: Buffer | string;
  mimeType: string;
  size: number;
}

// ============================================================================
// DATABASE QUERY TYPES
// ============================================================================

export interface MeetingQueryResult {
  id: number;
  ustazid: string | null;
  studentid: number;
  sent_time: Date | null;
  zoom_meeting_id: string | null;
  zoom_actual_duration: number | null;
  session_duration_minutes: number | null;
  session_status: string;
  created_via_api: boolean | null;
  zoom_start_time: Date | null;
  session_ended_at: Date | null;
  host_joined_at: Date | null;
  host_left_at: Date | null;
  student_joined_at: Date | null;
  student_left_at: Date | null;
  teacher_duration_minutes: number | null;
  student_duration_minutes: number | null;
  meeting_topic: string | null;
  wpos_wpdatatable_23: {
    name: string | null;
  } | null;
  wpos_wpdatatable_24: {
    ustazname: string | null;
  } | null;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CachedDurationData {
  data: DurationReportResponse;
  generatedAt: Date;
  expiresAt: Date;
  cacheKey: string;
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  refreshOnAccess?: boolean;
  autoRefresh?: boolean;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface DurationAlert {
  type: "threshold_exceeded" | "anomaly_detected" | "missing_data";
  teacherId: string;
  message: string;
  timestamp: Date;
  severity: "low" | "medium" | "high";
  metadata?: Record<string, any>;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface DurationTrackingConfig {
  // Thresholds
  minSessionDuration: number; // minutes
  maxSessionDuration: number; // minutes
  latenessThreshold: number; // minutes
  earlyLeaveThreshold: number; // minutes

  // Attendance calculation
  attendanceRateWeight: number; // 0-1
  punctualityWeight: number; // 0-1

  // Analytics
  enableTrendAnalysis: boolean;
  enableAnomalyDetection: boolean;

  // Caching
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
