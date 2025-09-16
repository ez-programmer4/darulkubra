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

    // Get all registrars
    const registrarsQuery = `
      SELECT DISTINCT rigistral
      FROM wpos_wpdatatable_23 
      WHERE rigistral IS NOT NULL
        AND (refer IS NULL OR refer = '')
    `;
    
    const registrars = await prisma.$queryRawUnsafe(registrarsQuery) as any[];
    const earnings = [];
    
    console.log(`Processing ${registrars.length} registrars for month ${month}`);
    
    // Calculate earnings for each registrar
    for (const reg of registrars) {
      const registrar = reg.rigistral;
      console.log(`Processing registrar: ${registrar}`);
      
      try {
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
        
        const successResults = await prisma.$queryRawUnsafe(successQuery, registrar, month, month) as any[];
        
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
        
        const stats = {
          registral: registrar,
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
        
        // Calculate reward using dynamic values
        stats.reward = (stats.reading * readingReward) + (stats.hifz * hifzReward);
        
        // Determine level
        if (registrar === "Abdulrahim") {
          stats.level = "Level 1";
        } else if (registrar !== "Unsigned") {
          stats.level = "Level 2";
        }
        
        console.log(`Stats for ${registrar}:`, stats);
        
        // Always include registrars, even with 0 values for debugging
        earnings.push(stats);
        
      } catch (error) {
        console.error(`Error processing registrar ${registrar}:`, error);
      }
    }

    return NextResponse.json({
      earnings: earnings.sort((a, b) => b.reward - a.reward),
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