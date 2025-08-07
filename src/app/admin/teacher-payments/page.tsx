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
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";

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
};

function getPeriodFromDateRange(dateRange: { from: Date; to: Date }) {
  return `${dateRange.from.getFullYear()}-${String(
    dateRange.from.getMonth() + 1
  ).padStart(2, "0")}`;
}

export default function TeacherPaymentsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [teachers, setTeachers] = useState<TeacherPayment[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPayment | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [baseSalaryPerStudent, setBaseSalaryPerStudent] = useState<number>(900);
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>("900");
  const [baseSalaryLoading, setBaseSalaryLoading] = useState(false);
  const [baseSalaryError, setBaseSalaryError] = useState<string | null>(null);
  const [baseSalarySuccess, setBaseSalarySuccess] = useState<string | null>(
    null
  );
  const [absenceDeductionAmount, setAbsenceDeductionAmount] =
    useState<string>("50");
  const [absenceEffectiveMonths, setAbsenceEffectiveMonths] = useState<
    string[]
  >([]);
  const [absenceLoading, setAbsenceLoading] = useState(false);
  const [absenceError, setAbsenceError] = useState<string | null>(null);
  const [absenceSuccess, setAbsenceSuccess] = useState<string | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(
    new Set()
  );
  const [bulkAction, setBulkAction] = useState<
    "mark-paid" | "mark-unpaid" | ""
  >("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting states
  const [sortKey, setSortKey] = useState<keyof TeacherPayment | "status">(
    "name"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  // Random avatar color generator
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

  // Skeleton Loader Component
  const SkeletonLoader = ({ rows = 5 }: { rows?: number }) => (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );

  // Sorting logic
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

  const fetchBreakdown = useCallback(
    async (teacherId: string) => {
      setBreakdownLoading(true);
      setBreakdownError(null);
      try {
        const { from, to } = getMonthRange(selectedYear, selectedMonth);
        const res = await fetch(
          `/api/admin/teacher-payments?teacherId=${teacherId}&from=${from.toISOString()}&to=${to.toISOString()}`
        );
        if (!res.ok) throw new Error("Failed to fetch breakdown");
        const data = await res.json();
        setBreakdown(data);
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
    [selectedMonth, selectedYear]
  );

  useEffect(() => {
    async function fetchBaseSalary() {
      setBaseSalaryLoading(true);
      setBaseSalaryError(null);
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        const found = data.settings?.find(
          (s: any) => s.key === "base_salary_per_student"
        );
        if (found && !isNaN(Number(found.value))) {
          setBaseSalaryPerStudent(Number(found.value));
          setBaseSalaryInput(String(found.value));
        } else {
          setBaseSalaryPerStudent(900);
          setBaseSalaryInput("900");
        }
      } catch (err: any) {
        setBaseSalaryError(err.message || "Failed to fetch base salary");
      } finally {
        setBaseSalaryLoading(false);
      }
    }

    async function fetchAbsenceSettings() {
      setAbsenceLoading(true);
      setAbsenceError(null);
      try {
        const res = await fetch("/api/admin/absence-settings");
        if (!res.ok) throw new Error("Failed to fetch absence settings");
        const data = await res.json();
        setAbsenceDeductionAmount(data.deductionAmount || "50");
        setAbsenceEffectiveMonths(data.effectiveMonths || []);
      } catch (err: any) {
        setAbsenceError(err.message || "Failed to fetch absence settings");
      } finally {
        setAbsenceLoading(false);
      }
    }

    fetchBaseSalary();
    fetchAbsenceSettings();
  }, []);

  const handleUpdateBaseSalary = async () => {
    setBaseSalaryLoading(true);
    setBaseSalaryError(null);
    setBaseSalarySuccess(null);
    try {
      const value = Number(baseSalaryInput);
      if (isNaN(value) || value <= 0) {
        setBaseSalaryError("Please enter a valid positive number.");
        setBaseSalaryLoading(false);
        return;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "base_salary_per_student",
          value: String(value),
        }),
      });
      if (!res.ok) throw new Error("Failed to update base salary");
      setBaseSalaryPerStudent(value);
      setBaseSalarySuccess("Base salary updated!");
      setTimeout(() => setBaseSalarySuccess(null), 2000);
      toast({
        title: "Success",
        description: "Base salary updated successfully!",
      });
    } catch (err: any) {
      setBaseSalaryError(err.message || "Failed to update base salary");
      toast({
        title: "Error",
        description: "Failed to update base salary",
        variant: "destructive",
      });
    } finally {
      setBaseSalaryLoading(false);
    }
  };

  const handleUpdateAbsenceSettings = async () => {
    setAbsenceLoading(true);
    setAbsenceError(null);
    setAbsenceSuccess(null);
    try {
      if (
        !absenceDeductionAmount ||
        isNaN(Number(absenceDeductionAmount)) ||
        Number(absenceDeductionAmount) <= 0
      ) {
        setAbsenceError("Please enter a valid deduction amount.");
        setAbsenceLoading(false);
        return;
      }
      const res = await fetch("/api/admin/absence-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductionAmount: absenceDeductionAmount,
          effectiveMonths: absenceEffectiveMonths,
        }),
      });
      if (!res.ok) throw new Error("Failed to save absence settings");
      setAbsenceSuccess("Absence settings updated!");
      setTimeout(() => setAbsenceSuccess(null), 2000);
      toast({
        title: "Success",
        description: "Absence settings updated successfully!",
      });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setAbsenceError(err.message || "Failed to save absence settings");
      toast({
        title: "Error",
        description: "Failed to save absence settings",
        variant: "destructive",
      });
    } finally {
      setAbsenceLoading(false);
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
        setTeachers(data);
        const statusMap: Record<string, "Paid" | "Unpaid"> = {};
        for (const t of data) {
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

  // Reset pagination on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedMonth, selectedYear]);

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
    return matchesSearch && matchesStatus;
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

  const handleBulkAction = async () => {
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
          }),
        });

        if (!res.ok) throw new Error(`Failed to update ${teacher.name}`);
        return teacherId;
      });

      await Promise.all(promises);

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
        description: `${selectedTeachers.size} teacher(s) marked as ${newStatus}`,
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 px-6 py-4 mb-8 flex items-center gap-3">
          <FiDollarSign className="text-indigo-500 h-8 w-8" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight">
            Teacher Payments Dashboard
          </h1>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 px-4 sm:px-6">
          {[
            {
              title: "Total Teachers",
              value: monthSummary.totalTeachers,
              icon: <FiUser className="text-indigo-500 w-8 h-8" />,
              tooltip: "Number of teachers for the selected period",
            },
            {
              title: "Total Paid",
              value: monthSummary.totalPaid,
              icon: <FiCheckCircle className="text-teal-500 w-8 h-8" />,
              tooltip: "Number of teachers marked as paid",
            },
            {
              title: "Total Unpaid",
              value: monthSummary.totalUnpaid,
              icon: <FiXCircle className="text-yellow-500 w-8 h-8" />,
              tooltip: "Number of teachers marked as unpaid",
            },
            {
              title: "Total Deductions",
              value: `${monthSummary.totalDeductions.toLocaleString()} ETB`,
              icon: <FiAlertTriangle className="text-red-500 w-8 h-8" />,
              tooltip: "Sum of lateness and absence deductions",
            },
          ].map((card) => (
            <Tooltip key={card.title} content={card.tooltip}>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 flex flex-col items-center hover:shadow-xl transition-all relative group">
                {card.icon}
                <p className="text-indigo-700 text-sm font-semibold mt-2">
                  {card.title}
                </p>
                <p className="text-2xl font-extrabold text-indigo-900">
                  {card.value}
                </p>
                <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" />
              </div>
            </Tooltip>
          ))}
        </div>

        {/* Month Summary Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-indigo-900 flex items-center gap-3">
              <FiCalendar className="text-indigo-500 w-6 h-6" />
              {
                months.find((m) => m.value === String(selectedMonth))?.label
              }{" "}
              {selectedYear} Summary
            </h2>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button
                onClick={goToPreviousMonth}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-md text-sm sm:text-base"
                aria-label="Previous month"
              >
                <FiChevronDown className="rotate-90 w-5 h-5" />
              </Button>
              <Button
                onClick={goToCurrentMonth}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md text-sm sm:text-base"
                aria-label="Go to current month"
              >
                Current Month
              </Button>
              <Button
                onClick={goToNextMonth}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-md text-sm sm:text-base"
                aria-label="Next month"
              >
                <FiChevronDown className="-rotate-90 w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-indigo-700 text-sm font-semibold">
                Total Salary
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-indigo-900">
                {monthSummary.totalSalary.toLocaleString()} ETB
              </p>
            </div>
            <div className="text-center">
              <p className="text-indigo-700 text-sm font-semibold">
                Total Deductions
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-red-600">
                {monthSummary.totalDeductions.toLocaleString()} ETB
              </p>
            </div>
            <div className="text-center">
              <p className="text-indigo-700 text-sm font-semibold">
                Total Bonuses
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-teal-600">
                {monthSummary.totalBonuses.toLocaleString()} ETB
              </p>
            </div>
            <div className="text-center">
              <p className="text-indigo-700 text-sm font-semibold">
                Payment Status
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-indigo-900">
                {monthSummary.totalPaid}/{monthSummary.totalTeachers} Paid
              </p>
            </div>
          </div>
        </div>

        {/* Base Salary Config */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FiInfo className="text-indigo-500 w-6 h-6" />
              <h2 className="text-xl font-semibold text-indigo-900">
                Base Salary Per Student
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="number"
                min={1}
                value={baseSalaryInput}
                onChange={(e) => setBaseSalaryInput(e.target.value)}
                className="w-28 sm:w-32 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                aria-label="Base salary per student"
                disabled={baseSalaryLoading}
              />
              <span className="text-indigo-700 font-semibold text-sm sm:text-base">
                ETB
              </span>
              <Button
                onClick={handleUpdateBaseSalary}
                className={`bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg flex items-center gap-2 text-sm sm:text-base ${
                  baseSalaryLoading ? "opacity-75" : ""
                }`}
                disabled={baseSalaryLoading}
                aria-label="Update base salary"
              >
                {baseSalaryLoading ? (
                  <FiLoader className="animate-spin w-5 h-5" />
                ) : (
                  <FiCheck className="w-5 h-5" />
                )}
                Update
              </Button>
            </div>
          </div>
          {baseSalaryError && (
            <p className="text-sm text-red-600 mt-2">{baseSalaryError}</p>
          )}
          {baseSalarySuccess && (
            <p className="text-sm text-teal-600 mt-2">{baseSalarySuccess}</p>
          )}
        </div>

        {/* Absence Settings */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="text-yellow-500 w-6 h-6" />
              <h2 className="text-xl font-semibold text-indigo-900">
                Absence Deduction Settings
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              <input
                type="number"
                min={1}
                value={absenceDeductionAmount}
                onChange={(e) => setAbsenceDeductionAmount(e.target.value)}
                className="w-28 sm:w-32 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                aria-label="Absence deduction amount"
                disabled={absenceLoading}
              />
              <span className="text-indigo-700 font-semibold text-sm sm:text-base">
                ETB per absence
              </span>
              <MultiSelect
                options={months}
                onValueChange={setAbsenceEffectiveMonths}
                defaultValue={absenceEffectiveMonths}
                className="w-full sm:w-64 bg-white/95 border-2 border-indigo-200 rounded-lg text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                placeholder="Select effective months"
                aria-label="Select effective months for absence deduction"
                disabled={absenceLoading}
              />
              <Button
                onClick={handleUpdateAbsenceSettings}
                className={`bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg flex items-center gap-2 text-sm sm:text-base ${
                  absenceLoading ? "opacity-75" : ""
                }`}
                disabled={absenceLoading}
                aria-label="Update absence settings"
              >
                {absenceLoading ? (
                  <FiLoader className="animate-spin w-5 h-5" />
                ) : (
                  <FiCheck className="w-5 h-5" />
                )}
                Update
              </Button>
            </div>
          </div>
          {absenceError && (
            <p className="text-sm text-red-600 mt-2">{absenceError}</p>
          )}
          {absenceSuccess && (
            <p className="text-sm text-teal-600 mt-2">{absenceSuccess}</p>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8">
          {/* Search, Filter, Export Row */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center bg-indigo-50/95 backdrop-blur-md p-4 rounded-xl shadow-sm">
            <div className="relative flex-1 max-w-xs">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teacher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                aria-label="Search teacher"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={statusFilter === "" ? "default" : "outline"}
                className={`${
                  statusFilter === ""
                    ? "bg-indigo-600 text-white"
                    : "border-indigo-200 text-indigo-800"
                } px-3 py-1 rounded-full text-sm sm:text-base`}
                onClick={() => setStatusFilter("")}
                aria-label="Filter all statuses"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "Paid" ? "default" : "outline"}
                className={`${
                  statusFilter === "Paid"
                    ? "bg-teal-600 text-white"
                    : "border-indigo-200 text-indigo-800"
                } px-3 py-1 rounded-full text-sm sm:text-base`}
                onClick={() => setStatusFilter("Paid")}
                aria-label="Filter paid statuses"
              >
                Paid
              </Button>
              <Button
                variant={statusFilter === "Unpaid" ? "default" : "outline"}
                className={`${
                  statusFilter === "Unpaid"
                    ? "bg-yellow-600 text-white"
                    : "border-indigo-200 text-indigo-800"
                } px-3 py-1 rounded-full text-sm sm:text-base`}
                onClick={() => setStatusFilter("Unpaid")}
                aria-label="Filter unpaid statuses"
              >
                Unpaid
              </Button>
            </div>
            <Button
              onClick={() =>
                exportToCSV(
                  filteredTeachers,
                  `teacher_payments_${dayjs().format("YYYY-MM-DD")}.csv`
                )
              }
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg flex items-center gap-2 text-sm sm:text-base"
              aria-label="Export all payments to CSV"
            >
              <FiDownload className="w-5 h-5" /> Export All
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <FiCalendar className="text-indigo-500 w-5 h-5" />
              <span className="text-indigo-700 font-semibold text-sm sm:text-base">
                Month:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full sm:w-32 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                aria-label="Select month"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-indigo-700 font-semibold text-sm sm:text-base">
                Year:
              </span>
              <input
                type="number"
                value={selectedYear}
                min={2000}
                max={2100}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-20 sm:w-24 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                aria-label="Select year"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedTeachers.size > 0 && (
            <div className="mb-6 bg-yellow-50/95 backdrop-blur-md border border-yellow-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="text-yellow-500 w-5 h-5" />
                  <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                    {selectedTeachers.size} teacher(s) selected
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-yellow-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-yellow-500 text-sm sm:text-base"
                    aria-label="Select bulk action"
                  >
                    <option value="">Select action...</option>
                    <option value="mark-paid">Mark as Paid</option>
                    <option value="mark-unpaid">Mark as Unpaid</option>
                  </select>
                  <Button
                    onClick={() => setShowBulkConfirm(true)}
                    disabled={!bulkAction || bulkLoading}
                    className={`bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg flex items-center gap-2 text-sm sm:text-base ${
                      bulkLoading ? "opacity-75" : ""
                    }`}
                    aria-label="Apply bulk action"
                  >
                    {bulkLoading ? (
                      <FiLoader className="animate-spin w-5 h-5" />
                    ) : (
                      <FiCheck className="w-5 h-5" />
                    )}
                    Apply
                  </Button>
                  <Button
                    onClick={() => setSelectedTeachers(new Set())}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 sm:py-2.5 px-4 rounded-lg text-sm sm:text-base"
                    aria-label="Clear selection"
                  >
                    <FiX className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Action Confirmation Modal */}
          {showBulkConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-md mx-2 p-6 relative border border-indigo-100">
                <Button
                  onClick={() => setShowBulkConfirm(false)}
                  className="absolute top-4 right-4 text-indigo-500 hover:text-indigo-700 rounded-full"
                  aria-label="Close confirmation modal"
                >
                  <FiX className="w-6 h-6" />
                </Button>
                <h2 className="text-xl font-semibold text-indigo-900 mb-4">
                  Confirm Bulk Action
                </h2>
                <p className="text-indigo-700 text-sm mb-6">
                  Are you sure you want to mark {selectedTeachers.size}{" "}
                  teacher(s) as {bulkAction === "mark-paid" ? "Paid" : "Unpaid"}
                  ?
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkConfirm(false)}
                    className="border-indigo-200 text-indigo-800"
                    aria-label="Cancel bulk action"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAction}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    disabled={bulkLoading}
                    aria-label="Confirm bulk action"
                  >
                    {bulkLoading ? (
                      <FiLoader className="animate-spin w-5 h-5" />
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-indigo-600">
              <FiLoader className="w-8 h-8 animate-spin mr-3" />
              <span className="text-lg font-semibold">Loading...</span>
              <SkeletonLoader rows={pageSize} />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-600">
              <FiXCircle className="w-8 h-8 mr-3" />
              <span className="text-lg font-semibold">{error}</span>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-sm text-indigo-600">
                <FiInfo className="text-indigo-500 w-5 h-5" />
                Base salary is{" "}
                <span className="font-bold text-indigo-900">
                  {baseSalaryPerStudent} ETB
                </span>{" "}
                per active student.
              </div>
              <div className="overflow-x-auto rounded-xl shadow-sm border border-indigo-100">
                <table className="min-w-full text-sm divide-y divide-indigo-100">
                  <thead className="bg-indigo-50 sticky top-0 z-10">
                    <tr>
                      {[
                        { label: "Select", key: "" },
                        { label: "Teacher", key: "name" },
                        { label: "# Students", key: "numStudents" },
                        { label: "Base Salary", key: "baseSalary" },
                        {
                          label: "Lateness Deduction",
                          key: "latenessDeduction",
                        },
                        { label: "Absence Deduction", key: "absenceDeduction" },
                        { label: "Bonuses", key: "bonuses" },
                        { label: "Total Salary", key: "totalSalary" },
                        { label: "Status", key: "status" },
                        { label: "", key: "" },
                      ].map((header) => (
                        <th
                          key={header.label}
                          className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-sm font-bold text-indigo-900 uppercase tracking-wider whitespace-nowrap ${
                            header.key ? "cursor-pointer" : ""
                          }`}
                          onClick={() => {
                            if (!header.key) return;
                            setSortKey(
                              header.key as keyof TeacherPayment | "status"
                            );
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          }}
                        >
                          {header.label === "Select" ? (
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
                              className="rounded border-indigo-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                              aria-label="Select all teachers"
                            />
                          ) : (
                            <span className="flex items-center gap-1">
                              {header.label}
                              {sortKey === header.key &&
                                (sortDir === "asc" ? "↑" : "↓")}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center text-indigo-500 py-12"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-4xl">😕</span>
                            <span className="text-sm font-semibold">
                              No teachers found.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortData(filteredTeachers)
                        .slice((page - 1) * pageSize, page * pageSize)
                        .map((t) => (
                          <tr
                            key={t.id}
                            className="hover:bg-indigo-50 transition-all"
                          >
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
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
                                className="rounded border-indigo-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                aria-label={`Select teacher ${t.name}`}
                              />
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
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
                              <span className="font-semibold text-indigo-900">
                                {t.name || "Unknown Teacher"}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                              <Tooltip content="Number of active students assigned to this teacher">
                                <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold text-xs">
                                  {t.numStudents || 0}
                                </span>
                              </Tooltip>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center font-medium text-indigo-700">
                              {t.baseSalary} ETB
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                -{t.latenessDeduction} ETB
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                              {t.absenceDeduction > 0 ? (
                                <Tooltip content="Teacher has unpermitted absences">
                                  <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs border border-red-200">
                                    -{t.absenceDeduction} ETB
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold text-xs">
                                  No absences
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold text-xs">
                                +{t.bonuses} ETB
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center font-bold text-indigo-900">
                              {t.totalSalary} ETB
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                              <Button
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-sm sm:text-base ${
                                  (salaryStatus[t.id] || "Unpaid") === "Paid"
                                    ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                                    : canMarkPaid
                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                    : "bg-gray-100 text-gray-500 cursor-not-allowed"
                                }`}
                                onClick={async () => {
                                  if (!canMarkPaid) return;
                                  const newStatus =
                                    (salaryStatus[t.id] || "Unpaid") === "Paid"
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
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          teacherId: t.id,
                                          period,
                                          status: newStatus,
                                          totalSalary: t.totalSalary,
                                          latenessDeduction:
                                            t.latenessDeduction,
                                          absenceDeduction: t.absenceDeduction,
                                          bonuses: t.bonuses,
                                        }),
                                      }
                                    );
                                    if (!res.ok)
                                      throw new Error(
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
                                  } catch (err) {
                                    toast({
                                      title: "Error",
                                      description:
                                        "Failed to update salary status",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                aria-label={`Mark as ${
                                  (salaryStatus[t.id] || "Unpaid") === "Paid"
                                    ? "Unpaid"
                                    : "Paid"
                                }`}
                                disabled={!canMarkPaid}
                                title={
                                  !canMarkPaid
                                    ? "You can only mark as paid after the 28th of the current month or for past months."
                                    : undefined
                                }
                              >
                                {(salaryStatus[t.id] || "Unpaid") === "Paid" ? (
                                  <FiCheckCircle className="text-teal-600 w-4 sm:w-5 h-4 sm:h-5" />
                                ) : canMarkPaid ? (
                                  <FiXCircle className="text-yellow-600 w-4 sm:w-5 h-4 sm:h-5" />
                                ) : (
                                  <FiXCircle className="text-gray-400 w-4 sm:w-5 h-4 sm:h-5" />
                                )}
                                {salaryStatus[t.id] || "Unpaid"}
                              </Button>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                              <Button
                                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm sm:text-base"
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  fetchBreakdown(t.id);
                                }}
                                aria-label={`Review salary for ${t.name}`}
                              >
                                Review
                              </Button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="border-indigo-200 text-indigo-800"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="border-indigo-200 text-indigo-800"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-indigo-700">
                      Page {page} of{" "}
                      {Math.ceil(filteredTeachers.length / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={
                        page >= Math.ceil(filteredTeachers.length / pageSize)
                      }
                      className="border-indigo-200 text-indigo-800"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(Math.ceil(filteredTeachers.length / pageSize))
                      }
                      disabled={
                        page >= Math.ceil(filteredTeachers.length / pageSize)
                      }
                      className="border-indigo-200 text-indigo-800"
                    >
                      Last
                    </Button>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-3 py-2 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {[5, 10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size} per page
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCSV(
                        filteredTeachers,
                        `teacher_payments_${dayjs().format(
                          "YYYY-MM-DD"
                        )}_all.csv`
                      )
                    }
                    className="border-indigo-200 text-indigo-800"
                  >
                    <FiDownload className="mr-2 w-4 h-4" /> Export All
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Salary Review Modal */}
          {selectedTeacher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-2xl mx-2 sm:mx-4 my-8 p-4 sm:p-6 md:p-8 relative border border-indigo-100 max-h-[90vh] overflow-y-auto flex flex-col">
                <Button
                  onClick={() => setSelectedTeacher(null)}
                  className="absolute top-4 right-4 text-indigo-500 hover:text-indigo-700 rounded-full"
                  aria-label="Close modal"
                >
                  <FiX className="w-6 h-6" />
                </Button>
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-900 mb-4 sm:mb-6 flex items-center gap-3">
                  <FiUser className="text-indigo-500 w-6 h-6" />
                  Salary Review for {selectedTeacher.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div className="space-y-4">
                    {[
                      {
                        label: "Base Salary",
                        value: `${selectedTeacher.baseSalary} ETB`,
                        color: "indigo",
                      },
                      {
                        label: "# Students",
                        value: selectedTeacher.numStudents || 0,
                        color: "indigo",
                        badge: true,
                      },
                      {
                        label: "Lateness Deduction",
                        value: `-${selectedTeacher.latenessDeduction} ETB`,
                        color: "red",
                        badge: true,
                      },
                      {
                        label: "Absence Deduction",
                        value: `-${selectedTeacher.absenceDeduction} ETB`,
                        color: "red",
                        badge: true,
                      },
                      {
                        label: "Bonuses",
                        value: `+${selectedTeacher.bonuses} ETB`,
                        color: "teal",
                        badge: true,
                      },
                      {
                        label: "Total Salary",
                        value: `${selectedTeacher.totalSalary} ETB`,
                        color: "indigo",
                        bold: true,
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="font-semibold text-indigo-700 text-sm sm:text-base">
                          {item.label}:
                        </span>
                        {item.badge ? (
                          <span
                            className={`inline-block px-3 py-1 rounded-full bg-${item.color}-100 text-${item.color}-700 font-semibold text-xs sm:text-sm`}
                          >
                            {item.value}
                          </span>
                        ) : (
                          <span
                            className={`font-${
                              item.bold ? "extrabold" : "medium"
                            } text-${item.color}-900 text-sm sm:text-base`}
                          >
                            {item.value}
                          </span>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm text-indigo-600">
                      <FiInfo className="text-indigo-500 w-5 h-5" />
                      Base salary is {baseSalaryPerStudent} ETB per active
                      student.
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-indigo-700 text-sm sm:text-base">
                        Status:
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                          (salaryStatus[selectedTeacher.id] || "Unpaid") ===
                          "Paid"
                            ? "bg-teal-100 text-teal-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {(salaryStatus[selectedTeacher.id] || "Unpaid") ===
                        "Paid" ? (
                          <FiCheckCircle className="text-teal-600 w-4 sm:w-5 h-4 sm:h-5" />
                        ) : (
                          <FiXCircle className="text-yellow-600 w-4 sm:w-5 h-4 sm:h-5" />
                        )}
                        {salaryStatus[selectedTeacher.id] || "Unpaid"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-indigo-600">
                      <FiInfo className="text-indigo-500 w-5 h-5" />
                      Salary status changes are logged for audit.
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-4 px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-100 text-indigo-800 rounded-lg font-semibold text-sm sm:text-base"
                  onClick={() => setShowDetails((v) => !v)}
                  aria-expanded={showDetails}
                  aria-label={showDetails ? "Hide details" : "Show details"}
                >
                  {showDetails ? (
                    <FiChevronUp className="w-5 h-5" />
                  ) : (
                    <FiChevronDown className="w-5 h-5" />
                  )}
                  {showDetails ? "Hide Details" : "Show Details"}
                </Button>
                {showDetails && (
                  <div className="mt-4 bg-indigo-50/95 backdrop-blur-md rounded-xl p-4 sm:p-6 text-sm max-h-80 overflow-y-auto border border-indigo-100 shadow-inner">
                    {breakdownLoading ? (
                      <div className="flex items-center gap-3 text-indigo-600 animate-pulse">
                        <FiLoader className="w-6 h-6 animate-spin" />
                        <span className="text-sm sm:text-base font-semibold">
                          Loading breakdown...
                        </span>
                      </div>
                    ) : breakdownError ? (
                      <div className="flex items-center gap-3 text-red-600">
                        <FiXCircle className="w-6 h-6" />
                        <span className="text-sm sm:text-base font-semibold">
                          {breakdownError}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 font-semibold text-indigo-900 flex items-center gap-2 text-sm sm:text-base">
                          <FiAlertTriangle className="text-red-500 w-5 h-5" />{" "}
                          Lateness Records
                        </div>
                        {breakdown.latenessRecords?.length === 0 ? (
                          <div className="text-indigo-500 mb-4 text-sm sm:text-base">
                            No lateness records.
                          </div>
                        ) : (
                          <ul className="mb-6 space-y-2">
                            {breakdown.latenessRecords.map((r: any) => (
                              <li
                                key={r.id}
                                className="flex items-center gap-3"
                              >
                                <span className="font-mono text-xs sm:text-sm text-indigo-600">
                                  {new Date(r.classDate).toLocaleDateString()}
                                </span>
                                <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs sm:text-sm">
                                  {r.latenessMinutes} min late
                                </span>
                                <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs sm:text-sm">
                                  -{r.deductionApplied} ETB
                                </span>
                                <span className="text-xs sm:text-sm text-indigo-600">
                                  ({r.deductionTier})
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mb-4 font-semibold text-indigo-900 flex items-center gap-2 text-sm sm:text-base">
                          <FiAlertTriangle className="text-yellow-500 w-5 h-5" />{" "}
                          Absence Records
                        </div>
                        {breakdown.absenceRecords?.length === 0 ? (
                          <div className="text-indigo-500 mb-4 text-sm sm:text-base">
                            No absence records.
                          </div>
                        ) : (
                          <ul className="mb-6 space-y-2">
                            {breakdown.absenceRecords.map((r: any) => (
                              <li
                                key={r.id}
                                className="flex items-center gap-3"
                              >
                                <span className="font-mono text-xs sm:text-sm text-indigo-600">
                                  {new Date(r.classDate).toLocaleDateString()}
                                </span>
                                <span
                                  className={`inline-block px-3 py-1 rounded-full font-semibold text-xs sm:text-sm ${
                                    r.permitted
                                      ? "bg-teal-100 text-teal-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {r.permitted ? "Permitted" : "Unpermitted"}
                                </span>
                                <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs sm:text-sm">
                                  -{r.deductionApplied} ETB
                                </span>
                                {r.reviewNotes && (
                                  <span className="text-xs sm:text-sm text-indigo-600">
                                    ({r.reviewNotes})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mb-4 font-semibold text-indigo-900 flex items-center gap-2 text-sm sm:text-base">
                          <FiAward className="text-teal-500 w-5 h-5" /> Bonus
                          Records
                        </div>
                        {breakdown.bonusRecords?.length === 0 ? (
                          <div className="text-indigo-500 mb-4 text-sm sm:text-base">
                            No bonus records.
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {breakdown.bonusRecords.map((r: any) => (
                              <li
                                key={r.id}
                                className="flex items-center gap-3"
                              >
                                <span className="font-mono text-xs sm:text-sm text-indigo-600">
                                  {new Date(r.createdAt).toLocaleDateString()}
                                </span>
                                <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold text-xs sm:text-sm">
                                  +{r.amount} ETB
                                </span>
                                <span className="text-xs sm:text-sm text-indigo-600">
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
                <Button
                  className="w-full mt-6 px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm sm:text-base"
                  onClick={() => setSelectedTeacher(null)}
                  aria-label="Close salary review modal"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="w-full text-center text-indigo-500 text-sm py-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md mt-12">
            © {new Date().getFullYear()} DarulKubra Admin Portal. All rights
            reserved.
          </footer>
        </div>
      </div>
    </div>
  );
}
