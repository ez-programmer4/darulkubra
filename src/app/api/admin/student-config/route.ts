import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    if (type === "statuses") {
      const statuses = await prisma.studentStatus.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(statuses);
    }

    if (type === "packages") {
      const packages = await prisma.studentPackage.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(packages);
    }

    if (type === "subjects") {
      const subjects = await prisma.studentSubject.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(subjects);
    }

    // Return all configurations
    const [statuses, packages, subjects] = await Promise.all([
      prisma.studentStatus.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.studentPackage.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.studentSubject.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    ]);

    return NextResponse.json({ statuses, packages, subjects });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, name, action = "add", id } = await req.json();

    if (action === "add") {
      let result;
      if (type === "status") {
        result = await prisma.studentStatus.create({ data: { name } });
      } else if (type === "package") {
        result = await prisma.studentPackage.create({ data: { name } });
      } else if (type === "subject") {
        result = await prisma.studentSubject.create({ data: { name } });
      }
      return NextResponse.json({ success: true, id: result?.id });
    }

    if (action === "delete" && id) {
      if (type === "status") {
        await prisma.studentStatus.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      } else if (type === "package") {
        await prisma.studentPackage.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      } else if (type === "subject") {
        await prisma.studentSubject.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}