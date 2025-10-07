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
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
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
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
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
                onValueChange={(value) => setSelectedYear(parseInt(value))}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
        {/* Teacher Changes Summary */}
        {teachers.filter((t) => t.hasTeacherChanges).length > 0 && (
          <Card className="border border-orange-200 shadow-sm bg-orange-50">
            <CardHeader className="bg-orange-100">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <FiAlertTriangle className="w-6 h-6" />
                Teacher Changes Detected
              </CardTitle>
              <CardDescription className="text-orange-700">
                {teachers.filter((t) => t.hasTeacherChanges).length} teacher(s)
                have student assignments with teacher changes this period
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="text-sm text-orange-800">
                  <strong>Note:</strong> Teachers with student changes have been
                  paid accurately based on their actual teaching periods. The
                  salary calculations include both active assignments and
                  historical periods from the teacher change history.
                </div>
                <div className="flex flex-wrap gap-2">
                  {teachers
                    .filter((t) => t.hasTeacherChanges)
                    .map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-orange-200 shadow-sm"
                      >
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-orange-700">
                            {teacher.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-orange-900">
                          {teacher.name}
                        </span>
                        <span className="text-xs text-orange-600">
                          ({formatCurrency(teacher.totalSalary)})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
    </div>
  );
}
