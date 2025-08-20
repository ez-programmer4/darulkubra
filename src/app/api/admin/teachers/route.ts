import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const controlId = searchParams.get("controlId");

    // First get teachers from the users table who are assigned to this controller
    const teacherUsers = await prisma.user.findMany({
      where: {
        role: "teacher",
        ...(controlId && { controlId: controlId }),
      },
      select: {
        id: true,
        name: true,
        controlId: true,
      },
    });

    return NextResponse.json({
      teachers: teacherUsers.map((t) => ({
        id: t.id,
        name: t.name,
        controllerId: t.controlId,
      })),
    });
  } catch (err) {
    console.error("Error fetching teachers:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
