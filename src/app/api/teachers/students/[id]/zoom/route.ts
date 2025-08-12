import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
    if (!link) {
      return NextResponse.json({ error: "link is required" }, { status: 400 });
    }

    // Verify ownership and collect student messaging info
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: { ustaz: true, chatId: true, name: true },
    });
    console.log('Zoom API - Student check:', { studentId, student, teacherId });

    if (!student || student.ustaz !== teacherId) {
      console.log('Zoom API - Ownership denied. Student ustaz:', student?.ustaz, 'Teacher ID:', teacherId);
      return NextResponse.json({ error: "Not your student" }, { status: 403 });
    }

    // Coerce/validate fields
    const now = new Date();
    const expiry = expiration_date ? new Date(expiration_date) : null;
    const tokenToUse: string = (tracking_token && String(tracking_token)) ||
      crypto.randomBytes(16).toString('hex').toUpperCase();

    // Persist record
    const created = await prisma.wpos_zoom_links.create({
      data: {
        studentid: studentId,
        ustazid: teacherId,
        link,
        tracking_token: tokenToUse,
        sent_time: now,
        expiration_date: expiry ?? undefined,
      },
    });

    // Build tracking URL from request headers
    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') ?? 'http';
    const baseUrl = `${proto}://${host}`;
    const trackURL = `${baseUrl}/api/zoom/track?token=${encodeURIComponent(tokenToUse)}`;

    // Send Telegram message if possible
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && student.chatId) {
      const message = `✅ Assalamu Alaikum dear ${student.name ?? "student"}, here is your Zoom link:`;
      const keyboard = {
        inline_keyboard: [[{ text: 'Join Zoom', url: trackURL }]],
      };

      // Fire and forget; do not block API response on Telegram errors
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: student.chatId,
          text: message,
          reply_markup: keyboard,
        }),
      }).catch((err) => {
        console.error('Telegram sendMessage error', err);
      });
    }

    return NextResponse.json({ id: created.id, tracking_token: tokenToUse }, { status: 201 });
  } catch (error) {
    console.error('Zoom API - Error', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}