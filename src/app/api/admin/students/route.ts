import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const offset = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {};
    
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (status) {
      whereClause.status = status;
    }

    // Get students with pagination
    const [students, total] = await Promise.all([
      prisma.wpos_wpdatatable_23.findMany({
        where: whereClause,
        select: {
          wdt_ID: true,
          name: true,
          status: true,
          startdate: true,
          ustaz: true,
          phoneno: true,
          registrationdate: true,
        },
        orderBy: {
          registrationdate: 'desc'
        },
        skip: offset,
        take: limit,
      }),
      prisma.wpos_wpdatatable_23.count({
        where: whereClause,
      }),
    ]);

    // Get ustaz names for assigned students
    const ustazIds = students
      .map(s => s.ustaz)
      .filter((id): id is string => Boolean(id))
      .filter((id, index, arr) => arr.indexOf(id) === index);

    const ustazData = await prisma.wpos_wpdatatable_24.findMany({
      where: {
        ustazid: {
          in: ustazIds
        }
      },
      select: {
        ustazid: true,
        ustazname: true,
      }
    });

    const ustazMap = ustazData.reduce((acc, ustaz) => {
      if (ustaz.ustazid && ustaz.ustazname) {
        acc[ustaz.ustazid] = ustaz.ustazname;
      }
      return acc;
    }, {} as Record<string, string>);

    // Format response
    const formattedStudents = students.map(student => ({
      id: student.wdt_ID,
      name: student.name,
      status: student.status,
      startDate: student.startdate,
      ustazName: student.ustaz ? ustazMap[student.ustaz] : null,
      phone: student.phoneno,
      email: null,
      registrationDate: student.registrationdate,
    }));

    return NextResponse.json({
      students: formattedStudents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("Admin students API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}