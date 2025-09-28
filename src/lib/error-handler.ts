import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;
}

export class PaymentError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = "PaymentError";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.context = context;
  }
}

export class ValidationError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.isOperational = true;
    this.context = context;
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = "DatabaseError";
    this.statusCode = 500;
    this.isOperational = true;
    this.context = context;
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;

  constructor(
    message: string = "Too many requests",
    context?: Record<string, any>
  ) {
    super(message);
    this.name = "RateLimitError";
    this.statusCode = 429;
    this.isOperational = true;
    this.context = context;
  }
}

export function handleError(error: unknown): NextResponse {
  console.error("Error occurred:", error);

  // Handle known error types
  if (error instanceof PaymentError) {
    return NextResponse.json(
      {
        error: "Payment Error",
        message: error.message,
        context: error.context,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: error.message,
        context: error.context,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof DatabaseError) {
    return NextResponse.json(
      {
        error: "Database Error",
        message: error.message,
        context: error.context,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        error: "Rate Limit Error",
        message: error.message,
        context: error.context,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Invalid input data",
        details: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        return NextResponse.json(
          {
            error: "Database Error",
            message: "Duplicate entry found",
            context: { field: prismaError.meta?.target },
            timestamp: new Date().toISOString(),
          },
          { status: 409 }
        );

      case "P2025":
        return NextResponse.json(
          {
            error: "Database Error",
            message: "Record not found",
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );

      case "P2003":
        return NextResponse.json(
          {
            error: "Database Error",
            message: "Foreign key constraint failed",
            context: { field: prismaError.meta?.field_name },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          {
            error: "Database Error",
            message: "Database operation failed",
            context: { code: prismaError.code },
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: "Unknown Error",
      message: "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

export function logError(error: unknown, context?: Record<string, any>) {
  const errorInfo = {
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  console.error("Error logged:", errorInfo);

  // In production, you might want to send this to an external logging service
  // like Sentry, LogRocket, or CloudWatch
  if (process.env.NODE_ENV === "production") {
    // Send to external logging service
    // await sendToLoggingService(errorInfo);
  }
}

export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  context?: Record<string, any>
) {
  return NextResponse.json(
    {
      error: "Error",
      message,
      context,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export function createSuccessResponse(
  data: any,
  message?: string,
  statusCode: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>
) {
  return NextResponse.json(
    {
      error: "Validation Error",
      message: "Invalid input data",
      details: errors,
      timestamp: new Date().toISOString(),
    },
    { status: 400 }
  );
}

export function createNotFoundErrorResponse(resource: string) {
  return NextResponse.json(
    {
      error: "Not Found",
      message: `${resource} not found`,
      timestamp: new Date().toISOString(),
    },
    { status: 404 }
  );
}

export function createUnauthorizedErrorResponse(
  message: string = "Unauthorized"
) {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message,
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}

export function createForbiddenErrorResponse(message: string = "Forbidden") {
  return NextResponse.json(
    {
      error: "Forbidden",
      message,
      timestamp: new Date().toISOString(),
    },
    { status: 403 }
  );
}

export function createRateLimitErrorResponse(
  retryAfter?: number,
  message: string = "Too many requests"
) {
  const response = NextResponse.json(
    {
      error: "Rate Limit Exceeded",
      message,
      timestamp: new Date().toISOString(),
    },
    { status: 429 }
  );

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString());
  }

  return response;
}

