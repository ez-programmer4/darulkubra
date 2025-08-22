import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

// GET - Get a specific student
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: parseInt(params.id) },
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
    if (student.u_control !== session.code) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT - Update a student
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "controller") {
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
      where: { wdt_ID: parseInt(params.id) },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.u_control !== session.code) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if status is changing to Leave and set exitdate
    const exitdate = (status === "Leave" && student.status !== "Leave") 
      ? new Date() 
      : undefined;

    // Update the student
    const updatedStudent = await prisma.wpos_wpdatatable_23.update({
      where: { wdt_ID: parseInt(params.id) },
      data: {
        status,
        classfee,
        package: pkg,
        subject,
        daypackages,
        ...(exitdate && { exitdate }),
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the student belongs to this controller
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: parseInt(params.id) },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.u_control !== session.code) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the student
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.student_attendance_progress.deleteMany({
        where: { student_id: parseInt(params.id) },
      });

      await tx.months_table.deleteMany({
        where: { studentid: parseInt(params.id) },
      });

      await tx.payment.deleteMany({
        where: { studentid: parseInt(params.id) },
      });

      await tx.wpos_ustaz_occupied_times.deleteMany({
        where: { student_id: parseInt(params.id) },
      });

      // Finally delete the student
      await tx.wpos_wpdatatable_23.delete({
        where: { wdt_ID: parseInt(params.id) },
      });
    });

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
