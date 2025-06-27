import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "../../../../lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    console.log("Auth token:", token);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    console.log("Verified user:", user);

    if (!user || user.role !== "controller") {
      console.log("User role check failed:", { user });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get controller's username from the database
    const controller = await prisma.wpos_wpdatatable_28.findUnique({
      where: { id: user.id },
      select: { username: true },
    });
    console.log("Found controller:", controller);
    console.log("Looking for controller with ID:", user.id);

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
    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
