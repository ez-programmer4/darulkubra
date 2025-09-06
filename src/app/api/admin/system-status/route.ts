import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const status = await prisma.setting.findUnique({
      where: { key: "system_status" }
    });
    
    return NextResponse.json({ 
      status: status?.value || "operational",
      message: status?.description || "System operating normally"
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, message } = await req.json();
    
    await prisma.setting.upsert({
      where: { key: "system_status" },
      update: { 
        value: status,
        description: message,
        updatedAt: new Date()
      },
      create: {
        key: "system_status",
        value: status,
        description: message
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}