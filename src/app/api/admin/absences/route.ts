import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || (session.role !== "admin" && session.role !== "controller")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const absences = await prisma.absencerecord.findMany({
      include: {
        wpos_wpdatatable_24: {
          select: {
            ustazname: true
          }
        },
        permissionrequest: {
          select: {
            reasonCategory: true,
            timeSlots: true
          }
        }
      },
      orderBy: {
        classDate: "desc"
      },
      take: limit,
      skip: offset
    });

    return NextResponse.json(absences);
  } catch (error) {
    console.error("Error fetching absences:", error);
    return NextResponse.json({ error: "Failed to fetch absences" }, { status: 500 });
  }
}