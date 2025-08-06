import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "controller") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const controllerUsername = token.username;

  try {
    const controller = await prisma.wpos_wpdatatable_28.findUnique({
      where: { username: controllerUsername },
      select: { code: true },
    });

    if (!controller) {
      return NextResponse.json(
        { message: "Controller not found" },
        { status: 404 }
      );
    }

    const ustazs = await prisma.wpos_wpdatatable_24.findMany({
      where: {
        control: controller.code,
      },
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    return NextResponse.json(ustazs, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching assigned teachers" },
      { status: 500 }
    );
  }
}
