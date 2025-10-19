/**
 * Duration Tracking Export Service
 *
 * This service handles exporting duration tracking data in various formats
 * (CSV, Excel, JSON). Designed to be extensible for future formats like PDF.
 */

import {
  DurationReportResponse,
  TeacherStatistics,
  MeetingDetails,
  ExportFormat,
  ExportConfig,
  ExportResult,
} from "@/types/duration-tracking";

// ============================================================================
// CSV EXPORT
// ============================================================================

export class CSVExporter {
  /**
   * Generate CSV from duration report
   */
  static generate(data: DurationReportResponse): string {
    const headers = [
      "Teacher ID",
      "Teacher Name",
      "Date",
      "Student Name",
      "Total Duration (min)",
      "Teacher Duration (min)",
      "Student Duration (min)",
      "Teacher Joined",
      "Teacher Left",
      "Student Joined",
      "Student Left",
      "Status",
      "Type",
      "Punctuality",
      "Attendance Rate (%)",
    ];

    const rows = data.teachers.flatMap((teacher) =>
      teacher.meetings.map((meeting) => [
        teacher.teacherId,
        teacher.teacherName,
        this.formatDate(meeting.date),
        meeting.studentName || "Unknown",
        meeting.totalDuration || "",
        meeting.teacherDuration || "",
        meeting.studentDuration || "",
        this.formatDateTime(meeting.hostJoinedAt),
        this.formatDateTime(meeting.hostLeftAt),
        this.formatDateTime(meeting.studentJoinedAt),
        this.formatDateTime(meeting.studentLeftAt),
        meeting.status,
        meeting.createdViaApi ? "Auto" : "Manual",
        meeting.punctuality || "unknown",
        meeting.completionRate || "",
      ])
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => this.escapeCSV(String(cell))).join(",")
      ),
    ].join("\n");

    return csv;
  }

  /**
   * Generate summary CSV (teacher-level only)
   */
  static generateSummary(data: DurationReportResponse): string {
    const headers = [
      "Teacher ID",
      "Teacher Name",
      "Total Meetings",
      "Completed Meetings",
      "Active Meetings",
      "Total Hours",
      "Total Minutes",
      "Avg Duration (min)",
      "Avg Teacher Duration (min)",
      "Avg Student Duration (min)",
      "Attendance Rate (%)",
      "Punctuality Rate (%)",
    ];

    const rows = data.teachers.map((teacher) => [
      teacher.teacherId,
      teacher.teacherName,
      teacher.totalMeetings,
      teacher.completedMeetings,
      teacher.activeMeetings,
      teacher.totalHours,
      teacher.totalMinutes,
      teacher.averageDuration,
      teacher.averageTeacherDuration,
      teacher.averageStudentDuration,
      teacher.attendanceRate,
      teacher.punctualityRate,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => this.escapeCSV(String(cell))).join(",")
      ),
    ].join("\n");

    return csv;
  }

  /**
   * Escape CSV field
   */
  private static escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format date for CSV
   */
  private static formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Format datetime for CSV
   */
  private static formatDateTime(date: Date | null): string {
    return date ? new Date(date).toLocaleString() : "";
  }
}

// ============================================================================
// JSON EXPORT
// ============================================================================

export class JSONExporter {
  /**
   * Generate JSON from duration report
   */
  static generate(data: DurationReportResponse): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate compact JSON (no formatting)
   */
  static generateCompact(data: DurationReportResponse): string {
    return JSON.stringify(data);
  }

  /**
   * Generate JSONL (JSON Lines) format - one object per line
   */
  static generateJSONL(data: DurationReportResponse): string {
    const lines = data.teachers.flatMap((teacher) =>
      teacher.meetings.map((meeting) => ({
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        ...meeting,
      }))
    );

    return lines.map((line) => JSON.stringify(line)).join("\n");
  }
}

// ============================================================================
// EXCEL EXPORT (Placeholder - requires additional library)
// ============================================================================

export class ExcelExporter {
  /**
   * Generate Excel file from duration report
   * Note: This is a placeholder. For full Excel support, install 'exceljs':
   * npm install exceljs
   */
  static async generate(data: DurationReportResponse): Promise<Buffer> {
    // For now, return CSV as fallback
    // In production, use exceljs to create proper Excel files
    const csvContent = CSVExporter.generate(data);
    return Buffer.from(csvContent, "utf-8");
  }

  /**
   * Generate Excel with multiple sheets
   */
  static async generateWithSheets(
    data: DurationReportResponse
  ): Promise<Buffer> {
    // Placeholder for multi-sheet Excel generation
    // Would include: Summary, Details, Analytics, Charts
    const csvContent = CSVExporter.generateSummary(data);
    return Buffer.from(csvContent, "utf-8");
  }
}

// ============================================================================
// PDF EXPORT (Placeholder)
// ============================================================================

export class PDFExporter {
  /**
   * Generate PDF report from duration report
   * Note: This is a placeholder. For full PDF support, install 'pdfkit':
   * npm install pdfkit
   */
  static async generate(data: DurationReportResponse): Promise<Buffer> {
    // Placeholder - would use pdfkit or puppeteer to generate PDF
    const content = `Duration Report - ${data.month}\n\n${JSON.stringify(
      data.overallStats,
      null,
      2
    )}`;
    return Buffer.from(content, "utf-8");
  }
}

// ============================================================================
// MAIN EXPORT SERVICE
// ============================================================================

