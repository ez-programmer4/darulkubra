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

    // Get controller's code from the session (try different possible field names)
    const controllerCode = session.code || session.username || session.name;
    if (!controllerCode) {
      return NextResponse.json(
        { error: "Controller code not found in session" },
        { status: 404 }
      );
    }

    // Get active students for this controller
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        u_control: controllerCode,
      },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        classfee: true,
        startdate: true,
        status: true,
        ustaz: true,
        package: true,
        subject: true,
        country: true,
        rigistral: true,
        daypackages: true,
        isTrained: true,
        refer: true,
        registrationdate: true,
        chatId: true,
        u_control: true,
      },
    });

    // Return all student data
    return NextResponse.json(
      students.map((student) => ({
        ...student,
        id: student.wdt_ID,
        teacher: {
          ustazname: student.ustaz || "N/A",
        },
        selectedTime: "",
        chatId: student.chatId,
        progress: "",
      }))
    );
  } catch (error) {
    console.error("Controller students API error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
