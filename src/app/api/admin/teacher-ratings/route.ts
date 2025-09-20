import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const RatingSchema = z.object({
  teacherId: z.string().min(1),
  rating: z.number().min(1).max(10),
});

const BulkRatingSchema = z.array(RatingSchema);

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");

  try {
    if (teacherId) {
      // Get ratings for specific teacher
      const ratings = await prisma.teacherRating.findMany({
        where: { teacherId },
        orderBy: { id: "desc" },
      });

      const average = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : null;

      return NextResponse.json({
        teacherId,
        ratings,
        average: average ? Number(average.toFixed(1)) : null,
        count: ratings.length,
      });
    } else {
      // Get average ratings for all teachers
      const averageRatings = await prisma.teacherRating.groupBy({
        by: ['teacherId'],
        _avg: { rating: true },
        _count: { rating: true },
      });

      const teacherNames = await prisma.wpos_wpdatatable_24.findMany({
        where: {
          ustazid: { in: averageRatings.map(r => r.teacherId) }
        },
        select: { ustazid: true, ustazname: true }
      });

      const nameMap = Object.fromEntries(
        teacherNames.map(t => [t.ustazid, t.ustazname])
      );

      const result = averageRatings.map(r => ({
        teacherId: r.teacherId,
        teacherName: nameMap[r.teacherId] || r.teacherId,
        averageRating: r._avg.rating ? Number(r._avg.rating.toFixed(1)) : null,
        ratingCount: r._count.rating,
      }));

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error fetching teacher ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch teacher ratings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Check if it's bulk or single rating
    const isBulk = Array.isArray(body);
    
    if (isBulk) {
      const parse = BulkRatingSchema.safeParse(body);
      if (!parse.success) {
        return NextResponse.json(
          { error: "Invalid bulk rating data", details: parse.error.issues },
          { status: 400 }
        );
      }

      const ratings = parse.data;
      const created = await prisma.teacherRating.createMany({
        data: ratings,
      });

      return NextResponse.json({
        success: true,
        message: `Created ${created.count} teacher ratings`,
        ratingsCreated: created.count,
      });
    } else {
      const parse = RatingSchema.safeParse(body);
      if (!parse.success) {
        return NextResponse.json(
          { error: "Invalid rating data", details: parse.error.issues },
          { status: 400 }
        );
      }

      const { teacherId, rating } = parse.data;
      
      const created = await prisma.teacherRating.create({
        data: { teacherId, rating },
      });

      return NextResponse.json({
        success: true,
        message: "Teacher rating created successfully",
        rating: created,
      });
    }
  } catch (error) {
    console.error("Error creating teacher rating:", error);
    return NextResponse.json(
      { error: "Failed to create teacher rating" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");
  const ratingId = url.searchParams.get("ratingId");

  try {
    if (ratingId) {
      // Delete specific rating
      await prisma.teacherRating.delete({
        where: { id: ratingId },
      });
      return NextResponse.json({ success: true, message: "Rating deleted" });
    } else if (teacherId) {
      // Delete all ratings for teacher
      const deleted = await prisma.teacherRating.deleteMany({
        where: { teacherId },
      });
      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.count} ratings for teacher ${teacherId}`,
      });
    } else {
      return NextResponse.json(
        { error: "Missing teacherId or ratingId" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting teacher rating:", error);
    return NextResponse.json(
      { error: "Failed to delete teacher rating" },
      { status: 500 }
    );
  }
}