export class DurationExportService {
  /**
   * Export duration report in specified format
   */
  static async export(
    data: DurationReportResponse,
    config: ExportConfig
  ): Promise<ExportResult> {
    const format = config.format || "csv";
    const filename = this.generateFilename(data.month, format);

    let content: Buffer | string;
    let mimeType: string;

    switch (format) {
      case "csv":
        content = CSVExporter.generate(data);
        mimeType = "text/csv";
        break;

      case "excel":
        content = await ExcelExporter.generate(data);
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;

      case "pdf":
        content = await PDFExporter.generate(data);
        mimeType = "application/pdf";
        break;

      case "json":
        content = JSONExporter.generate(data);
        mimeType = "application/json";
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const size =
      typeof content === "string"
        ? Buffer.byteLength(content, "utf-8")
        : (content as Buffer).length;

    return {
      filename,
      content,
      mimeType,
      size,
    };
  }

  /**
   * Export summary only (teacher-level stats)
   */
  static async exportSummary(
    data: DurationReportResponse,
    format: ExportFormat = "csv"
  ): Promise<ExportResult> {
    const filename = this.generateFilename(data.month, format, "summary");

    let content: Buffer | string;
    let mimeType: string;

    switch (format) {
      case "csv":
        content = CSVExporter.generateSummary(data);
        mimeType = "text/csv";
        break;

      case "json":
        content = JSONExporter.generate({
          ...data,
          teachers: data.teachers.map((t) => ({
            ...t,
            meetings: [], // Exclude meeting details
          })),
        });
        mimeType = "application/json";
        break;

      default:
        throw new Error(`Summary export not supported for format: ${format}`);
    }

    const size =
      typeof content === "string"
        ? Buffer.byteLength(content, "utf-8")
        : (content as Buffer).length;

    return {
      filename,
      content,
      mimeType,
      size,
    };
  }

  /**
   * Export for specific teacher
   */
  static async exportTeacher(
    data: DurationReportResponse,
    teacherId: string,
    format: ExportFormat = "csv"
  ): Promise<ExportResult> {
    const teacher = data.teachers.find((t) => t.teacherId === teacherId);

    if (!teacher) {
      throw new Error(`Teacher ${teacherId} not found in report`);
    }

    const filteredData: DurationReportResponse = {
      ...data,
      teachers: [teacher],
      overallStats: {
        ...data.overallStats,
        totalTeachers: 1,
        totalMeetings: teacher.totalMeetings,
        totalCompletedMeetings: teacher.completedMeetings,
        totalHours: teacher.totalHours,
        totalMinutes: teacher.totalMinutes,
        totalTeacherMinutes: teacher.teacherTotalMinutes,
        totalStudentMinutes: teacher.studentTotalMinutes,
        averageDurationPerMeeting: teacher.averageDuration,
        averageTeacherDuration: teacher.averageTeacherDuration,
        averageStudentDuration: teacher.averageStudentDuration,
        overallAttendanceRate: teacher.attendanceRate,
        overallPunctualityRate: teacher.punctualityRate,
        totalActiveMeetings: teacher.activeMeetings,
      },
    };

    return this.export(filteredData, { format });
  }

  /**
   * Generate filename
   */
  private static generateFilename(
    month: string,
    format: ExportFormat,
    suffix?: string
  ): string {
    const parts = ["teacher-durations", month];
    if (suffix) parts.push(suffix);
    return `${parts.join("-")}.${format}`;
  }

  /**
   * Get supported formats
   */
  static getSupportedFormats(): ExportFormat[] {
    return ["csv", "json", "excel", "pdf"];
  }

  /**
   * Validate export config
   */
  static validateConfig(config: ExportConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.getSupportedFormats().includes(config.format)) {
      errors.push(`Unsupported format: ${config.format}`);
    }

    if (config.dateRange) {
      if (config.dateRange.start > config.dateRange.end) {
        errors.push("Start date must be before end date");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create download response for Next.js API routes
 */
export function createDownloadResponse(result: ExportResult): Response {
  const headers = new Headers();
  headers.set("Content-Type", result.mimeType);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`
  );
  headers.set("Content-Length", result.size.toString());

  const content =
    typeof result.content === "string"
      ? result.content
      : result.content.toString("utf-8");

  return new Response(content, { headers });
}

/**
 * Stream large exports
 */
export async function* streamExport(
  data: DurationReportResponse,
  format: ExportFormat,
  chunkSize: number = 1000
): AsyncGenerator<string> {
  if (format !== "csv" && format !== "json") {
    throw new Error("Streaming only supported for CSV and JSON formats");
  }

  if (format === "csv") {
    // Stream CSV headers first
    yield CSVExporter.generate({ ...data, teachers: [] }).split("\n")[0] + "\n";

    // Stream rows in chunks
    for (let i = 0; i < data.teachers.length; i += chunkSize) {
      const chunk = data.teachers.slice(i, i + chunkSize);
      const chunkData = { ...data, teachers: chunk };
      const csvLines = CSVExporter.generate(chunkData).split("\n").slice(1);
      yield csvLines.join("\n") + "\n";
    }
  } else if (format === "json") {
    // Stream JSON Lines
    for (const teacher of data.teachers) {
      for (const meeting of teacher.meetings) {
        yield JSON.stringify({
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          ...meeting,
        }) + "\n";
      }
    }
  }
}
