import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unique time slots from occupied times
    const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
      select: {
        time_slot: true,
      },
      distinct: ["time_slot"],
    });

    const slots = occupiedTimes
      .map((slot) => slot.time_slot)
      .filter(Boolean)
      .sort();

    return NextResponse.json(slots || []);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
