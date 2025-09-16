import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const registralName = session.name || session.username;

    // Get successful registrations (started + paid in same month)
    const successQuery = `
      SELECT 
        s.wdt_ID,
        s.subject
      FROM wpos_wpdatatable_23 s
      JOIN months_table m ON s.wdt_ID = m.studentid
      WHERE s.rigistral = ?
        AND (s.refer IS NULL OR s.refer = '')
        AND DATE_FORMAT(s.startdate, '%Y-%m') = ?
        AND s.status IN ('Active', 'Not yet')
        AND m.month = ?
        AND (UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1)
    `;
    
    const successResults = await prisma.$queryRawUnsafe(successQuery, registralName, month, month) as any[];
    
    // Get total registrations in month
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM wpos_wpdatatable_23 
      WHERE rigistral = ?
        AND (refer IS NULL OR refer = '')
        AND DATE_FORMAT(registrationdate, '%Y-%m') = ?
        AND status IN ('Active', 'Not yet', 'Not Succeed')
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(totalQuery, registralName, month) as any[];
    
    // Get not success count
    const notSuccessQuery = `
      SELECT COUNT(*) as count
      FROM wpos_wpdatatable_23 
      WHERE rigistral = ?
        AND (refer IS NULL OR refer = '')
        AND DATE_FORMAT(registrationdate, '%Y-%m') = ?
        AND status = 'Not Succeed'
    `;
    
    const notSuccessResult = await prisma.$queryRawUnsafe(notSuccessQuery, registralName, month) as any[];
    
    // Calculate stats
    const stats = {
      registral: registralName,
      totalReg: Number(totalResult[0]?.count || 0),
      successReg: successResults.length,
      reading: 0,
      hifz: 0,
      notSuccess: Number(notSuccessResult[0]?.count || 0),
      reward: 0,
      level: null as string | null,
    };
    
    // Count reading and hifz from successful registrations
    successResults.forEach((result: any) => {
      if (result.subject && ["Nethor", "Qaidah"].includes(result.subject)) {
        stats.reading++;
      } else if (result.subject === "Hifz") {
        stats.hifz++;
      }
    });

    // Calculate reward
    stats.reward = (stats.reading * 50) + (stats.hifz * 100);

    // Determine level
    if (registralName === "Abdulrahim") {
      stats.level = "Level 1";
    } else if (registralName !== "Unsigned") {
      stats.level = "Level 2";
    }

    return NextResponse.json({
      earnings: stats.totalReg > 0 || stats.successReg > 0 ? stats : null,
      month,
    });
  } catch (error) {
    console.error("Error fetching registral earnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}