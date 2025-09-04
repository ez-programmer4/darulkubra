import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;
  if (apiToken && senderUid && senderName) {
    const payload = {
      from: senderUid,
      sender: senderName,
      to: phone,
      message,
    };
    await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user as { id: string; role: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = session.user as { id: string; role: string };
    const { status, reviewNotes, lateReviewReason, notifyStudents } =
      await req.json();
    const requestId = parseInt(params.id);

    // Fetch the permission request and teacher
    const permissionRequest = await prisma.permissionrequest.findUnique({
      where: { id: requestId },
      include: {
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
            students: {
              select: {
                wdt_ID: true,
                name: true,
                phoneno: true,
                daypackages: true,
              },
            },
          },
        },
      },
    });
    if (!permissionRequest) {
      return NextResponse.json(
        { error: "Permission request not found" },
        { status: 404 }
      );
    }

    // If reviewing after the class date, require lateReviewReason
    const today = new Date();
    const requestedDate = new Date(
      permissionRequest.requestedDate?.split(",")[0] || new Date()
    );
    if (today > requestedDate && !lateReviewReason) {
      return NextResponse.json(
        { error: "Late review reason required" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.permissionrequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewNotes,
        lateReviewReason,
        adminId: user.id,
        reviewedAt: new Date(),
      },
    });

    // Notify students if requested
    if (notifyStudents && permissionRequest.wpos_wpdatatable_24?.students) {
      const teacherName =
        permissionRequest.wpos_wpdatatable_24.ustazname || "Your teacher";
      const message = `Teacher ${teacherName} will be absent on ${permissionRequest.requestedDate}. Your class is cancelled/rescheduled.`;
      for (const student of permissionRequest.wpos_wpdatatable_24.students) {
        if (student.phoneno) {
          await sendSMS(student.phoneno, message);
        }
        await prisma.notification.create({
          data: {
            userId: String(student.wdt_ID),
            type: "absence_notice",
            title: "Class Cancellation Notice",
            message,
            userRole: "student",
          },
        });
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
