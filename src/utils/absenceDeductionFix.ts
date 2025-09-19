/**
 * 🔧 ABSENCE DEDUCTION FIX UTILITIES
 * 
 * This file contains the corrected absence deduction calculation logic
 * to ensure consistency between main table and detail views.
 */

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

interface PackageDeductionMap {
  [packageName: string]: {
    lateness: number;
    absence: number;
  };
}

interface AbsenceCalculationResult {
  totalDeduction: number;
  breakdown: Array<{
    date: string;
    reason: string;
    deduction: number;
    affectedStudents: number;
    packageBreakdown: Array<{
      package: string;
      rate: number;
      students: number;
    }>;
  }>;
}

/**
 * Initialize package deduction rates if missing
 */
export async function initializePackageDeductions(): Promise<void> {
  const defaultPackages = [
    { name: "0 Fee", lateness: 0, absence: 0 },
    { name: "3 days", lateness: 30, absence: 25 },
    { name: "5 days", lateness: 40, absence: 35 },
    { name: "Europe", lateness: 50, absence: 45 },
  ];

  for (const pkg of defaultPackages) {
    await prisma.packageDeduction.upsert({
      where: { packageName: pkg.name },
      update: {
        absenceBaseAmount: pkg.absence,
        latenessBaseAmount: pkg.lateness,
        updatedAt: new Date(),
      },
      create: {
        packageName: pkg.name,
        absenceBaseAmount: pkg.absence,
        latenessBaseAmount: pkg.lateness,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Get package deduction rates map
 */
export async function getPackageDeductionMap(): Promise<PackageDeductionMap> {
  const packageDeductions = await prisma.packageDeduction.findMany();
  
  const map: PackageDeductionMap = {};
  packageDeductions.forEach((pkg) => {
    map[pkg.packageName] = {
      lateness: Number(pkg.latenessBaseAmount) || 30,
      absence: Number(pkg.absenceBaseAmount) || 25,
    };
  });

  // Add default rates for common packages if missing
  const defaultRates = {
    "0 Fee": { lateness: 0, absence: 0 },
    "3 days": { lateness: 30, absence: 25 },
    "5 days": { lateness: 40, absence: 35 },
    "Europe": { lateness: 50, absence: 45 },
  };

  Object.entries(defaultRates).forEach(([pkg, rates]) => {
    if (!map[pkg]) {
      map[pkg] = rates;
    }
  });

  return map;
}

/**
 * UNIFIED ABSENCE DEDUCTION CALCULATION
 * This ensures consistency between main table and detail views
 */
export async function calculateAbsenceDeduction(
  teacherId: string,
  fromDate: Date,
  toDate: Date,
  includeSundays: boolean = false
): Promise<AbsenceCalculationResult> {
  // Get package deduction rates
  const packageRateMap = await getPackageDeductionMap();

  // Get existing absence records from database
  const existingRecords = await prisma.absencerecord.findMany({
    where: {
      teacherId,
      classDate: { gte: fromDate, lte: toDate },
    },
    orderBy: { classDate: "asc" },
  });

  // Get absence waivers
  const waivers = await prisma.deduction_waivers.findMany({
    where: {
      teacherId,
      deductionType: "absence",
      deductionDate: { gte: fromDate, lte: toDate },
    },
  });

  const waivedDates = new Set(
    waivers.map((w) => w.deductionDate.toISOString().split("T")[0])
  );

  let totalDeduction = 0;
  const breakdown: AbsenceCalculationResult["breakdown"] = [];
  const existingDates = new Set(
    existingRecords.map((r) => format(r.classDate, "yyyy-MM-dd"))
  );

  // Step 1: Add deductions from existing database records
  for (const record of existingRecords) {
    const dateStr = format(record.classDate, "yyyy-MM-dd");
    
    // Check if waived
    if (waivedDates.has(dateStr)) {
      breakdown.push({
        date: dateStr,
        reason: "Database record (WAIVED)",
        deduction: 0,
        affectedStudents: 0,
        packageBreakdown: [],
      });
    } else {
      totalDeduction += record.deductionApplied;
      breakdown.push({
        date: dateStr,
        reason: record.permitted ? "Permitted absence" : "Unpermitted absence",
        deduction: record.deductionApplied,
        affectedStudents: 1, // Approximate
        packageBreakdown: [], // Could be enhanced with more detail
      });
    }
  }

  // Step 2: Check for computed absences (missing days)
  const teacherStudents = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      ustaz: teacherId,
      status: { in: ["active", "Active"] },
    },
    select: {
      wdt_ID: true,
      name: true,
      package: true,
      zoom_links: {
        where: {
          sent_time: { gte: fromDate, lte: toDate },
        },
        select: { sent_time: true },
      },
    },
  });

  // Only check past dates
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    // Skip future dates
    if (d > today) continue;

    // Skip Sundays if not included
    if (!includeSundays && d.getDay() === 0) continue;

    const dateStr = format(d, "yyyy-MM-dd");

    // Skip if already has database record
    if (existingDates.has(dateStr)) continue;

    // Check if teacher sent zoom links this day
    const hasZoomLinks = teacherStudents.some((student) =>
      student.zoom_links.some((link) => {
        if (!link.sent_time) return false;
        const linkDate = format(link.sent_time, "yyyy-MM-dd");
        return linkDate === dateStr;
      })
    );

    // If no zoom links and has students = computed absence
    if (!hasZoomLinks && teacherStudents.length > 0) {
      // Check if waived
      if (waivedDates.has(dateStr)) {
        breakdown.push({
          date: dateStr,
          reason: "Computed absence (WAIVED)",
          deduction: 0,
          affectedStudents: teacherStudents.length,
          packageBreakdown: [],
        });
      } else {
        // Calculate package-based deduction
        let dailyDeduction = 0;
        const packageBreakdown: Array<{
          package: string;
          rate: number;
          students: number;
        }> = [];

        // Group students by package
        const packageGroups = new Map<string, number>();
        for (const student of teacherStudents) {
          const pkg = student.package || "Unknown";
          packageGroups.set(pkg, (packageGroups.get(pkg) || 0) + 1);
        }

        // Calculate deduction per package
        for (const [pkg, count] of packageGroups.entries()) {
          const rate = packageRateMap[pkg]?.absence || 25;
          const packageDeduction = rate * count;
          dailyDeduction += packageDeduction;

          packageBreakdown.push({
            package: pkg,
            rate,
            students: count,
          });
        }

        totalDeduction += dailyDeduction;
        breakdown.push({
          date: dateStr,
          reason: "Computed absence (no zoom links)",
          deduction: dailyDeduction,
          affectedStudents: teacherStudents.length,
          packageBreakdown,
        });
      }
    }
  }

  return {
    totalDeduction: Math.round(totalDeduction),
    breakdown,
  };
}

/**
 * Verify package deduction configuration
 */
export async function verifyPackageConfiguration(): Promise<{
  isConfigured: boolean;
  missingPackages: string[];
  configuredPackages: Array<{ name: string; absence: number; lateness: number }>;
}> {
  // Get all active packages from students
  const activePackages = await prisma.wpos_wpdatatable_23.findMany({
    where: { status: { in: ["active", "Active"] } },
    select: { package: true },
    distinct: ["package"],
  });

  const uniquePackages = [
    ...new Set(activePackages.map((s) => s.package).filter(Boolean)),
  ];

  // Get configured package deductions
  const configuredDeductions = await prisma.packageDeduction.findMany();
  const configuredPackageNames = configuredDeductions.map((p) => p.packageName);

  const missingPackages = uniquePackages.filter(
    (pkg) => !configuredPackageNames.includes(pkg!)
  );

  return {
    isConfigured: missingPackages.length === 0,
    missingPackages: missingPackages as string[],
    configuredPackages: configuredDeductions.map((p) => ({
      name: p.packageName,
      absence: Number(p.absenceBaseAmount),
      lateness: Number(p.latenessBaseAmount),
    })),
  };
}

/**
 * Debug absence calculation for a specific teacher
 */
export async function debugAbsenceCalculation(
  teacherId: string,
  month: number,
  year: number
): Promise<void> {
  const fromDate = new Date(year, month - 1, 1);
  const toDate = new Date(year, month, 0);

  console.log(`🔍 Debugging absence calculation for teacher ${teacherId}`);
  console.log(`📅 Period: ${format(fromDate, "yyyy-MM-dd")} to ${format(toDate, "yyyy-MM-dd")}`);

  const result = await calculateAbsenceDeduction(teacherId, fromDate, toDate);

  console.log(`💰 Total Absence Deduction: ${result.totalDeduction} ETB`);
  console.log(`📊 Breakdown (${result.breakdown.length} records):`);

  result.breakdown.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.date}: ${item.reason} = ${item.deduction} ETB`);
    if (item.packageBreakdown.length > 0) {
      item.packageBreakdown.forEach((pkg) => {
        console.log(`     - ${pkg.package}: ${pkg.students} students × ${pkg.rate} ETB = ${pkg.students * pkg.rate} ETB`);
      });
    }
  });

  // Check package configuration
  const config = await verifyPackageConfiguration();
  console.log(`⚙️ Package Configuration: ${config.isConfigured ? "✅ Complete" : "❌ Missing packages"}`);
  if (!config.isConfigured) {
    console.log(`❌ Missing packages: ${config.missingPackages.join(", ")}`);
  }
}