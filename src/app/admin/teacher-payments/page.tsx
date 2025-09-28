"use client";

import React, { useState, useCallback } from "react";
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
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    refreshInterval: 30000,
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

      {/* Main Content */}
      <div className="space-y-4">
        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <FiSettings className="w-5 h-5 text-blue-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks for teacher payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="flex items-center gap-2 h-12 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-300"
              >
                <FiCheckCircle className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Mark All Unpaid as Paid</div>
                  <div className="text-xs text-gray-500">
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
                className="flex items-center gap-2 h-12 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-300"
              >
                <FiXCircle className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Mark All Paid as Unpaid</div>
                  <div className="text-xs text-gray-500">
                    {teachers.filter((t) => t.status === "Paid").length}{" "}
                    teachers
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={loading}
                className="flex items-center gap-2 h-12 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-300"
              >
                <FiDownload className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Export All Data</div>
                  <div className="text-xs text-gray-500">CSV format</div>
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
    </div>
  );
}
