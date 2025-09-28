import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const from = parseISO(startDate);
    const to = parseISO(endDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range. Use UTC ISO format (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const teacherId = session.id;

    // Get detailed records for the period
    const [latenessRecords, absenceRecords, bonusRecords, zoomLinks] =
      await Promise.all([
        // Lateness records
        prisma.latenessrecord.findMany({
          where: {
            teacherId,
            classDate: {
              gte: from,
              lte: to,
            },
          },
          include: {
            wpos_wpdatatable_24: {
              select: { ustazname: true },
            },
          },
          orderBy: { classDate: "desc" },
        }),

        // Absence records
        prisma.absencerecord.findMany({
          where: {
            teacherId,
            classDate: {
              gte: from,
              lte: to,
            },
          },
          orderBy: { classDate: "desc" },
        }),

        // Bonus records
        prisma.bonusrecord.findMany({
          where: {
            teacherId,
            createdAt: {
              gte: from,
              lte: to,
            },
          },
          orderBy: { createdAt: "desc" },
        }),

        // Zoom links
        prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacherId,
            sent_time: {
              gte: from,
              lte: to,
            },
          },
          include: {
            wpos_wpdatatable_23: {
              select: {
                wdt_ID: true,
                name: true,
                package: true,
              },
            },
          },
          orderBy: { sent_time: "desc" },
        }),
      ]);

    // Get quality assessment bonuses
    const qualityBonuses = await prisma.qualityassessment.findMany({
      where: {
        teacherId,
        weekStart: {
          gte: from,
          lte: to,
        },
        managerApproved: true,
      },
      select: {
        weekStart: true,
        bonusAwarded: true,
        supervisorFeedback: true,
        overrideNotes: true,
      },
      orderBy: { weekStart: "desc" },
    });

    const details = {
      latenessRecords,
      absenceRecords,
      bonusRecords,
      qualityBonuses,
      zoomLinks,
      period: {
        startDate: from.toISOString().split("T")[0],
        endDate: to.toISOString().split("T")[0],
      },
    };

    return NextResponse.json(details);
  } catch (error: any) {
    console.error("Error in teacher salary details API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
