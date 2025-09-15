import { prisma } from "@/lib/prisma";

/**
 * Check if a deduction is waived for a specific teacher, date, and type
 */
export async function isDeductionWaived(
  teacherId: string,
  deductionDate: Date,
  deductionType: 'lateness' | 'absence'
): Promise<boolean> {
  try {
    const waiver = await prisma.deduction_waivers.findFirst({
      where: {
        teacherId,
        deductionType,
        deductionDate: {
          gte: new Date(deductionDate.getFullYear(), deductionDate.getMonth(), deductionDate.getDate()),
          lt: new Date(deductionDate.getFullYear(), deductionDate.getMonth(), deductionDate.getDate() + 1)
        }
      }
    });

    return !!waiver;
  } catch (error) {
    console.error('Error checking deduction waiver:', error);
    return false;
  }
}

/**
 * Get all waivers for a teacher in a date range
 */
export async function getTeacherWaivers(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  deductionType?: 'lateness' | 'absence'
) {
  try {
    const where: any = {
      teacherId,
      deductionDate: { gte: startDate, lte: endDate }
    };

    if (deductionType) {
      where.deductionType = deductionType;
    }

    return await prisma.deduction_waivers.findMany({
      where,
      orderBy: { deductionDate: 'asc' }
    });
  } catch (error) {
    console.error('Error fetching teacher waivers:', error);
    return [];
  }
}