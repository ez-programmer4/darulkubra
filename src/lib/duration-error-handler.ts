/**
 * Duration Tracking Error Handler
 *
 * Centralized error handling and logging for duration tracking functionality.
 * Provides consistent error responses and detailed logging for debugging.
 */

import { NextResponse } from "next/server";

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Data Validation
  INVALID_PARAMS = "INVALID_PARAMS",
  INVALID_DATE_RANGE = "INVALID_DATE_RANGE",
  INVALID_FILTER = "INVALID_FILTER",
  INVALID_SORT_FIELD = "INVALID_SORT_FIELD",

  // Data Access
  DATA_NOT_FOUND = "DATA_NOT_FOUND",
  TEACHER_NOT_FOUND = "TEACHER_NOT_FOUND",
  MEETING_NOT_FOUND = "MEETING_NOT_FOUND",

  // Database
  DATABASE_ERROR = "DATABASE_ERROR",
  DATABASE_TIMEOUT = "DATABASE_TIMEOUT",
  DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",

  // Cache
  CACHE_ERROR = "CACHE_ERROR",

  // Export
  EXPORT_ERROR = "EXPORT_ERROR",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",

  // External Services
  ZOOM_API_ERROR = "ZOOM_API_ERROR",
  NOTIFICATION_ERROR = "NOTIFICATION_ERROR",

  // General
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class DurationError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = "DurationError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

export class ErrorFactory {
  static unauthorized(message: string = "Unauthorized"): DurationError {
    return new DurationError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = "Forbidden"): DurationError {
    return new DurationError(ErrorCode.FORBIDDEN, message, 403);
  }

  static invalidParams(
    message: string = "Invalid parameters",
    details?: any
  ): DurationError {
    return new DurationError(ErrorCode.INVALID_PARAMS, message, 400, details);
  }

  static invalidDateRange(
    message: string = "Invalid date range"
  ): DurationError {
    return new DurationError(ErrorCode.INVALID_DATE_RANGE, message, 400);
  }

  static dataNotFound(
    resource: string = "Data",
    id?: string | number
  ): DurationError {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    return new DurationError(ErrorCode.DATA_NOT_FOUND, message, 404);
  }

  static teacherNotFound(teacherId: string): DurationError {
    return new DurationError(
      ErrorCode.TEACHER_NOT_FOUND,
      `Teacher ${teacherId} not found`,
      404
    );
  }

  static databaseError(
    message: string = "Database error",
    details?: any
  ): DurationError {
    return new DurationError(ErrorCode.DATABASE_ERROR, message, 500, details);
  }

  static cacheError(
    message: string = "Cache error",
    details?: any
  ): DurationError {
    return new DurationError(ErrorCode.CACHE_ERROR, message, 500, details);
  }

  static exportError(
    message: string = "Export failed",
    details?: any
  ): DurationError {
    return new DurationError(ErrorCode.EXPORT_ERROR, message, 500, details);
  }

  static unsupportedFormat(format: string): DurationError {
    return new DurationError(
      ErrorCode.UNSUPPORTED_FORMAT,
      `Unsupported format: ${format}`,
      400
    );
  }

  static internalError(
    message: string = "Internal server error",
    details?: any
  ): DurationError {
    return new DurationError(ErrorCode.INTERNAL_ERROR, message, 500, details);
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

export class DurationErrorHandler {
  /**
   * Handle error and return appropriate NextResponse
   */
  static handle(error: unknown): NextResponse {
    // Log the error
    this.log(error);

    // Handle DurationError
    if (error instanceof DurationError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: error.timestamp,
          },
        },
        { status: error.statusCode }
      );
    }

