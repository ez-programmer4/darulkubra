import { prisma } from "@/lib/prisma";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  addDays,
  isBefore,
} from "date-fns";

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SalaryCalculationResult {
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
    }>;
    latenessBreakdown: Array<{
      date: string;
      studentName: string;
      scheduledTime: string;
      actualTime: string;
      latenessMinutes: number;
      tier: string;
      deduction: number;
    }>;
    absenceBreakdown: Array<{
      date: string;
      studentId: number;
      studentName: string;
      studentPackage: string;
      reason: string;
      deduction: number;
      permitted: boolean;
      waived: boolean;
    }>;
  };
}

/**
 * Validate teacher payment data
 */
export async function validateTeacherPayment(
  teacherId: string,
  period: string,
  totalSalary: number
): Promise<PaymentValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if teacher exists
  const teacher = await prisma.wpos_wpdatatable_24.findUnique({
    where: { ustazid: teacherId },
    select: { ustazname: true },
  });

  if (!teacher) {
    errors.push("Teacher not found");
  }

  // Check if teacher is active
  if (teacher && teacher.ustazname !== "active") {
    warnings.push("Teacher is not active");
  }

  // Validate period format (YYYY-MM)
  const periodRegex = /^\d{4}-\d{2}$/;
  if (!periodRegex.test(period)) {
    errors.push("Invalid period format. Use YYYY-MM format");
  }

  // Check if payment already exists
  const existingPayment = await prisma.teachersalarypayment.findUnique({
    where: { teacherId_period: { teacherId, period } },
    select: { status: true, totalSalary: true },
  });

  if (existingPayment) {
    if (existingPayment.status === "Paid") {
      warnings.push("Payment already marked as paid");
    }
    if (Math.abs(existingPayment.totalSalary - totalSalary) > 0.01) {
      warnings.push("Salary amount differs from previous calculation");
    }
  }

  // Validate salary amount
  if (totalSalary < 0) {
    errors.push("Salary cannot be negative");
  }

  if (totalSalary === 0) {
    warnings.push("Salary amount is zero");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get teacher payment history
 */
export async function getTeacherPaymentHistory(
  teacherId: string,
  limit: number = 12
) {
  return await prisma.teachersalarypayment.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      period: true,
      status: true,
      totalSalary: true,
      latenessDeduction: true,
      absenceDeduction: true,
      bonuses: true,
      paidAt: true,
      createdAt: true,
      admin: {
        select: { name: true },
      },
    },
  });
}

/**
 * Get payment statistics for a period
 */
export async function getPaymentStatistics(startDate: Date, endDate: Date) {
  const [
    totalTeachers,
    paidTeachers,
    unpaidTeachers,
    totalSalary,
    totalDeductions,
    totalBonuses,
    averageSalary,
  ] = await Promise.all([
    prisma.wpos_wpdatatable_24.count(),
    prisma.teachersalarypayment.count({
      where: {
        status: "Paid",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.teachersalarypayment.count({
      where: {
        status: "Unpaid",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.teachersalarypayment.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalSalary: true },
    }),
    prisma.teachersalarypayment.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        latenessDeduction: true,
        absenceDeduction: true,
      },
    }),
    prisma.teachersalarypayment.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { bonuses: true },
    }),
    prisma.teachersalarypayment.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _avg: { totalSalary: true },
    }),
  ]);

  return {
    totalTeachers,
    paidTeachers,
    unpaidTeachers,
    totalSalary: totalSalary._sum.totalSalary || 0,
    totalDeductions:
      (totalDeductions._sum.latenessDeduction || 0) +
      (totalDeductions._sum.absenceDeduction || 0),
    totalBonuses: totalBonuses._sum.bonuses || 0,
    averageSalary: averageSalary._avg.totalSalary || 0,
    paymentRate: totalTeachers > 0 ? (paidTeachers / totalTeachers) * 100 : 0,
  };
}

/**
 * Check if student is scheduled for a specific day
 */
export async function isStudentScheduledForDay(
  studentId: number,
  dayOfWeek: number,
  dayPackage: string
): Promise<boolean> {
  const dayMap: Record<string, number[]> = {
    MWF: [1, 3, 5], // Monday, Wednesday, Friday
    TTS: [2, 4, 6], // Tuesday, Thursday, Saturday
    "All days": [0, 1, 2, 3, 4, 5, 6],
    // Add other day packages as needed
  };

  const days = dayMap[dayPackage];
  return days ? days.includes(dayOfWeek) : false;
}

