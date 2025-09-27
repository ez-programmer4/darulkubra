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
};

export default function TeacherPaymentsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [teachers, setTeachers] = useState<TeacherPayment[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salaryStatus, setSalaryStatus] = useState<Record<string, "Paid" | "Unpaid">>({});
  const [breakdown, setBreakdown] = useState<{
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
  }>({ latenessRecords: [], absenceRecords: [], bonusRecords: [] });
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState<Set<string>>(new Set());
  const [paymentResults, setPaymentResults] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortKey, setSortKey] = useState<keyof TeacherPayment | "status">("name");
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
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const sortData = (data: TeacherPayment[]) => {
    return [...data].sort((a, b) => {
      let aValue: any = sortKey === "status" ? salaryStatus[a.id] || "Unpaid" : a[sortKey as keyof TeacherPayment];
      let bValue: any = sortKey === "status" ? salaryStatus[b.id] || "Unpaid" : b[sortKey as keyof TeacherPayment];

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

  const refreshTeacherData = useCallback(async () => {
    const { from, to } = getMonthRange(selectedYear, selectedMonth);
    try {
      const res = await fetch(
        `/api/admin/teacher-payments?startDate=${from.toISOString()}&endDate=${to.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        const validatedData = data.map((teacher: any) => {
          const calculatedTotal = teacher.baseSalary - teacher.latenessDeduction + teacher.bonuses;
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

        const validatedData = data.map((teacher: any) => {
          const calculatedTotal = teacher.baseSalary - teacher.latenessDeduction + teacher.bonuses;
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

  const canMarkPaid = (() => {
    const now = dayjs();
    if (selectedYear < now.year()) return true;
    if (selectedYear > now.year()) return false;
    if (selectedMonth < now.month() + 1) return true;
    if (selectedMonth > now.month() + 1) return false;
    return now.date() >= 25;
  })();

  const monthSummary = {
    totalTeachers: teachers.length,
    totalPaid: Object.values(salaryStatus).filter((s) => s === "Paid").length,
    totalUnpaid: teachers.length - Object.values(salaryStatus).filter((s) => s === "Paid").length,
    totalBaseSalary: teachers.reduce((sum, t) => sum + t.baseSalary, 0),
    totalDeductions: teachers.reduce((sum, t) => sum + t.latenessDeduction, 0),
    totalBonuses: teachers.reduce((sum, t) => sum + t.bonuses, 0),
    totalSalary: teachers.reduce((sum, t) => sum + t.totalSalary, 0),
  };

  const processPayment = async (teacherId: string, teacher: TeacherPayment) => {
    setPaymentProcessing((prev) => new Set([...prev, teacherId]));
    try {
      const period = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const res = await fetch("/api/admin/teacher-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          period,
          status: "Paid",
          totalSalary: teacher.totalSalary,
          processPaymentNow: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Payment failed");

      setSalaryStatus((prev) => ({ ...prev, [teacherId]: "Paid" }));
      if (result.paymentResult) {
        setPaymentResults((prev) => ({
          ...prev,
          [teacherId]: result.paymentResult,
        }));
      }

      toast({
        title: "Payment Successful",
        description: `Payment processed for ${teacher.name}`,
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

  function exportToCSV(data: TeacherPayment[], filename: string) {
    if (!data || data.length === 0) {
      toast({
        title: "Error",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }
    const headers = ["Teacher", "Base Salary", "Lateness Deduction", "Bonuses", "Total Salary", "Status"];
    const rows = data.map((row) => [
      row.name,
      row.baseSalary,
      row.latenessDeduction,
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
    const matchesStatus = !statusFilter || (salaryStatus[t.id] || "Unpaid") === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                  Enhanced salary system with real-time calculations
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
                  <span className="text-xs font-semibold text-blue-700">Teachers</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{monthSummary.totalTeachers}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-green-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-green-700">Paid</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{monthSummary.totalPaid}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-orange-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiXCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-xs font-semibold text-orange-700">Unpaid</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{monthSummary.totalUnpaid}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiDollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700">Total</span>
                </div>
                <div className="text-2xl font-bold text-purple-900 truncate" title={currencyFormatter.format(monthSummary.totalSalary)}>
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

        {/* Enhanced Teacher Payments Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiUsers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    {months.find((m) => m.value === String(selectedMonth))?.label} {selectedYear} Payments
                  </h2>
                  <p className="text-gray-600">Enhanced teacher salary management system</p>
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
                >
                  {refreshing ? (
                    <FiLoader className="animate-spin h-4 w-4" />
                  ) : (
                    <FiUser className="h-4 w-4" />
                  )}
                  {refreshing ? "Refreshing..." : "Refresh Data"}
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
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
                <p className="text-black font-medium text-lg">Loading payments...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
                  <FiXCircle className="h-16 w-16 text-red-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">Error Loading Payments</h3>
                <p className="text-red-600 text-xl">{error}</p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiDollarSign className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Teachers Found</h3>
                <p className="text-gray-600 text-xl">No teachers match your current filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Base Salary
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Deductions
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
                              <div className="font-bold text-gray-900">{t.baseSalary} ETB</div>
                              {t.numStudents && (
                                <div className="text-xs text-blue-600 mt-1">{t.numStudents} students</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                                -{t.latenessDeduction} ETB
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                                +{t.bonuses} ETB
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="font-bold text-black text-lg">{t.totalSalary} ETB</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-2">
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
                                      (salaryStatus[t.id] || "Unpaid") === "Paid" ? "Unpaid" : "Paid";
                                    setSalaryStatus((prev) => ({
                                      ...prev,
                                      [t.id]: newStatus,
                                    }));
                                    toast({
                                      title: "Success",
                                      description: `Salary for ${t.name} marked as ${newStatus}`,
                                    });
                                  }}
                                  disabled={!canMarkPaid || paymentProcessing.has(t.id)}
                                >
                                  {paymentProcessing.has(t.id) ? (
                                    <FiLoader className="animate-spin h-4 w-4" />
                                  ) : (salaryStatus[t.id] || "Unpaid") === "Paid" ? (
                                    <FiCheckCircle className="text-green-600 h-4 w-4" />
                                  ) : canMarkPaid ? (
                                    <FiXCircle className="text-yellow-600 h-4 w-4" />
                                  ) : (
                                    <FiXCircle className="text-gray-400 h-4 w-4" />
                                  )}
                                  {salaryStatus[t.id] || "Unpaid"}
                                </button>

                                {canMarkPaid && (salaryStatus[t.id] || "Unpaid") === "Unpaid" && (
                                  <button
                                    onClick={() => processPayment(t.id, t)}
                                    disabled={paymentProcessing.has(t.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                  >
                                    {paymentProcessing.has(t.id) ? (
                                      <FiLoader className="animate-spin h-3 w-3" />
                                    ) : (
                                      "💳 Pay"
                                    )}
                                  </button>
                                )}

                                {paymentResults[t.id] && (
                                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border">
                                    TX: {paymentResults[t.id].transactionId?.slice(-8) || "N/A"}
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
                    Page {page} of {Math.ceil(filteredTeachers.length / pageSize)}
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
                          Math.min(Math.ceil(filteredTeachers.length / pageSize), page + 1)
                        )
                      }
                      disabled={page >= Math.ceil(filteredTeachers.length / pageSize)}
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

        {/* Teacher Detail Modal */}
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
                        <span className="font-semibold text-gray-700 flex-1">{item.label}:</span>
                        {item.badge ? (
                          <span
                            className={`inline-block px-3 py-1 rounded-full bg-${item.color}-100 text-${item.color}-700 font-semibold text-sm`}
                          >
                            {item.value}
                          </span>
                        ) : (
                          <span
                            className={`font-${item.bold ? "bold" : "medium"} text-${
                              item.color === "purple" ? "purple-900" : "gray-900"
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
                        (salaryStatus[selectedTeacher.id] || "Unpaid") === "Paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {(salaryStatus[selectedTeacher.id] || "Unpaid") === "Paid" ? (
                        <FiCheckCircle className="text-green-600 h-4 w-4" />
                      ) : (
                        <FiXCircle className="text-yellow-600 h-4 w-4" />
                      )}
                      {salaryStatus[selectedTeacher.id] || "Unpaid"}
                    </span>
                  </div>
                </div>
              </div>

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