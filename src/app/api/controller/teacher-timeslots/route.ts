import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "controller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID required" }, { status: 400 });
    }

    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      where: { ustaz_id: teacherId },
      include: {
        student: {
          select: {
            wdt_ID: true,
            name: true,
          },
        },
      },
      orderBy: [
        { daypackage: "asc" },
        { time_slot: "asc" },
      ],
    });

    return NextResponse.json({ occupiedTimes });
  } catch (error) {
    console.error("Error fetching teacher time slots:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "controller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Time slot ID required" }, { status: 400 });
    }

    await prisma.wpos_ustaz_occupied_times.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time slot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}