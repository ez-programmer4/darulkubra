import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "controller") {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Get teachers assigned to this controller
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      where: {
        control: session.code,
      },
      select: {
        ustazid: true,
        ustazname: true,
        phone: true,
        schedule: true,
        password: true,
        created_at: true,
      },
      orderBy: {
        ustazname: "asc",
      },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error("Controller teachers API error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}