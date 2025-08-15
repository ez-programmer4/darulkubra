import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { startOfWeek, parseISO } from "date-fns";
import { getTeacherExamPassFail } from "@/lib/examStats";

// Helper to map category IDs to names
async function enrichFeedbackWithDescriptions(feedback: any) {
  const allIds = [
    ...(feedback.positive?.map((f: any) => f.id) || []),
    ...(feedback.negative?.map((f: any) => f.id) || []),
  ];
  if (allIds.length === 0) return feedback;
  const categories = await prisma.qualitydescription.findMany({
    where: { id: { in: allIds } },
  });
  const catMap = Object.fromEntries(
    categories.map((c) => [c.id, c.description])
  );

  function enrich(arr: any[]) {
    return arr.map((item) => ({
      ...item,
      description: item.description || catMap[item.id] || "",
    }));
  }

  return {
    positive: enrich(feedback.positive || []),
    negative: enrich(feedback.negative || []),
  };
}

function aggregateControllerFeedback(supervisorFeedback: string) {
  try {
    const parsed = JSON.parse(supervisorFeedback || "{}");
    return {
      positive: parsed.positive || [],
      negative: parsed.negative || [],
    };
  } catch {
    return { positive: [], negative: [] };
  }
}

// Helper: calculate control rate (average of all ratings)
function calculateControlRate(feedback: { positive: any[]; negative: any[] }) {
  // Transform negative ratings: 11 - original_rating (where 10 is 'strongly present/bad')
  const positiveRatings =
    feedback.positive?.map((c: any) => Number(c.rating)) || [];
  const negativeRatings =
    feedback.negative?.map((c: any) => 11 - Number(c.rating)) || [];

  // Filter out invalid ratings
  const validPositiveRatings = positiveRatings.filter((n) => !isNaN(n));
  const validNegativeRatings = negativeRatings.filter((n) => !isNaN(n));

  // Sum all ratings (positive + transformed negative)
  const totalRawScore =
    validPositiveRatings.reduce((sum, n) => sum + n, 0) +
    validNegativeRatings.reduce((sum, n) => sum + n, 0);

  // Count total items
  const totalNumberOfItems =
    validPositiveRatings.length + validNegativeRatings.length;

  // Calculate final score out of 10
  if (totalNumberOfItems === 0) return null;

  const finalScoreOutOf10 = totalRawScore / totalNumberOfItems;

  return finalScoreOutOf10;
}

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const weekStartStr = url.searchParams.get("weekStart");
  // Always use UTC midnight for weekStart
  const weekStart = weekStartStr
    ? new Date(weekStartStr)
    : new Date(
        startOfWeek(new Date(), { weekStartsOn: 1 })
          .toISOString()
          .split("T")[0] + "T00:00:00.000Z"
      );
  const nextWeek = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Only return manager-approved assessments for this teacher and week
  const assessments = await prisma.qualityassessment.findMany({
    where: {
      weekStart: {
        gte: weekStart,
        lt: nextWeek,
      },
      teacherId: session.id,
      managerApproved: true,
    },
    include: { wpos_wpdatatable_24: true },
  });
  // Debug info
  const debug = {
    sessionId: session.id,
    weekStart: weekStart.toISOString(),
    found: assessments.length,
    teacherIds: assessments.map((a) => a.teacherId),
  };
  if (assessments.length === 0) {
    return NextResponse.json(
      { error: "No assessments found", debug },
      { status: 404 }
    );
  }
  // Use direct DB query for exam pass rate for each teacher with adjusted calculation
  const SCHOOL_AVERAGE_PASS_RATE = 0.75; // 75%
  const IMAGINARY_STUDENTS = 8;
  
  const teacherStats = await Promise.all(
    assessments.map(async (a) => {
      let examPassRate = null;
      let adjustedExamPassRate = null;
      let studentsTotal = 0;
      try {
        const { passed, failed } = await getTeacherExamPassFail(
          prisma,
          a.teacherId
        );
        const total = passed + failed;
        studentsTotal = total;
        
        if (total > 0) {
          // Raw pass rate
          const rawPassRate = (passed / total) * 100;
          
          // Adjusted pass rate calculation
          const imaginaryPasses = IMAGINARY_STUDENTS * SCHOOL_AVERAGE_PASS_RATE;
          const adjustedPassed = passed + imaginaryPasses;
          const adjustedTotal = total + IMAGINARY_STUDENTS;
          adjustedExamPassRate = Math.round((adjustedPassed / adjustedTotal) * 100);
          
          examPassRate = Math.round(rawPassRate);
        } else {
          examPassRate = 0;
          adjustedExamPassRate = Math.round(SCHOOL_AVERAGE_PASS_RATE * 100);
        }
      } catch {}
      // Enrich feedback with real category names
      let feedback = {};
      try {
        feedback = JSON.parse(a.supervisorFeedback || "{}");
      } catch {
        feedback = { positive: [], negative: [] };
      }
      const enrichedFeedback = await enrichFeedbackWithDescriptions(feedback);
      return {
        ...a,
        examPassRate,
        adjustedExamPassRate,
        studentsTotal,
        controllerFeedback: enrichedFeedback,
      };
    })
  );
  // Aggregate per teacher
  const teachers = teacherStats.map((a) => {
    const controlRate = calculateControlRate(a.controllerFeedback);
    // Use manager override if present
    const quality = a.managerOverride ? a.overallQuality : a.overallQuality;
    const notes = a.managerOverride ? a.overrideNotes : a.overrideNotes;
    const bonus = a.managerOverride ? a.bonusAwarded : a.bonusAwarded;
    return {
      teacherId: a.teacherId,
      teacherName: a.wpos_wpdatatable_24?.ustazname || a.teacherId,
      weekStart: a.weekStart ? a.weekStart.toISOString() : undefined,
      controllerFeedback: a.controllerFeedback,
      controlRate,
      examPassRate: a.adjustedExamPassRate, // Use adjusted pass rate
      rawExamPassRate: a.examPassRate, // Keep raw for reference
      studentsTotal: a.studentsTotal,
      examinerRating: a.examinerRating ?? Math.round(Math.random() * 10), // mock
      overallQuality: quality,
      overrideNotes: notes,
      bonusAwarded: bonus,
    };
  });
  return NextResponse.json({ teachers, debug });
}
