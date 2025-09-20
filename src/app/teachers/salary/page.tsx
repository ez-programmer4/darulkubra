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
  FiHome,
  FiUsers,
  FiClipboard,
  FiTarget,
  FiRefreshCw,
  FiGift,
  FiMinus,
  FiMenu,
  FiLogOut,
  FiX,
  FiEye,
  FiPieChart,
} from "react-icons/fi";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

type SalaryData = {
  id: string;
  name: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  numStudents: number;
  teachingDays: number;
  status: "Paid" | "Unpaid";
};

export default function TeacherSalaryPage() {
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const router = useRouter();
  const pathname = usePathname();

  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    return result;
  });
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salaryVisible, setSalaryVisible] = useState(true);
  const [checkingVisibility, setCheckingVisibility] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
  }>({ latenessRecords: [], absenceRecords: [], bonusRecords: [] });
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkSalaryVisibility();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && salaryVisible) {
      fetchSalaryData();
    }
  }, [user?.id, selectedMonth, salaryVisible]);

  async function checkSalaryVisibility() {
    try {
      setCheckingVisibility(true);
      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month);
      const from = new Date(selectedYear, monthNumber - 1, 1);
      const to = new Date(selectedYear, monthNumber, 0);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }`
      );

      if (res.status === 403) {
        setSalaryVisible(false);
      } else if (res.ok) {
        setSalaryVisible(true);
        const data = await res.json();
        setSalaryData(data);
      } else {
        setSalaryVisible(true);
        setError("Failed to load salary information. Please try again.");
      }
    } catch (error) {
      setSalaryVisible(true);
      setError("Failed to load salary information. Please try again.");
    } finally {
      setCheckingVisibility(false);
    }
  }

  async function fetchSalaryData() {
    if (!salaryVisible) return;

    try {
      setLoading(true);
      setError(null);

      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month);
      const from = new Date(selectedYear, monthNumber - 1, 1);
      const to = new Date(selectedYear, monthNumber, 0);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }`
      );

      if (res.status === 403) {
        setSalaryVisible(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch salary data");
      const data = await res.json();

      setSalaryData(data);
    } catch (error) {
      setError("Failed to load salary information. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBreakdown() {
    if (!user?.id) return;

    setBreakdownLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month);
      const from = new Date(selectedYear, monthNumber - 1, 1);
      const to = new Date(selectedYear, monthNumber, 0);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }&details=true`
      );

      if (!res.ok) throw new Error("Failed to fetch breakdown");
      const data = await res.json();

      if (data.breakdown) {
        setBreakdown({
          latenessRecords: data.breakdown.latenessRecords || [],
          absenceRecords: data.breakdown.absenceRecords || [],
          bonusRecords: data.breakdown.bonusRecords || [],
        });
      }

      setShowBreakdown(true);
    } catch (error) {
      setError("Failed to load detailed breakdown.");
    } finally {
      setBreakdownLoading(false);
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

  if (authLoading || checkingVisibility) {
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
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <FiDollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">
                My Salary
              </h1>
              <p className="text-gray-600 text-sm">
                View salary details
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex gap-2 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 flex-1">
              <FiCalendar className="h-4 w-4 text-gray-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-gray-700 font-medium text-sm w-full"
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
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            >
              <FiDownload className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!salaryVisible ? (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="p-4 bg-yellow-50 rounded-full w-fit mx-auto mb-4">
              <FiAlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Salary Access Restricted
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Access to salary information has been temporarily disabled.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">
                Please contact your administrator for access.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <h3 className="text-base font-bold text-black mb-2">
              Loading Salary Data
            </h3>
            <p className="text-gray-600 text-sm">
              Please wait...
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="p-3 bg-red-50 rounded-full w-fit mx-auto mb-4">
              <FiAlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-black mb-3">
              Error Loading Data
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              {error}
            </p>
            <Button
              onClick={fetchSalaryData}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium"
            >
              <FiRefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : salaryData ? (
          <div className="space-y-4">
            {/* Salary Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Base Salary */}
              <div className="bg-white rounded-xl shadow-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <FiDollarSign className="h-3 w-3 text-gray-600" />
                      <p className="text-xs font-medium text-gray-600">
                        Base Salary
                      </p>
                    </div>
                    <p className="text-lg font-bold text-black">
                      {salaryData.baseSalary} ETB
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiTarget className="h-4 w-4 text-black" />
                  </div>
                </div>
              </div>

              {/* Bonuses */}
              <div className="bg-white rounded-xl shadow-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <FiGift className="h-3 w-3 text-gray-600" />
                      <p className="text-xs font-medium text-gray-600">
                        Bonuses
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      +{salaryData.bonuses || 0} ETB
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiAward className="h-4 w-4 text-black" />
                  </div>
                </div>
              </div>

              {/* Lateness Deduction */}
              <div
                className="bg-white rounded-xl shadow-lg border p-3 cursor-pointer"
                onClick={fetchBreakdown}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <FiClock className="h-3 w-3 text-gray-600" />
                      <p className="text-xs font-medium text-gray-600">
                        Lateness
                      </p>
                    </div>
                    <p className="text-lg font-bold text-red-600">
                      -{salaryData.latenessDeduction} ETB
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      Tap for details
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiMinus className="h-4 w-4 text-black" />
                  </div>
                </div>
              </div>

              {/* Absence Deduction */}
              <div
                className="bg-white rounded-xl shadow-lg border p-3 cursor-pointer"
                onClick={fetchBreakdown}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <FiTrendingDown className="h-3 w-3 text-gray-600" />
                      <p className="text-xs font-medium text-gray-600">
                        Absence
                      </p>
                    </div>
                    <p className="text-lg font-bold text-red-600">
                      -{salaryData.absenceDeduction} ETB
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      Tap for details
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiAlertTriangle className="h-4 w-4 text-black" />
                  </div>
                </div>
              </div>
            </div>

            {/* Final Salary Card */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-blue-600 rounded-xl">
                    <FiDollarSign className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-black">
                    Final Salary
                  </h2>
                </div>
                <div className="bg-gray-50 rounded-xl p-6 mb-4">
                  <p className="text-3xl font-bold text-black mb-2">
                    {salaryData.totalSalary} ETB
                  </p>
                  <div className="flex items-center justify-center gap-2 text-gray-700">
                    <FiTrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Monthly Salary
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${
                      salaryData.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {salaryData.status === "Paid" ? (
                      <>
                        <FiCheckCircle className="inline h-4 w-4 mr-1" />
                        Paid
                      </>
                    ) : (
                      <>
                        <FiClock className="inline h-4 w-4 mr-1" />
                        Pending
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {new Date(selectedMonth + "-01").toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No Salary Data Available
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Salary information for{" "}
              {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}{" "}
              is not available yet.
            </p>
            <p className="text-xs text-gray-500">
              Data is available after month ends.
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Mobile Breakdown Modal */}
      {showBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-x-4 top-4 bottom-4 bg-white rounded-2xl shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <FiBarChart className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-black">
                  Detailed Salary Breakdown
                </h2>
              </div>
              <button
                onClick={() => setShowBreakdown(false)}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-lg bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-4">
              {breakdownLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-black font-medium">
                    Loading detailed breakdown...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Enhanced Lateness Records */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FiClock className="text-red-500 h-4 w-4" />
                        <h3 className="text-base font-bold text-red-900">
                          Lateness Records & Deductions
                        </h3>
                      </div>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        {breakdown.latenessRecords?.length || 0} incidents
                      </span>
                    </div>
                    
                    {/* Summary Stats */}
                    {breakdown.latenessRecords?.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="text-sm font-bold text-red-900">
                            {Math.round(breakdown.latenessRecords.reduce((sum: number, r: any) => sum + (r.latenessMinutes || 0), 0) / breakdown.latenessRecords.length)}
                          </div>
                          <div className="text-xs text-red-600">Avg Minutes</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="text-sm font-bold text-red-900">
                            -{breakdown.latenessRecords.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0)} ETB
                          </div>
                          <div className="text-xs text-red-600">Total Deduction</div>
                        </div>
                      </div>
                    )}
                    
                    {breakdown.latenessRecords?.length === 0 ? (
                      <p className="text-red-600 text-center py-3 text-sm">
                        Perfect punctuality! No lateness records.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {breakdown.latenessRecords?.map(
                          (record: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white rounded-lg p-3 border border-red-200"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                  <div className="text-xs font-mono text-gray-600">
                                    {format(new Date(record.classDate), "MMM dd, yyyy")}
                                  </div>
                                  <div className="text-xs text-gray-700 font-medium">
                                    {record.studentName}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    Package: {record.studentPackage || 'Standard'}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    record.latenessMinutes <= 5 ? 'bg-yellow-100 text-yellow-700' :
                                    record.latenessMinutes <= 15 ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {record.latenessMinutes} min late
                                  </span>
                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                    -{record.deductionApplied} ETB
                                  </span>
                                  {record.deductionTier && (
                                    <div className="text-xs text-gray-500">
                                      {record.deductionTier}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {record.notes && (
                                <div className="mt-2 pt-2 border-t border-red-100">
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Notes:</span> {record.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-red-900 text-sm">
                          Total Lateness Deduction:
                        </span>
                        <span className="text-lg font-bold text-red-600">
                          -
                          {breakdown.latenessRecords?.reduce(
                            (sum: number, r: any) =>
                              sum + (r.deductionApplied || 0),
                            0
                          ) || 0}{" "}
                          ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Absence Records */}
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FiAlertTriangle className="text-yellow-500 h-4 w-4" />
                        <h3 className="text-base font-bold text-yellow-900">
                          Absence Records & Deductions
                        </h3>
                      </div>
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
                        {breakdown.absenceRecords?.length || 0} days
                      </span>
                    </div>
                    
                    {/* Summary Stats */}
                    {breakdown.absenceRecords?.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="text-sm font-bold text-green-700">
                            {breakdown.absenceRecords.filter((r: any) => r.permitted).length}
                          </div>
                          <div className="text-xs text-green-600">Permitted</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="text-sm font-bold text-red-700">
                            {breakdown.absenceRecords.filter((r: any) => !r.permitted).length}
                          </div>
                          <div className="text-xs text-red-600">Unpermitted</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="text-sm font-bold text-yellow-900">
                            -{breakdown.absenceRecords.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0)} ETB
                          </div>
                          <div className="text-xs text-yellow-600">Total</div>
                        </div>
                      </div>
                    )}
                    
                    {breakdown.absenceRecords?.length === 0 ? (
                      <p className="text-yellow-600 text-center py-4">
                        Perfect attendance! No absence records.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {breakdown.absenceRecords?.map(
                          (record: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="text-sm font-mono text-gray-600">
                                    {format(new Date(record.classDate), "MMM dd, yyyy")}
                                  </div>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      record.permitted
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {record.permitted
                                      ? "✓ Permitted"
                                      : "⚠ Unpermitted"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                                    -{record.deductionApplied} ETB
                                  </span>
                                </div>
                              </div>
                              
                              {/* Additional Details */}
                              <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                                {record.timeSlots && record.timeSlots.length > 0 && (
                                  <div>
                                    <span className="text-gray-600">Time Slots:</span>
                                    <span className="ml-1 text-gray-800">{record.timeSlots.join(', ')}</span>
                                  </div>
                                )}
                                {record.permissionrequest?.reasonCategory && (
                                  <div>
                                    <span className="text-gray-600">Reason:</span>
                                    <span className="ml-1 text-purple-600">{record.permissionrequest.reasonCategory}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-600">Review:</span>
                                  <span className={`ml-1 ${record.reviewedByManager ? 'text-green-600' : 'text-orange-600'}`}>
                                    {record.reviewedByManager ? 'Manager Reviewed' : 'Pending Review'}
                                  </span>
                                </div>
                              </div>
                              
                              {record.reviewNotes && (
                                <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-300">
                                  <div className="text-xs text-blue-800">
                                    <span className="font-medium">Manager Notes:</span> {record.reviewNotes}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-yellow-900">
                          Total Absence Deduction:
                        </span>
                        <span className="text-xl font-bold text-yellow-600">
                          -
                          {breakdown.absenceRecords?.reduce(
                            (sum: number, r: any) =>
                              sum + (r.deductionApplied || 0),
                            0
                          ) || 0}{" "}
                          ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bonus Records */}
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                      <FiAward className="text-green-500 h-5 w-5" />
                      <h3 className="text-lg font-bold text-green-900">
                        Bonus Records
                      </h3>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">
                        {breakdown.bonusRecords?.length || 0} bonuses
                      </span>
                    </div>
                    {breakdown.bonusRecords?.length === 0 ? (
                      <p className="text-green-600 text-center py-4">
                        No bonus records for this period.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {breakdown.bonusRecords?.map(
                          (record: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white rounded-xl p-4 border border-green-200 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="text-sm font-mono text-gray-600">
                                    {format(new Date(record.createdAt), "MMM dd, yyyy")}
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {record.reason}
                                  </div>
                                </div>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                                  +{record.amount} ETB
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-900">
                          Total Bonuses:
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          +
                          {breakdown.bonusRecords?.reduce(
                            (sum: number, r: any) => sum + (r.amount || 0),
                            0
                          ) || 0}{" "}
                          ETB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium"
                  onClick={() => setShowBreakdown(false)}
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}