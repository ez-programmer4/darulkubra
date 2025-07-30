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
      console.log("Invalid permissionId:", params.permissionId);
      return NextResponse.json(
        { error: "Invalid permissionId" },
        { status: 400 }
      );
    }
    const permission = await prisma.permissionRequest.findUnique({
      where: { id: permissionId },
      include: { teacher: { include: { students: true } } },
    });
    console.log("Fetched permission:", permission);
    if (!permission || !permission.teacher) {
      console.log("Permission or teacher not found");
      return NextResponse.json(
        { error: "Permission or teacher not found" },
        { status: 404 }
      );
    }
    if (permission.status !== "Approved") {
      console.log("Permission is not approved:", permission.status);
      return NextResponse.json(
        { error: "Permission is not approved" },
        { status: 400 }
      );
    }
    const teacherName =
      permission.teacher.ustazname || permission.teacher.ustazid;
    const students = permission.teacher.students || [];
    console.log("Teacher students:", students.length);
    const message = `Teacher ${teacherName} will be absent on ${permission.requestedDates}. Your class is cancelled or rescheduled.`;
    let sentCount = 0;
    for (const student of students) {
      if (student.phoneno) {
        try {
          await sendSMS(student.phoneno, message);
          sentCount++;
          console.log("SMS sent to student:", student.phoneno);
        } catch (e) {
          console.error("Failed to send SMS to student:", student.phoneno, e);
        }
      } else {
        console.log("Student has no phone:", student);
      }
    }
    console.log("Total SMS sent:", sentCount);
    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error("Error notifying students:", error);
    return NextResponse.json(
      { error: "Failed to notify students" },
      { status: 500 }
    );
  }
}
