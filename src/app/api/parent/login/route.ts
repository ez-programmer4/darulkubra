import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Find all children with this parent phone number
    const children = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        parent_phone: phone,
        // Only include active students (optional filter)
        status: {
          not: "Leave", // Adjust based on your status values
        },
      },
      select: {
        wdt_ID: true,
        name: true,
        package: true,
        status: true,
        ustaz: true,
        daypackages: true,
        registrationdate: true,
        teacher: {
          select: {
            ustazname: true,
            phone: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    if (children.length === 0) {
      return NextResponse.json(
        {
          error: "No children found with this phone number",
          message: "Please check the phone number or contact the school",
        },
        { status: 404 }
      );
    }

    // Return parent session data
    return NextResponse.json({
      success: true,
      parentPhone: phone,
      children: children,
      message: `Found ${children.length} child${
        children.length > 1 ? "ren" : ""
      }`,
    });
  } catch (error: any) {
    console.error("Parent login error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
