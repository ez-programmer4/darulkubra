import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getStudentProgressStatus(
  studentId: number,
  activePackageId: string
) {
  // 1. Get all chapters for the active package
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
      // Find the chapter details for that id
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
      (chapter) =>
        chapter.studentProgress[0] && !chapter.studentProgress[0]?.isCompleted
    ).length;
    const notStartedChapters =
      totalChapters - completedChapters - inProgressChapters;
    const progressPercent =
      totalChapters > 0
        ? Math.round((completedChapters / totalChapters) * 100)
        : 0;

    return {
      id: course.id,
      title: course.title,
      totalChapters,
      completedChapters,
      inProgressChapters,
      notStartedChapters,
      progressPercent,
      status:
        progressPercent === 100
          ? "completed"
          : progressPercent > 0
          ? "inprogress"
          : "notstarted",
    };
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const { searchParams } = new URL(req.url);
    const parentPhone = searchParams.get("parentPhone");

    if (!parentPhone) {
      return NextResponse.json(
        { error: "Parent phone is required" },
        { status: 400 }
      );
    }

    // Verify this student belongs to this parent
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID: parseInt(studentId),
        parent_phone: parentPhone,
      },
      select: {
        wdt_ID: true,
        name: true,
        subject: true,
        package: true,
        isKid: true,
        youtubeSubject: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found or access denied" },
        { status: 404 }
      );
    }

    // Get subject packages to find the active package
    const subjectPackages = await prisma.subjectPackage.findMany({
      select: {
        subject: true,
        kidpackage: true,
        packageType: true,
        packageId: true,
      },
      distinct: ["subject", "kidpackage", "packageType"],
    });

    const matchedSubjectPackage = subjectPackages.find(
      (sp) =>
        sp.subject === student.subject &&
        sp.packageType === student.package &&
        sp.kidpackage === student.isKid
    );

    const activePackageId =
      student.youtubeSubject ?? matchedSubjectPackage?.packageId;

    if (!activePackageId) {
      return NextResponse.json({
        success: true,
        terbiaProgress: {
          hasProgress: false,
          message: "No active Terbia package found for this student",
          progress: null,
          packageDetails: null,
        },
      });
    }

    // Get the active package name
    const activePackage = await prisma.coursePackage.findUnique({
      where: { id: activePackageId },
      select: { name: true },
    });

    // Get student progress status
    const progress = await getStudentProgressStatus(
      student.wdt_ID,
      activePackageId
    );

    // Get detailed package information
    const packageDetails = await getPackageDetails(
      activePackageId,
      student.wdt_ID
    );

    // Calculate overall progress
    const totalCourses = packageDetails.length;
    const completedCourses = packageDetails.filter(
      (course) => course.status === "completed"
    ).length;
    const inProgressCourses = packageDetails.filter(
      (course) => course.status === "inprogress"
    ).length;
    const notStartedCourses = packageDetails.filter(
      (course) => course.status === "notstarted"
    ).length;

    const overallProgress = {
      totalCourses,
      completedCourses,
      inProgressCourses,
      notStartedCourses,
      overallPercent:
        totalCourses > 0
          ? Math.round((completedCourses / totalCourses) * 100)
          : 0,
    };

    return NextResponse.json({
      success: true,
      terbiaProgress: {
        hasProgress: true,
        studentName: student.name,
        activePackage: activePackage?.name || "Unknown Package",
        activePackageId,
        progress,
        overallProgress,
        packageDetails,
      },
    });
  } catch (error: any) {
    console.error("Parent terbia progress error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
