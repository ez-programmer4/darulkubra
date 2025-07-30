"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiArrowLeft,
  FiDownload,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiAward,
  FiBarChart,
} from "react-icons/fi";
import Link from "next/link";

type SalaryData = {
  id: string;
  name: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  numStudents: number;
  status: "Paid" | "Unpaid";
};

export default function TeacherSalaryPage() {
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const router = useRouter();

  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to current month
    const now = new Date();
    console.log("📅 Current date:", now);
    console.log("📅 Current month (0-indexed):", now.getMonth());
    console.log("📅 Current year:", now.getFullYear());

    const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    console.log("📅 Selected month:", result);
    return result;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSalaryData();
    }
  }, [user?.id, selectedMonth]);

  async function fetchSalaryData() {
    try {
      setLoading(true);
      setError(null);

      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month); // Keep as 1-indexed
      const from = new Date(selectedYear, monthNumber - 1, 1); // Convert to 0-indexed for Date constructor
      const to = new Date(selectedYear, monthNumber, 0); // Convert to 0-indexed for Date constructor

      console.log("📅 Selected month:", selectedMonth);
      console.log("📅 Selected year:", selectedYear);
      console.log("📅 Month number (1-indexed):", monthNumber);
      console.log("📅 From date:", from);
      console.log("📅 To date:", to);
      console.log("📅 From date string:", from.toISOString().split("T")[0]);
      console.log("📅 To date string:", to.toISOString().split("T")[0]);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }`
      );
      if (!res.ok) throw new Error("Failed to fetch salary data");
      const data = await res.json();

      setSalaryData(data);
    } catch (error) {
      console.error("Error fetching salary data:", error);
      setError("Failed to load salary information. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const downloadSalaryReport = () => {
    if (!salaryData) return;

    const reportContent = `
Teacher Salary Report
Month: ${new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })}
Teacher: ${user?.name} (ID: ${user?.id})

SALARY BREAKDOWN:
================
Base Salary: ${salaryData.baseSalary} ETB
Quality Bonuses: +${salaryData.bonuses} ETB
Lateness Deductions: -${salaryData.latenessDeduction} ETB
Absence Deductions: -${salaryData.absenceDeduction} ETB

FINAL SALARY: ${salaryData.totalSalary} ETB
Status: ${salaryData.status}

Additional Information:
- Number of Students: ${salaryData.numStudents}
- Payment Status: ${salaryData.status}
- Generated on: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salary_Report_${selectedMonth}_${user?.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        <FiAlertTriangle className="inline-block mr-2 h-6 w-6" />
        User not found or not authorized. Please contact support.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/teachers/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <FiDollarSign className="h-8 w-8 text-green-600" />
                  Salary Overview
                </h1>
                <p className="text-gray-600 mt-1">
                  View your salary details and payment history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FiCalendar className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = `${date.getFullYear()}-${String(
                      date.getMonth() + 1
                    ).padStart(2, "0")}`;
                    const label = date.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <Button
                onClick={downloadSalaryReport}
                disabled={!salaryData}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <FiDownload className="h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading salary information...</p>
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 text-center">
              <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Error Loading Salary Data
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchSalaryData} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : salaryData ? (
          <div className="space-y-8">
            {/* Salary Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Base Salary */}
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">
                        Base Salary
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        {salaryData.baseSalary} ETB
                      </p>
                    </div>
                    <div className="text-3xl text-green-300">💵</div>
                  </div>
                </CardContent>
              </Card>

              {/* Bonuses */}
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">
                        Quality Bonuses
                      </p>
                      <p className="text-2xl font-bold text-purple-700">
                        +{salaryData.bonuses} ETB
                      </p>
                    </div>
                    <div className="text-3xl text-purple-300">🏆</div>
                  </div>
                </CardContent>
              </Card>

              {/* Lateness Deduction */}
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">
                        Lateness Deduction
                      </p>
                      <p className="text-2xl font-bold text-red-700">
                        -{salaryData.latenessDeduction} ETB
                      </p>
                    </div>
                    <div className="text-3xl text-red-300">⏰</div>
                  </div>
                </CardContent>
              </Card>

              {/* Absence Deduction */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">
                        Absence Deduction
                      </p>
                      <p className="text-2xl font-bold text-orange-700">
                        -{salaryData.absenceDeduction} ETB
                      </p>
                    </div>
                    <div className="text-3xl text-orange-300">📉</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Final Salary Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-blue-900 mb-2">
                    Final Salary
                  </h2>
                  <p className="text-5xl font-extrabold text-blue-600 mb-4">
                    {salaryData.totalSalary} ETB
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        salaryData.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {salaryData.status === "Paid" ? "✅ Paid" : "⏳ Pending"}
                    </span>
                    <span className="text-gray-600">
                      {new Date(selectedMonth + "-01").toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Salary Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiBarChart className="h-5 w-5 text-green-600" />
                    Salary Breakdown
                  </CardTitle>
                  <CardDescription>
                    Detailed breakdown of your salary components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <FiDollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Base Salary</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        +{salaryData.baseSalary} ETB
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <FiAward className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Quality Bonuses</span>
                      </div>
                      <span className="font-semibold text-purple-600">
                        +{salaryData.bonuses} ETB
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <FiClock className="h-5 w-5 text-red-600" />
                        <span className="font-medium">Lateness Deductions</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        -{salaryData.latenessDeduction} ETB
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <FiTrendingDown className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Absence Deductions</span>
                      </div>
                      <span className="font-semibold text-orange-600">
                        -{salaryData.absenceDeduction} ETB
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-4 bg-blue-50 rounded-lg px-4">
                      <div className="flex items-center gap-3">
                        <FiDollarSign className="h-6 w-6 text-blue-600" />
                        <span className="font-bold text-lg">Final Salary</span>
                      </div>
                      <span className="font-bold text-xl text-blue-600">
                        {salaryData.totalSalary} ETB
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiUser className="h-5 w-5 text-green-600" />
                    Additional Information
                  </CardTitle>
                  <CardDescription>
                    Other relevant details about your salary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="font-medium text-gray-600">
                        Number of Students
                      </span>
                      <span className="font-semibold">
                        {salaryData.numStudents}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="font-medium text-gray-600">
                        Payment Status
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium ${
                          salaryData.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {salaryData.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Month</span>
                      <span className="font-semibold">
                        {new Date(selectedMonth + "-01").toLocaleDateString(
                          "en-US",
                          { month: "long", year: "numeric" }
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3">
                      <span className="font-medium text-gray-600">
                        Last Updated
                      </span>
                      <span className="font-semibold">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tips Section */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  💡 Tips to Maximize Your Salary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-yellow-700">
                      Arrive on time to avoid lateness deductions
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-yellow-700">
                      Send zoom links to maintain attendance records
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-yellow-700">
                      Request permission in advance for absences
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-yellow-700">
                      Focus on quality to earn performance bonuses
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Salary Data Available
              </h3>
              <p className="text-gray-600 mb-4">
                Salary information for{" "}
                {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                is not available yet.
              </p>
              <p className="text-sm text-gray-500">
                Salary data is typically available after the month ends and
                calculations are completed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
