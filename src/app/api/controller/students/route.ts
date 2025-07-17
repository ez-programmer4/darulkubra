import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get controller's username from the database
    const controllerId =
      typeof session.id === "string" ? parseInt(session.id, 10) : session.id;
    if (!controllerId || isNaN(controllerId)) {
      return NextResponse.json(
        { error: "Invalid controller session id" },
        { status: 400 }
      );
    }
    const controller = await prisma.wpos_wpdatatable_28.findUnique({
      where: { wdt_ID: controllerId },
      select: { username: true },
    });
    console.log("Found controller:", controller);
    console.log("Looking for controller with ID:", session.id);

    if (!controller) {
      console.log("Controller not found in database");
      return NextResponse.json(
        { error: "Controller not found" },
        { status: 404 }
      );
    }

    // Get students for this controller
    console.log("Searching for students with control:", controller.username);
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        control: controller.username,
      },
      include: {
        teacher: {
          select: {
            ustazname: true,
          },
        },
      },
    });
    console.log("Found students:", students);

    // Return all student data
    return NextResponse.json(
      students.map((student) => ({
        ...student,
        id: student.wdt_ID,
      }))
    );
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
