import { prisma } from "@/lib/prisma";
import { SalaryCalculator } from "./salary-calculator";
import { clearCalculatorCache } from "./calculator-cache";
import { getEthiopianTime } from "./ethiopian-time";

/**
 * Create zoom link with package rate tracking
 */
export async function createZoomLinkWithPackage(
  teacherId: string,
  studentId: number,
  zoomLink: string
) {
  // Get student's current package
  const student = await prisma.wpos_wpdatatable_23.findUnique({
    where: { wdt_ID: studentId },
    select: { package: true },
  });

  if (!student?.package) {
    throw new Error("Student package not found");
  }

  // Get package rate
  const packageSalary = await prisma.packageSalary.findFirst({
    where: { packageName: student.package },
  });

  if (!packageSalary) {
    throw new Error(`Package salary not found for ${student.package}`);
  }

  // Create zoom link with package info
  // Use Ethiopian local time (UTC+3)
  const result = await prisma.wpos_zoom_links.create({
    data: {
      ustazid: teacherId,
      studentid: studentId,
      link: zoomLink,
      tracking_token: `${teacherId}_${studentId}_${Date.now()}`,
      sent_time: getEthiopianTime(),
      packageId: student.package,
      packageRate: packageSalary.salaryPerStudent,
    },
  });

  // Clear salary cache for this teacher to ensure dynamic updates
  SalaryCalculator.clearGlobalTeacherCache(teacherId);

  // Clear the calculator cache to force fresh data
  clearCalculatorCache();

  return result;
}

/**
 * Get zoom links for teacher in date range
 */
export async function getTeacherZoomLinks(
  teacherId: string,
  startDate: Date,
  endDate: Date
) {
  return await prisma.wpos_zoom_links.findMany({
    where: {
      ustazid: teacherId,
      sent_time: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      sent_time: "asc",
    },
  });
}
