import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get controller's code from the session
    if (!session.code) {
      return NextResponse.json(
        { error: "Controller code not found" },
        { status: 404 }
      );
    }

    // Get students for this controller
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        u_control: session.code,
      },
      include: {
        teacher: {
          select: {
            ustazname: true,
          },
        },
      },
    });
    // Return all student data
    return NextResponse.json(
      students.map((student) => ({
        ...student,
        id: student.wdt_ID,
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
