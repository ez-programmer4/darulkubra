import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ustazId = params.id;

  if (!ustazId) {
    return NextResponse.json(
      { error: "Ustaz ID is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Get all students for the given ustaz
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { ustaz: ustazId },
      select: { wdt_ID: true },
    });

    if (students.length === 0) {
      return NextResponse.json({ passed: 0, failed: 0 });
    }

    const studentIds = students.map((s) => s.wdt_ID);

    // 2. Get all test results for these students
    const testResults = await prisma.testResult.findMany({
      where: {
        studentId: { in: studentIds },
      },
      include: {
        question: {
          include: {
            test: true,
          },
        },
      },
    });

    // 3. Process results in memory
    // Group scores by student and then by test
    const scoresByStudentAndTest: {
      [studentId: number]: { [testId: string]: { score: number; test: any } };
    } = {};

    for (const result of testResults) {
      const { studentId, question, result: score } = result;
      const test = question.test;

      if (!scoresByStudentAndTest[studentId]) {
        scoresByStudentAndTest[studentId] = {};
      }
      if (!scoresByStudentAndTest[studentId][test.id]) {
        scoresByStudentAndTest[studentId][test.id] = { score: 0, test };
      }
      scoresByStudentAndTest[studentId][test.id].score += score;
    }

    // 4. Calculate pass/fail count
    let passed = 0;
    let failed = 0;

    for (const studentId in scoresByStudentAndTest) {
      for (const testId in scoresByStudentAndTest[studentId]) {
        const { score, test } = scoresByStudentAndTest[studentId][testId];
        if (score >= test.passingResult) {
          passed++;
        } else {
          failed++;
        }
      }
    }

    return NextResponse.json({ passed, failed });
  } catch (error) {
    console.error("Failed to get exam stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
