"use client";

import React, { useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import {
  FiCalendar,
  FiUser,
  FiDollarSign,
  FiAward,
  FiAlertTriangle,
  FiSearch,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiX,
  FiLoader,
  FiInfo,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiFilter,
  FiSettings,
  FiBarChart,
  FiFileText,
  FiTrash2,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SalaryTable from "@/components/teacher-payments/SalaryTable";
import {
  formatCurrency,
  formatCompactCurrency,
} from "@/lib/teacher-payment-utils";
import TeacherChangeValidator from "@/components/teacher-payments/TeacherChangeValidator";
import { useRouter, useSearchParams } from "next/navigation";

// Month options
const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

interface TeacherSalaryData {
  id: string;
  name: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  status: "Paid" | "Unpaid";
  numStudents: number;
  teachingDays: number;
  hasTeacherChanges: boolean;
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
      periods?: Array<{
        period: string;
        daysWorked: number;
        dailyRate: number;
        periodEarnings: number;
        teachingDates: string[];
        teacherRole: "old_teacher" | "new_teacher";
        changeDate?: string;
      }>;
      teacherChanges: boolean;
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
    summary: {
      workingDaysInMonth: number;
      actualTeachingDays: number;
      averageDailyEarning: number;
      totalDeductions: number;
      netSalary: number;
    };
  };
}

interface PaymentStatistics {
  totalTeachers: number;
  totalSalary: number;
  totalDeductions: number;
  paidTeachers: number;
  unpaidTeachers: number;
  averageSalary: number;
  paymentRate: number;
}

interface TeacherPaymentsClientProps {
  initialTeachers: TeacherSalaryData[];
  initialStatistics: PaymentStatistics | null;
  initialError: string | null;
  initialIncludeSundays: boolean;
  initialShowTeacherSalary: boolean;
  initialCustomMessage: string;
  initialAdminContact: string;
  selectedMonth: number;
  selectedYear: number;
  startDate: string;
  endDate: string;
}

export default function TeacherPaymentsClient({
  initialTeachers,
  initialStatistics,
  initialError,
  initialIncludeSundays,
  initialShowTeacherSalary,
  initialCustomMessage,
  initialAdminContact,
  selectedMonth: initialSelectedMonth,
  selectedYear: initialSelectedYear,
  startDate,
  endDate,
}: TeacherPaymentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [selectedMonth, setSelectedMonth] = useState(initialSelectedMonth);
  const [selectedYear, setSelectedYear] = useState(initialSelectedYear);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTeacherChangeValidator, setShowTeacherChangeValidator] =
    useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [includeSundays, setIncludeSundays] = useState(initialIncludeSundays);
  const [showTeacherSalary, setShowTeacherSalary] = useState(
    initialShowTeacherSalary
  );
  const [customMessage, setCustomMessage] = useState(initialCustomMessage);
  const [adminContact, setAdminContact] = useState(initialAdminContact);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  // Update URL when month/year changes
  const updateURL = useCallback(
    (month: number, year: number, clearCache = false) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month.toString());
      params.set("year", year.toString());
      if (clearCache) {
        params.set("clearCache", "true");
      } else {
        params.delete("clearCache");
      }
      router.push(`/admin/teacher-payments?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Handle URL changes and update state accordingly
  useEffect(() => {
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (month) {
      const monthNum = parseInt(month);
      if (monthNum !== selectedMonth) {
        setSelectedMonth(monthNum);
      }
    }

    if (year) {
      const yearNum = parseInt(year);
      if (yearNum !== selectedYear) {
        setSelectedYear(yearNum);
      }
    }
  }, [searchParams, selectedMonth, selectedYear]);

  // Debug function to fetch debug information
  const fetchDebugInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/teacher-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "debug",
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDebugInfo(JSON.stringify(data, null, 2));
        toast({
          title: "Debug Info",
          description: "Debug information loaded. Check the debug panel below.",
        });
      } else {
        throw new Error("Failed to fetch debug info");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch debug information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Refresh data by navigating to the same URL with clearCache
  const refreshWithCacheClear = useCallback(async () => {
    setLoading(true);
    try {
      // Clear cache via API first
      const cacheResponse = await fetch("/api/admin/clear-salary-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });

      if (!cacheResponse.ok) {
        throw new Error("Failed to clear cache");
      }

      // Then refresh the page
      updateURL(selectedMonth, selectedYear, true);
      setLastUpdated(new Date());

      toast({
        title: "Success",
        description: "Salary cache cleared and data refreshed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, updateURL]);

  // Regular refresh (without cache clear)
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      updateURL(selectedMonth, selectedYear, false);
      setLastUpdated(new Date());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, updateURL]);

  // Update Sunday inclusion setting
  const updateSundaySetting = useCallback(
    async (include: boolean) => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/settings/include-sundays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ includeSundays: include }),
        });

        if (response.ok) {
          setIncludeSundays(include);
          toast({
            title: "Success",
            description: `Sunday inclusion ${
              include ? "enabled" : "disabled"
            }. Refreshing calculations...`,
          });
          // Clear cache and refresh data to reflect the change immediately
          await refreshWithCacheClear();
          setLastUpdated(new Date());
        } else {
          throw new Error("Failed to update setting");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update Sunday inclusion setting",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [refreshWithCacheClear]
  );

  // Update show teacher salary setting
  const updateShowTeacherSalarySetting = useCallback(
    async (show: boolean, message?: string, contact?: string) => {
      try {
        setLoading(true);
        const response = await fetch(
          "/api/admin/settings/teacher-salary-visibility",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              showTeacherSalary: show,
              customMessage: message || customMessage,
              adminContact: contact || adminContact,
            }),
          }
        );

        if (response.ok) {
          setShowTeacherSalary(show);
          if (message !== undefined) setCustomMessage(message);
          if (contact !== undefined) setAdminContact(contact);
          toast({
            title: "Success",
            description: `Teacher salary visibility ${
              show ? "enabled" : "disabled"
            }`,
          });
          // Refresh data with cache clear to reflect the change immediately
          await refreshWithCacheClear();
          setLastUpdated(new Date());
        } else {
          throw new Error("Failed to update setting");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update teacher salary visibility setting",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [customMessage, adminContact, refreshWithCacheClear]
  );

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
      updateURL(12, selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
      updateURL(selectedMonth - 1, selectedYear);
    }
  }, [selectedMonth, selectedYear, updateURL]);

  const goToNextMonth = useCallback(() => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
      updateURL(1, selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
      updateURL(selectedMonth + 1, selectedYear);
    }
  }, [selectedMonth, selectedYear, updateURL]);

  const goToCurrentMonth = useCallback(() => {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    setSelectedMonth(month);
    setSelectedYear(year);
    updateURL(month, year);
  }, [updateURL]);

  // Teacher selection handler
  const handleTeacherSelect = useCallback((teacher: any) => {
    setSelectedTeacher(teacher);
    setShowDetails(true);
  }, []);

  // Bulk action handler
  const handleBulkAction = useCallback(
    async (action: string, teacherIds?: string[]) => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/teacher-payments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_update_status",
            teacherIds: teacherIds || [],
            status: action === "mark_paid" ? "Paid" : "Unpaid",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update payment status");
        }

        toast({
          title: "Success",
          description: `Bulk action completed successfully. Refreshing data...`,
        });

        // Refresh data to show updated status
        await refresh();
        setLastUpdated(new Date());
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to perform bulk action",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teacher Payments
            </h1>
            <p className="text-gray-600 mt-1">
              Manage teacher salaries, deductions, bonuses, and payment status
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  includeSundays
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <FiCalendar className="w-3 h-3 inline mr-1" />
                Sundays: {includeSundays ? "Included" : "Excluded"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <FiSettings className="w-4 h-4" />
              Settings
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowTeacherChangeValidator(true)}
              className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <FiAlertTriangle className="w-4 h-4" />
              Validate Changes
            </Button>

            <Button
              onClick={() => refresh()}
              disabled={loading}
              className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              onClick={refreshWithCacheClear}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FiTrash2 className="w-4 h-4" />
              Clear Cache
            </Button>
            <Button
              onClick={fetchDebugInfo}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <FiInfo className="w-4 h-4" />
              Debug Info
            </Button>
          </div>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FiCalendar className="w-5 h-5 text-gray-600" />
            Period Selection
          </CardTitle>
          <CardDescription className="text-gray-600">
            Select the month and year to view teacher payment data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="flex items-center gap-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <FiChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Month:
                </span>
              </div>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => {
                  const month = parseInt(value);
                  setSelectedMonth(month);
                  updateURL(month, selectedYear);
                }}
              >
                <SelectTrigger className="w-40 border-gray-300 focus:border-black">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Year:</span>
              </div>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => {
                  const year = parseInt(value);
                  setSelectedYear(year);
                  updateURL(selectedMonth, year);
                }}
              >
                <SelectTrigger className="w-24 border-gray-300 focus:border-black">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = dayjs().year() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              className="flex items-center gap-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Next
              <FiChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={goToCurrentMonth}
              className="flex items-center gap-1 bg-black hover:bg-gray-800 text-white"
            >
              <FiCalendar className="w-4 h-4" />
              Current Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      {statistics && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-gray-900">
                  {statistics.totalTeachers}
                </div>
                <div className="text-gray-600 text-sm">Total Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-gray-900">
                  {formatCurrency(statistics.totalSalary)}
                </div>
                <div className="text-gray-600 text-sm">Total Salary</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-red-600">
                  {formatCurrency(statistics.totalDeductions)}
                </div>
                <div className="text-gray-600 text-sm">Total Deductions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-green-600">
                  {statistics.paidTeachers}
                </div>
                <div className="text-gray-600 text-sm">Paid Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-orange-600">
                  {statistics.unpaidTeachers}
                </div>
                <div className="text-gray-600 text-sm">Unpaid Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 text-blue-600">
                  {teachers.filter((t) => t.hasTeacherChanges).length}
                </div>
                <div className="text-gray-600 text-sm">
                  With Teacher Changes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Main Content */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FiSettings className="w-6 h-6" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-gray-600">
              Common administrative tasks for teacher payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {/* Sunday Inclusion Toggle */}
            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-800 rounded-full">
                    <FiCalendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Sunday Inclusion Setting
                    </h3>
                    <p className="text-sm text-gray-600">
                      {includeSundays
                        ? "Sundays are included in salary calculations (7 working days)"
                        : "Sundays are excluded from salary calculations (6 working days)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      includeSundays
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {includeSundays ? "INCLUDED" : "EXCLUDED"}
                  </span>
                  <Button
                    onClick={() => updateSundaySetting(!includeSundays)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      includeSundays
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    <FiSettings className="w-4 h-4" />
                    {includeSundays ? "Exclude Sundays" : "Include Sundays"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Button
                variant="outline"
                onClick={() =>
                  handleBulkAction(
                    "mark_paid",
                    teachers
                      .filter((t) => t.status === "Unpaid")
                      .map((t) => t.id)
                  )
                }
                disabled={
                  loading ||
                  teachers.filter((t) => t.status === "Unpaid").length === 0
                }
                className="flex items-center gap-3 h-16 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-300 group border-2 hover:shadow-lg"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <FiCheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">
                    Mark All Unpaid as Paid
                  </div>
                  <div className="text-sm text-gray-600">
                    {teachers.filter((t) => t.status === "Unpaid").length}{" "}
                    teachers
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  handleBulkAction(
                    "mark_unpaid",
                    teachers.filter((t) => t.status === "Paid").map((t) => t.id)
                  )
                }
                disabled={
                  loading ||
                  teachers.filter((t) => t.status === "Paid").length === 0
                }
                className="flex items-center gap-3 h-16 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-300 group border-2 hover:shadow-lg"
              >
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <FiXCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">
                    Mark All Paid as Unpaid
                  </div>
                  <div className="text-sm text-gray-600">
                    {teachers.filter((t) => t.status === "Paid").length}{" "}
                    teachers
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowTeacherSalary(!showTeacherSalary)}
                className={`flex items-center gap-3 h-16 transition-all duration-300 group border-2 hover:shadow-lg ${
                  showTeacherSalary
                    ? "bg-blue-50 hover:bg-blue-100 text-blue-600 hover:border-blue-300"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-600 hover:border-gray-300"
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    showTeacherSalary
                      ? "bg-blue-100 group-hover:bg-blue-200"
                      : "bg-gray-100 group-hover:bg-gray-200"
                  }`}
                >
                  <FiUsers
                    className={`w-6 h-6 ${
                      showTeacherSalary ? "text-blue-600" : "text-gray-600"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">
                    {showTeacherSalary ? "Hide" : "Show"} Teacher Salary
                  </div>
                  <div className="text-sm text-gray-600">
                    {showTeacherSalary
                      ? "Teachers can view salary"
                      : "Teachers cannot view salary"}
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // This will be handled by the SalaryTable component's filter
                  const teacherChangeFilter = document.querySelector(
                    "[data-teacher-change-filter]"
                  ) as HTMLSelectElement;
                  if (teacherChangeFilter) {
                    teacherChangeFilter.value = "changed";
                    teacherChangeFilter.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );
                  }
                }}
                disabled={
                  teachers.filter((t) => t.hasTeacherChanges).length === 0
                }
                className="flex items-center gap-3 h-16 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-300 group border-2 hover:shadow-lg"
              >
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <FiAlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">
                    View Teacher Changes
                  </div>
                  <div className="text-sm text-gray-600">
                    {teachers.filter((t) => t.hasTeacherChanges).length}{" "}
                    teachers with changes
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3">
                <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-gray-700">
                  Loading teacher payment data...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salary Table */}
        {!loading && (
          <SalaryTable
            data={teachers}
            loading={loading}
            onRefresh={refresh}
            onTeacherSelect={handleTeacherSelect}
            onBulkAction={handleBulkAction}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {/* Error Display */}
        {error && (
          <Card className="border border-red-200 shadow-sm bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-800">
                <div className="p-2 bg-red-500 rounded-full">
                  <FiAlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-lg">Error:</span>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <FiSettings className="w-5 h-5" />
              Payment Settings
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Configure payment calculation settings and preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Calculation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Include Sundays
                    </label>
                    <p className="text-xs text-gray-500">
                      Include Sunday classes in salary calculations
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeSundays}
                      onChange={(e) => updateSundaySetting(e.target.checked)}
                      className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Show Teacher Salary
                      </label>
                      <p className="text-xs text-gray-500">
                        Allow teachers to view their own salary information
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showTeacherSalary}
                        onChange={(e) =>
                          updateShowTeacherSalarySetting(e.target.checked)
                        }
                        className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black"
                      />
                    </div>
                  </div>

                  {!showTeacherSalary && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Custom Message for Teachers
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Enter a custom message to show teachers when salary is hidden..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500">
                          This message will be displayed to teachers when salary
                          information is hidden
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Admin Contact Information
                        </label>
                        <textarea
                          value={adminContact}
                          onChange={(e) => setAdminContact(e.target.value)}
                          placeholder="Enter contact information for teachers to reach admin..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                        <p className="text-xs text-gray-500">
                          Contact information shown to teachers when they need
                          help
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            updateShowTeacherSalarySetting(
                              false,
                              customMessage,
                              adminContact
                            )
                          }
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Save Message & Contact
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCustomMessage(
                              "Salary information is currently hidden by administrator. Please contact the administration for more details."
                            );
                            setAdminContact(
                              "Contact the administration office for assistance."
                            );
                          }}
                        >
                          Reset to Default
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Package Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FiSettings className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Package Deductions
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Configure base deduction amounts for lateness and absence by
                    package type
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSettings(false);
                      window.open("/admin/package-deductions", "_blank");
                    }}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    <FiSettings className="w-4 h-4 mr-2" />
                    Configure Package Deductions
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowSettings(false)}>
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher Change Validator Modal */}
      <Dialog
        open={showTeacherChangeValidator}
        onOpenChange={setShowTeacherChangeValidator}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <FiAlertTriangle className="w-5 h-5" />
              Teacher Change Validations
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Validate teacher changes and check for payment
            </DialogDescription>
          </DialogHeader>
          <TeacherChangeValidator
            period={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`}
            onClose={() => setShowTeacherChangeValidator(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Debug Panel */}
      {debugInfo && (
        <Card className="mt-4 border border-blue-200 shadow-sm">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <FiInfo className="w-5 h-5" />
              Debug Information
            </CardTitle>
            <CardDescription className="text-blue-700">
              Debug logs for salary calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
              {debugInfo}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setDebugInfo("")}
                className="text-gray-600"
              >
                <FiX className="w-4 h-4 mr-2" />
                Close Debug
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
