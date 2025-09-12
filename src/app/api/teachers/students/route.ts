import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = (await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as any;

    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const teacherId = session.user?.id || session.id;
    if (!teacherId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: String(teacherId) },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        daypackages: true,
        subject: true,
        status: true,
        zoom_links: {
          select: {
            id: true,
            sent_time: true,
          },
          take: 5,
          orderBy: {
            sent_time: 'desc'
          }
        },
        occupiedTimes: {
          select: {
            time_slot: true,
          },
          take: 1
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const count = students.length;

    return NextResponse.json({ students, count });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
