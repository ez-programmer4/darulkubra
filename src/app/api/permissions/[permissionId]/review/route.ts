import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

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

const ReviewSchema = z.object({
  status: z.enum(["Approved", "Declined"]),
  reviewNotes: z.string().optional(),
  lateReviewReason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { permissionId: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can review." },
        { status: 403 }
      );
    }
    const permissionId = parseInt(params.permissionId, 10);
    if (isNaN(permissionId)) {
      return NextResponse.json(
        { error: "Invalid permission ID." },
        { status: 400 }
      );
    }
    const body = await req.json();
    const parseResult = ReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const { status, reviewNotes, lateReviewReason } = parseResult.data;
    // Only allow review if status is Pending
    const permission = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return NextResponse.json(
        { error: "Permission request not found." },
        { status: 404 }
      );
    }
    if (permission.status !== "Pending") {
      return NextResponse.json(
        { error: "Only pending requests can be reviewed." },
        { status: 400 }
      );
    }
    const reviewerId = user.id;
    const admin = await prisma.admin.findUnique({
      where: { id: reviewerId },
    });
    if (!admin) {
      return NextResponse.json(
        { error: "Reviewer admin not found." },
        { status: 400 }
      );
    }
    const updated = await prisma.permissionrequest.update({
      where: { id: permissionId },
      data: {
        status,
        adminId: reviewerId, // <-- changed from reviewedBy to adminId
        reviewedAt: new Date(),
        reviewNotes,
        lateReviewReason,
      },
    });

    // Notify students if requested
    // Fetch teacher and students
    const permissionWithTeacher = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
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
    // If notifyStudents is passed in the body and students exist
    if (
      body.notifyStudents &&
      permissionWithTeacher?.wpos_wpdatatable_24?.students
    ) {
      const teacherName =
        permissionWithTeacher.wpos_wpdatatable_24.ustazname || "Your teacher";
      const message = `Teacher ${teacherName} will be absent on ${permissionWithTeacher.requestedDate}. Your class is cancelled/rescheduled.`;
      for (const student of permissionWithTeacher.wpos_wpdatatable_24
        .students) {
        if (student.phoneno) {
          // You may need to import or define sendSMS
          try {
            await sendSMS(student.phoneno, message);
          } catch (e) {}
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

    return NextResponse.json(updated);
  } catch (err) {
    const error = err as Error;
    if (error.stack)
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    return NextResponse.json(
      { error: "Failed to review permission request." },
      { status: 500 }
    );
  }
}
