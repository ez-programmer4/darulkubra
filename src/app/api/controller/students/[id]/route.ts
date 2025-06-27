import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "../../../../../lib/server-auth";
import { prisma } from "../../../../../lib/prisma";

// GET - Get a specific student
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        teacher: {
          select: {
            ustazname: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Verify the student belongs to this controller
    const controller = await prisma.wpos_wpdatatable_28.findUnique({
      where: { id: user.id },
      select: { username: true },
    });

    if (student.control !== controller?.username) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT - Update a student
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      status,
      classfee,
      package: pkg,
      subject,
      daypackages,
      selectedTime,
    } = body;

    // Verify the student belongs to this controller
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const controller = await prisma.wpos_wpdatatable_28.findUnique({
      where: { id: user.id },
      select: { username: true },
    });

    if (student.control !== controller?.username) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the student
    const updatedStudent = await prisma.wpos_wpdatatable_23.update({
      where: { id: parseInt(params.id) },
      data: {
        status,
        classfee,
        package: pkg,
        subject,
        daypackages,
        selectedTime,
      },
      include: {
        teacher: {
          select: {
            ustazname: true,
          },
        },
      },
    });

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a student
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the student belongs to this controller
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const controller = await prisma.wpos_wpdatatable_28.findUnique({
      where: { id: user.id },
      select: { username: true },
    });

    if (student.control !== controller?.username) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the student
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.attendance.deleteMany({
        where: { studentId: parseInt(params.id) },
      });

      await tx.months_table.deleteMany({
        where: { studentid: parseInt(params.id) },
      });

      await tx.payment.deleteMany({
        where: { studentid: parseInt(params.id) },
      });

      await tx.student_referrals.deleteMany({
        where: {
          OR: [
            { referrer_id: parseInt(params.id) },
            { referred_id: parseInt(params.id) },
          ],
        },
      });

      await tx.wpos_ustaz_occupied_times.deleteMany({
        where: { student_id: parseInt(params.id) },
      });

      // Finally delete the student
      await tx.wpos_wpdatatable_23.delete({
        where: { id: parseInt(params.id) },
      });
    });

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
