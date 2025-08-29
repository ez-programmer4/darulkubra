import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

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

        const result = {
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
        };

        console.log(
          `[DEBUG] Final selectedTime for ${student.name}: ${
            occupiedTime?.time_slot ?? "null"
          }`
        );
        return result;
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
