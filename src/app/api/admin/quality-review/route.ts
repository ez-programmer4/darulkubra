import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { startOfWeek, parseISO } from "date-fns";
import { getTeacherExamPassFail } from "@/lib/examStats";

const ApprovalSchema = z.object({
  override: z.string().min(2),
  notes: z.string().optional(),
  bonus: z.number().min(0).max(100).optional(),
});

// Helper: aggregate controller feedback
function aggregateControllerFeedback(supervisorFeedback: string) {
  try {
    // Try to fix common JSON issues
    let cleanedFeedback = supervisorFeedback || "{}";

    // If the JSON is truncated, try to close it properly
    if (cleanedFeedback.includes('{"id":') && !cleanedFeedback.endsWith("}")) {
      // Find the last complete object and close the arrays/object
      const lastCompleteMatch = cleanedFeedback.match(
        /{"id":\d+,"note":"[^"]*","rating":\d+}/g
      );
      if (lastCompleteMatch) {
        const lastComplete = lastCompleteMatch[lastCompleteMatch.length - 1];
        const beforeLast = cleanedFeedback.substring(
          0,
          cleanedFeedback.lastIndexOf(lastComplete) + lastComplete.length
        );
        cleanedFeedback = beforeLast + "]}}";
      }
    }

    const parsed = JSON.parse(cleanedFeedback);
    const result = {
      positive: parsed.positive || [],
      negative: parsed.negative || [],
    };
    return result;
  } catch (error) {
    // Try to extract what we can from the malformed JSON
    try {
      const positiveMatches =
        supervisorFeedback.match(/{"id":\d+,"note":"[^"]*","rating":\d+}/g) ||
        [];
      const positive = positiveMatches.map((match: string) => {
        const idMatch = match.match(/"id":(\d+)/);
        const noteMatch = match.match(/"note":"([^"]*)"/);
        const ratingMatch = match.match(/"rating":(\d+)/);
        return {
          id: idMatch ? parseInt(idMatch[1]) : 0,
          title: `Feedback ${idMatch ? idMatch[1] : "Unknown"}`,
          note: noteMatch ? noteMatch[1] : "",
          rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
        };
      });

      return { positive, negative: [] };
    } catch (extractError) {
      return { positive: [], negative: [] };
    }
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

  return {
    transformedPositiveRatings: validPositiveRatings,
    transformedNegativeRatings: validNegativeRatings,
    totalRawScore,
    totalNumberOfItems,
    finalScoreOutOf10,
  };
}

function sumRatings(arr: any[]) {
  return arr.reduce((sum, c) => sum + (Number(c.rating) || 0), 0);
}

// Helper: calculate sum of original ratings (for display badges)
function sumOriginalRatings(arr: any[]) {
  return arr.reduce((sum, c) => sum + (Number(c.rating) || 0), 0);
}

// Helper: calculate sum of transformed negative ratings (for display badges)
function sumTransformedNegativeRatings(arr: any[]) {
  return arr.reduce((sum, c) => sum + (11 - Number(c.rating) || 0), 0);
}

// Helper to send SMS
async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;
  if (apiToken && senderUid && senderName) {
    const payload = {
      from: senderUid,
      sender: senderName,
      to: phone,
      message,
    };
    await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
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
  // Get all quality assessments for the week (range)
  const assessments = await prisma.qualityassessment.findMany({
    where: {
      weekStart: {
        gte: weekStart,
        lt: nextWeek,
      },
    },
    include: { wpos_wpdatatable_24: true },
  });

  // Use direct DB query for exam pass rate for each teacher
  const teacherStats = await Promise.all(
    assessments.map(async (a) => {
      let examPassRate = null;
      let examSampleSize = 0;
      try {
        const { passed, failed } = await getTeacherExamPassFail(
          prisma,
          a.teacherId
        );
        const total = passed + failed;
        examPassRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        examSampleSize = total;
      } catch {}
      return { ...a, examPassRate, examSampleSize };
    })
  );
  // Aggregate per teacher
  const teachers = teacherStats.map((a) => {
    const feedback = aggregateControllerFeedback(a.supervisorFeedback);
    const controlRate = calculateControlRate(feedback);
    const positiveSum = sumOriginalRatings(feedback.positive);
    const negativeSum = sumOriginalRatings(feedback.negative); // Keep original for display
    const positiveCount = feedback.positive.length;
    const negativeCount = feedback.negative.length;
    const teacherData = {
      teacherId: a.teacherId,
      teacherName: a.wpos_wpdatatable_24?.ustazname || a.teacherId,
      controllerFeedback: feedback,
      controlRate,
      positiveSum,
      negativeSum,
      positiveCount,
      negativeCount,
      examPassRate: a.examPassRate,
      examSampleSize: a.examSampleSize,
      examinerRating: a.examinerRating ?? Math.round(Math.random() * 10), // mock
      overallQuality: a.overallQuality,
      managerOverride: a.managerOverride ? a.overallQuality : undefined,
      overrideNotes: a.overrideNotes,
      bonusAwarded: a.bonusAwarded,
    };
    return teacherData;
  });

  return NextResponse.json(teachers);
}

export async function POST(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");
  const weekStartStr = url.searchParams.get("weekStart");
  if (!teacherId || !weekStartStr) {
    return NextResponse.json(
      { error: "Missing teacherId or weekStart" },
      { status: 400 }
    );
  }
  // Always use UTC midnight for weekStart
  const weekStart = new Date(weekStartStr);
  const body = await req.json();
  const parse = ApprovalSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parse.error.issues },
      { status: 400 }
    );
  }
  const { override, notes, bonus } = parse.data;

  // Update or create the assessment for this teacher/week
  const updated = await prisma.qualityassessment.updateMany({
    where: { teacherId, weekStart },
    data: {
      overallQuality: override,
      managerApproved: true,
      managerOverride: true,
      overrideNotes: notes,
      bonusAwarded: override === "Exceptional" ? Math.min(bonus ?? 0, 100) : 0,
    },
  });

  // If bonus is awarded, send notification and SMS
  if (override === "Exceptional" && bonus && bonus > 0) {
    // Find teacher record for SMS and (if possible) notification
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { phone: true, ustazname: true },
    });
    // Notification: skip if no valid int userId mapping
    try {
      // Attempt to find a teacher userId (int) for notification
      // (If you have a mapping, use it. Otherwise, skip notification.)
      // await prisma.notification.create({ ... })
    } catch (e) {}
    // SMS notification
    if (teacher?.phone) {
      const smsMessage = `Dear ${
        teacher.ustazname || "Teacher"
      }, you have been awarded a bonus of ${bonus} ETB for exceptional quality this week. Congratulations!`;
      await sendSMS(teacher.phone, smsMessage);
    }
  }
  // Log override for audit (optional: implement AuditLog)
  return NextResponse.json({ success: true });
}
