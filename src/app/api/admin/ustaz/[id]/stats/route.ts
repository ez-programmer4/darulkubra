import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherExamPassFail } from "@/lib/examStats";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ustazId = params.id;

  if (!ustazId) {
    return NextResponse.json(
      { error: "Ustaz ID is required" },
      { status: 400 }
    );
  }

  try {
    const { passed, failed } = await getTeacherExamPassFail(prisma, ustazId);
    return NextResponse.json({ passed, failed });
  } catch (error) {
    console.error("Failed to get exam stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
