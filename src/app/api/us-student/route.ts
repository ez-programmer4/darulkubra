import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.user.findMany({
      where: { role: "student" },
      select: { 
        id: true,
        firstName: true, 
        lastName: true, 
        email: true, 
        phoneNumber: true,
        wpos_wpdatatable_23: {
          select: {
            wdt_ID: true
          }
        }
      },
    });
    
    // Transform data to match expected interface
    const transformedData = data.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      wpos_wpdatatable_23Wdt_ID: user.wpos_wpdatatable_23?.wdt_ID || null
    }));
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching US students:", error);
    return NextResponse.json(
      { error: "Failed to fetch US students" },
      { status: 500 }
    );
  }
}

// PUT method no longer needed since userId is stored directly in registration
