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

    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get total counts
    const [totalStudents, totalActive, totalNotYet, monthlyActive, monthlyNotYet] = await Promise.all([
      // Total students
      prisma.wpos_wpdatatable_23.count({
        where: { name: { not: "" } }
      }),
      
      // Total active students
      prisma.wpos_wpdatatable_23.count({
        where: { 
          name: { not: "" },
          status: "Active"
        }
      }),
      
      // Total not yet students
      prisma.wpos_wpdatatable_23.count({
        where: { 
          name: { not: "" },
          status: "Not yet"
        }
      }),
      
      // Monthly active students (registered this month)
      prisma.wpos_wpdatatable_23.count({
        where: { 
          name: { not: "" },
          status: "Active",
          registrationdate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      }),
      
      // Monthly not yet students (registered this month)
      prisma.wpos_wpdatatable_23.count({
        where: { 
          name: { not: "" },
          status: "Not yet",
          registrationdate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })
    ]);

    return NextResponse.json({
      totalStudents,
      totalActive,
      totalNotYet,
      monthlyActive,
      monthlyNotYet
    });

  } catch (error) {
    console.error("Error fetching student stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}