    // Handle standard Error
    if (error instanceof Error) {
      const isDevelopment = process.env.NODE_ENV === "development";

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: isDevelopment
              ? error.message
              : "An internal error occurred",
            ...(isDevelopment && { stack: error.stack }),
            timestamp: new Date(),
          },
        },
        { status: 500 }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.UNKNOWN_ERROR,
          message: "An unknown error occurred",
          timestamp: new Date(),
        },
      },
      { status: 500 }
    );
  }

  /**
   * Log error with appropriate level
   */
  static log(error: unknown): void {
    const isDevelopment = process.env.NODE_ENV === "development";

    if (error instanceof DurationError) {
      const logLevel = this.getLogLevel(error.statusCode);
      const logMessage = `[${error.code}] ${error.message}`;
      const logData = {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: isDevelopment ? error.stack : undefined,
        timestamp: error.timestamp,
      };

      switch (logLevel) {
        case "error":
          console.error(logMessage, logData);
          break;
        case "warn":
          console.warn(logMessage, logData);
          break;
        case "info":
          console.info(logMessage, logData);
          break;
      }
    } else if (error instanceof Error) {
      console.error("Unhandled error:", {
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
      });
    } else {
      console.error("Unknown error:", error);
    }
  }

  /**
   * Get log level based on status code
   */
  private static getLogLevel(statusCode: number): "error" | "warn" | "info" {
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  /**
   * Wrap async function with error handling
   */
  static async wrap<T>(
    fn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DurationError) {
        throw error;
      }

      if (error instanceof Error) {
        throw ErrorFactory.internalError(errorMessage || error.message, {
          originalError: error.message,
        });
      }

      throw ErrorFactory.internalError(
        errorMessage || "Unknown error occurred"
      );
    }
  }

  /**
   * Validate and throw if invalid
   */
  static validate(
    condition: boolean,
    error: DurationError | (() => DurationError)
  ): void {
    if (!condition) {
      throw typeof error === "function" ? error() : error;
    }
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export class ValidationHelper {
  /**
   * Validate date range
   */
  static validateDateRange(
    startDate: Date,
    endDate: Date
  ): { valid: boolean; error?: DurationError } {
    if (startDate > endDate) {
      return {
        valid: false,
        error: ErrorFactory.invalidDateRange(
          "Start date must be before end date"
        ),
      };
    }

    // Check if date range is reasonable (e.g., not more than 1 year)
    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return {
        valid: false,
        error: ErrorFactory.invalidDateRange("Date range cannot exceed 1 year"),
      };
    }

    return { valid: true };
  }

  /**
   * Validate month format (YYYY-MM)
   */
  static validateMonthFormat(month: string): {
    valid: boolean;
    error?: DurationError;
  } {
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!monthRegex.test(month)) {
      return {
        valid: false,
        error: ErrorFactory.invalidParams(
          "Invalid month format. Expected YYYY-MM",
          { month }
        ),
      };
    }

    return { valid: true };
  }

  /**
   * Validate teacher ID
   */
  static validateTeacherId(teacherId: string): {
    valid: boolean;
    error?: DurationError;
  } {
    if (!teacherId || teacherId.trim().length === 0) {
      return {
        valid: false,
        error: ErrorFactory.invalidParams("Teacher ID is required"),
      };
    }

    return { valid: true };
  }

  /**
   * Validate pagination params
   */
  static validatePagination(
    page?: number,
    pageSize?: number
  ): { valid: boolean; error?: DurationError } {
    if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
      return {
        valid: false,
        error: ErrorFactory.invalidParams("Page must be a positive integer"),
      };
    }

    if (
      pageSize !== undefined &&
      (pageSize < 1 || pageSize > 1000 || !Number.isInteger(pageSize))
    ) {
      return {
        valid: false,
        error: ErrorFactory.invalidParams(
          "Page size must be between 1 and 1000"
        ),
      };
    }

    return { valid: true };
  }
}

// ============================================================================
// LOGGER
// ============================================================================

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.log(`[${this.context}] ℹ️ ${message}`, data || "");
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] ⚠️ ${message}`, data || "");
  }

  error(message: string, error?: any): void {
    console.error(`[${this.context}] ❌ ${message}`, error || "");
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${this.context}] 🐛 ${message}`, data || "");
    }
  }

  success(message: string, data?: any): void {
    console.log(`[${this.context}] ✅ ${message}`, data || "");
  }

  performance(operation: string, durationMs: number): void {
    const emoji = durationMs < 100 ? "⚡" : durationMs < 1000 ? "🏃" : "🐌";
    console.log(
      `[${this.context}] ${emoji} ${operation} completed in ${durationMs}ms`
    );
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export class PerformanceMonitor {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(operation: string, context: string = "DurationTracking") {
    this.operation = operation;
    this.logger = new Logger(context);
    this.startTime = Date.now();
  }

  end(data?: any): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.operation, duration);

    if (data) {
      this.logger.debug(`${this.operation} result`, data);
    }

    return duration;
  }

  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    const monitor = new PerformanceMonitor(operation, context);
    const result = await fn();
    monitor.end();
    return result;
  }
}
