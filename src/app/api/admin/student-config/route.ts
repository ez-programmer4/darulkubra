import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

async function initializeDefaultData() {
  try {
    const [statusCount, packageCount, subjectCount] = await Promise.all([
      prisma.studentStatus.count(),
      prisma.studentPackage.count(),
      prisma.studentSubject.count()
    ]);

    if (statusCount === 0) {
      const defaultStatuses = ["Active", "Inactive", "Not yet", "Leave", "Completed"];
      await Promise.all(
        defaultStatuses.map(status => 
          prisma.studentStatus.create({ data: { name: status } })
        )
      );
    }

    if (packageCount === 0) {
      const defaultPackages = ["0 Fee", "3 days", "5 days", "Europe"];
      await Promise.all(
        defaultPackages.map(pkg => 
          prisma.studentPackage.create({ data: { name: pkg } })
        )
      );
    }

    if (subjectCount === 0) {
      const defaultSubjects = ["Qaidah", "Nethor", "Hifz", "Kitab"];
      await Promise.all(
        defaultSubjects.map(subject => 
          prisma.studentSubject.create({ data: { name: subject } })
        )
      );
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    // Initialize default data if tables are empty
    await initializeDefaultData();

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
      const defaultStatuses = ["Active", "Inactive", "Not yet", "Leave", "Completed"];
      const defaultPackages = ["0 Fee", "3 days", "5 days", "Europe"];
      const defaultSubjects = ["Qaidah", "Nethor", "Hifz", "Kitab"];

      // Clear existing data and recreate
      await Promise.all([
        prisma.studentStatus.deleteMany({}),
        prisma.studentPackage.deleteMany({}),
        prisma.studentSubject.deleteMany({})
      ]);

      await Promise.all([
        ...defaultStatuses.map(status => 
          prisma.studentStatus.create({ data: { name: status } })
        ),
        ...defaultPackages.map(pkg => 
          prisma.studentPackage.create({ data: { name: pkg } })
        ),
        ...defaultSubjects.map(subject => 
          prisma.studentSubject.create({ data: { name: subject } })
        )
      ]);

      return NextResponse.json({ success: true, message: "Default data initialized" });
    }

    if (action === "add") {
      // Check for duplicates (case-insensitive)
      let exists = false;
      if (type === "status") {
        const existing = await prisma.studentStatus.findMany({
          where: {
            name: {
              mode: 'insensitive',
              equals: name
            }
          }
        });
        exists = existing.length > 0;
      } else if (type === "package") {
        const existing = await prisma.studentPackage.findMany({
          where: {
            name: {
              mode: 'insensitive',
              equals: name
            }
          }
        });
        exists = existing.length > 0;
      } else if (type === "subject") {
        const existing = await prisma.studentSubject.findMany({
          where: {
            name: {
              mode: 'insensitive',
              equals: name
            }
          }
        });
        exists = existing.length > 0;
      }

      if (exists) {
        return NextResponse.json({ error: `${name} already exists` }, { status: 400 });
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