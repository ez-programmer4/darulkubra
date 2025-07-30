import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "2024-01-01";
    const to = searchParams.get("to") || "2024-12-31";
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get teacher ratings based on quality assessments
    const teacherRatings = await prisma.qualityAssessment.groupBy({
      by: ["teacherId"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });

    // Get teacher details and transform the data
    const ratingsWithDetails = await Promise.all(
      teacherRatings.map(async (rating) => {
        const teacher = await prisma.wpos_wpdatatable_24.findUnique({
          where: { ustazid: rating.teacherId },
          select: { ustazname: true },
        });

        // Get the latest quality assessment for this teacher
        const latestAssessment = await prisma.qualityAssessment.findFirst({
          where: { teacherId: rating.teacherId },
          orderBy: { createdAt: "desc" },
          select: { overallQuality: true },
        });

        return {
          ustazname: teacher?.ustazname || "Unknown",
          name: teacher?.ustazname || "Unknown",
          quality: latestAssessment?.overallQuality || "Unknown",
          rating: latestAssessment?.overallQuality || "Unknown",
          assessmentCount: rating._count.id || 0,
        };
      })
    );

    return NextResponse.json(ratingsWithDetails);
  } catch (error) {
    console.error("Error fetching ustaz ratings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
