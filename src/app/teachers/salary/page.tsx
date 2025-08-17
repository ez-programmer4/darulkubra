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
} from "react-icons/fi";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
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
    } catch (error) {
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
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 md:w-72 bg-black text-white flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-20 md:h-24 px-4 md:px-6 border-b border-gray-700 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-lg">
              <FiDollarSign className="h-5 w-5 md:h-6 md:w-6 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-extrabold text-white">
                Teacher Portal
              </span>
              <span className="text-xs text-gray-300 hidden md:block">
                Salary Management
              </span>
            </div>
          </div>
          <button
            className="md:hidden text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 hover:scale-110"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        </div>
        <nav className="flex-1 px-6 py-8 space-y-3 overflow-y-auto">
          <Link
            href="/teachers/dashboard"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname === "/teachers/dashboard"
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiHome className="h-5 w-5" /> Dashboard
          </Link>
          <Link
            href="/teachers/dashboard?tab=students"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname.includes("tab=students")
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiUsers className="h-5 w-5" /> Students
          </Link>
          <Link
            href="/teachers/permissions"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname === "/teachers/permissions"
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiClipboard className="h-5 w-5" /> Permissions
          </Link>
          <Link
            href="/teachers/salary"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname === "/teachers/salary"
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiTrendingUp className="h-5 w-5" /> Salary
          </Link>
        </nav>
        <div className="px-6 py-6 border-t border-gray-700 bg-black">
          <button
            onClick={() => signOut({ callbackUrl: "/teachers/login" })}
            className="w-full flex items-center gap-4 p-4 text-base font-medium text-gray-300 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 hover:transform hover:scale-105 hover:shadow-lg"
            aria-label="Logout"
          >
            <FiLogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white shadow-xl border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 max-w-7xl mx-auto gap-4">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                className="md:hidden text-black hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-110 shadow-md"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FiMenu size={24} />
              </button>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-black rounded-xl shadow-lg">
                  <FiDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-black">
                    Salary Overview
                  </h1>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium hidden sm:block">
                    View your salary details and payment history
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <FiCalendar className="h-4 w-4 text-gray-600" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-gray-700 font-medium text-sm sm:text-base cursor-pointer"
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
                className="bg-black hover:bg-gray-800 text-white flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base flex-1 sm:flex-none justify-center"
              >
                <FiDownload className="h-4 w-4" />
                <span className="hidden sm:inline">Download Report</span>
                <span className="sm:hidden">Download</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 md:pb-8">
          {!salaryVisible ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200 p-8 sm:p-12 text-center animate-slide-in">
              <div className="p-6 bg-yellow-50 rounded-full w-fit mx-auto mb-6 border-2 border-yellow-200">
                <FiAlertTriangle className="h-16 w-16 text-yellow-500" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Salary Access Restricted
              </h2>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed max-w-md mx-auto">
                Access to salary information has been temporarily disabled by
                the administration.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <p className="text-sm text-gray-500">
                  Please contact your administrator for more information or to
                  request access.
                </p>
              </div>
              <p className="text-xs text-gray-400">
                You can still access other sections using the navigation menu.
              </p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200 p-8 sm:p-12 text-center animate-slide-in">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
              </div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <FiDollarSign className="h-6 w-6 text-black" />
                <h3 className="text-xl font-bold text-black">
                  Loading Salary Data
                </h3>
              </div>
              <p className="text-gray-700 font-medium">
                Please wait while we fetch your salary information...
              </p>
            </div>
          ) : error ? (
            <Card className="bg-white border-gray-200 shadow-xl rounded-2xl sm:rounded-3xl animate-slide-in">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-6">
                  <FiAlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-3">
                  Error Loading Salary Data
                </h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                  {error}
                </p>
                <Button
                  onClick={fetchSalaryData}
                  className="bg-black hover:bg-gray-800 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <FiRefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : salaryData ? (
            <div className="space-y-8">
              {/* Salary Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {/* Base Salary */}
                <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl animate-slide-in">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FiDollarSign className="h-4 w-4 text-gray-600" />
                          <p className="text-xs sm:text-sm font-semibold text-gray-600">
                            Base Salary
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-black">
                          {salaryData.baseSalary} ETB
                        </p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <FiTarget className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bonuses */}
                <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl animate-slide-in">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FiGift className="h-4 w-4 text-gray-600" />
                          <p className="text-xs sm:text-sm font-semibold text-gray-600">
                            Quality Bonuses
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          +{salaryData.bonuses || 0} ETB
                        </p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <FiAward className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lateness Deduction */}
                <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl animate-slide-in">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FiClock className="h-4 w-4 text-gray-600" />
                          <p className="text-xs sm:text-sm font-semibold text-gray-600">
                            Lateness Deduction
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-red-600">
                          -{salaryData.latenessDeduction} ETB
                        </p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <FiMinus className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Absence Deduction */}
                <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl animate-slide-in">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FiTrendingDown className="h-4 w-4 text-gray-600" />
                          <p className="text-xs sm:text-sm font-semibold text-gray-600">
                            Absence Deduction
                          </p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-red-600">
                          -{salaryData.absenceDeduction} ETB
                        </p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <FiAlertTriangle className="h-6 w-6 text-black" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Final Salary Card */}
              <Card className="bg-white border-gray-200 shadow-2xl rounded-3xl animate-slide-in hover:shadow-3xl transition-all duration-500">
                <CardContent className="p-6 sm:p-8 lg:p-12">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="p-4 bg-black rounded-2xl shadow-lg">
                        <FiDollarSign className="h-8 w-8 text-white" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black">
                        Final Salary
                      </h2>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 mb-6 shadow-lg">
                      <p className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-black mb-2">
                        {salaryData.totalSalary} ETB
                      </p>
                      <div className="flex items-center justify-center gap-2 text-gray-700">
                        <FiTrendingUp className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          Monthly Salary
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${
                            salaryData.status === "Paid"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                          }`}
                        >
                          {salaryData.status === "Paid" ? (
                            <>
                              <FiCheckCircle className="inline h-4 w-4 mr-1" />{" "}
                              Paid
                            </>
                          ) : (
                            <>
                              <FiClock className="inline h-4 w-4 mr-1" />{" "}
                              Pending
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiCalendar className="h-4 w-4" />
                        <span className="font-semibold text-sm sm:text-base">
                          {new Date(selectedMonth + "-01").toLocaleDateString(
                            "en-US",
                            { month: "long", year: "numeric" }
                          )}
                        </span>
                      </div>
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
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-2xl flex justify-around py-3 z-50">
          <Link
            href="/teachers/dashboard"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <FiHome className="w-5 h-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
          <Link
            href="/teachers/dashboard?tab=students"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <FiUsers className="w-5 h-5" />
            <span className="text-xs font-medium">Students</span>
          </Link>
          <Link
            href="/teachers/permissions"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <FiClipboard className="w-5 h-5" />
            <span className="text-xs font-medium">Permissions</span>
          </Link>
          <Link
            href="/teachers/salary"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-black bg-gray-100 transform scale-105"
          >
            <FiTrendingUp className="w-5 h-5" />
            <span className="text-xs font-medium">Salary</span>
          </Link>
        </nav>
      </div>

      {/* Enhanced Animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Mobile touch improvements */
        @media (max-width: 768px) {
          .touch-target {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
