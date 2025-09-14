import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Get unique time slots from occupied times
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      select: { time_slot: true },
      distinct: ['time_slot']
    });

    const timeSlots = occupiedTimes
      .map(ot => ot.time_slot)
      .filter(Boolean)
      .sort();

    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error("Failed to fetch time slots:", error);
    return NextResponse.json({ error: "Failed to fetch time slots" }, { status: 500 });
  }
}