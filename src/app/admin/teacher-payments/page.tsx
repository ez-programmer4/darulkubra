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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Payments</h1>
          <p className="text-gray-600 mt-1">
            Manage teacher salaries, deductions, bonuses, and payment status
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowStatistics(true)}
            className="flex items-center gap-2"
          >
            <FiBarChart className="w-4 h-4" />
            Statistics
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <FiSettings className="w-4 h-4" />
            Settings
          </Button>

          <Button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiCalendar className="w-5 h-5" />
            Period Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="flex items-center gap-1"
            >
              <FiChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-40">
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

              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-24">
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
              className="flex items-center gap-1"
            >
              Next
              <FiChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentMonth}
              className="flex items-center gap-1"
            >
              Current Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Teachers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.totalTeachers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Active teachers this month
                  </p>
                </div>
                <FiUsers className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Salary
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(statistics.totalSalary)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Before deductions & bonuses
                  </p>
                </div>
                <FiDollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statistics.paidTeachers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      (statistics.paidTeachers / statistics.totalTeachers) * 100
                    )}
                    % completion rate
                  </p>
                </div>
                <FiCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unpaid</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statistics.unpaidTeachers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pending payment processing
                  </p>
                </div>
                <FiXCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Deductions
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    -{formatCurrency(statistics.totalDeductions)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Lateness & absence penalties
                  </p>
                </div>
                <FiAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Bonuses
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    +{formatCurrency(statistics.totalBonuses)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Quality & performance rewards
                  </p>
                </div>
                <FiAward className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Average Salary
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(statistics.averageSalary)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Per teacher this month
                  </p>
                </div>
                <FiBarChart className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiSettings className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks for teacher payments
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                className="flex items-center gap-2"
              >
                <FiCheckCircle className="w-4 h-4" />
                Mark All Unpaid as Paid
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
                className="flex items-center gap-2"
              >
                <FiXCircle className="w-4 h-4" />
                Mark All Paid as Unpaid
              </Button>

              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Export All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <SalaryTable
          data={teachers}
          loading={loading}
          onRefresh={refresh}
          onTeacherSelect={handleTeacherSelect}
          onBulkAction={handleBulkAction}
        />

        {/* Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle>Reports & Analytics</CardTitle>
            <CardDescription>
              Generate and download payment reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
                className="flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Export Excel
              </Button>
            </div>

            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <FiAlertTriangle className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
