import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { EarningsCalculator } from "@/lib/earningsCalculator";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access all controller earnings
    if (session.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized role" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("month") || undefined;
    const teamId = searchParams.get("teamId")
      ? parseInt(searchParams.get("teamId")!)
      : undefined;
    const controllerId = searchParams.get("controllerId") || undefined;

    try {
      const calculator = new EarningsCalculator(yearMonth);
      const earnings = await calculator.calculateControllerEarnings({
        yearMonth,
        teamId,
        controllerId,
      });

      // Calculate summary statistics
      const totalEarnings = earnings.reduce(
        (sum, e) => sum + e.totalEarnings,
        0
      );
      const totalActiveStudents = earnings.reduce(
        (sum, e) => sum + e.activeStudents,
        0
      );
      const totalPaidStudents = earnings.reduce(
        (sum, e) => sum + e.paidThisMonth,
        0
      );
      const averageEarnings =
        earnings.length > 0 ? totalEarnings / earnings.length : 0;

      // Group by teams
      const teamStats = earnings.reduce((acc, earning) => {
        const teamId = earning.teamId;
        if (!acc[teamId]) {
          acc[teamId] = {
            teamId,
            teamName: earning.teamName,
            teamLeader: earning.teamLeader,
            controllers: [],
            totalEarnings: 0,
            totalActiveStudents: 0,
            totalPaidStudents: 0,
          };
        }

        acc[teamId].controllers.push(earning);
        acc[teamId].totalEarnings += earning.totalEarnings;
        acc[teamId].totalActiveStudents += earning.activeStudents;
        acc[teamId].totalPaidStudents += earning.paidThisMonth;

        return acc;
      }, {} as any);

      return NextResponse.json({
        message: "Controller earnings retrieved successfully",
        earnings,
        summary: {
          totalControllers: earnings.length,
          totalEarnings,
          totalActiveStudents,
          totalPaidStudents,
          averageEarnings,
        },
        teamStats: Object.values(teamStats),
      });
    } catch (calculationError) {
      return NextResponse.json(
        {
          message: "Error calculating earnings",
          error:
            calculationError instanceof Error
              ? calculationError.message
              : "Unknown error",
          details: calculationError,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      { status: 500 }
    );
  }
}
