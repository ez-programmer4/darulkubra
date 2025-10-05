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
import { useTeacherPayments } from "@/hooks/useTeacherPayments";
import SalaryTable from "@/components/teacher-payments/SalaryTable";
import {
  formatCurrency,
  formatCompactCurrency,
} from "@/lib/teacher-payment-utils";
import TeacherChangeValidator from "@/components/teacher-payments/TeacherChangeValidator";

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

export default function TeacherPaymentsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showTeacherChangeValidator, setShowTeacherChangeValidator] =
    useState(false);
  const [includeSundays, setIncludeSundays] = useState(false);
  const [showTeacherSalary, setShowTeacherSalary] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [adminContact, setAdminContact] = useState("");

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [sundayResponse, salaryResponse] = await Promise.all([
          fetch("/api/admin/settings/include-sundays"),
          fetch("/api/admin/settings/teacher-salary-visibility"),
        ]);

        if (sundayResponse.ok) {
          const sundayData = await sundayResponse.json();
          setIncludeSundays(sundayData.includeSundays || false);
        }

        if (salaryResponse.ok) {
          const salaryData = await salaryResponse.json();
          setShowTeacherSalary(salaryData.showTeacherSalary || true);
          setCustomMessage(salaryData.customMessage || "");
          setAdminContact(salaryData.adminContact || "");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Update Sunday inclusion setting
  const updateSundaySetting = useCallback(
    async (include: boolean) => {
      try {
        const response = await fetch("/api/admin/settings/include-sundays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ includeSundays: include }),
        });

        if (response.ok) {
          setIncludeSundays(include);
          toast({
            title: "Success",
            description: `Sunday inclusion ${include ? "enabled" : "disabled"}`,
          });
          // Refresh data to reflect the change
          await refresh();
        } else {
          throw new Error("Failed to update setting");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update Sunday inclusion setting",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Update show teacher salary setting
  const updateShowTeacherSalarySetting = useCallback(
    async (show: boolean, message?: string, contact?: string) => {
      try {
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
        } else {
          throw new Error("Failed to update setting");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update teacher salary visibility setting",
          variant: "destructive",
        });
      }
    },
    [toast, customMessage, adminContact]
  );

  // Get date range for the selected month/year
  const getDateRange = () => {
    const startDate = dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
    )
      .startOf("month")
      .toISOString()
      .split("T")[0];
    const endDate = dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
    )
      .endOf("month")
      .toISOString()
      .split("T")[0];
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Use our enhanced hook
  const {
    data: teachers,
    statistics,
    loading,
    error,
    lastUpdated,
    fetchData,
    fetchDetails,
    updatePaymentStatus,
    bulkUpdatePaymentStatus,
    exportData,
    refresh,
  } = useTeacherPayments({
    startDate,
    endDate,
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes instead of 30 seconds
  });

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }, [selectedMonth, selectedYear]);

  const goToNextMonth = useCallback(() => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }, [selectedMonth, selectedYear]);

  const generateFinancialReport = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/teacher-payments/financial-report?startDate=${startDate}&endDate=${endDate}&format=csv`
      );

      if (!response.ok) {
        throw new Error("Failed to generate financial report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Financial report generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate financial report",
        variant: "destructive",
      });
    }
  }, [startDate, endDate, toast]);

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonth(dayjs().month() + 1);
    setSelectedYear(dayjs().year());
  }, []);

  // Teacher selection handler
  const handleTeacherSelect = useCallback((teacher: any) => {
    setSelectedTeacher(teacher);
    setShowDetails(true);
  }, []);

  // Bulk action handler
  const handleBulkAction = useCallback(
    async (action: string, teacherIds?: string[]) => {
      try {
        const status = action === "mark_paid" ? "Paid" : "Unpaid";
        await bulkUpdatePaymentStatus(teacherIds || [], status);
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to perform bulk action",
          variant: "destructive",
        });
      }
    },
    [bulkUpdatePaymentStatus]
  );

  // Export handler
  const handleExport = useCallback(
    async (format: "csv" | "excel") => {
      try {
        await exportData(format);
        toast({
          title: "Success",
          description: `Data exported as ${format.toUpperCase()}`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to export data",
          variant: "destructive",
        });
      }
    },
    [exportData]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Teacher Payments</h1>
            <p className="text-blue-100 mt-1">
              Manage teacher salaries, deductions, bonuses, and payment status
            </p>
            {lastUpdated && (
              <p className="text-sm text-blue-200 mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  includeSundays
                    ? "bg-green-500/20 text-green-200"
                    : "bg-red-500/20 text-red-200"
                }`}
              >
                <FiCalendar className="w-3 h-3 inline mr-1" />
                Sundays: {includeSundays ? "Included" : "Excluded"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowStatistics(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <FiBarChart className="w-4 h-4" />
              Statistics
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <FiSettings className="w-4 h-4" />
              Settings
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowTeacherChangeValidator(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <FiAlertTriangle className="w-4 h-4" />
              Validate Changes
            </Button>

            <Button
              variant="secondary"
              onClick={generateFinancialReport}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <FiFileText className="w-4 h-4" />
              Financial Report
            </Button>

            <Button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-600"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <FiCalendar className="w-5 h-5 text-blue-600" />
            Period Selection
          </CardTitle>
          <CardDescription>
            Select the month and year to view teacher payment data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
            >
              <FiChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Month:
                </span>
              </div>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-40 border-gray-300 focus:border-blue-500">
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
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-24 border-gray-300 focus:border-blue-500">
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
              className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
            >
              Next
              <FiChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={goToCurrentMonth}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FiCalendar className="w-4 h-4" />
              Current Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      {statistics && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">
                  {statistics.totalTeachers}
                </div>
                <div className="text-indigo-200 text-sm">Total Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(statistics.totalSalary)}
                </div>
                <div className="text-indigo-200 text-sm">Total Salary</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">
                  {statistics.paidTeachers}
                </div>
                <div className="text-indigo-200 text-sm">Paid Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">
                  {statistics.unpaidTeachers}
                </div>
                <div className="text-indigo-200 text-sm">Unpaid Teachers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">
                    Total Teachers
                  </p>
                  <p className="text-3xl font-bold text-blue-900 mb-1">
                    {statistics.totalTeachers}
                  </p>
                  <p className="text-xs text-blue-600">
                    Active teachers this month
                  </p>
                </div>
                <div className="p-3 bg-blue-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiUsers className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">
                    Total Salary
                  </p>
                  <p className="text-3xl font-bold text-green-900 mb-1">
                    {formatCurrency(statistics.totalSalary)}
                  </p>
                  <p className="text-xs text-green-600">
                    Before deductions & bonuses
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiDollarSign className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-1">
                    Paid
                  </p>
                  <p className="text-3xl font-bold text-emerald-900 mb-1">
                    {statistics.paidTeachers}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {Math.round(
                      (statistics.paidTeachers / statistics.totalTeachers) * 100
                    )}
                    % completion rate
                  </p>
                </div>
                <div className="p-3 bg-emerald-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiCheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">
                    Unpaid
                  </p>
                  <p className="text-3xl font-bold text-amber-900 mb-1">
                    {statistics.unpaidTeachers}
                  </p>
                  <p className="text-xs text-amber-600">
                    Pending payment processing
                  </p>
                </div>
                <div className="p-3 bg-amber-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiXCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">
                    Total Deductions
                  </p>
                  <p className="text-3xl font-bold text-red-900 mb-1">
                    -{formatCurrency(statistics.totalDeductions)}
                  </p>
                  <p className="text-xs text-red-600">
                    Lateness & absence penalties
                  </p>
                </div>
                <div className="p-3 bg-red-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiAlertTriangle className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">
                    Total Bonuses
                  </p>
                  <p className="text-3xl font-bold text-purple-900 mb-1">
                    +{formatCurrency(statistics.totalBonuses)}
                  </p>
                  <p className="text-xs text-purple-600">
                    Quality & performance rewards
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiAward className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-1">
                    Average Salary
                  </p>
                  <p className="text-3xl font-bold text-indigo-900 mb-1">
                    {formatCurrency(statistics.averageSalary)}
                  </p>
                  <p className="text-xs text-indigo-600">
                    Per teacher this month
                  </p>
                </div>
                <div className="p-3 bg-indigo-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <FiBarChart className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Main Content */}
      <div className="space-y-6">
        {/* Enhanced Quick Actions */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FiSettings className="w-6 h-6" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-blue-100">
              Common administrative tasks for teacher payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {/* Sunday Inclusion Toggle - Prominent */}
            <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500 rounded-full">
                    <FiCalendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-orange-800">
                      Sunday Inclusion Setting
                    </h3>
                    <p className="text-sm text-orange-700">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                onClick={() => handleExport("csv")}
                disabled={loading}
                className="flex items-center gap-3 h-16 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300 group border-2 hover:shadow-lg"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <FiDownload className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-lg">Export All Data</div>
                  <div className="text-sm text-gray-600">CSV format</div>
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
          />
        )}

        {/* Absence Deduction Summary */}
        {!loading && teachers.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <FiAlertTriangle className="w-5 h-5 text-red-600" />
                Absence Deduction Summary
              </CardTitle>
              <CardDescription>
                Students who received absence deductions this month
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {(() => {
                // Collect all absence deductions from all teachers
                const allAbsenceDeductions = teachers.flatMap(
                  (teacher) => teacher.breakdown?.absenceBreakdown || []
                );

                if (allAbsenceDeductions.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <FiCheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <p className="text-lg font-medium">
                        No absence deductions this month
                      </p>
                      <p className="text-sm">
                        All students attended their scheduled classes
                      </p>
                    </div>
                  );
                }

                // Group by student for better organization
                const groupedByStudent = allAbsenceDeductions.reduce(
                  (acc, deduction) => {
                    const key = `${deduction.studentId}-${deduction.studentName}`;
                    if (!acc[key]) {
                      acc[key] = {
                        studentId: deduction.studentId,
                        studentName: deduction.studentName,
                        studentPackage: deduction.studentPackage,
                        totalDeduction: 0,
                        deductions: [],
                      };
                    }
                    acc[key].totalDeduction += deduction.deduction;
                    acc[key].deductions.push(deduction);
                    return acc;
                  },
                  {} as Record<string, any>
                );

                const studentGroups = Object.values(groupedByStudent);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {studentGroups.length}
                        </div>
                        <div className="text-sm text-red-700">
                          Students with Absences
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {allAbsenceDeductions.length}
                        </div>
                        <div className="text-sm text-orange-700">
                          Total Absence Days
                        </div>
                      </div>
                      <div className="bg-red-100 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-700">
                          -
                          {formatCurrency(
                            allAbsenceDeductions.reduce(
                              (sum, d) => sum + d.deduction,
                              0
                            )
                          )}
                        </div>
                        <div className="text-sm text-red-800">
                          Total Deductions
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {studentGroups.map((student, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <FiUser className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {student.studentName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Package: {student.studentPackage}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">
                                -{formatCurrency(student.totalDeduction)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.deductions.length} absence
                                {student.deductions.length > 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {student.deductions.map(
                              (deduction: any, dedIndex: number) => (
                                <div
                                  key={dedIndex}
                                  className="bg-gray-50 rounded p-3 text-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700">
                                      {dayjs(deduction.date).format("MMM DD")}
                                    </span>
                                    <span className="text-red-600 font-semibold">
                                      -{formatCurrency(deduction.deduction)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {deduction.permitted && (
                                      <span className="text-green-600">
                                        ✓ Permitted
                                      </span>
                                    )}
                                    {deduction.waived && (
                                      <span className="text-blue-600">
                                        ✓ Waived
                                      </span>
                                    )}
                                    {!deduction.permitted &&
                                      !deduction.waived && (
                                        <span className="text-red-600">
                                          ✗ Unauthorized
                                        </span>
                                      )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Reports Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <FiFileText className="w-5 h-5 text-purple-600" />
              Reports & Analytics
            </CardTitle>
            <CardDescription>
              Generate and download comprehensive payment reports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-3 h-14 bg-green-600 hover:bg-green-700 text-white transition-all duration-300"
              >
                <div className="p-2 bg-green-500 rounded-lg">
                  <FiDownload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Export CSV</div>
                  <div className="text-xs text-green-100">
                    Spreadsheet format
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
                className="flex items-center gap-3 h-14 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiDownload className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Export Excel</div>
                  <div className="text-xs text-gray-500">
                    Advanced formatting
                  </div>
                </div>
              </Button>
            </div>

            {/* Report Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Report Summary</h4>
                  <p className="text-sm text-gray-600">
                    Period: {dayjs(startDate).format("MMMM YYYY")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Records</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {teachers.length} teachers
                  </p>
                </div>
              </div>
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiRefreshCw className="w-4 h-4" />
                <span>Last updated: {lastUpdated.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-red-100">
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

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiSettings className="w-5 h-5" />
              Payment Settings
            </DialogTitle>
            <DialogDescription>
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
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
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
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Auto-refresh Interval
                    </label>
                    <p className="text-xs text-gray-500">
                      How often to refresh data automatically
                    </p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deduction Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Default Lateness Rate
                    </label>
                    <p className="text-xs text-gray-500">
                      Base deduction rate for lateness
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue="30"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">ETB</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Default Absence Rate
                    </label>
                    <p className="text-xs text-gray-500">
                      Base deduction rate for absences
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue="25"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">ETB</span>
                  </div>
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

      {/* Analytics Modal */}
      <Dialog open={showStatistics} onOpenChange={setShowStatistics}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiBarChart className="w-5 h-5" />
              Payment Analytics
            </DialogTitle>
            <DialogDescription>
              Detailed analytics and insights for teacher payments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {statistics && (
              <>
                {/* Payment Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Payment Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {statistics.paidTeachers}
                        </div>
                        <div className="text-sm text-green-700">
                          Paid Teachers
                        </div>
                        <div className="text-xs text-green-600">
                          {Math.round(
                            (statistics.paidTeachers /
                              statistics.totalTeachers) *
                              100
                          )}
                          %
                        </div>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <div className="text-2xl font-bold text-amber-600">
                          {statistics.unpaidTeachers}
                        </div>
                        <div className="text-sm text-amber-700">
                          Unpaid Teachers
                        </div>
                        <div className="text-xs text-amber-600">
                          {Math.round(
                            (statistics.unpaidTeachers /
                              statistics.totalTeachers) *
                              100
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(statistics.totalSalary)}
                        </div>
                        <div className="text-xs text-blue-700">
                          Total Salary
                        </div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">
                          -{formatCurrency(statistics.totalDeductions)}
                        </div>
                        <div className="text-xs text-red-700">
                          Total Deductions
                        </div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          +{formatCurrency(statistics.totalBonuses)}
                        </div>
                        <div className="text-xs text-purple-700">
                          Total Bonuses
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-600">
                          {formatCurrency(statistics.averageSalary)}
                        </div>
                        <div className="text-xs text-gray-700">
                          Average Salary
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Payment Completion Rate
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  (statistics.paidTeachers /
                                    statistics.totalTeachers) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round(
                              (statistics.paidTeachers /
                                statistics.totalTeachers) *
                                100
                            )}
                            %
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Deduction Rate
                        </span>
                        <span className="text-sm font-medium">
                          {Math.round(
                            (statistics.totalDeductions /
                              statistics.totalSalary) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Bonus Rate
                        </span>
                        <span className="text-sm font-medium">
                          {Math.round(
                            (statistics.totalBonuses / statistics.totalSalary) *
                              100
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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
            <DialogTitle className="flex items-center gap-2">
              <FiAlertTriangle className="w-5 h-5" />
              Teacher Change Validation
            </DialogTitle>
            <DialogDescription>
              Validate teacher changes and check for payment conflicts
            </DialogDescription>
          </DialogHeader>
          <TeacherChangeValidator
            period={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`}
            onClose={() => setShowTeacherChangeValidator(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
