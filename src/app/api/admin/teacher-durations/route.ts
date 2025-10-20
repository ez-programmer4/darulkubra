import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DurationService } from "@/lib/duration-service";
import { DurationExportService } from "@/lib/duration-export";
import {
  DurationErrorHandler,
  ErrorFactory,
  ValidationHelper,
  PerformanceMonitor,
} from "@/lib/duration-error-handler";
import { SortConfig, DurationFilters } from "@/types/duration-tracking";
import { getEthiopianTime } from "@/lib/ethiopian-time";

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
    // Use Ethiopian local time since we store times in UTC+3
    const now = getEthiopianTime();
    const targetDate = monthParam ? new Date(monthParam + "-01") : now;

    // Manually create Ethiopian month boundaries
    // Database stores naive datetime (no timezone), so we need matching boundaries
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // Start of month in Ethiopian time: YYYY-MM-01 00:00:00
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);

    // End of month in Ethiopian time: YYYY-MM-DD 23:59:59
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    console.log(`📅 Date range for teacher durations (Ethiopian time):`);
    console.log(`  Ethiopian time now: ${now.toISOString()}`);
    console.log(`  Month: ${year}-${String(month + 1).padStart(2, "0")}`);
    console.log(
      `  Start date: ${startDate.toISOString()} (${startDate.toLocaleString()})`
    );
    console.log(
      `  End date: ${endDate.toISOString()} (${endDate.toLocaleString()})`
    );

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

    // Set timeout for slow queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(new Error("Query timeout - please try a smaller date range")),
        25000
      );
    });

    // Generate report with timeout protection
    const reportPromise = DurationService.generateReport(
      startDate,
      endDate,
      filters,
      sortConfig
    );

    const report = (await Promise.race([reportPromise, timeoutPromise])) as any;

    monitor.end();

    // Handle export formats
    if (exportFormat && exportFormat !== "json") {
      const exportResult = await DurationExportService.export(report, {
        format: exportFormat,
      });

      // Convert Buffer to string if needed
      const content =
        typeof exportResult.content === "string"
          ? exportResult.content
          : exportResult.content.toString("utf-8");

      return new NextResponse(content, {
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
