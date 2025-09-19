"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiDownload,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiAward,
  FiBarChart,
  FiTarget,
  FiRefreshCw,
  FiGift,
  FiMinus,
  FiX,
  FiInfo,
  FiUsers,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiPieChart,
} from "react-icons/fi";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

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
  breakdown?: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
    }>;
    summary: {
      workingDaysInMonth: number;
      actualTeachingDays: number;
      averageDailyEarning: number;
      totalDeductions: number;
      netSalary: number;
    };
  };
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
      // Try to fetch salary data directly - API will return 403 if disabled
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
      
      toast({
        title: "Salary Data Loaded",
        description: `Salary information for ${new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })} has been loaded.`,
      });
    } catch (error) {
      setError("Failed to load salary information. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load salary information. Please try again.",
        variant: "destructive",
      });
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
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}&details=true`
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
      
      toast({
        title: "Breakdown Loaded",
        description: "Detailed salary breakdown has been loaded successfully.",
      });
    } catch (error) {
      setError("Failed to load detailed breakdown.");
      toast({
        title: "Error",
        description: "Failed to load detailed breakdown. Please try again.",
        variant: "destructive",
      });
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
          <div className="space-y-6">
            {/* Enhanced Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Base Salary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <FiDollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-blue-700 mb-1">
                      Base Salary
                    </p>
                    <p className="text-xl font-bold text-blue-900">
                      {salaryData.baseSalary} ETB
                    </p>
                  </div>
                </div>
                {salaryData.teachingDays && (
                  <div className="text-xs text-blue-600">
                    {salaryData.teachingDays} teaching days
                  </div>
                )}
              </div>

              {/* Bonuses */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg border border-green-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <FiAward className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-green-700 mb-1">
                      Quality Bonuses
                    </p>
                    <p className="text-xl font-bold text-green-900">
                      +{salaryData.bonuses || 0} ETB
                    </p>
                  </div>
                </div>
                <div className="text-xs text-green-600">
                  Performance rewards
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl shadow-lg border border-red-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <FiMinus className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-700 mb-1">
                      Total Deductions
                    </p>
                    <p className="text-xl font-bold text-red-900">
                      -{(salaryData.latenessDeduction + salaryData.absenceDeduction)} ETB
                    </p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-red-600">
                  <span>Lateness: {salaryData.latenessDeduction}</span>
                  <span>Absence: {salaryData.absenceDeduction}</span>
                </div>
              </div>

              {/* Final Salary */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl shadow-lg border border-purple-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <FiTarget className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-purple-700 mb-1">
                      Net Salary
                    </p>
                    <p className="text-xl font-bold text-purple-900">
                      {salaryData.totalSalary} ETB
                    </p>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full text-center ${
                  salaryData.status === "Paid" 
                    ? "bg-green-100 text-green-700" 
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {salaryData.status === "Paid" ? "✓ Paid" : "⏳ Pending"}
                </div>
              </div>
            </div>

            {/* Detailed Breakdown Section */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-600 rounded-lg">
                    <FiBarChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-black">
                    Salary Breakdown
                  </h2>
                </div>
                <Button
                  onClick={() => fetchBreakdown()}
                  disabled={breakdownLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  {breakdownLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                  View Details
                </Button>
              </div>

              {/* Quick Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiUsers className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Students</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{salaryData.numStudents}</p>
                  <p className="text-xs text-gray-500">Active students</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiCalendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Teaching Days</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{salaryData.teachingDays || 0}</p>
                  <p className="text-xs text-gray-500">Days with classes</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Daily Average</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {salaryData.teachingDays > 0 
                      ? Math.round(salaryData.baseSalary / salaryData.teachingDays)
                      : 0
                    }
                  </p>
                  <p className="text-xs text-gray-500">ETB per day</p>
                </div>
              </div>

              {/* Calculation Formula */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <FiPieChart className="h-4 w-4" />
                  Salary Calculation
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800">Base Salary (Daily earnings)</span>
                    <span className="font-mono text-blue-900">+{salaryData.baseSalary} ETB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-800">Quality Bonuses</span>
                    <span className="font-mono text-green-900">+{salaryData.bonuses} ETB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-800">Lateness Deductions</span>
                    <span className="font-mono text-red-900">-{salaryData.latenessDeduction} ETB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-800">Absence Deductions</span>
                    <span className="font-mono text-red-900">-{salaryData.absenceDeduction} ETB</span>
                  </div>
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-blue-900">Final Salary</span>
                      <span className="font-mono text-lg text-blue-900">{salaryData.totalSalary} ETB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Month Summary */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-indigo-600 rounded-xl">
                    <FiCalendar className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-black">
                    {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{salaryData.numStudents}</p>
                    <p className="text-sm text-gray-600">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{salaryData.teachingDays}</p>
                    <p className="text-sm text-gray-600">Teaching Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {(salaryData.latenessDeduction + salaryData.absenceDeduction) > 0 ? 
                        (salaryData.latenessDeduction + salaryData.absenceDeduction) : 0
                      }
                    </p>
                    <p className="text-sm text-gray-600">Deductions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{salaryData.bonuses}</p>
                    <p className="text-sm text-gray-600">Bonuses</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                  <p className="text-3xl font-bold text-indigo-900 mb-2">
                    {salaryData.totalSalary} ETB
                  </p>
                  <div className="flex items-center justify-center gap-2 text-gray-700 mb-4">
                    <FiTrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Monthly Net Salary</span>
                  </div>
                  
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                    salaryData.status === "Paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {salaryData.status === "Paid" ? (
                      <>
                        <FiCheckCircle className="inline h-4 w-4 mr-1" />
                        Payment Completed
                      </>
                    ) : (
                      <>
                        <FiClock className="inline h-4 w-4 mr-1" />
                        Payment Pending
                      </>
                    )}
                  </span>
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

      {/* Enhanced Breakdown Modal */}
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
                className="p-2 text-gray-500 hover:text-gray-800 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {breakdownLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-black mb-2">
                    Loading detailed breakdown...
                  </p>
                  <p className="text-gray-600">
                    Please wait while we fetch your salary details.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lateness Records */}
                  <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-600 rounded-lg">
                        <FiClock className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-red-900">
                        Lateness Records
                      </h3>
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                        {breakdown.latenessRecords?.length || 0} incidents
                      </span>
                    </div>
                    
                    {breakdown.latenessRecords?.length === 0 ? (
                      <div className="text-center py-8">
                        <FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-green-700 font-medium">No lateness records!</p>
                        <p className="text-green-600 text-sm">Great job maintaining punctuality.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {breakdown.latenessRecords?.map((record: any, index: number) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-mono text-sm text-gray-600 mb-1">
                                  {format(new Date(record.classDate), "MMM dd, yyyy")}
                                </div>
                                <div className="text-sm text-gray-700">
                                  Student: {record.studentName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {record.latenessMinutes} minutes late
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                                  -{record.deductionApplied} ETB
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {record.deductionTier}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-red-900">Total Lateness Deduction:</span>
                        <span className="text-xl font-bold text-red-600">
                          -{breakdown.latenessRecords?.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0) || 0} ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Absence Records */}
                  <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-yellow-600 rounded-lg">
                        <FiAlertTriangle className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-yellow-900">
                        Absence Records
                      </h3>
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                        {breakdown.absenceRecords?.length || 0} days
                      </span>
                    </div>
                    
                    {breakdown.absenceRecords?.length === 0 ? (
                      <div className="text-center py-8">
                        <FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-green-700 font-medium">Perfect attendance!</p>
                        <p className="text-green-600 text-sm">No absence records for this period.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {breakdown.absenceRecords?.map((record: any, index: number) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-mono text-sm text-gray-600 mb-1">
                                  {format(new Date(record.classDate), "MMM dd, yyyy")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    record.permitted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    {record.permitted ? "Permitted" : "Unpermitted"}
                                  </span>
                                </div>
                                {record.reviewNotes && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {record.reviewNotes}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
                                  -{record.deductionApplied} ETB
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-yellow-900">Total Absence Deduction:</span>
                        <span className="text-xl font-bold text-yellow-600">
                          -{breakdown.absenceRecords?.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0) || 0} ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bonus Records */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <FiAward className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-green-900">
                        Quality Bonuses
                      </h3>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        {breakdown.bonusRecords?.length || 0} bonuses
                      </span>
                    </div>
                    
                    {breakdown.bonusRecords?.length === 0 ? (
                      <div className="text-center py-8">
                        <FiGift className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No bonuses this period</p>
                        <p className="text-gray-500 text-sm">Keep up the great work to earn quality bonuses!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {breakdown.bonusRecords?.map((record: any, index: number) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-mono text-sm text-gray-600 mb-1">
                                  {format(new Date(record.createdAt), "MMM dd, yyyy")}
                                </div>
                                <div className="text-sm text-gray-700 font-medium">
                                  {record.reason}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                  +{record.amount} ETB
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-900">Total Bonuses:</span>
                        <span className="text-xl font-bold text-green-600">
                          +{breakdown.bonusRecords?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0} ETB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowBreakdown(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}um"
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

      {/* Mobile Breakdown Modal */}
      {showBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="fixed inset-x-4 top-4 bottom-4 bg-white rounded-2xl shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <FiBarChart className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-black">
                  Salary Breakdown
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
                    Loading breakdown...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Lateness Records */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FiClock className="text-red-500 h-4 w-4" />
                      <h3 className="text-base font-bold text-red-900">
                        Lateness Records
                      </h3>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        {breakdown.latenessRecords?.length || 0}
                      </span>
                    </div>
                    {breakdown.latenessRecords?.length === 0 ? (
                      <p className="text-red-600 text-center py-3 text-sm">
                        No lateness records.
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
                                    {new Date(
                                      record.classDate
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-700">
                                    {record.studentName}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {record.latenessMinutes} min
                                  </span>
                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                    -{record.deductionApplied} ETB
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-red-900 text-sm">
                          Total Deduction:
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

                {/* Absence Records */}
                <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FiAlertTriangle className="text-yellow-500 h-5 w-5" />
                    <h3 className="text-lg font-bold text-yellow-900">
                      Absence Records
                    </h3>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-sm font-semibold">
                      {breakdown.absenceRecords?.length || 0} days
                    </span>
                  </div>
                  {breakdown.absenceRecords?.length === 0 ? (
                    <p className="text-yellow-600 text-center py-4">
                      No absence records for this period.
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
                                  {new Date(
                                    record.classDate
                                  ).toLocaleDateString()}
                                </div>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    record.permitted
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {record.permitted
                                    ? "Permitted"
                                    : "Unpermitted"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                                  -{record.deductionApplied} ETB
                                </span>
                                {record.reviewNotes && (
                                  <span className="text-xs text-gray-500">
                                    ({record.reviewNotes})
                                  </span>
                                )}
                              </div>
                            </div>
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
                                  {new Date(
                                    record.createdAt
                                  ).toLocaleDateString()}
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
