"use client";

import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import {
  FiCalendar,
  FiDollarSign,
  FiAward,
  FiAlertTriangle,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiClock,
  FiFileText,
  FiInfo,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  formatCurrency,
  formatCompactCurrency,
} from "@/lib/teacher-payment-utils";

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
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
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

interface PaymentDetails {
  latenessRecords: any[];
  absenceRecords: any[];
  bonusRecords: any[];
  qualityBonuses: any[];
}

export default function TeacherSalaryPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [salaryData, setSalaryData] = useState<TeacherSalaryData | null>(null);
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

  const fetchSalaryData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/teacher/salary?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch salary data");
      }

      const data = await response.json();
      setSalaryData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fetchDetails = useCallback(async () => {
    if (!salaryData) return;

    try {
      const response = await fetch(
        `/api/teacher/salary/details?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch details");
      }

      const data = await response.json();
      setDetails(data);
    } catch (err) {
      console.error("Error fetching details:", err);
    }
  }, [salaryData, startDate, endDate]);

  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  useEffect(() => {
    if (salaryData) {
      fetchDetails();
    }
  }, [fetchDetails, salaryData]);

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

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i);

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(dayjs().month() + 1);
    setSelectedYear(dayjs().year());
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/teacher/salary/export?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Salary report exported successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to export salary report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-lg font-medium text-gray-700">
                Loading salary data...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-red-100">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 text-red-800">
              <div className="p-3 bg-red-500 rounded-full">
                <FiAlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Error Loading Salary Data</h3>
                <p className="text-red-700 mt-2">{error}</p>
                <Button
                  onClick={fetchSalaryData}
                  className="mt-4 bg-red-600 hover:bg-red-700"
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Salary</h1>
            <p className="text-blue-100 mt-1">
              View your salary breakdown, deductions, bonuses, and payment
              status
            </p>
            {lastUpdated && (
              <p className="text-sm text-blue-200 mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-600"
            >
              <FiDownload className="w-4 h-4" />
              Export PDF
            </Button>

            <Button
              onClick={fetchSalaryData}
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

      {/* Period Selector */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <FiCalendar className="w-5 h-5" />
            Select Period
          </CardTitle>
          <CardDescription>
            Choose the month and year to view your salary information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Month:
                </label>
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
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Year:
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                className="flex items-center gap-1"
              >
                <FiTrendingDown className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentMonth}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Current Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                className="flex items-center gap-1"
              >
                Next
                <FiTrendingUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {salaryData && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <FiInfo className="w-5 h-5" />
              Debug Information
            </CardTitle>
            <CardDescription>Raw salary data for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-medium text-gray-700">
                    Teacher Name:
                  </span>
                  <p className="text-gray-600">{salaryData.name || "N/A"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Base Salary:
                  </span>
                  <p className="text-gray-600">
                    {formatCurrency(salaryData.baseSalary || 0)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Salary:
                  </span>
                  <p className="text-gray-600">
                    {formatCurrency(salaryData.totalSalary || 0)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <p className="text-gray-600">{salaryData.status || "N/A"}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded border">
                <div className="text-xs text-gray-500 mb-2">
                  Raw Data Sample:
                </div>
                <pre className="text-xs text-gray-700 overflow-auto">
                  {JSON.stringify(salaryData, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary Data */}
      {salaryData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Base Salary
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(salaryData.baseSalary)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <FiDollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Deductions
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      -
                      {formatCurrency(
                        salaryData.latenessDeduction +
                          salaryData.absenceDeduction
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <FiTrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bonuses</p>
                    <p className="text-2xl font-bold text-blue-600">
                      +{formatCurrency(salaryData.bonuses)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiAward className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Net Salary
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(salaryData.totalSalary)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <FiCheckCircle className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="breakdown" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="breakdown" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiDollarSign className="w-5 h-5" />
                    Salary Breakdown
                  </CardTitle>
                  <CardDescription>
                    Detailed breakdown of your salary components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600">
                          Base Salary
                        </div>
                        <div className="text-xl font-bold text-green-700">
                          {formatCurrency(salaryData.baseSalary)}
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-sm text-red-600">
                          Total Deductions
                        </div>
                        <div className="text-xl font-bold text-red-700">
                          -
                          {formatCurrency(
                            salaryData.latenessDeduction +
                              salaryData.absenceDeduction
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-600">Bonuses</div>
                        <div className="text-xl font-bold text-blue-700">
                          +{formatCurrency(salaryData.bonuses)}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Net Salary</div>
                        <div className="text-xl font-bold text-gray-700">
                          {formatCurrency(salaryData.totalSalary)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiUsers className="w-5 h-5" />
                    Student Breakdown
                  </CardTitle>
                  <CardDescription>
                    Earnings breakdown by student
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {salaryData.breakdown.studentBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {salaryData.breakdown.studentBreakdown.map(
                        (student, index) => (
                          <div
                            key={index}
                            className="p-4 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {student.studentName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {student.package} • {student.daysWorked} days
                                  worked
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(student.totalEarned)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatCurrency(student.dailyRate)}/day
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No student data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <FiClock className="w-5 h-5" />
                      Lateness Deductions
                    </CardTitle>
                    <CardDescription>
                      Deductions for late class starts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salaryData.breakdown.latenessBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {salaryData.breakdown.latenessBreakdown.map(
                          (record, index) => (
                            <div
                              key={index}
                              className="p-3 bg-red-50 rounded-lg border border-red-200"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  {record.studentName}
                                </div>
                                <div className="text-red-600 font-semibold">
                                  -{formatCurrency(record.deduction)}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {new Date(record.date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Scheduled: {record.scheduledTime} | Actual:{" "}
                                {record.actualTime} | Late:{" "}
                                {record.latenessMinutes} min ({record.tier})
                              </div>
                            </div>
                          )
                        )}
                        <div className="mt-4 p-3 bg-red-100 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-red-800">
                              Total Lateness Deduction:
                            </span>
                            <span className="font-bold text-red-800">
                              -{formatCurrency(salaryData.latenessDeduction)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-gray-500">No lateness deductions</p>
                        <p className="text-sm text-gray-400">
                          Great job being on time!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <FiAlertTriangle className="w-5 h-5" />
                      Absence Deductions
                    </CardTitle>
                    <CardDescription>
                      Deductions for missed classes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salaryData.breakdown.absenceBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {salaryData.breakdown.absenceBreakdown.map(
                          (record, index) => (
                            <div
                              key={index}
                              className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  {record.studentName}
                                </div>
                                <div className="text-orange-600 font-semibold">
                                  -{formatCurrency(record.deduction)}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {new Date(record.date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {record.studentPackage} • {record.reason}
                              </div>
                            </div>
                          )
                        )}
                        <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-orange-800">
                              Total Absence Deduction:
                            </span>
                            <span className="font-bold text-orange-800">
                              -{formatCurrency(salaryData.absenceDeduction)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="text-gray-500">No absence deductions</p>
                        <p className="text-sm text-gray-400">
                          Perfect attendance!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiCalendar className="w-5 h-5" />
                    Attendance Summary
                  </CardTitle>
                  <CardDescription>
                    Your teaching performance and attendance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {salaryData.numStudents}
                        </div>
                        <div className="text-sm text-blue-700">
                          Active Students
                        </div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {salaryData.breakdown.summary.workingDaysInMonth}
                        </div>
                        <div className="text-sm text-green-700">
                          Working Days
                        </div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {salaryData.breakdown.summary.actualTeachingDays}
                        </div>
                        <div className="text-sm text-purple-700">
                          Teaching Days
                        </div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(
                            salaryData.breakdown.summary.averageDailyEarning
                          )}
                        </div>
                        <div className="text-sm text-orange-700">
                          Avg Daily Earning
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Attendance Rate
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {Math.round(
                            (salaryData.breakdown.summary.actualTeachingDays /
                              salaryData.breakdown.summary.workingDaysInMonth) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              (salaryData.breakdown.summary.actualTeachingDays /
                                salaryData.breakdown.summary
                                  .workingDaysInMonth) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FiAward className="w-5 h-5" />
                      Bonuses Earned
                    </CardTitle>
                    <CardDescription>
                      Quality assessment bonuses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {details?.qualityBonuses &&
                    details.qualityBonuses.length > 0 ? (
                      <div className="space-y-3">
                        {details.qualityBonuses.map(
                          (bonus: any, index: number) => (
                            <div
                              key={index}
                              className="p-3 bg-green-50 rounded-lg border border-green-200"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    Week of{" "}
                                    {new Date(
                                      bonus.weekStart
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {bonus.supervisorFeedback ||
                                      "Quality assessment bonus"}
                                  </div>
                                </div>
                                <div className="text-green-600 font-semibold">
                                  +{formatCurrency(bonus.bonusAwarded)}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FiAward className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">
                          No bonuses earned this period
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FiCheckCircle className="w-5 h-5" />
                      Payment Status
                    </CardTitle>
                    <CardDescription>
                      Current payment information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Status:
                        </span>
                        <Badge
                          variant={
                            salaryData.status === "Paid"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            salaryData.status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {salaryData.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Net Salary:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(salaryData.totalSalary)}
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">
                          Calculation:
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Base Salary:</span>
                            <span>
                              +{formatCurrency(salaryData.baseSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Lateness Deduction:</span>
                            <span>
                              -{formatCurrency(salaryData.latenessDeduction)}
                            </span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Absence Deduction:</span>
                            <span>
                              -{formatCurrency(salaryData.absenceDeduction)}
                            </span>
                          </div>
                          <div className="flex justify-between text-blue-600">
                            <span>Bonuses:</span>
                            <span>+{formatCurrency(salaryData.bonuses)}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Net Salary:</span>
                            <span>
                              {formatCurrency(salaryData.totalSalary)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiFileText className="w-5 h-5" />
                    Performance Summary
                  </CardTitle>
                  <CardDescription>
                    Overall performance metrics for this period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {salaryData.numStudents}
                      </div>
                      <div className="text-sm text-blue-700">
                        Students Taught
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {salaryData.breakdown.summary.actualTeachingDays}
                      </div>
                      <div className="text-sm text-green-700">Days Taught</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(
                          salaryData.breakdown.summary.averageDailyEarning
                        )}
                      </div>
                      <div className="text-sm text-purple-700">
                        Daily Average
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
