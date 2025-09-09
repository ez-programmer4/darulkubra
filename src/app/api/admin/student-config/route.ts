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

    // Initialize default data if action is 'init'
    if (action === "init") {
      const defaultStatuses = ["Active", "Inactive", "Not yet", "Graduated", "Suspended"];
      const defaultPackages = ["Basic", "Standard", "Premium", "VIP", "Custom"];
      const defaultSubjects = ["Quran", "Arabic", "Islamic Studies", "Tajweed", "Hadith"];

      await Promise.all([
        ...defaultStatuses.map(status => 
          prisma.studentStatus.upsert({
            where: { name: status },
            update: {},
            create: { name: status }
          })
        ),
        ...defaultPackages.map(pkg => 
          prisma.studentPackage.upsert({
            where: { name: pkg },
            update: {},
            create: { name: pkg }
          })
        ),
        ...defaultSubjects.map(subject => 
          prisma.studentSubject.upsert({
            where: { name: subject },
            update: {},
            create: { name: subject }
          })
        )
      ]);

      return NextResponse.json({ success: true, message: "Default data initialized" });
    }

    if (action === "add") {
      // Check for duplicates
      let exists = false;
      if (type === "status") {
        exists = !!(await prisma.studentStatus.findUnique({ where: { name } }));
      } else if (type === "package") {
        exists = !!(await prisma.studentPackage.findUnique({ where: { name } }));
      } else if (type === "subject") {
        exists = !!(await prisma.studentSubject.findUnique({ where: { name } }));
      }

      if (exists) {
        return NextResponse.json({ error: "Item already exists" }, { status: 400 });
      }

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

    if (action === "update" && id && name) {
      if (type === "status") {
        await prisma.studentStatus.update({ where: { id: parseInt(id) }, data: { name } });
      } else if (type === "package") {
        await prisma.studentPackage.update({ where: { id: parseInt(id) }, data: { name } });
      } else if (type === "subject") {
        await prisma.studentSubject.update({ where: { id: parseInt(id) }, data: { name } });
      }
      return NextResponse.json({ success: true });
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