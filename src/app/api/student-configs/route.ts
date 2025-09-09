import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Public endpoint - no authentication required for reading configurations
    const [statuses, packages, subjects] = await Promise.all([
      prisma.studentStatus.findMany({ 
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.studentPackage.findMany({ 
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.studentSubject.findMany({ 
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