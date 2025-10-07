import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SalaryCalculator } from "@/lib/salary-calculator";

export async function POST(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teacherId, action } = body;

    if (action === "clear_all") {
      SalaryCalculator.clearGlobalCache();
      return NextResponse.json({
        success: true,
        message: "All salary cache cleared successfully",
      });
    } else if (action === "clear_teacher" && teacherId) {
      SalaryCalculator.clearGlobalTeacherCache(teacherId);
      return NextResponse.json({
        success: true,
        message: `Salary cache cleared for teacher ${teacherId}`,
      });
    } else {
      return NextResponse.json(
        { message: "Invalid action or missing teacherId" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Cache clearing error:", error);
    return NextResponse.json(
      { message: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
