import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const defaultReasons = [
      "Sick Leave",
      "Personal Emergency", 
      "Family Matter",
      "Medical Appointment",
      "Religious Observance",
      "Bereavement",
      "Personal Business",
      "Other"
    ];

    // Check if reasons already exist
    const existingCount = await prisma.permissionreason.count();
    
    if (existingCount > 0) {
      return NextResponse.json({ 
        message: "Permission reasons already exist", 
        count: existingCount 
      });
    }

    // Create default reasons
    const createdReasons = await Promise.all(
      defaultReasons.map(reason => 
        prisma.permissionreason.create({
          data: { reason }
        })
      )
    );

    return NextResponse.json({ 
      message: "Default permission reasons created successfully",
      reasons: createdReasons
    });
  } catch (error) {
    console.error("Error seeding permission reasons:", error);
    return NextResponse.json({ error: "Failed to seed reasons" }, { status: 500 });
  }
}