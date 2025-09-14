import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: { ustazid: true, ustazname: true },
      orderBy: { ustazname: 'asc' }
    });

    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.ustazid,
      name: teacher.ustazname || 'Unknown Teacher'
    }));

    return NextResponse.json(formattedTeachers);
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}