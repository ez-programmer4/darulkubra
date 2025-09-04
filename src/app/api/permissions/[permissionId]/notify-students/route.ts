import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  { params }: { params: { permissionId: string } }
) {
  try {
    const permissionId = parseInt(params.permissionId, 10);
    if (isNaN(permissionId)) {
      return NextResponse.json(
        { error: "Invalid permissionId" },
        { status: 400 }
      );
    }
    const permission = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
      include: { wpos_wpdatatable_24: { include: { students: true } } },
    });
    if (!permission || !permission.wpos_wpdatatable_24) {
      return NextResponse.json(
        { error: "Permission or teacher not found" },
        { status: 404 }
      );
    }
    if (permission.status !== "Approved") {
      return NextResponse.json(
        { error: "Permission is not approved" },
        { status: 400 }
      );
    }
    const teacherName =
      permission.wpos_wpdatatable_24.ustazname ||
      permission.wpos_wpdatatable_24.ustazid;
    const students = permission.wpos_wpdatatable_24.students || [];
    const message = `Teacher ${teacherName} will be absent on ${permission.requestedDate}. Your class is cancelled or rescheduled.`;
    let sentCount = 0;
    for (const student of students) {
      if (student.phoneno) {
        try {
          await sendSMS(student.phoneno, message);
          sentCount++;
        } catch (e) {}
      } else {
      }
    }
    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to notify students" },
      { status: 500 }
    );
  }
}
