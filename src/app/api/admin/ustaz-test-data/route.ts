import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

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
    toDate.setHours(23, 59, 59, 999);

    // Get sample zoom links with student data
    const sampleZoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        sent_time: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true,
            name: true,
            u_control: true,
            occupiedTimes: {
              select: {
                time_slot: true,
              },
            },
          },
        },
        wpos_wpdatatable_24: {
          select: {
            ustazid: true,
            ustazname: true,
          },
        },
      },
      take: 10,
      orderBy: {
        sent_time: "desc",
      },
    });

    // Get teachers with their zoom links count
    const teachersWithLinks = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
        _count: {
          select: {
            zoom_links: {
              where: {
                sent_time: {
                  gte: fromDate,
                  lte: toDate,
                },
              },
            },
          },
        },
      },
    });

    // Get students with their scheduled times
    const studentsWithTimes = await prisma.wpos_wpdatatable_23.findMany({
      include: {
        occupiedTimes: {
          select: {
            time_slot: true,
          },
        },
      },
      take: 10,
    });

    return NextResponse.json({
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      sampleZoomLinks: sampleZoomLinks.map((link) => ({
        id: link.id,
        sent_time: link.sent_time?.toISOString(),
        student: {
          id: link.wpos_wpdatatable_23.wdt_ID,
          name: link.wpos_wpdatatable_23.name,
          selectedTime:
            link.wpos_wpdatatable_23.occupiedTimes?.[0]?.time_slot ||
            "Not specified",
          control: link.wpos_wpdatatable_23.u_control,
        },
        teacher: {
          ustazid: link.wpos_wpdatatable_24?.ustazid,
          ustazname: link.wpos_wpdatatable_24?.ustazname,
        },
      })),
      teachersWithLinks,
      studentsWithTimes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch ustaz test data" },
      { status: 500 }
    );
  }
}
