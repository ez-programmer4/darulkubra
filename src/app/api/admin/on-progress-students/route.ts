import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin roles to access this endpoint
    if (!["admin", "registral"].includes(token.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const onProgressStudents = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        status: "On Progress",
      },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        country: true,
        registrationdate: true,
        rigistral: true,
        isTrained: true,
        package: true,
        subject: true,
        daypackages: true,
      },
      orderBy: {
        registrationdate: "desc",
      },
    });

    return NextResponse.json(onProgressStudents);
  } catch (error) {
    console.error("Error fetching on progress students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}