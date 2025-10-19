import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { startOfMonth, endOfMonth } from "date-fns";
import { DurationService } from "@/lib/duration-service";
import { DurationExportService } from "@/lib/duration-export";
import {
  DurationErrorHandler,
  ErrorFactory,
  ValidationHelper,
  PerformanceMonitor,
} from "@/lib/duration-error-handler";
import { SortConfig, DurationFilters } from "@/types/duration-tracking";

/**
 * Admin endpoint to view all teachers' meeting durations
 * GET /api/admin/teacher-durations?month=2025-10&teacherId=123&sort=totalHours&order=desc&format=json
 */
export async function GET(req: NextRequest) {
  const monitor = new PerformanceMonitor("GET /api/admin/teacher-durations");

  try {
    // Authentication & Authorization
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "admin") {
      throw ErrorFactory.unauthorized("Admin access required");
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // YYYY-MM format
    const teacherId = searchParams.get("teacherId");
    const studentId = searchParams.get("studentId");
    const sortField = searchParams.get("sort") as any;
    const sortOrder = searchParams.get("order") as "asc" | "desc";
    const exportFormat = searchParams.get("format") as any;

    // Validate month format
    if (monthParam) {
      const validation = ValidationHelper.validateMonthFormat(monthParam);
      if (!validation.valid) {
        throw validation.error;
      }
    }

    // Determine date range
    const now = new Date();
    const targetDate = monthParam ? new Date(monthParam + "-01") : now;
    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);

    // Build filters
    const filters: Partial<DurationFilters> = {};
    if (teacherId) filters.teacherId = teacherId;
    if (studentId) filters.studentId = parseInt(studentId);

    // Build sort config
    const sortConfig: SortConfig | undefined = sortField
      ? {
          field: sortField,
          order: sortOrder || "desc",
        }
      : undefined;

    // Generate report - NO CACHE - Always fresh data
    const report = await DurationService.generateReport(
      startDate,
      endDate,
      filters,
      sortConfig
    );

    monitor.end();

    // Handle export formats
    if (exportFormat && exportFormat !== "json") {
      const exportResult = await DurationExportService.export(report, {
        format: exportFormat,
      });

      return new NextResponse(exportResult.content, {
        headers: {
          "Content-Type": exportResult.mimeType,
          "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
        },
      });
    }

    // Return JSON response
    return NextResponse.json(report);
  } catch (error) {
    monitor.end();
    return DurationErrorHandler.handle(error);
  }
}
