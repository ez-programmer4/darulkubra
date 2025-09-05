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
          fetch(`/api/admin/teacher-students/${teacherId}`),
        ]);

        if (!breakdownRes.ok) throw new Error("Failed to fetch breakdown");
        const data = await breakdownRes.json();
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
    [selectedMonth, selectedYear]
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
          const setting = data.settings?.find(
            (s: any) => s.key === "teacher_salary_visible"
          );
          setTeacherSalaryVisible(setting?.value === "true");
        }
      } catch (error) {
        console.error("Failed to fetch salary visibility setting:", error);
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
                  Package-driven salary management system
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
                        Package-Based Salaries
                      </h3>
                      <p className="text-blue-700 text-sm">
                        Configure salary per student package
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {availablePackages.map((packageName, index) => {
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
                    })}
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
                </div>
              </div>
              <div className="flex gap-3">
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
                <button
                  onClick={async () => {
                    try {
                      const { from, to } = getMonthRange(selectedYear, selectedMonth);
                      const response = await fetch('/api/admin/teacher-payments/pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          startDate: from.toISOString(),
                          endDate: to.toISOString(),
                          teachersData: filteredTeachers
                        })
                      });
                      
                      if (response.ok) {
                        const html = await response.text();
                        const newWindow = window.open('', '_blank');
                        if (newWindow) {
                          newWindow.document.write(html);
                          newWindow.document.close();
                        }
                        toast({
                          title: "Success",
                          description: "Professional report generated successfully!"
                        });
                      } else {
                        throw new Error('Failed to generate report');
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to generate PDF report",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                >
                  <FiDownload className="h-4 w-4" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>

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
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          # Students
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Base Salary
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
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Total Salary
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
                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                              {t.baseSalary} ETB
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
                            <td className="px-6 py-4 text-center font-bold text-black">
                              {t.totalSalary} ETB
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                  (salaryStatus[t.id] || "Unpaid") === "Paid"
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
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
                                disabled={!canMarkPaid}
                                title={
                                  !canMarkPaid
                                    ? "You can only mark as paid after the 28th of the current month or for past months."
                                    : undefined
                                }
                              >
                                {(salaryStatus[t.id] || "Unpaid") === "Paid" ? (
                                  <FiCheckCircle className="text-green-600 h-4 w-4" />
                                ) : canMarkPaid ? (
                                  <FiXCircle className="text-yellow-600 h-4 w-4" />
                                ) : (
                                  <FiXCircle className="text-gray-400 h-4 w-4" />
                                )}
                                {salaryStatus[t.id] || "Unpaid"}
                              </button>
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
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-all font-semibold"
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <FiLoader className="animate-spin h-4 w-4" />
                  ) : (
                    "Confirm"
                  )}
                </button>
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
                    Package-Based Salary Breakdown
                  </h3>
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
                          <span
                            className={`font-${
                              item.bold ? "bold" : "medium"
                            } text-${
                              item.color === "purple"
                                ? "purple-900"
                                : "gray-900"
                            } text-lg`}
                          >
                            {item.value}
                          </span>
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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiInfo className="text-gray-500 h-5 w-5" />
                    Salary calculated based on student packages.
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
                      <div className="mb-4 font-semibold text-black flex items-center gap-2">
                        <FiAlertTriangle className="text-red-500 h-5 w-5" />{" "}
                        Lateness Records
                      </div>
                      {breakdown.latenessRecords?.length === 0 ? (
                        <div className="text-gray-500 mb-4">
                          No lateness records.
                        </div>
                      ) : (
                        <ul className="mb-6 space-y-2">
                          {breakdown.latenessRecords.map((r: any) => (
                            <li key={r.id} className="flex items-center gap-3">
                              <span className="font-mono text-sm text-gray-600">
                                {new Date(r.classDate).toLocaleDateString()}
                              </span>
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                {r.latenessMinutes} min late
                              </span>
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                -{r.deductionApplied} ETB
                              </span>
                              <span className="text-sm text-gray-600">
                                ({r.deductionTier})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mb-4 font-semibold text-black flex items-center gap-2">
                        <FiAlertTriangle className="text-yellow-500 h-5 w-5" />{" "}
                        Absence Records
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
                            if (r.timeSlots) {
                              try {
                                const slots = JSON.parse(r.timeSlots);
                                if (slots.includes('Whole Day')) {
                                  timeSlotsInfo = "🚫 Whole Day";
                                } else {
                                  slotsCount = slots.length;
                                  timeSlotsInfo = `⏰ ${slotsCount} Time Slot${slotsCount > 1 ? 's' : ''}`;
                                }
                              } catch {}
                            }
                            
                            return (
                              <li key={r.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-mono text-sm text-gray-600">
                                    {new Date(r.classDate).toLocaleDateString()}
                                  </span>
                                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                                    {timeSlotsInfo}
                                  </span>
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${
                                      r.permitted
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {r.permitted ? "Permitted" : "Unpermitted"}
                                  </span>
                                  <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                    -{r.deductionApplied} ETB
                                  </span>
                                </div>
                                {r.timeSlots && (() => {
                                  try {
                                    const slots = JSON.parse(r.timeSlots);
                                    if (!slots.includes('Whole Day') && slots.length > 0) {
                                      return (
                                        <div className="text-xs text-gray-600 ml-2">
                                          <span className="font-medium">Affected slots: </span>
                                          {slots.slice(0, 3).join(', ')}
                                          {slots.length > 3 && ` +${slots.length - 3} more`}
                                        </div>
                                      );
                                    }
                                  } catch {}
                                  return null;
                                })()}
                                {r.reviewNotes && (
                                  <div className="text-xs text-gray-500 mt-1 ml-2">
                                    Note: {r.reviewNotes}
                                  </div>
                                )}
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
