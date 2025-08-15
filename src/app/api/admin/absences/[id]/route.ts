import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const recordId = parseInt(params.id);

    const updatedRecord = await prisma.absencerecord.update({
      where: { id: recordId },
      data: {
        reviewedByManager: body.reviewedByManager,
        reviewNotes: body.reviewNotes,
        adminId: (session.user as { id: string }).id,
      },
    });

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update absence record" },
      { status: 500 }
    );
  }
}