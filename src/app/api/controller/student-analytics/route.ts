import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
async function getLastSeen(studentId: number): Promise<string> {
  const lastProgressUpdatedDate = await prisma.studentProgress.findFirst({
    where: {
      studentId,
    },
    select: {
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!lastProgressUpdatedDate) return "-";

  const daysAgo = differenceInDays(
    new Date(),
    lastProgressUpdatedDate.updatedAt
  );

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "1 day ago";
  if (daysAgo <= 7) return `${daysAgo} days ago`;
  if (daysAgo <= 14) return "1 week ago";
  if (daysAgo <= 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  if (daysAgo <= 60) return "1 month ago";
  if (daysAgo <= 365) return `${Math.floor(daysAgo / 30)} months ago`;
  if (daysAgo <= 730) return "1 year ago";
  return `${Math.floor(daysAgo / 365)} years ago`;
}
async function getAttendanceofAllStudents(studentIds: number[]) {
  try {
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: { wdt_ID: { in: studentIds } },
    });

    if (students.length === 0) {
      return {};
    }

    const records = await prisma.tarbiaAttendance.findMany({
      where: { studId: { in: studentIds } },
      select: { studId: true, status: true },
    });

    if (records.length === 0) {
      return {};
    }

    // Group attendance by student
    const attendanceMap: Record<number, { present: number; absent: number }> =
      {};

    for (const id of studentIds) {
      attendanceMap[id] = { present: 0, absent: 0 };
    }

    for (const record of records) {
      if (record.status) {
        attendanceMap[record.studId].present += 1;
      } else {
        attendanceMap[record.studId].absent += 1;
      }
    }

    return attendanceMap;
  } catch (error) {
    console.log("አቴንዳንስ ማሳየት ላይ ችግር አለ: ", error);
    return {};
  }
}

async function correctExamAnswer(
  coursesPackageId: string,
  studentId: number
) {
  try {
    const questions = await prisma.question.findMany({
      where: { packageId: coursesPackageId },
      select: { id: true },
    });

    if (!questions.length) {
      console.error(
        "No questions found for coursesPackageId:",
        coursesPackageId
      );
    }

    const questionIds = questions.map((q) => q.id);
    const studentQuiz = await prisma.studentQuiz.findMany({
      where: {
        studentId: studentId,
        questionId: { in: questionIds },
        isFinalExam: true,
      },
      select: {
        id: true,
      },
    });
    if (!studentQuiz) {
      console.log("there is no students queiz");
      return undefined;
    }
    console.log("Fetching student quiz answers for studentId:", studentId);
    const studentQuizAnswers = await prisma.studentQuizAnswer.findMany({
      where: {
        studentQuiz: {
          studentId: studentId,
          questionId: { in: questionIds },
          isFinalExam: true,
        },
      },
      select: {
        studentQuiz: { select: { questionId: true } },
        selectedOptionId: true,
      },
    });
    if (!studentQuizAnswers) {
      console.log("there is no studentsanswer for the exam");
      return undefined;
    }
    const studentResponse: { [questionId: string]: string[] } = {};
    for (const ans of studentQuizAnswers) {
      const qid = ans.studentQuiz.questionId;
      if (!studentResponse[qid]) studentResponse[qid] = [];
      studentResponse[qid].push(ans.selectedOptionId);
    }

    console.log("Fetching correct answers for questions:", questionIds);
    const questionAnswersRaw = await prisma.questionAnswer.findMany({
      where: { questionId: { in: questionIds } },
      select: { questionId: true, answerId: true },
    });

    const questionAnswers: { [questionId: string]: string[] } = {};
    for (const qa of questionAnswersRaw) {
      if (!questionAnswers[qa.questionId]) questionAnswers[qa.questionId] = [];
      questionAnswers[qa.questionId].push(qa.answerId);
    }

    const total = questionIds.length;
    let correct = 0;

    for (const questionId of questionIds) {
      const correctAnswers = questionAnswers[questionId]?.sort() || [];
      const userAnswers = studentResponse[questionId]?.sort() || [];
      const isCorrect =
        correctAnswers.length === userAnswers.length &&
        correctAnswers.every((v, i) => v === userAnswers[i]);
      if (isCorrect) correct++;
    }

    const result = {
      total,
      correct,
      score: correct / total ? correct / total : 0,
    };

    console.log("Exam Result calculated:", result);
    return { studentResponse: await studentResponse, questionAnswers, result };
  } catch (error) {
    console.error("Error in correctAnswer:", error);
    throw new Error("Failed to calculate the correct answers.");
  }
}

async function checkFinalExamCreation(
  studentId: number,
  packageId: string
) {
  try {
    // 1. Check if a registration for this student and package already exists
    const updateProhibibted = await prisma.finalExamResult.findFirst({
      where: {
        studentId: studentId,
        packageId: packageId,
      },
      select: {
        id: true,
        updationProhibited: true,
      },
    });
    if (!updateProhibibted) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.error("update prohibted errror", error);
    return false; // Re-throw the error to be handled by the caller
  }
}

async function checkingUpdateProhibition(
  studentId: number,
  packageId: string
) {
  try {
    // 1. Check if a registration for this student and package already exists
    const updateProhibibted = await prisma.finalExamResult.findFirst({
      where: {
        studentId: studentId,
        packageId: packageId,
      },
      select: {
        id: true,
        updationProhibited: true,
      },
    });

    if (updateProhibibted?.updationProhibited === true) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("update prohibted errror", error);
    return false; // Re-throw the error to be handled by the caller
  }
}
async function getStudentProgressStatus(
  studentId: number,
  activePackageId: string
) {
  const chapters = await prisma.chapter.findMany({
    where: { course: { packageId: activePackageId } },
    select: {
      id: true,
      title: true,
      course: { select: { title: true, package: { select: { name: true } } } },
    },
  });
  const chapterIds = chapters.map((ch) => ch.id);

  const progress = await prisma.studentProgress.findMany({
    where: {
      studentId,
      chapterId: { in: chapterIds },
    },
    select: { isCompleted: true, chapterId: true },
  });

  if (progress.length > 0) {
    if (progress.filter((p) => p.isCompleted).length === chapterIds.length) {
      return "completed";
    } else {
      const firstIncomplete = progress.find((p) => !p.isCompleted);
      const chapter = chapters.find(
        (ch) => ch.id === firstIncomplete?.chapterId
      );
      const chapterTitle = chapter?.title ?? null;
      const courseTitle = chapter?.course?.title ?? null;
      const packageName = chapter?.course?.package?.name ?? null;

      const percent = getProgressPercent(progress, chapterIds.length);
      return `${packageName} > ${courseTitle} > ${chapterTitle} -> ${percent}%`;
    }
  } else {
    return "notstarted";
  }
}

function getProgressPercent(
  progress: { isCompleted: boolean }[],
  total: number
): number {
  if (progress.length === 0) return 0;
  const completed = progress.filter((p) => p.isCompleted).length;
  return Number((completed / total) * 100);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "controller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search") || "";
    const currentPage = parseInt(searchParams.get("page") || "1");
    const itemsPerPage = parseInt(searchParams.get("limit") || "10");
    const progressFilter =
      (searchParams.get("progress") as
        | "notstarted"
        | "inprogress"
        | "completed"
        | "all") || "all";
    const lastSeenFilter = searchParams.get("lastSeen") || "all";
    const examFilter = searchParams.get("examStatus") || "all";
    const packageDetails = searchParams.get("packageDetails");
    const controllerId = session.id?.toString();

    if (!controllerId) {
      return NextResponse.json(
        { error: "Controller ID not found" },
        { status: 400 }
      );
    }

    const page = currentPage > 0 ? currentPage : 1;
    const take = itemsPerPage > 0 ? itemsPerPage : 10;
    const skip = (page - 1) * take;

    // Get all subjectPackages
    const subjectPackages = await prisma.subjectPackage.findMany({
      select: {
        subject: true,
        kidpackage: true,
        packageType: true,
        packageId: true,
      },
      distinct: ["subject", "kidpackage", "packageType"],
    });

    const subjectPackageFilters = subjectPackages.map((sp) => ({
      subject: sp.subject,
      package: sp.packageType,
      isKid: sp.kidpackage,
    }));

    const searchFilter = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm } },
            { phoneno: { contains: searchTerm } },
            ...(Number.isNaN(Number(searchTerm))
              ? []
              : [{ wdt_ID: Number(searchTerm) }]),
          ],
        }
      : {};

    // Get students using controller relation
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        controller: { wdt_ID: Number(controllerId) },
        status: { in: ["Active", "Not yet"] },
        OR: subjectPackageFilters,
        ...searchFilter,
      },
      orderBy: { wdt_ID: "asc" },
      select: {
        wdt_ID: true,
        name: true,
        phoneno: true,
        country: true,
        isKid: true,
        subject: true,
        package: true,
        chatId: true,
        teacher: {
          select: { ustazname: true },
        },
      },
    });
    const attendanceMap = await getAttendanceofAllStudents(
      students.map((s) => s.wdt_ID)
    );

    // Process students with progress
    let studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        const matchedSubjectPackage = subjectPackages.find(
          (sp) =>
            sp.subject === student.subject &&
            sp.packageType === student.package &&
            sp.kidpackage === student.isKid
        );
        const activePackageId = matchedSubjectPackage?.packageId ?? "";

        const progress = await getStudentProgressStatus(
          student.wdt_ID,
          activePackageId
        );

        const activePackage = await prisma.coursePackage.findUnique({
          where: { id: activePackageId },
          select: { name: true },
        });

        // Format phone number
        let phoneNo = student.phoneno;
        if (phoneNo) {
          phoneNo = phoneNo.split("").reverse().slice(0, 9).reverse().join("");
          let countryCode = "+251";

          const countryMap: { [key: string]: string } = {
            ethiopia: "+251",
            anguilla: "+1",
            "saudi arabia": "+966",
            canada: "+1",
            "united arab emirates": "+971",
            kuwait: "+965",
            usa: "+1",
            "united states": "+1",
            "united states of america": "+1",
            china: "+86",
            "south africa": "+27",
            cuba: "+53",
            "equatorial guinea": "+240",
            sweden: "+46",
            qatar: "+974",
            angola: "+244",
            pakistan: "+92",
            norway: "+47",
            netherlands: "+31",
            bahrain: "+973",
            turkey: "+90",
            egypt: "+20",
            germany: "+49",
            italy: "+39",
            djibouti: "+253",
            mongolia: "+976",
          };

          countryCode =
            countryMap[(student.country || "").toLowerCase()] || "+251";
          phoneNo = `${countryCode}${phoneNo}`;
        }

        // Fetch occupied time for this student
        console.log(
          `[DEBUG] Fetching occupied time for student ID: ${student.wdt_ID}`
        );
        const occupiedTime = await prisma.wpos_ustaz_occupied_times.findFirst({
          where: { student_id: student.wdt_ID },
          select: { time_slot: true },
        });
        console.log(
          `[DEBUG] Student ${student.wdt_ID} (${student.name}) occupied time result:`,
          occupiedTime
        );
        let examResult = { total: 0, correct: 0, score: 0 };
        let hasFinalExam = false;
        let isUpdateProhibited = false;
        if (progress === "completed") {
          const [examData, finalExamStatus, updateProhibition] =
            await Promise.all([
              correctExamAnswer(activePackageId, student.wdt_ID),
              checkFinalExamCreation(student.wdt_ID, activePackageId),
              checkingUpdateProhibition(student.wdt_ID, activePackageId),
            ]);

          if (examData?.result) examResult = examData.result;
          hasFinalExam = !!finalExamStatus;
          isUpdateProhibited = !!updateProhibition;
        }

        const attendance = attendanceMap[student.wdt_ID] ?? {
          present: 0,
          absent: 0,
        };
        const totalSessions = attendance.present + attendance.absent;
        const lastSeen = await getLastSeen(student.wdt_ID);

        const studentResult = {
          id: student.wdt_ID,
          name: student.name,
          phoneNo,
          ustazname: student.teacher?.ustazname ?? "",
          tglink: `https://t.me/${phoneNo}`,
          whatsapplink: `https://wa.me/${phoneNo}`,
          isKid: student.isKid,
          chatid: student.chatId,
          activePackage: activePackage?.name ?? "",
          studentProgress: progress,
          selectedTime: occupiedTime?.time_slot ?? null,
          result: examResult,
          hasFinalExam,
          isUpdateProhibited,
          attendance: `P-${attendance.present} A-${attendance.absent} T-${totalSessions}`,
          totalSessions,
          lastSeen,
          activePackageId,
        };

        console.log(
          `[DEBUG] Final selectedTime for ${student.name}: ${
            occupiedTime?.time_slot ?? "null"
          }`
        );
        return studentResult;
      })
    );

    // Filter by progress
    if (progressFilter && progressFilter !== "all") {
      studentsWithProgress = studentsWithProgress.filter((student) => {
        if (progressFilter === "inprogress") {
          return (
            student.studentProgress !== "completed" &&
            student.studentProgress !== "notstarted"
          );
        } else {
          return student.studentProgress === progressFilter;
        }
      });
    }

    // Filter by last seen
    if (lastSeenFilter && lastSeenFilter !== "all") {
      studentsWithProgress = studentsWithProgress.filter((student) => {
        const lastSeen = student.lastSeen;
        if (lastSeenFilter === "today") return lastSeen === "Today";
        if (lastSeenFilter === "week")
          return lastSeen.includes("day") || lastSeen === "Today";
        if (lastSeenFilter === "month")
          return !lastSeen.includes("month") && !lastSeen.includes("year");
        if (lastSeenFilter === "inactive")
          return (
            lastSeen.includes("month") ||
            lastSeen.includes("year") ||
            lastSeen === "-"
          );
        return true;
      });
    }

    // Filter by exam status
    if (examFilter && examFilter !== "all") {
      studentsWithProgress = studentsWithProgress.filter((student) => {
        if (examFilter === "taken") return student.hasFinalExam;
        if (examFilter === "nottaken") return !student.hasFinalExam && student.studentProgress === "completed";
        if (examFilter === "passed") return student.hasFinalExam && student.result.score >= 0.6;
        if (examFilter === "failed") return student.hasFinalExam && student.result.score < 0.6;
        return true;
      });
    }

    // Handle package details request
    if (packageDetails) {
      const student = studentsWithProgress.find(
        (s) => s.id === parseInt(packageDetails)
      );
      if (student && student.activePackageId) {
        const packageInfo = await getPackageDetails(
          student.activePackageId,
          student.id
        );
        return NextResponse.json({ packageDetails: packageInfo });
      }
    }

    // Paginate
    const totalRecords = studentsWithProgress.length;
    const totalPages = Math.ceil(totalRecords / take);
    const paginatedStudents = studentsWithProgress.slice(skip, skip + take);

    return NextResponse.json({
      data: paginatedStudents,
      pagination: {
        currentPage: page,
        totalPages,
        itemsPerPage: take,
        totalRecords,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getPackageDetails(packageId: string, studentId: number) {
  const courses = await prisma.course.findMany({
    where: { packageId },
    include: {
      chapters: {
        include: {
          studentProgress: {
            where: { studentId },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return courses.map((course) => {
    const totalChapters = course.chapters.length;
    const completedChapters = course.chapters.filter(
      (chapter) => chapter.studentProgress[0]?.isCompleted
    ).length;
    const inProgressChapters = course.chapters.filter(
      (chapter) => chapter.studentProgress[0] && !chapter.studentProgress[0]?.isCompleted
    ).length;
    const notStartedChapters = totalChapters - completedChapters - inProgressChapters;
    const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    return {
      id: course.id,
      title: course.title,
      totalChapters,
      completedChapters,
      inProgressChapters,
      notStartedChapters,
      progressPercent,
      status: progressPercent === 100 ? 'completed' : progressPercent > 0 ? 'inprogress' : 'notstarted'
    };
  });
}
