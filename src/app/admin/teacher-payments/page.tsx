"use client";
import { useState, useEffect, useCallback } from "react";
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
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/ui/button";

// Currency formatters for ETB display
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 2,
});
const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ETB",
  notation: "compact",
  maximumFractionDigits: 1,
});

export type TeacherPayment = {
  id: string;
  name: string;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  baseSalary: number;
  totalSalary: number;
  status?: "Paid" | "Unpaid";
  numStudents?: number;
  teachingDays?: number;
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

export default function TeacherPaymentsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [teachers, setTeachers] = useState<TeacherPayment[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPayment | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salaryStatus, setSalaryStatus] = useState<
    Record<string, "Paid" | "Unpaid">
  >({});
  const [showDetails, setShowDetails] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
  }>({ latenessRecords: [], absenceRecords: [], bonusRecords: [] });
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [packageSalaries, setPackageSalaries] = useState<
    Record<string, number>
  >({});
  const [packageSalaryInputs, setPackageSalaryInputs] = useState<
    Record<string, string>
  >({});
  const [packageSalaryLoading, setPackageSalaryLoading] = useState(false);
  const [packageSalaryError, setPackageSalaryError] = useState<string | null>(
    null
  );
  const [packageSalarySuccess, setPackageSalarySuccess] = useState<
    string | null
  >(null);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [teacherSalaryVisible, setTeacherSalaryVisible] = useState(true);
  const [salaryVisibilityLoading, setSalaryVisibilityLoading] = useState(false);
  const [includeSundays, setIncludeSundays] = useState(false); // Default: exclude Sundays
  const [sundayLoading, setSundayLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(
    new Set()
  );
  const [bulkAction, setBulkAction] = useState<
    "mark-paid" | "mark-unpaid" | ""
  >("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<keyof TeacherPayment | "status">(
    "name"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [salaryRangeFilter, setSalaryRangeFilter] = useState({
    min: "",
    max: "",
  });
  const [deductionFilter, setDeductionFilter] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState<Set<string>>(
    new Set()
  );
  const [paymentResults, setPaymentResults] = useState<Record<string, any>>({});

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

  function getMonthRange(year: number, month: number) {
    const from = dayjs(`${year}-${String(month).padStart(2, "0")}-01`)
      .startOf("month")
      .toDate();
    const to = dayjs(from).endOf("month").toDate();
    return { from, to };
  }

  const getAvatarColor = (id: string) => {
    const colors = [
      "bg-indigo-100 text-indigo-700",
      "bg-teal-100 text-teal-700",
      "bg-yellow-100 text-yellow-700",
      "bg-red-100 text-red-700",
      "bg-purple-100 text-purple-700",
    ];
    const hash = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const sortData = (data: TeacherPayment[]) => {
    return [...data].sort((a, b) => {
      let aValue: any =
        sortKey === "status"
          ? salaryStatus[a.id] || "Unpaid"
          : a[sortKey as keyof TeacherPayment];
      let bValue: any =
        sortKey === "status"
          ? salaryStatus[b.id] || "Unpaid"
          : b[sortKey as keyof TeacherPayment];

      if (sortKey === "name" || sortKey === "status") {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      } else {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      if (sortDir === "asc") return aValue < bValue ? -1 : 1;
      return aValue > bValue ? -1 : 1;
    });
  };

  const [teacherPackageBreakdown, setTeacherPackageBreakdown] =
    useState<any>(null);

  const refreshTeacherData = useCallback(async () => {
    const { from, to } = getMonthRange(selectedYear, selectedMonth);
    try {
      const res = await fetch(
        `/api/admin/teacher-payments?startDate=${from.toISOString()}&endDate=${to.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        const validatedData = data.map((teacher: any) => {
          const calculatedTotal =
            teacher.baseSalary -
            teacher.latenessDeduction -
            teacher.absenceDeduction +
            teacher.bonuses;
          return {
            ...teacher,
            totalSalary: Math.round(calculatedTotal),
          };
        });
        setTeachers(validatedData);

        const statusMap: Record<string, "Paid" | "Unpaid"> = {};
        for (const t of validatedData) {
          statusMap[t.id] = t.status || "Unpaid";
        }
        setSalaryStatus(statusMap);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh teacher data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTeacherData();
      toast({
        title: "Data Refreshed",
        description: `Updated ${teachers.length} teacher records successfully`,
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh teacher data. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    refreshTeacherData();
  }, [refreshTeacherData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        handleRefresh();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loading, refreshing]);

  const fetchBreakdown = useCallback(
    async (teacherId: string) => {
      setBreakdownLoading(true);
      setBreakdownError(null);
      try {
        const { from, to } = getMonthRange(selectedYear, selectedMonth);
        const [breakdownRes, studentsRes] = await Promise.all([
          fetch(
            `/api/admin/teacher-payments?teacherId=${teacherId}&from=${from.toISOString()}&to=${to.toISOString()}`
          ),
          fetch(
            `/api/admin/teacher-students/${teacherId}?month=${selectedMonth}&year=${selectedYear}`
          ),
        ]);

        if (!breakdownRes.ok) throw new Error("Failed to fetch breakdown");
        const data = await breakdownRes.json();

        // Validate breakdown data consistency
        const totalLateness =
          data.latenessRecords?.reduce(
            (sum: number, r: any) => sum + (r.deductionApplied || 0),
            0
          ) || 0;
        const totalAbsence =
          data.absenceRecords?.reduce(
            (sum: number, r: any) => sum + (r.deductionApplied || 0),
            0
          ) || 0;
        const totalBonus =
          data.bonusRecords?.reduce(
            (sum: number, r: any) => sum + (r.amount || 0),
            0
          ) || 0;

        const teacher = teachers.find((t) => t.id === teacherId);
        if (teacher) {
          if (Math.abs(totalLateness - teacher.latenessDeduction) > 0.01) {
            console.warn(
              `Lateness mismatch for ${teacher.name}: Detail=${totalLateness}, Main=${teacher.latenessDeduction}`
            );
          }
          if (Math.abs(totalAbsence - teacher.absenceDeduction) > 0.01) {
            console.warn(
              `Absence mismatch for ${teacher.name}: Detail=${totalAbsence}, Main=${teacher.absenceDeduction}`
            );
          }
          if (Math.abs(totalBonus - teacher.bonuses) > 0.01) {
            console.warn(
              `Bonus mismatch for ${teacher.name}: Detail=${totalBonus}, Main=${teacher.bonuses}`
            );
          }
        }

        setBreakdown(data);

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setTeacherPackageBreakdown(studentsData);
        }
      } catch (err: any) {
        setBreakdownError(err.message || "Failed to fetch breakdown");
        setBreakdown({
          latenessRecords: [],
          absenceRecords: [],
          bonusRecords: [],
        });
      } finally {
        setBreakdownLoading(false);
      }
    },
    [selectedMonth, selectedYear, teachers]
  );

  useEffect(() => {
    async function fetchPackageSalaries() {
      setPackageSalaryLoading(true);
      setPackageSalaryError(null);
      try {
        const [packageSalariesRes, packagesRes] = await Promise.all([
          fetch("/api/admin/package-salaries"),
          fetch("/api/admin/packages"),
        ]);

        if (!packageSalariesRes.ok || !packagesRes.ok)
          throw new Error("Failed to fetch data");

        const packageSalariesData = await packageSalariesRes.json();
        const packages = await packagesRes.json();
        setAvailablePackages(packages);

        const salaries: Record<string, number> = {};
        const inputs: Record<string, string> = {};

        packages.forEach((pkg: string) => {
          const packageSalary = packageSalariesData.find(
            (ps: any) => ps.packageName === pkg
          );
          const value = packageSalary?.salaryPerStudent || 0;
          salaries[pkg] = value;
          inputs[pkg] = String(value);
        });

        setPackageSalaries(salaries);
        setPackageSalaryInputs(inputs);
      } catch (err: any) {
        setPackageSalaryError(
          err.message || "Failed to fetch package salaries"
        );
      } finally {
        setPackageSalaryLoading(false);
      }
    }

    async function fetchSalaryVisibility() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          const visibilitySetting = data.settings?.find(
            (s: any) => s.key === "teacher_salary_visible"
          );
          const sundaySetting = data.settings?.find(
            (s: any) => s.key === "include_sundays_in_salary"
          );
          setTeacherSalaryVisible(visibilitySetting?.value === "true");
          setIncludeSundays(sundaySetting?.value === "true" || false); // Default: exclude
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    }

    fetchPackageSalaries();
    fetchSalaryVisibility();
  }, []);

  const handleUpdatePackageSalary = async (packageName: string) => {
    setPackageSalaryLoading(true);
    setPackageSalaryError(null);
    setPackageSalarySuccess(null);
    try {
      const value = Number(packageSalaryInputs[packageName]);
      if (isNaN(value) || value < 0) {
        setPackageSalaryError("Please enter a valid number (0 or greater).");
        setPackageSalaryLoading(false);
        return;
      }
      const res = await fetch("/api/admin/package-salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageName,
          salaryPerStudent: value,
        }),
      });
      if (!res.ok) throw new Error("Failed to update package salary");
      setPackageSalaries((prev) => ({ ...prev, [packageName]: value }));
      setPackageSalarySuccess(`${packageName} salary updated!`);
      setTimeout(() => setPackageSalarySuccess(null), 2000);
      toast({
        title: "Success",
        description: `${packageName} salary updated successfully!`,
      });
    } catch (err: any) {
      setPackageSalaryError(err.message || "Failed to update package salary");
      toast({
        title: "Error",
        description: "Failed to update package salary",
        variant: "destructive",
      });
    } finally {
      setPackageSalaryLoading(false);
    }
  };

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getMonthRange(selectedYear, selectedMonth);
        const res = await fetch(
          `/api/admin/teacher-payments?startDate=${from.toISOString()}&endDate=${to.toISOString()}`
        );
        if (!res.ok) throw new Error("Failed to fetch teacher payments");
        const data = await res.json();

        // Validate data consistency
        const validatedData = data.map((teacher: any) => {
          const calculatedTotal =
            teacher.baseSalary -
            teacher.latenessDeduction -
            teacher.absenceDeduction +
            teacher.bonuses;
          if (Math.abs(calculatedTotal - teacher.totalSalary) > 0.01) {
            console.warn(
              `Salary calculation mismatch for ${teacher.name}: Expected ${calculatedTotal}, Got ${teacher.totalSalary}`
            );
          }
          return {
            ...teacher,
            totalSalary: Math.round(calculatedTotal), // Ensure consistency
          };
        });

        setTeachers(validatedData);
        const statusMap: Record<string, "Paid" | "Unpaid"> = {};
        for (const t of validatedData) {
          statusMap[t.id] = t.status || "Unpaid";
        }
        setSalaryStatus(statusMap);
      } catch (e: any) {
        setError(e.message || "Failed to fetch teacher payments");
        toast({
          title: "Error",
          description: "Failed to load teacher payments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedMonth, selectedYear]);

  // Close report options when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowReportOptions(false);
    if (showReportOptions) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showReportOptions]);

  function exportToCSV(data: TeacherPayment[], filename: string) {
    if (!data || data.length === 0) {
      toast({
        title: "Error",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }
    const headers = [
      "Teacher",
      "Base Salary",
      "Lateness Deduction",
      "Absence Deduction",
      "Bonuses",
      "Total Salary",
      "Status",
    ];
    const rows = data.map((row) => [
      row.name,
      row.baseSalary,
      row.latenessDeduction,
      row.absenceDeduction,
      row.bonuses,
      row.totalSalary,
      salaryStatus[row.id] || "Unpaid",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({
      title: "Success",
      description: `Exported ${filename} successfully`,
    });
  }

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      !statusFilter || (salaryStatus[t.id] || "Unpaid") === statusFilter;

    // Salary range filter
    const matchesSalaryRange =
      (!salaryRangeFilter.min ||
        t.totalSalary >= Number(salaryRangeFilter.min)) &&
      (!salaryRangeFilter.max ||
        t.totalSalary <= Number(salaryRangeFilter.max));

    // Deduction filter
    const totalDeductions = t.latenessDeduction + t.absenceDeduction;
    const matchesDeduction =
      !deductionFilter ||
      (deductionFilter === "high" && totalDeductions > 100) ||
      (deductionFilter === "medium" &&
        totalDeductions > 50 &&
        totalDeductions <= 100) ||
      (deductionFilter === "low" &&
        totalDeductions > 0 &&
        totalDeductions <= 50) ||
      (deductionFilter === "none" && totalDeductions === 0);

    // Performance filter
    const matchesPerformance =
      !performanceFilter ||
      (performanceFilter === "top" && t.totalSalary > 2000) ||
      (performanceFilter === "good" &&
        t.totalSalary > 1500 &&
        t.totalSalary <= 2000) ||
      (performanceFilter === "average" &&
        t.totalSalary > 1000 &&
        t.totalSalary <= 1500) ||
      (performanceFilter === "low" && t.totalSalary <= 1000);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSalaryRange &&
      matchesDeduction &&
      matchesPerformance
    );
  });

  const canMarkPaid = (() => {
    const now = dayjs();
    if (selectedYear < now.year()) return true;
    if (selectedYear > now.year()) return false;
    if (selectedMonth < now.month() + 1) return true;
    if (selectedMonth > now.month() + 1) return false;
    return now.date() > 28;
  })();

  const monthSummary = {
    totalTeachers: teachers.length,
    totalPaid: Object.values(salaryStatus).filter((s) => s === "Paid").length,
    totalUnpaid:
      teachers.length -
      Object.values(salaryStatus).filter((s) => s === "Paid").length,
    totalBaseSalary: teachers.reduce((sum, t) => sum + t.baseSalary, 0),
    totalDeductions: teachers.reduce(
      (sum, t) => sum + t.latenessDeduction + t.absenceDeduction,
      0
    ),
    totalBonuses: teachers.reduce((sum, t) => sum + t.bonuses, 0),
    totalSalary: teachers.reduce((sum, t) => sum + t.totalSalary, 0),
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = dayjs();
    setSelectedYear(now.year());
    setSelectedMonth(now.month() + 1);
  };

  const processPayment = async (teacherId: string, teacher: TeacherPayment) => {
    setPaymentProcessing((prev) => new Set([...prev, teacherId]));
    try {
      const period = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}`;
      const res = await fetch("/api/admin/teacher-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          period,
          status: "Paid",
          totalSalary: teacher.totalSalary,
          latenessDeduction: teacher.latenessDeduction,
          absenceDeduction: teacher.absenceDeduction,
          bonuses: teacher.bonuses,
          processPaymentNow: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Payment failed");

      setSalaryStatus((prev) => ({ ...prev, [teacherId]: "Paid" }));
      setPaymentResults((prev) => ({
        ...prev,
        [teacherId]: result.paymentResult,
      }));

      toast({
        title: "Payment Successful",
        description: `Payment processed for ${teacher.name}. Transaction ID: ${
          result.paymentResult?.transactionId || "N/A"
        }`,
      });
    } catch (err: any) {
      toast({
        title: "Payment Failed",
        description: err.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(teacherId);
        return newSet;
      });
    }
  };

  const handleBulkAction = async (processPayments = false) => {
    if (!bulkAction || selectedTeachers.size === 0) return;

    setBulkLoading(true);
    try {
      const period = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}`;
      const newStatus = bulkAction === "mark-paid" ? "Paid" : "Unpaid";

      if (newStatus === "Paid" && !canMarkPaid) {
        toast({
          title: "Error",
          description:
            "Cannot mark as paid before the 28th of the current month or for future months.",
          variant: "destructive",
        });
        return;
      }

      const promises = Array.from(selectedTeachers).map(async (teacherId) => {
        const teacher = teachers.find((t) => t.id === teacherId);
        if (!teacher) return;

        const res = await fetch("/api/admin/teacher-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId,
            period,
            status: newStatus,
            totalSalary: teacher.totalSalary,
            latenessDeduction: teacher.latenessDeduction,
            absenceDeduction: teacher.absenceDeduction,
            bonuses: teacher.bonuses,
            processPaymentNow: processPayments && newStatus === "Paid",
          }),
        });

        const result = await res.json();
        if (!res.ok)
          throw new Error(result.error || `Failed to update ${teacher.name}`);

        if (result.paymentResult) {
          setPaymentResults((prev) => ({
            ...prev,
            [teacherId]: result.paymentResult,
          }));
        }

        return { teacherId, result };
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r).length;

      setSalaryStatus((prev) => {
        const updated = { ...prev };
        selectedTeachers.forEach((id) => {
          updated[id] = newStatus;
        });
        return updated;
      });

      setSelectedTeachers(new Set());
      setBulkAction("");
      setShowBulkConfirm(false);

      toast({
        title: "Success",
        description: processPayments
          ? `${successCount} teacher(s) marked as ${newStatus} and payments processed`
          : `${successCount} teacher(s) marked as ${newStatus}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Bulk action failed",
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-lg">
                <FiDollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-2">
                  Teacher Payments
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Daily-based salary system with Zoom link tracking
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto w-full">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-blue-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiUsers className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700">
                    Teachers
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {monthSummary.totalTeachers}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-green-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-green-700">
                    Paid
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {monthSummary.totalPaid}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-orange-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiXCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-xs font-semibold text-orange-700">
                    Unpaid
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {monthSummary.totalUnpaid}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiDollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700">
                    Total
                  </span>
                </div>
                <div
                  className="text-2xl font-bold text-purple-900 truncate"
                  title={currencyFormatter.format(monthSummary.totalSalary)}
                >
                  {compactCurrencyFormatter.format(monthSummary.totalSalary)}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiCalendar className="inline h-4 w-4 mr-2" />
                  Month & Year
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={selectedYear}
                    min={2000}
                    max={2100}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-24 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                  />
                </div>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Teachers
                </label>
                <input
                  type="text"
                  placeholder="Search teacher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiCheckCircle className="inline h-4 w-4 mr-2" />
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    <FiChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goToCurrentMonth}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105"
                  >
                    Current
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    <FiChevronRight className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 rounded-3xl blur-3xl -z-10"></div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg mb-4">
                <FiDollarSign className="h-6 w-6 text-white" />
                <span className="text-white font-bold text-lg">
                  Salary Configuration
                </span>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                Package & System Settings
              </h2>
              <p className="text-gray-600 text-lg">
                Configure package-based salaries and system preferences
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Package Salary Config */}
              <div className="relative group">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-indigo-400/20 to-purple-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200/50 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl blur-sm"></div>
                      <div className="relative p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg">
                        <FiDollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-indigo-900 bg-clip-text text-transparent">
                        Daily-Based Salary System
                      </h3>
                      <p className="text-blue-700 text-sm">
                        Teachers earn daily salary when sending Zoom links
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                      <FiInfo className="h-4 w-4" />
                      How Daily Calculation Works
                    </h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>
                        • Monthly package salary ÷ Working days = Daily rate
                      </li>
                      <li>
                        • Teacher earns daily rate when Zoom link is sent{" "}
                        {!includeSundays && "(excludes Sundays)"}
                      </li>
                      <li>
                        • Mid-month student changes are handled automatically
                      </li>
                      <li>
                        • Teacher replacements get fair pro-rated payments
                      </li>
                      <li>
                        • Working days ensure full monthly salary when all days
                        taught
                      </li>
                      <li>
                        • Deduction adjustments are automatically integrated
                      </li>
                    </ul>
                    <div className="mt-3 p-2 bg-white rounded-lg border border-blue-300">
                      <div className="text-xs text-blue-700">
                        <strong>
                          📦 Active Packages ({availablePackages.length}):
                        </strong>{" "}
                        {availablePackages.length > 0
                          ? availablePackages.join(", ")
                          : "Loading from database..."}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Packages automatically detected from active students in
                        the system
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {availablePackages.length === 0 ? (
                      <div className="col-span-2 text-center py-8">
                        <div className="text-blue-600 mb-2">
                          <FiLoader className="animate-spin h-8 w-8 mx-auto" />
                        </div>
                        <p className="text-blue-700 font-medium">
                          Loading packages from database...
                        </p>
                        <p className="text-blue-600 text-sm mt-1">
                          Fetching packages from active students
                        </p>
                      </div>
                    ) : (
                      availablePackages.map((packageName, index) => {
                        return (
                          <div
                            key={packageName}
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="font-bold text-blue-900 text-sm">
                                  {packageName}
                                </span>
                              </div>
                              <span className="text-xs text-blue-700 font-medium">
                                ETB per student
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={packageSalaryInputs[packageName] || ""}
                                  onChange={(e) =>
                                    setPackageSalaryInputs((prev) => ({
                                      ...prev,
                                      [packageName]: e.target.value,
                                    }))
                                  }
                                  placeholder={String(
                                    packageSalaries[packageName] || 0
                                  )}
                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-semibold text-center"
                                  disabled={packageSalaryLoading}
                                />
                              </div>

                              <button
                                onClick={() =>
                                  handleUpdatePackageSalary(packageName)
                                }
                                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-1 ${
                                  packageSalaryLoading ? "opacity-75" : ""
                                }`}
                                disabled={packageSalaryLoading}
                              >
                                {packageSalaryLoading ? (
                                  <FiLoader className="animate-spin h-4 w-4" />
                                ) : (
                                  <FiCheck className="h-4 w-4" />
                                )}
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Status Messages */}
                  {(packageSalaryError || packageSalarySuccess) && (
                    <div className="mt-4 space-y-2">
                      {packageSalaryError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                          <FiXCircle className="h-4 w-4 text-red-500" />
                          <p className="text-sm text-red-700 font-medium">
                            {packageSalaryError}
                          </p>
                        </div>
                      )}
                      {packageSalarySuccess && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                          <FiCheckCircle className="h-4 w-4 text-green-500" />
                          <p className="text-sm text-green-700 font-medium">
                            {packageSalarySuccess}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Package Deduction Configuration */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-pink-400/20 to-red-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-700 rounded-xl blur-sm"></div>
                      <div className="relative p-3 bg-gradient-to-br from-purple-600 to-pink-700 rounded-xl shadow-lg">
                        <FiDollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-800 to-pink-900 bg-clip-text text-transparent">
                        Package Deduction Rates
                      </h3>
                      <p className="text-purple-700 text-sm">
                        Configure base deduction amounts per package type
                      </p>
                    </div>
                  </div>
                  <PackageDeductionManager />
                </div>
              </div>

              {/* Working Days Configuration */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-blue-400/20 to-cyan-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200/50 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl blur-sm"></div>
                      <div className="relative p-3 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl shadow-lg">
                        <FiCalendar className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-800 to-blue-900 bg-clip-text text-transparent">
                        Working Days Configuration
                      </h3>
                      <p className="text-indigo-700 text-sm">
                        Control which days count for salary calculation
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-blue-100 rounded-xl opacity-60"></div>

                    <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 border border-indigo-200 rounded-xl backdrop-blur-sm">
                      <label className="flex items-center gap-3 cursor-pointer w-full md:flex-1 group/label">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={includeSundays}
                            onChange={(e) =>
                              setIncludeSundays(e.target.checked)
                            }
                            className="w-5 h-5 rounded border-2 border-indigo-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                            disabled={sundayLoading}
                          />
                          {includeSundays && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <FiCheck className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-900 font-semibold group-hover/label:text-indigo-700 transition-colors">
                            Include Sundays in salary calculation
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              includeSundays
                                ? "bg-indigo-500 shadow-lg shadow-indigo-500/50"
                                : "bg-gray-300"
                            }`}
                          ></div>
                        </div>
                      </label>

                      <button
                        onClick={async () => {
                          setSundayLoading(true);
                          try {
                            const res = await fetch("/api/admin/settings", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                key: "include_sundays_in_salary",
                                value: includeSundays.toString(),
                              }),
                            });
                            if (res.ok) {
                              toast({
                                title: "Success",
                                description:
                                  "Working days configuration updated!",
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update configuration",
                              variant: "destructive",
                            });
                          } finally {
                            setSundayLoading(false);
                          }
                        }}
                        className={`relative overflow-hidden w-full md:w-auto bg-gradient-to-r from-indigo-600 to-blue-700 hover:shadow-xl text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 group/btn ${
                          sundayLoading ? "opacity-75" : ""
                        }`}
                        disabled={sundayLoading}
                      >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                        {sundayLoading ? (
                          <FiLoader className="animate-spin h-4 w-4 relative z-10" />
                        ) : (
                          <FiCheck className="h-4 w-4 relative z-10" />
                        )}
                        <span className="relative z-10">Update Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Issue Management */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-red-400/20 to-pink-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-200/50 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-700 rounded-xl blur-sm"></div>
                      <div className="relative p-3 bg-gradient-to-br from-orange-600 to-red-700 rounded-xl shadow-lg">
                        <FiAlertTriangle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-orange-800 to-red-900 bg-clip-text text-transparent">
                        System Issue Management
                      </h3>
                      <p className="text-orange-700 text-sm">
                        Handle deductions affected by system problems
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() =>
                        window.open("/admin/system-incidents", "_blank")
                      }
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <FiAlertTriangle className="h-4 w-4" />
                      Manage System Incidents
                    </button>

                    <button
                      onClick={() => {
                        const adjustmentWindow = window.open(
                          "/admin/deduction-adjustments",
                          "_blank",
                          "width=1200,height=800"
                        );
                        // Listen for window close to refresh data
                        const checkClosed = setInterval(() => {
                          if (adjustmentWindow?.closed) {
                            clearInterval(checkClosed);
                            // Refresh teacher payments data to reflect adjustments
                            window.location.reload();
                            toast({
                              title: "Data Refreshed",
                              description:
                                "Teacher payments updated with latest adjustments",
                            });
                          }
                        }, 1000);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <FiAlertTriangle className="h-4 w-4" />
                      💰 Adjust Salary Deductions
                    </button>
                  </div>
                </div>
              </div>

              {/* Salary Visibility Config */}
              <div className="relative group">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-emerald-400/20 to-teal-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>

                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-green-200/50 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl blur-sm"></div>
                      <div className="relative p-3  rounded-xl shadow-lg">
                        <FiInfo className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-green-800 to-emerald-900 bg-clip-text text-transparent">
                        Teacher Salary Visibility
                      </h3>
                      <p className="text-green-700 text-sm">
                        Control teacher access to salary information
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl opacity-60"></div>

                    <div className="relative flex flex-col md:flex-row flex-wrap md:flex-nowrap items-stretch md:items-center gap-4 p-4 border border-green-200 rounded-xl backdrop-blur-sm">
                      <label className="flex items-center gap-3 cursor-pointer w-full md:flex-1 group/label">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={teacherSalaryVisible}
                            onChange={(e) =>
                              setTeacherSalaryVisible(e.target.checked)
                            }
                            className="w-5 h-5 rounded border-2 border-green-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
                            disabled={salaryVisibilityLoading}
                          />
                          {teacherSalaryVisible && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <FiCheck className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-900 font-semibold group-hover/label:text-green-700 transition-colors">
                            Allow teachers to see their salary
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              teacherSalaryVisible
                                ? "bg-green-500 shadow-lg shadow-green-500/50"
                                : "bg-gray-300"
                            }`}
                          ></div>
                        </div>
                      </label>

                      <button
                        onClick={async () => {
                          setSalaryVisibilityLoading(true);
                          try {
                            const res = await fetch("/api/admin/settings", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                key: "teacher_salary_visible",
                                value: teacherSalaryVisible.toString(),
                              }),
                            });
                            if (res.ok) {
                              toast({
                                title: "Success",
                                description:
                                  "Salary visibility updated successfully!",
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update salary visibility",
                              variant: "destructive",
                            });
                          } finally {
                            setSalaryVisibilityLoading(false);
                          }
                        }}
                        className={`relative overflow-hidden w-full md:w-auto bg-gradient-to-r from-green-600 to-emerald-700 hover:shadow-xl text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 group/btn ${
                          salaryVisibilityLoading ? "opacity-75" : ""
                        }`}
                        disabled={salaryVisibilityLoading}
                      >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                        {salaryVisibilityLoading ? (
                          <FiLoader className="animate-spin h-4 w-4 relative z-10" />
                        ) : (
                          <FiCheck className="h-4 w-4 relative z-10" />
                        )}
                        <span className="relative z-10">Update Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiUsers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    {
                      months.find((m) => m.value === String(selectedMonth))
                        ?.label
                    }{" "}
                    {selectedYear} Payments
                  </h2>
                  <p className="text-gray-600">
                    Manage teacher salary calculations and payment status
                  </p>
                  {lastUpdated && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                  title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Refresh teacher data'}
                >
                  {refreshing ? (
                    <FiLoader className="animate-spin h-4 w-4" />
                  ) : (
                    <FiUser className="h-4 w-4" />
                  )}
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
                <button
                  onClick={() => setShowAdvancedView(!showAdvancedView)}
                  className={`px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 ${
                    showAdvancedView
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  <FiSearch className="h-4 w-4" />
                  Advanced Filters
                </button>
                <button
                  onClick={() =>
                    exportToCSV(
                      filteredTeachers,
                      `teacher_payments_${dayjs().format("YYYY-MM-DD")}.csv`
                    )
                  }
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                >
                  <FiDownload className="h-4 w-4" />
                  Export CSV
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowReportOptions(!showReportOptions)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                  >
                    <FiDownload className="h-4 w-4" />
                    Generate Report
                    <FiChevronDown
                      className={`h-4 w-4 transition-transform ${
                        showReportOptions ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showReportOptions && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 min-w-[200px]">
                      <button
                        onClick={async () => {
                          setShowReportOptions(false);
                          try {
                            const { from, to } = getMonthRange(
                              selectedYear,
                              selectedMonth
                            );
                            const response = await fetch(
                              "/api/admin/teacher-payments/pdf",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  startDate: from.toISOString(),
                                  endDate: to.toISOString(),
                                  teachersData: filteredTeachers,
                                  includeDetails: false,
                                }),
                              }
                            );

                            if (response.ok) {
                              const html = await response.text();
                              const newWindow = window.open("", "_blank");
                              if (newWindow) {
                                newWindow.document.write(html);
                                newWindow.document.close();
                              }
                              toast({
                                title: "Success",
                                description:
                                  "Summary report generated successfully!",
                              });
                            } else {
                              throw new Error("Failed to generate report");
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to generate summary report",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <FiUsers className="h-4 w-4" />
                        Summary Report
                      </button>

                      <button
                        onClick={async () => {
                          setShowReportOptions(false);
                          try {
                            const { from, to } = getMonthRange(
                              selectedYear,
                              selectedMonth
                            );
                            const response = await fetch(
                              "/api/admin/teacher-payments/pdf",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  startDate: from.toISOString(),
                                  endDate: to.toISOString(),
                                  teachersData: filteredTeachers,
                                  includeDetails: true,
                                }),
                              }
                            );

                            if (response.ok) {
                              const html = await response.text();
                              const newWindow = window.open("", "_blank");
                              if (newWindow) {
                                newWindow.document.write(html);
                                newWindow.document.close();
                              }
                              toast({
                                title: "Success",
                                description:
                                  "Detailed report with daily breakdown generated!",
                              });
                            } else {
                              throw new Error("Failed to generate report");
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to generate detailed report",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <FiCalendar className="h-4 w-4" />
                        Daily Attendance Report
                      </button>

                      <button
                        onClick={async () => {
                          setShowReportOptions(false);
                          try {
                            const { from, to } = getMonthRange(
                              selectedYear,
                              selectedMonth
                            );
                            const response = await fetch(
                              "/api/admin/teacher-payments/pdf",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  startDate: from.toISOString(),
                                  endDate: to.toISOString(),
                                  teachersData: filteredTeachers,
                                  includeDetails: true,
                                  reportType: "deductions_only",
                                }),
                              }
                            );

                            if (response.ok) {
                              const html = await response.text();
                              const newWindow = window.open("", "_blank");
                              if (newWindow) {
                                newWindow.document.write(html);
                                newWindow.document.close();
                              }
                              toast({
                                title: "Success",
                                description:
                                  "Deductions & adjustments report generated!",
                              });
                            } else {
                              throw new Error("Failed to generate report");
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description:
                                "Failed to generate deductions report",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <FiAlertTriangle className="h-4 w-4" />
                        Deductions & Adjustments Report
                      </button>

                      <div className="border-t border-gray-200 my-1"></div>

                      <button
                        onClick={async () => {
                          setShowReportOptions(false);
                          try {
                            const { from, to } = getMonthRange(
                              selectedYear,
                              selectedMonth
                            );
                            const response = await fetch(
                              "/api/admin/teacher-payments/analytics",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  startDate: from.toISOString(),
                                  endDate: to.toISOString(),
                                  teachersData: filteredTeachers,
                                }),
                              }
                            );

                            if (response.ok) {
                              const html = await response.text();
                              const newWindow = window.open("", "_blank");
                              if (newWindow) {
                                newWindow.document.write(html);
                                newWindow.document.close();
                              }
                              toast({
                                title: "Success",
                                description:
                                  "Analytics report generated successfully!",
                              });
                            } else {
                              throw new Error("Failed to generate analytics");
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description:
                                "Failed to generate analytics report",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <FiAward className="h-4 w-4" />
                        Analytics Report
                      </button>

                      <button
                        onClick={async () => {
                          setShowReportOptions(false);
                          try {
                            const { from, to } = getMonthRange(
                              selectedYear,
                              selectedMonth
                            );
                            const response = await fetch(
                              "/api/admin/teacher-payments/financial",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  startDate: from.toISOString(),
                                  endDate: to.toISOString(),
                                  teachersData: filteredTeachers,
                                }),
                              }
                            );

                            if (response.ok) {
                              const html = await response.text();
                              const newWindow = window.open("", "_blank");
                              if (newWindow) {
                                newWindow.document.write(html);
                                newWindow.document.close();
                              }
                              toast({
                                title: "Success",
                                description:
                                  "Financial board report generated successfully!",
                              });
                            } else {
                              throw new Error(
                                "Failed to generate financial report"
                              );
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description:
                                "Failed to generate financial report",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <FiDollarSign className="h-4 w-4" />
                        Financial Board Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedView && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200 mx-6 sm:mx-8 lg:mx-10 mb-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                <FiSearch className="h-5 w-5" />
                Advanced Filtering & Analysis
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Salary Range (ETB)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={salaryRangeFilter.min}
                      onChange={(e) =>
                        setSalaryRangeFilter((prev) => ({
                          ...prev,
                          min: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={salaryRangeFilter.max}
                      onChange={(e) =>
                        setSalaryRangeFilter((prev) => ({
                          ...prev,
                          max: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Deduction Level
                  </label>
                  <select
                    value={deductionFilter}
                    onChange={(e) => setDeductionFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">All Levels</option>
                    <option value="none">No Deductions (0 ETB)</option>
                    <option value="low">Low (1-50 ETB)</option>
                    <option value="medium">Medium (51-100 ETB)</option>
                    <option value="high">High ({">"}100 ETB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Performance Level
                  </label>
                  <select
                    value={performanceFilter}
                    onChange={(e) => setPerformanceFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="">All Performance</option>
                    <option value="top">Top Performers ({">"}2000 ETB)</option>
                    <option value="good">Good (1501-2000 ETB)</option>
                    <option value="average">Average (1001-1500 ETB)</option>
                    <option value="low">Below Average (≤1000 ETB)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSalaryRangeFilter({ min: "", max: "" });
                      setDeductionFilter("");
                      setPerformanceFilter("");
                    }}
                    className="w-full px-4 py-2 bg-purple-200 hover:bg-purple-300 text-purple-800 rounded-lg font-medium transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-purple-900">
                    {filteredTeachers.length}
                  </div>
                  <div className="text-sm text-purple-700">
                    Filtered Results
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-green-900">
                    {filteredTeachers.length > 0
                      ? Math.round(
                          filteredTeachers.reduce(
                            (sum, t) => sum + t.totalSalary,
                            0
                          ) / filteredTeachers.length
                        )
                      : 0}
                  </div>
                  <div className="text-sm text-green-700">Avg Salary (ETB)</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-red-900">
                    {filteredTeachers.reduce(
                      (sum, t) =>
                        sum + t.latenessDeduction + t.absenceDeduction,
                      0
                    )}
                  </div>
                  <div className="text-sm text-red-700">Total Deductions</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-blue-900">
                    {filteredTeachers.reduce((sum, t) => sum + t.bonuses, 0)}
                  </div>
                  <div className="text-sm text-blue-700">Total Bonuses</div>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 lg:p-10">
            {/* Bulk Actions */}
            {selectedTeachers.size > 0 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="text-yellow-600 h-5 w-5" />
                    <span className="font-semibold text-black">
                      {selectedTeachers.size} teacher(s) selected
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Select action...</option>
                      <option value="mark-paid">Mark as Paid</option>
                      <option value="mark-unpaid">Mark as Unpaid</option>
                    </select>
                    <button
                      onClick={() => setShowBulkConfirm(true)}
                      disabled={!bulkAction || bulkLoading}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                    >
                      {bulkLoading ? (
                        <FiLoader className="animate-spin h-4 w-4" />
                      ) : (
                        <FiCheck className="h-4 w-4" />
                      )}
                      Apply
                    </button>
                    <button
                      onClick={() => setSelectedTeachers(new Set())}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
                <p className="text-black font-medium text-lg">
                  Loading payments...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Please wait while we fetch the data
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
                  <FiXCircle className="h-16 w-16 text-red-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">
                  Error Loading Payments
                </h3>
                <p className="text-red-600 text-xl">{error}</p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiDollarSign className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">
                  No Teachers Found
                </h3>
                <p className="text-gray-600 text-xl">
                  No teachers match your current filters.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={
                              selectedTeachers.size ===
                                filteredTeachers.length &&
                              filteredTeachers.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeachers(
                                  new Set(filteredTeachers.map((t) => t.id))
                                );
                              } else {
                                setSelectedTeachers(new Set());
                              }
                            }}
                            className="rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                          />
                        </th>
                        <th
                          className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (sortKey === "name") {
                              setSortDir(sortDir === "asc" ? "desc" : "asc");
                            } else {
                              setSortKey("name");
                              setSortDir("asc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            Teacher
                            {sortKey === "name" &&
                              (sortDir === "asc" ? (
                                <FiChevronUp className="h-4 w-4" />
                              ) : (
                                <FiChevronDown className="h-4 w-4" />
                              ))}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          # Students
                        </th>
                        <th
                          className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (sortKey === "baseSalary") {
                              setSortDir(sortDir === "asc" ? "desc" : "asc");
                            } else {
                              setSortKey("baseSalary");
                              setSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            Base Salary
                            {sortKey === "baseSalary" &&
                              (sortDir === "asc" ? (
                                <FiChevronUp className="h-4 w-4" />
                              ) : (
                                <FiChevronDown className="h-4 w-4" />
                              ))}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Lateness Deduction
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Absence Deduction
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Bonuses
                        </th>
                        <th
                          className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (sortKey === "totalSalary") {
                              setSortDir(sortDir === "asc" ? "desc" : "asc");
                            } else {
                              setSortKey("totalSalary");
                              setSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            Total Salary
                            {sortKey === "totalSalary" &&
                              (sortDir === "asc" ? (
                                <FiChevronUp className="h-4 w-4" />
                              ) : (
                                <FiChevronDown className="h-4 w-4" />
                              ))}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-black uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {sortData(filteredTeachers)
                        .slice((page - 1) * pageSize, page * pageSize)
                        .map((t, index) => (
                          <tr
                            key={t.id}
                            className={`hover:bg-gray-50 transition-all duration-200 ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedTeachers.has(t.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeachers(
                                      (prev) => new Set([...prev, t.id])
                                    );
                                  } else {
                                    setSelectedTeachers((prev) => {
                                      const newSet = new Set(prev);
                                      newSet.delete(t.id);
                                      return newSet;
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full ${getAvatarColor(
                                    t.id
                                  )} flex items-center justify-center font-bold`}
                                >
                                  {t.name
                                    ? t.name
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                    : "N/A"}
                                </div>
                                <span className="font-semibold text-black">
                                  {t.name || "Unknown Teacher"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-semibold text-xs">
                                {t.numStudents || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="font-bold text-gray-900">
                                {t.baseSalary} ETB
                              </div>
                              {t.teachingDays && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {t.teachingDays} teaching days
                                </div>
                              )}
                              {t.breakdown?.summary && (
                                <div className="text-xs text-green-600">
                                  Avg: {t.breakdown.summary.averageDailyEarning}{" "}
                                  ETB/day
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                -{t.latenessDeduction} ETB
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {t.absenceDeduction > 0 ? (
                                <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                  -{t.absenceDeduction} ETB
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                                  No absences
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                                +{t.bonuses} ETB
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="font-bold text-black text-lg">
                                {t.totalSalary} ETB
                              </div>
                              {(() => {
                                const efficiency =
                                  t.numStudents && t.totalSalary
                                    ? Math.round(t.totalSalary / t.numStudents)
                                    : 0;
                                return (
                                  efficiency > 0 && (
                                    <div className="text-xs text-purple-600">
                                      {efficiency} ETB per student
                                    </div>
                                  )
                                );
                              })()}
                              {t.breakdown?.summary && (
                                <div
                                  className={`text-xs font-medium ${
                                    t.breakdown.summary.totalDeductions > 100
                                      ? "text-red-600"
                                      : t.breakdown.summary.totalDeductions > 50
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  Net: {t.breakdown.summary.netSalary} ETB
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                      (salaryStatus[t.id] || "Unpaid") ===
                                      "Paid"
                                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                                        : canMarkPaid
                                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                        : "bg-gray-100 text-gray-500 cursor-not-allowed"
                                    }`}
                                    onClick={async () => {
                                      if (!canMarkPaid) return;
                                      const newStatus =
                                        (salaryStatus[t.id] || "Unpaid") ===
                                        "Paid"
                                          ? "Unpaid"
                                          : "Paid";
                                      try {
                                        const period = `${selectedYear}-${String(
                                          selectedMonth
                                        ).padStart(2, "0")}`;
                                        const res = await fetch(
                                          "/api/admin/teacher-payments",
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              teacherId: t.id,
                                              period,
                                              status: newStatus,
                                              totalSalary: t.totalSalary,
                                              latenessDeduction:
                                                t.latenessDeduction,
                                              absenceDeduction:
                                                t.absenceDeduction,
                                              bonuses: t.bonuses,
                                            }),
                                          }
                                        );
                                        const result = await res.json();
                                        if (!res.ok)
                                          throw new Error(
                                            result.error ||
                                              "Failed to update salary status"
                                          );
                                        setSalaryStatus((prev) => ({
                                          ...prev,
                                          [t.id]: newStatus,
                                        }));
                                        toast({
                                          title: "Success",
                                          description: `Salary for ${t.name} marked as ${newStatus}`,
                                        });
                                      } catch (err: any) {
                                        toast({
                                          title: "Error",
                                          description:
                                            err.message ||
                                            "Failed to update salary status",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    disabled={
                                      !canMarkPaid ||
                                      paymentProcessing.has(t.id)
                                    }
                                    title={
                                      !canMarkPaid
                                        ? "You can only mark as paid after the 28th of the current month or for past months."
                                        : undefined
                                    }
                                  >
                                    {paymentProcessing.has(t.id) ? (
                                      <FiLoader className="animate-spin h-4 w-4" />
                                    ) : (salaryStatus[t.id] || "Unpaid") ===
                                      "Paid" ? (
                                      <FiCheckCircle className="text-green-600 h-4 w-4" />
                                    ) : canMarkPaid ? (
                                      <FiXCircle className="text-yellow-600 h-4 w-4" />
                                    ) : (
                                      <FiXCircle className="text-gray-400 h-4 w-4" />
                                    )}
                                    {salaryStatus[t.id] || "Unpaid"}
                                  </button>

                                  {canMarkPaid &&
                                    (salaryStatus[t.id] || "Unpaid") ===
                                      "Unpaid" && (
                                      <button
                                        onClick={() => processPayment(t.id, t)}
                                        disabled={paymentProcessing.has(t.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                        title="Mark as paid and process payment"
                                      >
                                        {paymentProcessing.has(t.id) ? (
                                          <FiLoader className="animate-spin h-3 w-3" />
                                        ) : (
                                          "💳 Pay"
                                        )}
                                      </button>
                                    )}
                                </div>

                                {paymentResults[t.id] && (
                                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border">
                                    TX:{" "}
                                    {paymentResults[t.id].transactionId?.slice(
                                      -8
                                    ) || "N/A"}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all hover:scale-105"
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  fetchBreakdown(t.id);
                                }}
                                title="Review Salary Details"
                              >
                                <FiUser className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                  <p className="text-lg font-semibold text-gray-700">
                    Page {page} of{" "}
                    {Math.ceil(filteredTeachers.length / pageSize)}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() =>
                        setPage(
                          Math.min(
                            Math.ceil(filteredTeachers.length / pageSize),
                            page + 1
                          )
                        )
                      }
                      disabled={
                        page >= Math.ceil(filteredTeachers.length / pageSize)
                      }
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bulk Confirmation Modal */}
        {showBulkConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 relative border border-gray-200 p-6">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110"
              >
                <FiX size={20} />
              </button>
              <h2 className="text-xl font-semibold text-black mb-4">
                Confirm Bulk Action
              </h2>
              <p className="text-gray-700 mb-6">
                Are you sure you want to mark {selectedTeachers.size} teacher(s)
                as {bulkAction === "mark-paid" ? "Paid" : "Unpaid"}?
              </p>

              {bulkAction === "mark-paid" && canMarkPaid && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <FiInfo className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Payment Processing Options
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Choose whether to process actual payments or just mark as
                    paid for manual processing.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>

                {bulkAction === "mark-paid" && canMarkPaid ? (
                  <>
                    <button
                      onClick={() => handleBulkAction(false)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-all font-semibold flex items-center gap-2"
                      disabled={bulkLoading}
                    >
                      {bulkLoading ? (
                        <FiLoader className="animate-spin h-4 w-4" />
                      ) : (
                        <FiCheck className="h-4 w-4" />
                      )}
                      Mark Only
                    </button>
                    <button
                      onClick={() => handleBulkAction(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold flex items-center gap-2"
                      disabled={bulkLoading}
                    >
                      {bulkLoading ? (
                        <FiLoader className="animate-spin h-4 w-4" />
                      ) : (
                        <FiDollarSign className="h-4 w-4" />
                      )}
                      Mark & Pay
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleBulkAction(false)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-all font-semibold"
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? (
                      <FiLoader className="animate-spin h-4 w-4" />
                    ) : (
                      "Confirm"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Salary Review Modal */}
        {selectedTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 my-8 p-6 relative border border-gray-200 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedTeacher(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110"
              >
                <FiX size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-black rounded-xl">
                  <FiUser className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-black">
                  Salary Review for {selectedTeacher.name}
                </h2>
              </div>

              {/* Package Breakdown Section */}
              {teacherPackageBreakdown && (
                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <FiDollarSign className="h-5 w-5" />
                    Package-Based Salary & Deduction System
                  </h3>
                  <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      🎯 Package-Specific Deductions Active
                    </h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>
                        • <strong>Lateness:</strong> Base amount varies by
                        student's package (used with tier percentages)
                      </p>
                      <p>
                        • <strong>Absence:</strong> Per-slot deduction varies by
                        student's package
                      </p>
                      <p>
                        • <strong>Fair System:</strong> Higher-fee packages =
                        higher deductions, lower-fee packages = lower deductions
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherPackageBreakdown.packageBreakdown?.map(
                      (pkg: any, index: number) => {
                        const colors = [
                          "bg-emerald-100 text-emerald-800",
                          "bg-blue-100 text-blue-800",
                          "bg-purple-100 text-purple-800",
                          "bg-orange-100 text-orange-800",
                        ];
                        return (
                          <div
                            key={pkg.packageName}
                            className={`p-4 rounded-xl ${
                              colors[index % colors.length]
                            } border`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold">
                                {pkg.packageName}
                              </span>
                              <span className="text-sm font-semibold">
                                {pkg.count} students
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Rate per student:</span>
                                <span className="font-semibold">
                                  {pkg.salaryPerStudent} ETB
                                </span>
                              </div>
                              <div className="flex justify-between border-t pt-1">
                                <span>Package total:</span>
                                <span className="font-bold">
                                  {pkg.totalSalary} ETB
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  {[
                    {
                      label: "Base Salary",
                      value: `${selectedTeacher.baseSalary} ETB`,
                      color: "blue",
                      icon: FiDollarSign,
                    },
                    {
                      label: "# Students",
                      value: selectedTeacher.numStudents || 0,
                      color: "gray",
                      badge: true,
                      icon: FiUsers,
                    },
                    {
                      label: "Lateness Deduction",
                      value: `-${selectedTeacher.latenessDeduction} ETB`,
                      color: "red",
                      badge: true,
                      icon: FiAlertTriangle,
                      detail:
                        breakdown.latenessRecords?.length > 0
                          ? `${breakdown.latenessRecords.length} incident${
                              breakdown.latenessRecords.length > 1 ? "s" : ""
                            }`
                          : undefined,
                    },
                    {
                      label: "Absence Deduction",
                      value: `-${selectedTeacher.absenceDeduction} ETB`,
                      color: "red",
                      badge: true,
                      icon: FiXCircle,
                    },
                    {
                      label: "Bonuses",
                      value: `+${selectedTeacher.bonuses} ETB`,
                      color: "green",
                      badge: true,
                      icon: FiAward,
                    },
                    {
                      label: "Total Salary",
                      value: `${selectedTeacher.totalSalary} ETB`,
                      color: "purple",
                      bold: true,
                      icon: FiCheckCircle,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border shadow-sm"
                      >
                        <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                          <Icon className={`h-4 w-4 text-${item.color}-600`} />
                        </div>
                        <span className="font-semibold text-gray-700 flex-1">
                          {item.label}:
                        </span>
                        {item.badge ? (
                          <span
                            className={`inline-block px-3 py-1 rounded-full bg-${item.color}-100 text-${item.color}-700 font-semibold text-sm`}
                          >
                            {item.value}
                          </span>
                        ) : (
                          <div className="text-right">
                            <span
                              className={`font-${
                                item.bold ? "bold" : "medium"
                              } text-${
                                item.color === "purple"
                                  ? "purple-900"
                                  : "gray-900"
                              } text-lg block`}
                            >
                              {item.value}
                            </span>
                            {(item as any).detail && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(item as any).detail}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                        (salaryStatus[selectedTeacher.id] || "Unpaid") ===
                        "Paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {(salaryStatus[selectedTeacher.id] || "Unpaid") ===
                      "Paid" ? (
                        <FiCheckCircle className="text-green-600 h-4 w-4" />
                      ) : (
                        <FiXCircle className="text-yellow-600 h-4 w-4" />
                      )}
                      {salaryStatus[selectedTeacher.id] || "Unpaid"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCalendar className="text-gray-500 h-5 w-5" />
                      Salary calculated daily based on Zoom link activity.
                    </div>
                    {teacherPackageBreakdown && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Month:</span>{" "}
                        {
                          months.find((m) => m.value === String(selectedMonth))
                            ?.label
                        }{" "}
                        {selectedYear}
                        <span className="ml-4 font-medium">
                          Total Days:
                        </span>{" "}
                        {teacherPackageBreakdown.daysInMonth}
                        <span className="ml-4 font-medium">
                          Working Days:
                        </span>{" "}
                        {teacherPackageBreakdown.workingDays}{" "}
                        {!includeSundays && "(excludes Sundays)"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="w-full mb-4 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                onClick={() => setShowDetails((v) => !v)}
              >
                {showDetails ? (
                  <FiChevronUp className="h-5 w-5" />
                ) : (
                  <FiChevronDown className="h-5 w-5" />
                )}
                {showDetails ? "Hide Details" : "Show Details"}
              </button>

              {showDetails && (
                <div className="bg-gray-50 rounded-xl p-6 text-sm max-h-80 overflow-y-auto border border-gray-200 mb-6">
                  {breakdownLoading ? (
                    <div className="flex items-center gap-3 text-gray-600 animate-pulse">
                      <FiLoader className="h-6 w-6 animate-spin" />
                      <span className="font-semibold">
                        Loading breakdown...
                      </span>
                    </div>
                  ) : breakdownError ? (
                    <div className="flex items-center gap-3 text-red-600">
                      <FiXCircle className="h-6 w-6" />
                      <span className="font-semibold">{breakdownError}</span>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FiAlertTriangle className="text-red-500 h-5 w-5" />
                            <span className="font-semibold text-black">
                              Lateness Records
                            </span>
                          </div>
                          {breakdown.latenessRecords?.length > 0 && (
                            <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                              <div className="text-sm font-semibold text-red-800">
                                Total Deduction:{" "}
                                {breakdown.latenessRecords.reduce(
                                  (sum: number, r: any) =>
                                    sum + r.deductionApplied,
                                  0
                                )}{" "}
                                ETB
                              </div>
                              <div className="text-xs text-red-600">
                                {breakdown.latenessRecords.length} lateness
                                record
                                {breakdown.latenessRecords.length > 1
                                  ? "s"
                                  : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {breakdown.latenessRecords?.length === 0 ? (
                        <div className="text-gray-500 mb-4">
                          No lateness records.
                        </div>
                      ) : (
                        <ul className="mb-6 space-y-3">
                          {breakdown.latenessRecords.map((r: any) => (
                            <li
                              key={r.id}
                              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all"
                            >
                              <div className="flex flex-col space-y-3">
                                {/* Header Row */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-semibold text-gray-800">
                                      {new Date(
                                        r.classDate
                                      ).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(r.classDate).toLocaleDateString(
                                        "en-US",
                                        { weekday: "long" }
                                      )}
                                    </span>
                                  </div>
                                  <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                                    -{r.deductionApplied} ETB
                                  </span>
                                </div>

                                {/* Lateness Details */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-semibold text-xs">
                                    ⏰ {r.latenessMinutes} minutes late
                                  </span>
                                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                                    📊 {r.deductionTier}
                                  </span>
                                  {r.studentName && (
                                    <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-xs">
                                      👤 {r.studentName}
                                    </span>
                                  )}
                                </div>

                                {/* Calculation Details */}
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <div className="text-xs font-mono text-gray-700 mb-2">
                                    Package-Specific Calculation:{" "}
                                    {r.deductionApplied} ETB
                                  </div>
                                  {r.deductionTier &&
                                    r.deductionTier.includes(" - ") && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        <div className="bg-blue-100 rounded p-2">
                                          <span className="font-medium text-blue-800">
                                            Student Package:
                                          </span>
                                          <div className="font-bold text-blue-900">
                                            {r.deductionTier.split(" - ")[1]}
                                          </div>
                                        </div>
                                        <div className="bg-purple-100 rounded p-2">
                                          <span className="font-medium text-purple-800">
                                            Tier Applied:
                                          </span>
                                          <div className="font-bold text-purple-900">
                                            {r.deductionTier.split(" - ")[0]}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  <div className="text-xs text-green-600 mt-1 font-medium">
                                    ✓ Deduction calculated using {r.studentName}
                                    's package-specific base rate
                                  </div>
                                  {r.scheduledTime && r.actualStartTime && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                                      <div>
                                        <span className="font-medium">
                                          Scheduled:{" "}
                                        </span>
                                        <span className="font-mono">
                                          {new Date(
                                            r.scheduledTime
                                          ).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Actual Start:{" "}
                                        </span>
                                        <span className="font-mono">
                                          {new Date(
                                            r.actualStartTime
                                          ).toLocaleTimeString()}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FiAlertTriangle className="text-yellow-500 h-5 w-5" />
                            <span className="font-semibold text-black">
                              Absence Records
                            </span>
                          </div>
                          {breakdown.absenceRecords?.length > 0 && (
                            <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                              <div className="text-sm font-semibold text-red-800">
                                Total Deduction:{" "}
                                {breakdown.absenceRecords.reduce(
                                  (sum: number, r: any) =>
                                    sum + r.deductionApplied,
                                  0
                                )}{" "}
                                ETB
                              </div>
                              <div className="text-xs text-red-600">
                                {breakdown.absenceRecords.length} absence record
                                {breakdown.absenceRecords.length > 1 ? "s" : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {breakdown.absenceRecords?.length === 0 ? (
                        <div className="text-gray-500 mb-4">
                          No absence records.
                        </div>
                      ) : (
                        <ul className="mb-6 space-y-3">
                          {breakdown.absenceRecords.map((r: any) => {
                            let timeSlotsInfo = "Full Day";
                            let slotsCount = 0;
                            let packageInfo = "";

                            // Enhanced time slot and package information
                            if (
                              r.packageBreakdown &&
                              Array.isArray(r.packageBreakdown)
                            ) {
                              slotsCount = r.packageBreakdown.reduce(
                                (sum: number, p: any) => sum + p.timeSlots,
                                0
                              );
                              const packageCount = r.packageBreakdown.length;
                              timeSlotsInfo = `⏰ ${slotsCount} Time Slot${
                                slotsCount > 1 ? "s" : ""
                              }`;
                              packageInfo = `📦 ${packageCount} Package${
                                packageCount > 1 ? "s" : ""
                              }`;
                            } else if (r.timeSlots) {
                              try {
                                const slots = JSON.parse(r.timeSlots);
                                if (slots.includes("Whole Day")) {
                                  timeSlotsInfo = "🚫 Whole Day";
                                } else {
                                  slotsCount = slots.length;
                                  timeSlotsInfo = `⏰ ${slotsCount} Time Slot${
                                    slotsCount > 1 ? "s" : ""
                                  }`;
                                }
                              } catch {}
                            }

                            return (
                              <li
                                key={r.id}
                                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all"
                              >
                                <div className="flex flex-col space-y-3">
                                  {/* Header Row */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-sm font-semibold text-gray-800">
                                        {new Date(
                                          r.classDate
                                        ).toLocaleDateString()}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(
                                          r.classDate
                                        ).toLocaleDateString("en-US", {
                                          weekday: "long",
                                        })}
                                      </span>
                                    </div>
                                    <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                                      -{r.deductionApplied} ETB
                                    </span>
                                  </div>

                                  {/* Time Slots & Package Info Row */}
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span
                                      className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${
                                        timeSlotsInfo.includes("Whole Day")
                                          ? "bg-red-100 text-red-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {timeSlotsInfo}
                                    </span>
                                    {packageInfo && (
                                      <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold text-xs">
                                        {packageInfo}
                                      </span>
                                    )}
                                    <span
                                      className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${
                                        r.permitted
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {r.permitted
                                        ? "✅ Permitted"
                                        : "❌ Unpermitted"}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        r.reviewedByManager
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {r.reviewedByManager
                                        ? "🤖 Auto-Detected"
                                        : "👁️ Manual Review"}
                                    </span>
                                  </div>

                                  {/* Enhanced Calculation Details */}
                                  {(() => {
                                    let calculationDisplay = "";
                                    let packageDetails = null;

                                    // Parse package breakdown (handle both JSON string and object)
                                    let parsedPackageBreakdown = null;
                                    if (r.packageBreakdown) {
                                      try {
                                        parsedPackageBreakdown =
                                          typeof r.packageBreakdown === "string"
                                            ? JSON.parse(r.packageBreakdown)
                                            : r.packageBreakdown;
                                      } catch {
                                        parsedPackageBreakdown = null;
                                      }
                                    }

                                    if (
                                      parsedPackageBreakdown &&
                                      Array.isArray(parsedPackageBreakdown)
                                    ) {
                                      const totalSlots =
                                        parsedPackageBreakdown.reduce(
                                          (sum: number, p: any) =>
                                            sum + (p.timeSlots || 1),
                                          0
                                        );
                                      const packageCount =
                                        parsedPackageBreakdown.length;
                                      const calculatedTotal =
                                        parsedPackageBreakdown.reduce(
                                          (sum: number, p: any) =>
                                            sum +
                                            (p.total || p.ratePerSlot || 0),
                                          0
                                        );
                                      const isAccurate =
                                        Math.abs(
                                          calculatedTotal - r.deductionApplied
                                        ) < 0.01;

                                      calculationDisplay = `🎯 Package-Based Calculation: ${totalSlots} time slot${
                                        totalSlots > 1 ? "s" : ""
                                      } across ${packageCount} package type${
                                        packageCount > 1 ? "s" : ""
                                      } = ${r.deductionApplied} ETB ${
                                        isAccurate ? "✓" : "⚠️"
                                      }`;
                                      packageDetails = parsedPackageBreakdown;
                                    } else if (r.timeSlots) {
                                      try {
                                        const slots =
                                          typeof r.timeSlots === "string"
                                            ? JSON.parse(r.timeSlots)
                                            : r.timeSlots;
                                        if (slots.includes("Whole Day")) {
                                          calculationDisplay = `🚫 Whole Day Absence: ${r.deductionApplied} ETB (Package-weighted rates applied)`;
                                        } else {
                                          const avgRate = Math.round(
                                            r.deductionApplied / slots.length
                                          );
                                          calculationDisplay = `⏱️ Partial Absence: ${avgRate} ETB avg/slot × ${slots.length} slots = ${r.deductionApplied} ETB`;
                                        }
                                      } catch {
                                        calculationDisplay = `📊 Standard Calculation: ${r.deductionApplied} ETB (Package-based system)`;
                                      }
                                    } else {
                                      calculationDisplay = `🚫 Full Day Absence: ${r.deductionApplied} ETB (Package-weighted deduction)`;
                                    }

                                    return (
                                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="text-xs font-mono text-gray-700 font-semibold flex-1">
                                            {calculationDisplay}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {parsedPackageBreakdown &&
                                            parsedPackageBreakdown.length >
                                              0 ? (
                                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                                ✓ Verified
                                              </span>
                                            ) : (
                                              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                                                ⚠️ Basic
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Enhanced Package-specific breakdown */}
                                        {packageDetails &&
                                          packageDetails.length > 0 && (
                                            <div className="bg-blue-50 rounded p-3 mb-3 border border-blue-200">
                                              <div className="flex items-center justify-between mb-3">
                                                <div className="text-xs text-blue-800 font-medium flex items-center gap-1">
                                                  📊 Package-Specific Breakdown
                                                </div>
                                                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                  {packageDetails.length}{" "}
                                                  Package
                                                  {packageDetails.length > 1
                                                    ? "s"
                                                    : ""}{" "}
                                                  Affected
                                                </div>
                                              </div>
                                              <div className="grid grid-cols-1 gap-2">
                                                {packageDetails.map(
                                                  (pkg: any, idx: number) => {
                                                    const slots =
                                                      pkg.timeSlots || 1;
                                                    const rate =
                                                      pkg.ratePerSlot ||
                                                      pkg.total ||
                                                      0;
                                                    const total =
                                                      pkg.total || rate * slots;

                                                    return (
                                                      <div
                                                        key={idx}
                                                        className="bg-white rounded-lg px-3 py-2 border border-blue-200 shadow-sm"
                                                      >
                                                        <div className="flex justify-between items-start mb-1">
                                                          <div className="flex items-center gap-2">
                                                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                                                            <span className="font-semibold text-blue-900 text-xs">
                                                              {pkg.package ||
                                                                "Unknown Package"}
                                                            </span>
                                                            {pkg.studentId && (
                                                              <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                                                                ID:{" "}
                                                                {pkg.studentId}
                                                              </span>
                                                            )}
                                                          </div>
                                                          <span className="text-xs font-bold text-red-600">
                                                            -{total} ETB
                                                          </span>
                                                        </div>
                                                        <div className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                                                          {slots} slot
                                                          {slots > 1
                                                            ? "s"
                                                            : ""}{" "}
                                                          × {rate} ETB/slot ={" "}
                                                          {total} ETB
                                                        </div>
                                                        {pkg.studentName && (
                                                          <div className="text-xs text-gray-500 mt-1">
                                                            Student:{" "}
                                                            {pkg.studentName}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                )}
                                              </div>
                                              <div className="mt-3 pt-2 border-t border-blue-200">
                                                <div className="flex justify-between items-center">
                                                  <span className="text-xs font-medium text-blue-800">
                                                    Total Deduction:
                                                  </span>
                                                  <span className="text-sm font-bold text-red-700 bg-red-50 px-2 py-1 rounded">
                                                    -{r.deductionApplied} ETB
                                                  </span>
                                                </div>
                                                <div className="text-xs text-blue-600 mt-1">
                                                  Expected:{" "}
                                                  {packageDetails.reduce(
                                                    (sum: number, p: any) =>
                                                      sum +
                                                      (p.total ||
                                                        p.ratePerSlot ||
                                                        0),
                                                    0
                                                  )}{" "}
                                                  ETB
                                                  {(() => {
                                                    const expected =
                                                      packageDetails.reduce(
                                                        (sum: number, p: any) =>
                                                          sum +
                                                          (p.total ||
                                                            p.ratePerSlot ||
                                                            0),
                                                        0
                                                      );
                                                    const diff = Math.abs(
                                                      expected -
                                                        r.deductionApplied
                                                    );
                                                    return diff > 0.01 ? (
                                                      <span className="text-orange-600 ml-2">
                                                        ⚠️ Variance:{" "}
                                                        {diff.toFixed(2)} ETB
                                                      </span>
                                                    ) : (
                                                      <span className="text-green-600 ml-2">
                                                        ✓ Verified
                                                      </span>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                        {/* Deduction Verification & System Status */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                          <div className="bg-green-50 rounded p-2 border border-green-200">
                                            <div className="text-xs text-green-800 font-medium mb-1 flex items-center gap-1">
                                              ✓ System Verification
                                            </div>
                                            <div className="text-xs text-green-700">
                                              {packageDetails &&
                                              packageDetails.length > 1
                                                ? `Mixed packages: ${packageDetails.length} types`
                                                : packageDetails &&
                                                  packageDetails.length === 1
                                                ? `Single package: ${packageDetails[0]?.package}`
                                                : "Package-based calculation"}
                                            </div>
                                            <div className="text-xs text-green-600 mt-1">
                                              {r.reviewedByManager
                                                ? "🤖 Auto-verified"
                                                : "👁️ Manual review"}
                                            </div>
                                          </div>

                                          <div className="bg-purple-50 rounded p-2 border border-purple-200">
                                            <div className="text-xs text-purple-800 font-medium mb-1 flex items-center gap-1">
                                              📈 Impact Analysis
                                            </div>
                                            <div className="text-xs text-purple-700">
                                              Revenue impact:{" "}
                                              {r.deductionApplied} ETB
                                            </div>
                                            <div className="text-xs text-purple-600 mt-1">
                                              {packageDetails
                                                ? `Avg rate: ${Math.round(
                                                    r.deductionApplied /
                                                      packageDetails.length
                                                  )} ETB/pkg`
                                                : "Standard rate applied"}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Enhanced Time Slot Information */}
                                        {r.uniqueTimeSlots &&
                                          r.uniqueTimeSlots.length > 0 && (
                                            <div className="bg-gray-50 rounded p-2 border border-gray-200">
                                              <div className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                ⏰ Time Slots Affected (
                                                {r.uniqueTimeSlots.length})
                                              </div>
                                              <div className="flex flex-wrap gap-1">
                                                {r.uniqueTimeSlots
                                                  .slice(0, 4)
                                                  .map(
                                                    (
                                                      slot: string,
                                                      idx: number
                                                    ) => (
                                                      <span
                                                        key={idx}
                                                        className="inline-block bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono text-gray-700"
                                                      >
                                                        {slot}
                                                      </span>
                                                    )
                                                  )}
                                                {r.uniqueTimeSlots.length >
                                                  4 && (
                                                  <span className="inline-block bg-gray-200 border border-gray-300 rounded px-2 py-1 text-xs text-gray-600">
                                                    +
                                                    {r.uniqueTimeSlots.length -
                                                      4}{" "}
                                                    more
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">
                                                Total duration:{" "}
                                                {r.uniqueTimeSlots.length} time
                                                period
                                                {r.uniqueTimeSlots.length > 1
                                                  ? "s"
                                                  : ""}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    );
                                  })()}

                                  {/* Enhanced Review Notes & Additional Info */}
                                  {r.reviewNotes && (
                                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                      <div className="text-xs text-yellow-800 mb-2">
                                        <span className="font-medium flex items-center gap-1">
                                          📝 Admin Notes
                                        </span>
                                      </div>
                                      <div className="text-xs text-yellow-700 bg-white rounded p-2 border border-yellow-300">
                                        {r.reviewNotes}
                                      </div>
                                    </div>
                                  )}

                                  {/* Absence Record Metadata */}
                                  <div className="bg-gray-50 rounded p-2 border border-gray-200 mt-2">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          Record ID:
                                        </span>
                                        <span className="ml-1 font-mono text-gray-800">
                                          {r.id || "Auto-generated"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          Status:
                                        </span>
                                        <span
                                          className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                                            r.permitted
                                              ? "bg-green-100 text-green-700"
                                              : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {r.permitted
                                            ? "Permitted"
                                            : "Unpermitted"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          Detection:
                                        </span>
                                        <span className="ml-1 text-gray-700">
                                          {r.reviewedByManager
                                            ? "Automated"
                                            : "Manual"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          Processed:
                                        </span>
                                        <span className="ml-1 text-gray-700">
                                          {new Date(
                                            r.classDate
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <div className="mb-4 font-semibold text-black flex items-center gap-2">
                        <FiAward className="text-green-500 h-5 w-5" /> Bonus
                        Records
                      </div>
                      {breakdown.bonusRecords?.length === 0 ? (
                        <div className="text-gray-500 mb-4">
                          No bonus records.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {breakdown.bonusRecords.map((r: any) => (
                            <li key={r.id} className="flex items-center gap-3">
                              <span className="font-mono text-sm text-gray-600">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                                +{r.amount} ETB
                              </span>
                              <span className="text-sm text-gray-600">
                                ({r.reason})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                onClick={() => setSelectedTeacher(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Package Deduction Manager Component
function PackageDeductionManager() {
  const [packageDeductions, setPackageDeductions] = useState<any[]>([]);
  const [activePackages, setActivePackages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"lateness" | "absence">(
    "lateness"
  );

  useEffect(() => {
    fetchPackageDeductions();
    fetchActivePackages();
  }, []);

  const fetchPackageDeductions = async () => {
    try {
      const response = await fetch("/api/admin/package-deductions");
      if (response.ok) {
        const data = await response.json();
        setPackageDeductions(data);
      }
    } catch (error) {
      console.error("Failed to fetch package deductions:", error);
    }
  };

  const fetchActivePackages = async () => {
    try {
      // Fetch packages from active students (same source as base salary calculation)
      const response = await fetch("/api/admin/packages");
      if (response.ok) {
        const packages = await response.json();
        setActivePackages(packages);
      }
    } catch (error) {
      console.error("Failed to fetch active packages:", error);
      // Fallback to common packages if API fails
      setActivePackages(["0 Fee", "3 days", "5 days", "Europe"]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    packageName: string,
    type: "lateness" | "absence",
    amount: number
  ) => {
    setSaving(`${packageName}-${type}`);
    try {
      const existing = packageDeductions.find(
        (p) => p.packageName === packageName
      );
      const payload = {
        packageName,
        latenessBaseAmount:
          type === "lateness" ? amount : existing?.latenessBaseAmount || 30,
        absenceBaseAmount:
          type === "absence" ? amount : existing?.absenceBaseAmount || 25,
      };

      const response = await fetch("/api/admin/package-deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${packageName} ${type} deduction updated`,
        });
        fetchPackageDeductions();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save package deduction",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const updateAmount = (
    packageName: string,
    type: "lateness" | "absence",
    amount: number
  ) => {
    setPackageDeductions((prev) => {
      const existing = prev.find((p) => p.packageName === packageName);
      if (existing) {
        return prev.map((p) =>
          p.packageName === packageName
            ? {
                ...p,
                [type === "lateness"
                  ? "latenessBaseAmount"
                  : "absenceBaseAmount"]: amount,
              }
            : p
        );
      } else {
        return [
          ...prev,
          {
            id: 0,
            packageName,
            latenessBaseAmount: type === "lateness" ? amount : 30,
            absenceBaseAmount: type === "absence" ? amount : 25,
          },
        ];
      }
    });
  };

  if (loading)
    return <div className="animate-pulse bg-purple-100 h-32 rounded-lg"></div>;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex bg-purple-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("lateness")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === "lateness"
              ? "bg-white text-purple-900 shadow-sm"
              : "text-purple-700 hover:text-purple-900"
          }`}
        >
          Lateness Deductions
        </button>
        <button
          onClick={() => setActiveTab("absence")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === "absence"
              ? "bg-white text-purple-900 shadow-sm"
              : "text-purple-700 hover:text-purple-900"
          }`}
        >
          Absence Deductions
        </button>
      </div>

      {/* Package Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activePackages.map((packageName) => {
          const existing = packageDeductions.find(
            (p) => p.packageName === packageName
          );
          const currentAmount =
            existing?.[
              activeTab === "lateness"
                ? "latenessBaseAmount"
                : "absenceBaseAmount"
            ] || (activeTab === "lateness" ? 30 : 25);
          const savingKey = `${packageName}-${activeTab}`;

          return (
            <div
              key={packageName}
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-purple-900">{packageName}</h4>
                <span className="text-xs text-purple-600 font-medium">
                  {activeTab === "lateness"
                    ? "Base for % calc"
                    : "Per time slot"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) =>
                      updateAmount(
                        packageName,
                        activeTab,
                        Number(e.target.value)
                      )
                    }
                    className="w-full border border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center font-semibold"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-purple-600 font-medium">
                    ETB
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleSave(packageName, activeTab, currentAmount)
                  }
                  disabled={saving === savingKey}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white p-2 rounded-lg transition-all hover:scale-105"
                >
                  {saving === savingKey ? (
                    <FiLoader className="animate-spin h-4 w-4" />
                  ) : (
                    <FiCheck className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Information Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
        <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
          <FiInfo className="h-4 w-4" />
          {activeTab === "lateness"
            ? "Lateness Calculation"
            : "Absence Calculation"}
        </h4>
        <div className="text-purple-800 text-sm space-y-1">
          {activeTab === "lateness" ? (
            <>
              <p>• Base amount × Tier percentage = Final deduction</p>
              <p>• Each student's package determines their base amount</p>
              <p>• Tier percentages are configured in Lateness Management</p>
            </>
          ) : (
            <>
              <p>
                • Per time slot amount × Number of missed slots = Final
                deduction
              </p>
              <p>• Each student's package determines their slot rate</p>
              <p>• Mixed classes calculate fairly per student's package</p>
            </>
          )}
        </div>
        <div className="mt-3 p-2 bg-white rounded-lg border border-purple-300">
          <div className="text-xs text-purple-700">
            <strong>📦 Active Packages:</strong>{" "}
            {activePackages.length > 0
              ? activePackages.join(", ")
              : "Loading..."}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Packages are automatically detected from active students with
            configured salaries
          </div>
        </div>
      </div>
    </div>
  );
}
