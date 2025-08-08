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
    // Check if prisma is available

    if (!prisma) {
      throw new Error("Database connection not available");
    }

    // Check if the function exists
    if (typeof getTeacherExamPassFail !== "function") {
      throw new Error("getTeacherExamPassFail function not available");
    }

    const result = await getTeacherExamPassFail(prisma, ustazId);

    // Ensure result has expected structure
    const passed = result?.passed ?? 0;
    const failed = result?.failed ?? 0;

    return NextResponse.json({ passed, failed });
  } catch (error) {
    console.error("Error in ustaz stats API for ID:", ustazId, error);

    // Return default values on error
    return NextResponse.json({
      passed: 0,
      failed: 0,
      error: "Failed to fetch stats",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
