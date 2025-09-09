import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    // Initialize default data if tables are empty
    await initializeDefaultData();
    
    // Public endpoint - no authentication required for reading configurations
    const [statuses, packages, subjects] = await Promise.all([
      prisma.studentStatus.findMany({ 
        where: { isActive: true }, 
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.studentPackage.findMany({ 
        where: { isActive: true }, 
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.studentSubject.findMany({ 
        where: { isActive: true }, 
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      })
    ]);

    return NextResponse.json({ statuses, packages, subjects });

  } catch (error: any) {
    console.error('Error fetching student configurations:', error);
    
    // Return fallback data if database fails
    return NextResponse.json({
      statuses: [
        { id: 1, name: 'Active' },
        { id: 2, name: 'Inactive' },
        { id: 3, name: 'Not yet' },
        { id: 4, name: 'Leave' },
        { id: 5, name: 'Completed' }
      ],
      packages: [
        { id: 1, name: '0 Fee' },
        { id: 2, name: '3 days' },
        { id: 3, name: '5 days' },
        { id: 4, name: 'Europe' }
      ],
      subjects: [
        { id: 1, name: 'Qaidah' },
        { id: 2, name: 'Nethor' },
        { id: 3, name: 'Hifz' },
        { id: 4, name: 'Kitab' }
      ]
    });
  }
}