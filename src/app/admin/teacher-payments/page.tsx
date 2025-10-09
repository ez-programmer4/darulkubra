import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TeacherPaymentsClient from "./TeacherPaymentsClient";
import {
  createSalaryCalculator,
  TeacherSalaryData,
} from "@/lib/salary-calculator";
import { parseISO } from "date-fns";

interface TeacherPaymentsPageProps {
  searchParams: {
    month?: string;
    year?: string;
    clearCache?: string;
  };
}

interface PaymentStatistics {
  totalTeachers: number;
  totalSalary: number;
  paidTeachers: number;
  unpaidTeachers: number;
  averageSalary: number;
  paymentRate: number;
}

export default async function TeacherPaymentsPage({
  searchParams,
}: TeacherPaymentsPageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    redirect("/login");
  }

  // Get current month/year or from search params
  const currentDate = new Date();
  const selectedMonth = searchParams.month
    ? parseInt(searchParams.month)
    : currentDate.getMonth() + 1;
  const selectedYear = searchParams.year
    ? parseInt(searchParams.year)
    : currentDate.getFullYear();

  // Calculate date range
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(
    2,
    "0"
  )}-01`;
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(
    2,
    "0"
  )}-${String(lastDayOfMonth).padStart(2, "0")}`;

  // Parse dates
  const fromDate = parseISO(startDate);
  const toDate = parseISO(endDate);

  // Fetch data server-side
  let teachers: TeacherSalaryData[] = [];
  let statistics: PaymentStatistics | null = null;
  let error: string | null = null;

  try {
    const calculator = await createSalaryCalculator();

    // Clear cache if requested
    if (searchParams.clearCache === "true") {
      calculator.clearCache();
    }

    // Calculate all teacher salaries
    const teachersData = await calculator.calculateAllTeacherSalaries(
      fromDate,
      toDate
    );
    teachers = teachersData || [];

    // Calculate statistics
    if (teachers.length > 0) {
      statistics = {
        totalTeachers: teachers.length,
        totalSalary: teachers.reduce((sum, t) => sum + t.totalSalary, 0),
        paidTeachers: teachers.filter((t) => t.status === "Paid").length,
        unpaidTeachers: teachers.filter((t) => t.status === "Unpaid").length,
        averageSalary:
          teachers.reduce((sum, t) => sum + t.totalSalary, 0) / teachers.length,
        paymentRate:
          (teachers.filter((t) => t.status === "Paid").length /
            teachers.length) *
          100,
      };
    }
  } catch (err) {
    console.error("Error fetching teacher payment data:", err);
    error =
      err instanceof Error
        ? err.message
        : "Failed to fetch teacher payment data";
  }

  // Load settings server-side
  let includeSundays = false;
  let showTeacherSalary = true;
  let customMessage = "";
  let adminContact = "";

  try {
    const { prisma } = await import("@/lib/prisma");

    const [sundaySetting, salarySetting] = await Promise.all([
      prisma.setting.findUnique({
        where: { key: "include_sundays" },
        select: { value: true },
      }),
      prisma.setting.findUnique({
        where: { key: "teacher_salary_visibility" },
        select: { value: true },
      }),
    ]);

    includeSundays = sundaySetting?.value === "true";

    if (salarySetting?.value) {
      const salaryConfig = JSON.parse(salarySetting.value);
      showTeacherSalary = salaryConfig.showTeacherSalary ?? true;
      customMessage = salaryConfig.customMessage || "";
      adminContact = salaryConfig.adminContact || "";
    }
  } catch (err) {
    console.error("Error loading settings:", err);
  }

  return (
    <TeacherPaymentsClient
      initialTeachers={teachers}
      initialStatistics={statistics}
      initialError={error}
      initialIncludeSundays={includeSundays}
      initialShowTeacherSalary={showTeacherSalary}
      initialCustomMessage={customMessage}
      initialAdminContact={adminContact}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
