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
  unmatchedZoomLinks?: any[];
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

    setLoading(true);
    setError(null);

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
  }, [startDate, endDate, salaryData]);

  const handleExport = async (format: "csv" | "pdf" = "pdf") => {
    try {
      const response = await fetch(
        `/api/teacher/salary/export?startDate=${startDate}&endDate=${endDate}&format=${format}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to export data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Salary report exported successfully",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

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

  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Salary</h1>
          <p className="text-gray-600 mt-1">
            View your salary details and payment history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchSalaryData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Export PDF
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
                    <SelectItem key={month.value} value={month.value}>
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

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2">
              <FiRefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading salary data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
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
                  <FiDollarSign className="w-8 h-8 text-green-600" />
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
                  <FiAlertTriangle className="w-8 h-8 text-red-600" />
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
                  <FiAward className="w-8 h-8 text-blue-600" />
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
                  <FiCheckCircle className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status and Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge
                      variant={
                        salaryData.status === "Paid" ? "default" : "secondary"
                      }
                      className="mt-1"
                    >
                      {salaryData.status === "Paid" ? (
                        <>
                          <FiCheckCircle className="w-3 h-3 mr-1" />
                          Paid
                        </>
                      ) : (
                        <>
                          <FiXCircle className="w-3 h-3 mr-1" />
                          Unpaid
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-lg font-semibold">
                      {salaryData.numStudents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teaching Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Teaching Days</span>
                    <span className="font-medium">
                      {salaryData.teachingDays}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Daily</span>
                    <span className="font-medium">
                      {formatCurrency(
                        salaryData.breakdown.summary.averageDailyEarning
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Tabs defaultValue="breakdown" className="space-y-4">
            <TabsList>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="breakdown" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Salary Breakdown</CardTitle>
                  <CardDescription>
                    Detailed breakdown of your salary calculation
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
                  <CardTitle>Student Breakdown</CardTitle>
                  <CardDescription>Salary breakdown by student</CardDescription>
                </CardHeader>
                <CardContent>
                  {salaryData.breakdown.studentBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {salaryData.breakdown.studentBreakdown.map(
                        (student, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {student.studentName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {student.package}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(student.totalEarned)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {student.daysWorked} days ×{" "}
                                {formatCurrency(student.dailyRate)}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No student data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      Lateness Deductions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salaryData.breakdown.latenessBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {salaryData.breakdown.latenessBreakdown.map(
                          (record, index) => (
                            <div
                              key={index}
                              className="p-2 bg-red-50 rounded text-sm"
                            >
                              <div className="font-medium">
                                {record.studentName}
                              </div>
                              <div className="text-red-600">
                                -{formatCurrency(record.deduction)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {record.date} - {record.latenessMinutes} min
                                late
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No lateness deductions
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">
                      Absence Deductions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salaryData.breakdown.absenceBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {salaryData.breakdown.absenceBreakdown.map(
                          (record, index) => (
                            <div
                              key={index}
                              className="p-2 bg-red-50 rounded text-sm"
                            >
                              <div className="font-medium">
                                {record.studentName}
                              </div>
                              <div className="text-red-600">
                                -{formatCurrency(record.deduction)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {record.date} - {record.reason}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No absence deductions
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    Your payment history for this period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 text-center py-4">
                    Payment history will be displayed here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-gray-500 text-center">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
}
