import { prisma } from "@/lib/prisma";

export async function isDeductionWaived(
  teacherId: string,
  date: Date,
  type: 'lateness' | 'absence'
): Promise<boolean> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check for waiver settings that cover this teacher and date
    const waivers = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: `deduction_waiver_waive_${type}`
        }
      }
    });
    
    for (const waiver of waivers) {
      try {
        const waiverData = JSON.parse(waiver.value || '{}');
        
        // Extract date range from the key
        const keyParts = waiver.key.split('_');
        const startDate = keyParts[keyParts.length - 2];
        const endDate = keyParts[keyParts.length - 1];
        
        // Check if this teacher and date are covered by the waiver
        if (
          waiverData.teacherIds?.includes(teacherId) &&
          dateStr >= startDate &&
          dateStr <= endDate
        ) {
          return true;
        }
      } catch (error) {
        console.error('Error parsing waiver data:', error);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking deduction waiver:', error);
    return false;
  }
}

export async function getWaiverInfo(
  teacherId: string,
  date: Date,
  type: 'lateness' | 'absence'
): Promise<{ isWaived: boolean; reason?: string; adminId?: string } | null> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    const waivers = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: `deduction_waiver_waive_${type}`
        }
      }
    });
    
    for (const waiver of waivers) {
      try {
        const waiverData = JSON.parse(waiver.value || '{}');
        
        const keyParts = waiver.key.split('_');
        const startDate = keyParts[keyParts.length - 2];
        const endDate = keyParts[keyParts.length - 1];
        
        if (
          waiverData.teacherIds?.includes(teacherId) &&
          dateStr >= startDate &&
          dateStr <= endDate
        ) {
          return {
            isWaived: true,
            reason: waiverData.reason,
            adminId: waiverData.adminId
          };
        }
      } catch (error) {
        console.error('Error parsing waiver data:', error);
      }
    }
    
    return { isWaived: false };
  } catch (error) {
    console.error('Error getting waiver info:', error);
    return { isWaived: false };
  }
}