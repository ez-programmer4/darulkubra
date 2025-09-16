// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export async function GET(req: NextRequest) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user || (session.user as { role: string }).role !== "admin") {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//   }

//   try {
//     const url = new URL(req.url);
//     const limit = parseInt(url.searchParams.get("limit") || "20");
//     const teacherId = url.searchParams.get("teacherId");
//     const deductionType = url.searchParams.get("deductionType");

//     // Build where clause
//     const where: any = {};
//     if (teacherId) where.teacherId = teacherId;
//     if (deductionType) where.deductionType = deductionType;

//     // Get recent waiver records
//     const waivers = await prisma.deduction_waivers.findMany({
//       where,
//       orderBy: { createdAt: 'desc' },
//       take: limit
//     });

//     // Get teacher names
//     const teacherIds = [...new Set(waivers.map(w => w.teacherId))];
//     const teachers = await prisma.wpos_wpdatatable_24.findMany({
//       where: { ustazid: { in: teacherIds } },
//       select: { ustazid: true, ustazname: true }
//     });

//     const teacherMap = Object.fromEntries(teachers.map(t => [t.ustazid, t.ustazname]));

//     // Format response
//     const formattedWaivers = waivers.map(waiver => ({
//       id: waiver.id,
//       teacherId: waiver.teacherId,
//       teacherName: teacherMap[waiver.teacherId] || 'Unknown',
//       deductionType: waiver.deductionType,
//       deductionDate: waiver.deductionDate,
//       originalAmount: Number(waiver.originalAmount),
//       reason: waiver.reason,
//       adminId: waiver.adminId,
//       createdAt: waiver.createdAt
//     }));

//     return NextResponse.json({ waivers: formattedWaivers });

//   } catch (error) {
//     console.error("History fetch error:", error);
//     return NextResponse.json({ error: "Failed to fetch waiver history" }, { status: 500 });
//   }
// }

export {};
