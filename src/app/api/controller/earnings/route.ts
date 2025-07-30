import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { EarningsCalculator } from "@/lib/earningsCalculator";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only controllers can access their own earnings
    if (session.role !== "controller") {
      return NextResponse.json(
        { message: "Unauthorized role" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("month") || undefined;
    const controllerId = session.username; // Use session username as controller ID

    console.log(
      `Controller earnings request for: ${controllerId}, month: ${yearMonth}`
    );

    try {
      const calculator = new EarningsCalculator(yearMonth);
      const earnings = await calculator.calculateControllerEarnings({
        controllerId,
        yearMonth,
      });

      console.log(
        `Successfully calculated earnings for ${earnings.length} controllers`
      );

      if (earnings.length === 0) {
        return NextResponse.json({
          message: "No earnings data found for this controller",
          earnings: [],
        });
      }

      // Return only the controller's own earnings
      const controllerEarnings = earnings.find(
        (e) => e.controllerId === controllerId
      );

      if (!controllerEarnings) {
        return NextResponse.json({
          message: "No earnings data found for this controller",
          earnings: null,
        });
      }

      return NextResponse.json({
        message: "Controller earnings retrieved successfully",
        earnings: controllerEarnings,
      });
    } catch (calculationError) {
      console.error("Error in earnings calculation:", calculationError);
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
    console.error("Error in controller earnings API:", error);
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
