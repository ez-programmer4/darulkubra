import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: {
        ustazid: true,
        ustazname: true,
      },
      orderBy: {
        ustazname: "asc",
      },
    });

    return Response.json({
      teachers: teachers.map((teacher) => ({
        id: teacher.ustazid,
        name: teacher.ustazname,
      })),
    });
  } catch (error) {
    console.error("Teachers API error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
