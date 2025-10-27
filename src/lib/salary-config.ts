import { prisma } from "@/lib/prisma";

/**
 * Centralized configuration for salary calculations
 * This ensures all components use the same configuration
 */

export interface SalaryConfig {
  includeSundays: boolean;
  showTeacherSalary: boolean;
  customMessage: string;
  adminContact: string;
  packageDeductions: Record<string, { lateness: number; absence: number }>;
  latenessConfig: {
    excusedThreshold: number;
    tiers: Array<{ start: number; end: number; percent: number }>;
  };
  packageSalaries: Record<string, number>;
}

/**
 * Load salary configuration from database
 * This is called dynamically to ensure fresh configuration
 */
export async function getSalaryConfig(): Promise<SalaryConfig> {
  // Load all configuration in parallel for better performance
  const [
    sundaySetting,
    salarySetting,
    packageDeductions,
    latenessConfigs,
    packageSalaries,
  ] = await Promise.all([
    prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
      select: { value: true },
    }),
    prisma.setting.findUnique({
      where: { key: "teacher_salary_visibility" },
      select: { value: true },
    }),
    prisma.packageDeduction.findMany(),
    prisma.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    }),
    prisma.packageSalary.findMany(),
  ]);

  // Parse Sunday inclusion setting
  const includeSundays = sundaySetting?.value === "true";

  // Parse salary visibility settings
  let showTeacherSalary = true;
  let customMessage = "";
  let adminContact = "";

  if (salarySetting?.value) {
    try {
      const salaryConfig = JSON.parse(salarySetting.value);
      showTeacherSalary = salaryConfig.showTeacherSalary ?? true;
      customMessage = salaryConfig.customMessage || "";
      adminContact = salaryConfig.adminContact || "";
    } catch (error) {
      console.error("Error parsing salary visibility config:", error);
    }
  }

  // Create package deduction map
  const packageDeductionMap: Record<
    string,
    { lateness: number; absence: number }
  > = {};
  packageDeductions.forEach((pkg) => {
    packageDeductionMap[pkg.packageName] = {
      lateness: Number(pkg.latenessBaseAmount),
      absence: Number(pkg.absenceBaseAmount),
    };
  });

  // Create package salary map
  const packageSalaryMap: Record<string, number> = {};
  packageSalaries.forEach((pkg) => {
    packageSalaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
  });

  // Create lateness config
  const excusedThreshold =
    latenessConfigs.length > 0
      ? Math.min(...latenessConfigs.map((c) => c.excusedThreshold ?? 0))
      : 3;

  const tiers = latenessConfigs.map((c) => ({
    start: c.startMinute,
    end: c.endMinute,
    percent: c.deductionPercent,
  }));

  const config: SalaryConfig = {
    includeSundays,
    showTeacherSalary,
    customMessage,
    adminContact,
    packageDeductions: packageDeductionMap,
    latenessConfig: {
      excusedThreshold,
      tiers,
    },
    packageSalaries: packageSalaryMap,
  };

  return config;
}

/**
 * Get a specific configuration value
 */
export async function getConfigValue<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!setting?.value) {
      return defaultValue;
    }

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value as T;
    }
  } catch (error) {
    console.error(`Error loading config for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Update a configuration value
 */
export async function setConfigValue(key: string, value: any): Promise<void> {
  const now = new Date();
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value), updatedAt: now },
    create: { key, value: JSON.stringify(value), updatedAt: now },
  });
}

/**
 * Clear configuration cache
 * This should be called when configuration is updated
 */
export function clearConfigCache(): void {
  // If you implement caching, clear it here
}

/**
 * Validate configuration
 */
export function validateConfig(config: SalaryConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate package deductions
  if (Object.keys(config.packageDeductions).length === 0) {
    errors.push("No package deductions configured");
  }

  // Validate lateness config
  if (config.latenessConfig.tiers.length === 0) {
    errors.push("No lateness deduction tiers configured");
  }

  // Validate package salaries
  if (Object.keys(config.packageSalaries).length === 0) {
    errors.push("No package salaries configured");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
