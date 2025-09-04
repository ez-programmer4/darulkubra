import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Zoom status API called');
    
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log('👤 Session:', { username: session?.username, role: session?.role });

    if (!session || session.role !== "teacher") {
      console.log('❌ Unauthorized access');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = session.username;
    if (!teacherId) {
      console.log('❌ No teacher ID found');
      return NextResponse.json({ error: "Teacher ID not found" }, { status: 400 });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    console.log('📅 Today:', todayStr, 'Teacher ID:', teacherId);

    // First, let's see ALL zoom links for this teacher (for debugging)
    const allZoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
      },
      select: {
        studentid: true,
        sent_time: true,
        ustazid: true,
      },
      orderBy: {
        sent_time: 'desc'
      },
      take: 10 // Last 10 records
    });

    console.log('🔍 ALL zoom links for teacher (last 10):', allZoomLinks);

    // Find zoom links sent today for this teacher's students
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: new Date(todayStr + 'T00:00:00.000Z'),
          lt: new Date(todayStr + 'T23:59:59.999Z'),
        },
      },
      select: {
        studentid: true,
        sent_time: true,
      },
    });

    console.log('🔗 Found zoom links for TODAY:', zoomLinks.length);
    console.log('📋 Today zoom links details:', zoomLinks);

    const sentToday = zoomLinks.map(link => link.studentid);
    console.log('✅ Student IDs with zoom sent today:', sentToday);

    const response = {
      sentToday,
      date: todayStr,
      debug: {
        teacherId,
        totalLinks: zoomLinks.length,
        todayLinks: zoomLinks,
        allRecentLinks: allZoomLinks,
        dateRange: {
          from: todayStr + 'T00:00:00.000Z',
          to: todayStr + 'T23:59:59.999Z'
        }
      }
    };

    console.log('📤 API Response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error("💥 Zoom status check error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}