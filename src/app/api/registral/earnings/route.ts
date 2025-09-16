import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "2024-08"; // Default to August 2024 for debugging
    const registralName = session.name || session.username;

    console.log(`=== REGISTRAL EARNINGS DEBUG FOR ${registralName} - ${month} ===`);

    // Raw SQL queries for detailed analysis
    const queries = {
      // 1. All students registered by this registral (no referral)
      allStudents: `
        SELECT 
          wdt_ID,
          name,
          rigistral,
          status,
          subject,
          registrationdate,
          startdate,
          refer,
          package
        FROM wpos_wpdatatable_23 
        WHERE rigistral = ? 
          AND (refer IS NULL OR refer = '')
        ORDER BY registrationdate DESC
      `,

      // 2. Students registered in August 2024
      augustRegistrations: `
        SELECT 
          wdt_ID,
          name,
          rigistral,
          status,
          subject,
          registrationdate,
          startdate,
          refer
        FROM wpos_wpdatatable_23 
        WHERE rigistral = ? 
          AND (refer IS NULL OR refer = '')
          AND DATE_FORMAT(registrationdate, '%Y-%m') = ?
        ORDER BY registrationdate DESC
      `,

      // 3. Students who started in August 2024
      augustStarts: `
        SELECT 
          wdt_ID,
          name,
          rigistral,
          status,
          subject,
          registrationdate,
          startdate,
          refer
        FROM wpos_wpdatatable_23 
        WHERE rigistral = ? 
          AND (refer IS NULL OR refer = '')
          AND DATE_FORMAT(startdate, '%Y-%m') = ?
          AND status IN ('Active', 'Not yet')
        ORDER BY startdate DESC
      `,

      // 4. August payments for students who started in August
      augustPayments: `
        SELECT 
          s.wdt_ID,
          s.name,
          s.subject,
          s.startdate,
          m.month,
          m.payment_status,
          m.is_free_month
        FROM wpos_wpdatatable_23 s
        JOIN months_table m ON s.wdt_ID = m.studentid
        WHERE s.rigistral = ? 
          AND (s.refer IS NULL OR s.refer = '')
          AND DATE_FORMAT(s.startdate, '%Y-%m') = ?
          AND s.status IN ('Active', 'Not yet')
          AND m.month = ?
          AND (UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1)
        ORDER BY s.startdate DESC
      `,

      // 5. All payments for students registered by this registral
      allPayments: `
        SELECT 
          s.wdt_ID,
          s.name,
          s.subject,
          s.registrationdate,
          s.startdate,
          m.month,
          m.payment_status,
          m.is_free_month
        FROM wpos_wpdatatable_23 s
        JOIN months_table m ON s.wdt_ID = m.studentid
        WHERE s.rigistral = ? 
          AND (s.refer IS NULL OR s.refer = '')
          AND (UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1)
        ORDER BY m.month DESC, s.startdate DESC
      `,

      // 6. Payments specifically for the target month
      monthPayments: `
        SELECT 
          s.wdt_ID,
          s.name,
          s.subject,
          s.registrationdate,
          s.startdate,
          s.status,
          m.month,
          m.payment_status,
          m.is_free_month
        FROM wpos_wpdatatable_23 s
        JOIN months_table m ON s.wdt_ID = m.studentid
        WHERE s.rigistral = ? 
          AND (s.refer IS NULL OR s.refer = '')
          AND m.month = ?
          AND (UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1)
        ORDER BY s.startdate DESC
      `,

      // 7. Summary stats
      summaryStats: `
        SELECT 
          COUNT(CASE WHEN DATE_FORMAT(registrationdate, '%Y-%m') = ? AND status IN ('Active', 'Not yet', 'Not Succeed') THEN 1 END) as total_reg,
          COUNT(CASE WHEN DATE_FORMAT(registrationdate, '%Y-%m') = ? AND status = 'Not Succeed' THEN 1 END) as not_success,
          COUNT(CASE WHEN DATE_FORMAT(startdate, '%Y-%m') = ? AND status IN ('Active', 'Not yet') THEN 1 END) as started_in_month
        FROM wpos_wpdatatable_23 
        WHERE rigistral = ? 
          AND (refer IS NULL OR refer = '')
      `
    };

    // Execute all queries
    const results: any = {};
    
    results.allStudents = await prisma.$queryRawUnsafe(queries.allStudents, registralName);
    results.augustRegistrations = await prisma.$queryRawUnsafe(queries.augustRegistrations, registralName, month);
    results.augustStarts = await prisma.$queryRawUnsafe(queries.augustStarts, registralName, month);
    results.augustPayments = await prisma.$queryRawUnsafe(queries.augustPayments, registralName, month, month);
    results.allPayments = await prisma.$queryRawUnsafe(queries.allPayments, registralName);
    results.monthPayments = await prisma.$queryRawUnsafe(queries.monthPayments, registralName, month);
    results.summaryStats = await prisma.$queryRawUnsafe(queries.summaryStats, month, month, month, registralName);

    // Convert BigInt values to numbers for JSON serialization
    const convertBigInt = (value: any) => typeof value === 'bigint' ? Number(value) : value;
    
    // Calculate detailed stats
    const stats = {
      registral: registralName,
      month: month,
      totalReg: convertBigInt(results.summaryStats[0]?.total_reg || 0),
      notSuccess: convertBigInt(results.summaryStats[0]?.not_success || 0),
      startedInMonth: convertBigInt(results.summaryStats[0]?.started_in_month || 0),
      successReg: results.augustPayments.length,
      reading: 0,
      hifz: 0,
      reward: 0,
      level: null as string | null,
    };

    // Count reading and hifz from successful registrations
    results.augustPayments.forEach((payment: any) => {
      if (payment.subject && ["Nethor", "Qaidah"].includes(payment.subject)) {
        stats.reading++;
      } else if (payment.subject === "Hifz") {
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

    // Debug output
    console.log('=== QUERY RESULTS ===');
    console.log('All Students Count:', results.allStudents.length);
    console.log('August Registrations:', results.augustRegistrations.length);
    console.log('August Starts:', results.augustStarts.length);
    console.log('August Payments (started + paid same month):', results.augustPayments.length);
    console.log('All Payments Count:', results.allPayments.length);
    console.log('Month Payments Count:', results.monthPayments.length);
    console.log('Summary Stats:', results.summaryStats[0]);
    console.log('Final Stats:', stats);

    // Convert all BigInt values in the response
    const convertObjectBigInts = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertObjectBigInts);
      if (typeof obj === 'object') {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertObjectBigInts(value);
        }
        return converted;
      }
      return obj;
    };

    const response = {
      earnings: stats,
      month,
      debug: {
        queries: Object.keys(queries),
        allStudentsCount: results.allStudents.length,
        augustRegistrationsCount: results.augustRegistrations.length,
        augustStartsCount: results.augustStarts.length,
        augustPaymentsCount: results.augustPayments.length,
        allPaymentsCount: results.allPayments.length,
        monthPaymentsCount: results.monthPayments.length,
        summaryStats: convertObjectBigInts(results.summaryStats[0]),
        sampleData: {
          allStudents: convertObjectBigInts(results.allStudents.slice(0, 3)),
          augustRegistrations: convertObjectBigInts(results.augustRegistrations.slice(0, 3)),
          augustStarts: convertObjectBigInts(results.augustStarts.slice(0, 3)),
          augustPayments: convertObjectBigInts(results.augustPayments.slice(0, 3)),
          allPayments: convertObjectBigInts(results.allPayments.slice(0, 5)),
          monthPayments: convertObjectBigInts(results.monthPayments.slice(0, 5))
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching registral earnings:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}