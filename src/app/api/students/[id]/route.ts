import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (
    !session ||
    (session.role !== "controller" &&
      session.role !== "registral" &&
      session.role !== "admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: {
        wdt_ID: parseInt(params.id),
      },
      select: {
        wdt_ID: true,
        name: true,
        startdate: true,
        classfee: true,
        registrationdate: true,
        u_control: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Ownership check: only enforce for controllers. Admin/registral can access any student.
    if (session.role === "controller") {
      // Resolve controller code: prefer token, fallback to lookup by username
      let controllerCode: string | null | undefined = (session as any).code;
      if (!controllerCode && (session as any).username) {
        const controller = await prisma.wpos_wpdatatable_28.findUnique({
          where: { username: (session as any).username as string },
          select: { code: true },
        });
        controllerCode = controller?.code;
      }

      if (!controllerCode || student.u_control !== controllerCode) {
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
