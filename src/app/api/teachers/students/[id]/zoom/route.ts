import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    console.log('Zoom API - Token:', token);
    
    if (!token || token.role !== "teacher") {
      console.log('Zoom API - Access denied. Role:', token?.role);
      return NextResponse.json({ error: "Unauthorized - Teacher access required" }, { status: 403 });
    }
    const teacherId = token.id as string;
    const studentId = Number(params.id);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }
    const { link, tracking_token, expiration_date } = await req.json();
    if (!link || !tracking_token) {
      return NextResponse.json({ error: "link and tracking_token are required" }, { status: 400 });
    }

    // Verify ownership
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: { ustaz: true },
    });
    console.log('Zoom API - Student check:', { studentId, student, teacherId });
    
    if (!student || student.ustaz !== teacherId) {
      console.log('Zoom API - Ownership denied. Student ustaz:', student?.ustaz, 'Teacher ID:', teacherId);
      return NextResponse.json({ error: "Not your student" }, { status: 403 });
    }

    const now = new Date();
    const expiry = expiration_date ? new Date(expiration_date) : null;

    const created = await prisma.wpos_zoom_links.create({
      data: {
        studentid: studentId,
        ustazid: teacherId,
        link,
        tracking_token,
        sent_time: now,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}