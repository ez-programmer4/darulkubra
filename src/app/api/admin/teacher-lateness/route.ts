import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to calculate minutes late based on time slot and join time
function calculateMinutesLate(timeSlot: string, joinTime: Date): number {
  const [startHour, startMinute] = timeSlot.split('-')[0].split(':').map(Number);
  const slotStart = new Date(joinTime);
  slotStart.setHours(startHour, startMinute, 0, 0);
  
  const lateMs = joinTime.getTime() - slotStart.getTime();
  return Math.max(0, Math.floor(lateMs / (1000 * 60)));
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!teacherId || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    // Get all time slots for the teacher in the given month
    const timeSlots = await prisma.wpos_ustaz_occupied_times.findMany({
      where: {
        ustaz_id: teacherId,
        occupied_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: true,
        teacher: true,
      },
    });

    // Get all zoom links for the teacher in the given month
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        ustazid: teacherId,
        sent_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        sent_time: true,
        studentid: true,
        clicked_at: true,
      },
    });

    // Process time slots to find late arrivals
    const lateTimeSlots = [];
    let totalLateMinutes = 0;
    let lateOccurrences = 0;

    for (const slot of timeSlots) {
      const zoomLink = zoomLinks.find(
        (zl) =>
          zl.studentid === slot.student_id &&
          zl.sent_time && slot.occupied_at &&
          new Date(zl.sent_time).toDateString() === new Date(slot.occupied_at).toDateString()
      );

      if (zoomLink && zoomLink.clicked_at) {
        const minutesLate = calculateMinutesLate(slot.time_slot, zoomLink.clicked_at);
        
        if (minutesLate > 5) { // Consider lateness only if more than 5 minutes
          const deduction = calculateLatenessDeduction(minutesLate, 30); // Fixed deduction rate
          
          lateTimeSlots.push({
            date: slot.occupied_at ? new Date(slot.occupied_at).toISOString() : new Date().toISOString(),
            timeSlot: slot.time_slot,
            studentName: (slot as any).student?.name || 'Unknown',
            minutesLate,
            deduction,
          });

          totalLateMinutes += minutesLate;
          lateOccurrences++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalLateMinutes,
      lateOccurrences,
      lateTimeSlots,
    });
  } catch (error) {
    console.error('Error fetching teacher lateness:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lateness data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate lateness deduction based on minutes late and package rate
function calculateLatenessDeduction(minutesLate: number, packageRate: number): number {
  // Deduct 1% of the package rate for every 5 minutes late, minimum 1%
  const deductionPercentage = Math.max(1, Math.floor(minutesLate / 5));
  return (packageRate * deductionPercentage) / 100;
}
