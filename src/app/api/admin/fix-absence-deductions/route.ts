import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 🔧 ABSENCE DEDUCTION FIX API
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === "initialize-packages") {
      // Initialize package deduction rates
      const defaultPackages = [
        { name: "0 Fee", lateness: 0, absence: 0 },
        { name: "3 days", lateness: 30, absence: 25 },
        { name: "5 days", lateness: 40, absence: 35 },
        { name: "Europe", lateness: 50, absence: 45 },
      ];

      for (const pkg of defaultPackages) {
        await prisma.packageDeduction.upsert({
          where: { packageName: pkg.name },
          update: {
            absenceBaseAmount: pkg.absence,
            latenessBaseAmount: pkg.lateness,
            updatedAt: new Date(),
          },
          create: {
            packageName: pkg.name,
            absenceBaseAmount: pkg.absence,
            latenessBaseAmount: pkg.lateness,
            updatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Package deduction rates initialized",
        packages: defaultPackages,
      });
    }

    if (action === "process-absences") {
      // Run absence processing for last 7 days
      const processed = await fetch(`${req.nextUrl.origin}/api/admin/process-absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await processed.json();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use: initialize-packages or process-absences" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      { error: "Fix failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}