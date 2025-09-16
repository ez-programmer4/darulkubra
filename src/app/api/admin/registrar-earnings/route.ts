import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || !["admin", "registral"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Get reward settings
    const settings = await prisma.registralearningsconfig.findMany({
      where: {
        key: {
          in: ['reading_reward', 'hifz_reward']
        }
      }
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = parseFloat(setting.value);
      return acc;
    }, {} as Record<string, number>);

    const readingReward = settingsMap.reading_reward || 50;
    const hifzReward = settingsMap.hifz_reward || 100;

    // Use the EXACT same query as your working SQL query #4
    const earningsQuery = `
      SELECT 
        s.rigistral,
        COUNT(DISTINCT s.wdt_ID) as success_registrations,
        COUNT(CASE WHEN s.subject IN ('Nethor', 'Qaidah') THEN 1 END) as reading_students,
        COUNT(CASE WHEN s.subject = 'Hifz' THEN 1 END) as hifz_students,
        (COUNT(CASE WHEN s.subject IN ('Nethor', 'Qaidah') THEN 1 END) * ?) + 
        (COUNT(CASE WHEN s.subject = 'Hifz' THEN 1 END) * ?) as calculated_reward
      FROM wpos_wpdatatable_23 s
      JOIN months_table m ON s.wdt_ID = m.studentid
      WHERE s.rigistral IS NOT NULL
        AND (s.refer IS NULL OR s.refer = '')
        AND DATE_FORMAT(s.startdate, '%Y-%m') = ?
        AND s.status IN ('Active', 'Not yet')
        AND m.month = ?
        AND (UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1)
      GROUP BY s.rigistral
      ORDER BY calculated_reward DESC
    `;

    const earningsResults = await prisma.$queryRawUnsafe(
      earningsQuery, 
      readingReward, 
      hifzReward, 
      month, 
      month
    ) as any[];

    // Get additional data for each registrar
    const earnings = [];
    
    for (const result of earningsResults) {
      const registrar = result.rigistral;
      
      // Get total registrations in month
      const totalQuery = `
        SELECT COUNT(*) as count
        FROM wpos_wpdatatable_23 
        WHERE rigistral = ?
          AND (refer IS NULL OR refer = '')
          AND DATE_FORMAT(registrationdate, '%Y-%m') = ?
          AND status IN ('Active', 'Not yet', 'Not Succeed')
      `;
      
      const totalResult = await prisma.$queryRawUnsafe(totalQuery, registrar, month) as any[];
      
      // Get not success count
      const notSuccessQuery = `
        SELECT COUNT(*) as count
        FROM wpos_wpdatatable_23 
        WHERE rigistral = ?
          AND (refer IS NULL OR refer = '')
          AND DATE_FORMAT(registrationdate, '%Y-%m') = ?
          AND status = 'Not Succeed'
      `;
      
      const notSuccessResult = await prisma.$queryRawUnsafe(notSuccessQuery, registrar, month) as any[];
      
      // Get paid students count
      const paidStudentsQuery = `
        SELECT COUNT(DISTINCT s.wdt_ID) as count
        FROM wpos_wpdatatable_23 s
        JOIN months_table m ON s.wdt_ID = m.studentid
        WHERE s.rigistral = ?
          AND (s.refer IS NULL OR s.refer = '')
          AND m.month = ?
          AND (UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1)
      `;
      
      const paidStudentsResult = await prisma.$queryRawUnsafe(paidStudentsQuery, registrar, month) as any[];
      
      const stats = {
        registral: registrar,
        totalReg: Number(totalResult[0]?.count || 0),
        successReg: Number(result.success_registrations || 0),
        reading: Number(result.reading_students || 0),
        hifz: Number(result.hifz_students || 0),
        notSuccess: Number(notSuccessResult[0]?.count || 0),
        reward: Number(result.calculated_reward || 0),
        level: registrar === "Abdulrahim" ? "Level 1" : (registrar !== "Unsigned" ? "Level 2" : null),
        paidStudents: Number(paidStudentsResult[0]?.count || 0),
      };
      
      earnings.push(stats);
    }

    console.log('=== API EARNINGS RESULTS ===');
    earnings.forEach(e => {
      console.log(`${e.registral}: Success=${e.successReg}, Reading=${e.reading}, Hifz=${e.hifz}, Reward=${e.reward}`);
    });

    return NextResponse.json({
      earnings,
      month,
      settings: {
        reading_reward: readingReward,
        hifz_reward: hifzReward,
      },
    });

  } catch (error) {
    console.error("Error fetching registrar earnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}