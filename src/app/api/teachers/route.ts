import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  console.log("Teachers API called");
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log("Session:", session);
  console.log("Session role:", session?.role);

  if (!session) {
    console.log("No session found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("User role:", session.role);
  // Allow registral, controller, and admin roles
  if (!["registral", "controller", "admin"].includes(session.role)) {
    console.log("Unauthorized role:", session.role);
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

    console.log("Fetching teachers from database");
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

    console.log("Raw teachers from DB:", teachers);

    // Transform to match the expected Teacher interface
    const transformedTeachers = teachers.map((teacher) => {
      console.log(`Teacher ${teacher.ustazname}:`, {
        ustazid: teacher.ustazid,
        controlId: teacher.controlId,
        control: teacher.control,
      });

      return {
        ustazid: teacher.ustazid,
        ustazname: teacher.ustazname,
        phone: teacher.phone || "",
        schedule: teacher.schedule || "",
        control: teacher.control,
      };
    });

    console.log("Transformed teachers:", transformedTeachers);
    return NextResponse.json(transformedTeachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
