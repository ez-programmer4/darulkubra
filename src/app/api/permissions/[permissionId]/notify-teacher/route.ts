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
    const { status, reviewNotes } = await req.json();
    const permissionId = parseInt(params.permissionId, 10);
    if (!status || isNaN(permissionId)) {
      return NextResponse.json(
        { error: "Missing status or invalid permissionId" },
        { status: 400 }
      );
    }
    const permission = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
      include: { wpos_wpdatatable_24: true },
    });
    if (!permission || !permission.wpos_wpdatatable_24) {
      return NextResponse.json(
        { error: "Permission or teacher not found" },
        { status: 404 }
      );
    }
    const teacherPhone = permission.wpos_wpdatatable_24.phone;
    if (!teacherPhone) {
      return NextResponse.json(
        { error: "Teacher phone not found" },
        { status: 400 }
      );
    }
    const teacherName =
      permission.wpos_wpdatatable_24.ustazname ||
      permission.wpos_wpdatatable_24.ustazid;
    const message = `Your permission request for ${
      permission.requestedDate
    } has been ${status.toLowerCase()}.\nNotes: ${reviewNotes || "-"}`;
    await sendSMS(teacherPhone, message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to notify teacher" },
      { status: 500 }
    );
  }
}
