import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as any;
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const teacherId = session.user.id as string;
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
    if (!student || student.ustaz !== teacherId) {
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
        expiration_date: expiry,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}