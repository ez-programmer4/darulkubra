import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

function getStudentProgressStatus(student: any) {
  // Simple progress logic based on student status
  if (student.status === "Active") {
    return "inprogress";
  } else if (student.status === "Not yet") {
    return "notstarted";
  } else {
    return "notstarted";
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || !session.user || session.user.role !== "controller") {
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
    const controllerId = session.user.id?.toString();

    if (!controllerId) {
      return NextResponse.json(
        { error: "Controller ID not found" },
        { status: 400 }
      );
    }

    // Get controller code
    const controller = await prisma.wpos_wpdatatable_28.findFirst({
      where: { wdt_ID: Number(controllerId) },
      select: { code: true },
    });

    if (!controller) {
      return NextResponse.json(
        { error: "Controller not found" },
        { status: 404 }
      );
    }

    const page = currentPage > 0 ? currentPage : 1;
    const take = itemsPerPage > 0 ? itemsPerPage : 10;
    const skip = (page - 1) * take;

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

    // Get students for this controller only
    const students = await prisma.wpos_wpdatatable_23.findMany({
      where: {
        u_control: controller.code,
        status: { in: ["Active", "Not yet"] },
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
        status: true,
        chatId: true,
        teacher: {
          select: { ustazname: true },
        },
      },
    });

    // Process students with progress
    let studentsWithProgress = students.map((student) => {
      const progress = getStudentProgressStatus(student);

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

      return {
        id: student.wdt_ID,
        name: student.name || "Unknown",
        phoneNo: phoneNo || "",
        ustazname: student.teacher || "Not assigned",
        tglink: `https://t.me/${phoneNo}`,
        whatsapplink: `https://wa.me/${phoneNo}`,
        isKid: student.isKid || false,
        chatid: student.chatId,
        activePackage: student.package || "No Package",
        studentProgress: progress,
      };
    });

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
