import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get counts for each role using the correct tables
    const [adminCount, controllerCount, teacherCount, registralCount] = await Promise.all([
      prisma.admin.count(),
      prisma.wpos_wpdatatable_28.count(),
      prisma.wpos_wpdatatable_24.count(),
      prisma.wpos_wpdatatable_33.count(),
    ]);

    const totalUsers = adminCount + controllerCount + teacherCount + registralCount;

    return NextResponse.json({
      counts: {
        admin: adminCount,
        controller: controllerCount,
        teacher: teacherCount,
        registral: registralCount,
      },
      total: totalUsers,
    });
  } catch (error) {
    console.error("Error fetching user counts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}