/**
 * Get teacher's current students with their packages
 */
export async function getTeacherStudents(teacherId: string) {
  return await prisma.wpos_wpdatatable_23.findMany({
    where: {
      ustaz: teacherId,
      status: { in: ["active", "Active", "Not yet", "not yet"] },
    },
    select: {
      wdt_ID: true,
      name: true,
      package: true,
      status: true,
    },
  });
}

/**
 * Get package salary rates
 */
export async function getPackageSalaries() {
  const packageSalaries = await prisma.packageSalary.findMany();
  const salaryMap: Record<string, number> = {};

  packageSalaries.forEach((pkg) => {
    salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
  });

  return salaryMap;
}

/**
 * Get package deduction rates
 */
export async function getPackageDeductions() {
  const packageDeductions = await prisma.packageDeduction.findMany();
  const deductionMap: Record<string, { lateness: number; absence: number }> =
    {};

  packageDeductions.forEach((pkg) => {
    deductionMap[pkg.packageName] = {
      lateness: Number(pkg.latenessBaseAmount),
      absence: Number(pkg.absenceBaseAmount),
    };
  });

  return deductionMap;
}

/**
 * Get lateness deduction configuration
 */
export async function getLatenessConfig() {
  const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
    orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
  });

  if (latenessConfigs.length === 0) {
    return {
      excusedThreshold: 3,
      tiers: [
        { start: 4, end: 7, percent: 10 },
        { start: 8, end: 14, percent: 20 },
        { start: 15, end: 21, percent: 30 },
      ],
      maxTierEnd: 21,
    };
  }

  const excusedThreshold = Math.min(
    ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
  );

  const tiers = latenessConfigs.map((c) => ({
    start: c.startMinute,
    end: c.endMinute,
    percent: c.deductionPercent,
  }));

  const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));

  return {
    excusedThreshold,
    tiers,
    maxTierEnd,
  };
}

/**
 * Calculate working days in a period
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  includeSundays: boolean = false
): number {
  let workingDays = 0;

  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    if (!includeSundays && d.getDay() === 0) continue;
    workingDays++;
  }

  return workingDays;
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = "ETB"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format compact currency for display
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = "ETB"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Generate payment report data
 */
export async function generatePaymentReport(
  startDate: Date,
  endDate: Date,
  teacherIds?: string[]
) {
  const whereClause: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (teacherIds && teacherIds.length > 0) {
    whereClause.teacherId = { in: teacherIds };
  }

  const payments = await prisma.teachersalarypayment.findMany({
    where: whereClause,
    include: {
      wpos_wpdatatable_24: {
        select: { ustazname: true },
      },
      admin: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statistics = await getPaymentStatistics(startDate, endDate);

  return {
    payments,
    statistics,
    period: {
      start: startDate,
      end: endDate,
    },
    generatedAt: new Date(),
  };
}

/**
 * Export payment data to CSV format
 */
export function exportPaymentsToCSV(payments: any[]): string {
  const headers = [
    "Teacher ID",
    "Teacher Name",
    "Period",
    "Status",
    "Base Salary",
    "Lateness Deduction",
    "Absence Deduction",
    "Bonuses",
    "Total Salary",
    "Paid At",
    "Created At",
  ];

  const rows = payments.map((payment) => [
    payment.teacherId,
    payment.wpos_wpdatatable_24?.ustazname || "",
    payment.period,
    payment.status,
    payment.totalSalary,
    payment.latenessDeduction,
    payment.absenceDeduction,
    payment.bonuses,
    payment.totalSalary,
    payment.paidAt ? format(payment.paidAt, "yyyy-MM-dd HH:mm:ss") : "",
    format(payment.createdAt, "yyyy-MM-dd HH:mm:ss"),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): {
  isValid: boolean;
  start: Date | null;
  end: Date | null;
  error?: string;
} {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        isValid: false,
        start: null,
        end: null,
        error: "Invalid date format. Use YYYY-MM-DD format.",
      };
    }

    if (start > end) {
      return {
        isValid: false,
        start,
        end,
        error: "Start date cannot be after end date.",
      };
    }

    return {
      isValid: true,
      start,
      end,
    };
  } catch (error) {
    return {
      isValid: false,
      start: null,
      end: null,
      error: "Invalid date format.",
    };
  }
}
