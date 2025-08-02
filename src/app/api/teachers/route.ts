import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow registral, controller, and admin roles
  if (!["registral", "controller", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("search") || "";

    const whereClause = searchQuery
      ? {
          ustazname: { contains: searchQuery },
        }
      : {};

    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      where: whereClause,
      select: {
        ustazid: true,
        ustazname: true,
        phone: true,
        schedule: true,
        controlId: true,
        control: {
          select: {
            wdt_ID: true,
            username: true,
          },
        },
      },
    });

    // Transform to match the expected Teacher interface
    const transformedTeachers = teachers.map((teacher) => {
      return {
        ustazid: teacher.ustazid,
        ustazname: teacher.ustazname,
        phone: teacher.phone || "",
        schedule: teacher.schedule || "",
        control: teacher.control,
      };
    });

    return NextResponse.json(transformedTeachers);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
