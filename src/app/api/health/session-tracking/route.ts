import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    await prisma.$connect();

    // Get basic session statistics
    const [activeSessions, totalSessions, recentSessions] = await Promise.all([
      prisma.wpos_zoom_links.count({
        where: { session_status: "active" },
      }),
      prisma.wpos_zoom_links.count({
        where: { clicked_at: { not: null } },
      }),
      prisma.wpos_zoom_links.count({
        where: {
          clicked_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    // Check for potential issues
    const staleSessions = await prisma.wpos_zoom_links.count({
      where: {
        session_status: "active",
        clicked_at: {
          lt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Older than 2 hours
        },
      },
    });

    const responseTime = Date.now() - startTime;

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      database: {
        connected: true,
        activeSessions,
        totalSessions,
        recentSessions24h: recentSessions,
        staleSessions,
      },
      warnings: [] as string[],
    };

    // Add warnings for potential issues
    if (staleSessions > 0) {
      health.warnings.push(
        `${staleSessions} stale sessions detected (older than 2 hours)`
      );
    }

    if (responseTime > 1000) {
      health.warnings.push(`Slow response time: ${responseTime}ms`);
    }

    if (activeSessions > 1000) {
      health.warnings.push(`High number of active sessions: ${activeSessions}`);
    }

    // Determine overall health status
    if (health.warnings.length > 0) {
      health.status = "degraded";
    }

    return NextResponse.json(health, {
      status: health.status === "healthy" ? 200 : 206,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
        database: {
          connected: false,
        },
      },
      { status: 503 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
