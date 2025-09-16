import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [statuses, packages, subjects] = await Promise.all([
      prisma.studentstatus.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.studentpackage.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.studentsubject.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ statuses, packages, subjects });
  } catch (error: any) {
    console.error("Student config GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, name, action = "add", id } = await req.json();

    if (action === "init") {
      const defaultStatuses = ["Active", "Not yet", "Leave", "Completed"];
      const defaultPackages = ["0 Fee", "3 days", "5 days", "Europe"];
      const defaultSubjects = ["Qaidah", "Nethor", "Hifz", "Kitab"];

      await Promise.all([
        prisma.studentstatus.deleteMany({}),
        prisma.studentpackage.deleteMany({}),
        prisma.studentsubject.deleteMany({}),
      ]);

      await Promise.all([
        ...defaultStatuses.map((status) =>
          prisma.studentstatus.create({ data: { name: status } })
        ),
        ...defaultPackages.map((pkg) =>
          prisma.studentpackage.create({ data: { name: pkg } })
        ),
        ...defaultSubjects.map((subject) =>
          prisma.studentsubject.create({ data: { name: subject } })
        ),
      ]);

      return NextResponse.json({ success: true });
    }

    if (action === "add") {
      let result;
      if (type === "status") {
        result = await prisma.studentstatus.create({ data: { name } });
      } else if (type === "package") {
        result = await prisma.studentpackage.create({ data: { name } });
      } else if (type === "subject") {
        result = await prisma.studentsubject.create({ data: { name } });
      }
      return NextResponse.json({ success: true, id: result?.id });
    }

    if (action === "update" && id && name) {
      if (type === "status") {
        await prisma.studentstatus.update({
          where: { id: parseInt(id) },
          data: { name },
        });
      } else if (type === "package") {
        await prisma.studentpackage.update({
          where: { id: parseInt(id) },
          data: { name },
        });
      } else if (type === "subject") {
        await prisma.studentsubject.update({
          where: { id: parseInt(id) },
          data: { name },
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Student config POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}