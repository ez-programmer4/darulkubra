// Shared function to get exam pass/fail counts for a teacher
export async function getTeacherExamPassFail(prisma: any, teacherId: string) {
  // 1. Get all students for the given teacher
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: { ustaz: teacherId },
    select: { wdt_ID: true },
  });
  if (students.length === 0) {
    return { passed: 0, failed: 0 };
  }
  const studentIds = students.map((s: any) => s.wdt_ID);
  // 2. Get all test results for these students
  const testResults = await prisma.testresult.findMany({
    where: { studentId: { in: studentIds } },
    include: { testquestion: { include: { test: true } } },
  });
  // 3. Process results in memory
  const scoresByStudentAndTest: {
    [studentId: number]: { [testId: string]: { score: number; test: any } };
  } = {};
  for (const result of testResults) {
    const { studentId, testquestion, result: score } = result;
    const test = testquestion.test;
    if (!scoresByStudentAndTest[studentId])
      scoresByStudentAndTest[studentId] = {};
    if (!scoresByStudentAndTest[studentId][test.id])
      scoresByStudentAndTest[studentId][test.id] = { score: 0, test };
    scoresByStudentAndTest[studentId][test.id].score += score;
  }
  let passed = 0,
    failed = 0;
  for (const studentId in scoresByStudentAndTest) {
    for (const testId in scoresByStudentAndTest[studentId]) {
      const { score, test } = scoresByStudentAndTest[studentId][testId];
      if (score >= test.passingResult) passed++;
      else failed++;
    }
  }
  return { passed, failed };
}
