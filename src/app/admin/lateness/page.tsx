"use client";

import React, { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { useSession } from "next-auth/react";
import { DatePickerWithRange } from "../attendance/components/DateRangePicker";
import Modal from "@/app/components/Modal";
import {
  FiBarChart2,
  FiRefreshCw,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiUsers,
  FiClock,
  FiAlertCircle,
  FiX,
  FiSearch,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import LatenessDeductionConfigManager from "./LatenessDeductionConfigManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

// Helper function to format dates safely
const formatLocalDateTime = (value: unknown) => {
  if (!value) return "-";
  try {
    const d = value instanceof Date ? value : new Date(value as any);
    if (isNaN(d.getTime())) return "-";
    // yyyy-MM-dd HH:mm local
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return "-";
  }
};

function getInitials(name: string | null | undefined) {
  if (!name) return "N/A";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function AdminLatenessAnalyticsPage() {
  const { data: session } = useSession();
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      from: startOfMonth,
      to: today,
    };
  });
  const [controllerId, setControllerId] = useState("");
  const [controllers, setControllers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [teacherDaily, setTeacherDaily] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dailyDate, setDailyDate] = useState(new Date());
  const [dailyControllerId, setDailyControllerId] = useState("");
  const [dailyTeacherId, setDailyTeacherId] = useState("");
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("Total Deduction");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [teacherModalLoading, setTeacherModalLoading] = useState(false);
  const [showDeductionDetail, setShowDeductionDetail] = useState(false);
  const [deductionDetailLoading, setDeductionDetailLoading] = useState(false);
  const [deductionDetail, setDeductionDetail] = useState<any[]>([]);
  const [deductionDetailTotal, setDeductionDetailTotal] = useState(0);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(
    null
  );

  // Pagination states
  const [controllerPage, setControllerPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const [controllerPageSize, setControllerPageSize] = useState(10);
  const [teacherPageSize, setTeacherPageSize] = useState(10);
  const [dailyPageSize, setDailyPageSize] = useState(10);
  const [dailyTotal, setDailyTotal] = useState(0);

  // Search states
  const [controllerSearch, setControllerSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  // Fetch controllers for filter
  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const res = await fetch("/api/control-options", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch controllers");
        const data = await res.json();
        setControllers(data.controllers || []);
      } catch (err) {
        setControllers([]);
      }
    };
    fetchControllers();
  }, []);

  // Fetch analytics
  useEffect(() => {
    if (!date?.from || !date?.to) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: format(date.from, "yyyy-MM-dd"),
      to: format(date.to, "yyyy-MM-dd"),
    });
    if (controllerId) params.append("controllerId", controllerId);
    fetch(`/api/admin/lateness/analytics?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch lateness analytics");
        return res.json();
      })
      .then((data) => setAnalytics(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [date, controllerId]);

  // Reset pagination when filters change
  useEffect(() => {
    setControllerPage(1);
    setTeacherPage(1);
    setDailyPage(1);
  }, [
    date,
    controllerId,
    controllerSearch,
    teacherSearch,
    dailyDate,
    dailyControllerId,
    dailyTeacherId,
  ]);

  // Fetch daily lateness records
  useEffect(() => {
    async function fetchDaily() {
      setDailyLoading(true);
      setDailyError(null);
      try {
        const params = new URLSearchParams({
          date: format(dailyDate, "yyyy-MM-dd"),
          page: dailyPage.toString(),
          limit: dailyPageSize.toString(),
        });
        if (dailyControllerId) params.append("controllerId", dailyControllerId);
        if (dailyTeacherId) params.append("teacherId", dailyTeacherId);
        const res = await fetch(`/api/admin/lateness?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch daily lateness records");
        const data = await res.json();
        setDailyRecords(data.latenessData || []);
        setDailyTotal(data.total || 0);
      } catch (e: any) {
        setDailyError(e.message);
      } finally {
        setDailyLoading(false);
      }
    }
    fetchDaily();
  }, [dailyDate, dailyControllerId, dailyTeacherId, dailyPage, dailyPageSize]);

  // Sorting logic
  function sortData<T>(data: T[], key: string, dir: "asc" | "desc") {
    return [...data].sort((a: any, b: any) => {
      if (dir === "asc") return Number(a[key]) - Number(b[key]);
      return Number(b[key]) - Number(a[key]);
    });
  }

  // Filter data by search term
  const filterData = <T extends { name: string }>(
    data: T[],
    search: string
  ) => {
    if (!search) return data;
    return data.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Export CSV utility with toast
  function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export.",
        variant: "destructive",
      });
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => row[h]));
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: `Exported ${filename} successfully.`,
    });
  }

  // Summary stats
  const totalEvents =
    analytics?.dailyTrend.reduce(
      (sum: number, d: any) => sum + (Number(d.Total) || 0),
      0
    ) || 0;
  const totalDeduction =
    analytics?.dailyTrend.reduce(
      (sum: number, d: any) => sum + (Number(d["Total Deduction"]) || 0),
      0
    ) || 0;
  const avgLateness = (() => {
    const arr = Array.isArray(analytics?.dailyTrend)
      ? analytics.dailyTrend
      : [];
    if (arr.length === 0) return "0.00";
    const total = arr.reduce(
      (sum: number, d: any) => sum + (Number(d["Average Lateness"]) || 0),
      0
    );
    const avg = total / arr.length;
    return Number.isFinite(avg) ? avg.toFixed(2) : "0.00";
  })();

  // Open teacher modal and fetch breakdown
  const openTeacherModal = async (teacherName: string, teacherId: string) => {
    setExpandedTeacher(teacherName);
    setExpandedTeacherId(teacherId);
    setShowModal(true);
    setTeacherModalLoading(true);
    setTeacherDaily([]);
    try {
      const params = new URLSearchParams({
        from: date?.from ? format(date.from, "yyyy-MM-dd") : "",
        to: date?.to ? format(date.to, "yyyy-MM-dd") : "",
        teacherId: teacherId,
      });
      const res = await fetch(
        `/api/admin/lateness/analytics?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch lateness analytics");
      const data = await res.json();
      if (data && data.dailyTrend) {
        const daily = data.dailyTrend.map((d: any) => ({
          ...d,
          teacher: teacherName,
        }));
        setTeacherDaily(daily);
      }
    } catch (err) {
      setTeacherDaily([]);
    } finally {
      setTeacherModalLoading(false);
    }
  };

  // Fetch detailed deduction for teacher and date range
  const fetchDeductionDetail = async (teacherId: string) => {
    setDeductionDetailLoading(true);
    setDeductionDetail([]);
    setDeductionDetailTotal(0);
    try {
      const params = new URLSearchParams({
        from: date?.from ? format(date.from, "yyyy-MM-dd") : "",
        to: date?.to ? format(date.to, "yyyy-MM-dd") : "",
        teacherId: teacherId,
      });
      const res = await fetch(
        `/api/admin/teacher-payments?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch deduction detail");
      const data = await res.json();
      const records = data?.latenessRecords || [];
      if (Array.isArray(records)) {
        setDeductionDetail(records);
        setDeductionDetailTotal(
          records.reduce(
            (sum: number, r: any) => sum + (Number(r.deductionApplied) || 0),
            0
          )
        );
      }
    } catch (err) {
      setDeductionDetail([]);
      setDeductionDetailTotal(0);
    } finally {
      setDeductionDetailLoading(false);
    }
  };

  // Export deduction detail to CSV
  function exportDeductionDetailToCSV() {
    if (!deductionDetail || deductionDetail.length === 0) {
      toast({
        title: "No Data",
        description: "No detailed deduction data available to export.",
        variant: "destructive",
      });
      return;
    }
    const headers = [
      "Date",
      "Student",
      "Scheduled",
      "Actual Start",
      "Minutes Late",
      "Deduction",
      "Tier",
    ];
    const rows = deductionDetail.map((r) => [
      formatLocalDateTime(r.scheduledTime),
      r.studentName,
      formatLocalDateTime(r.scheduledTime),
      formatLocalDateTime(r.actualStartTime),
      r.latenessMinutes,
      r.deductionApplied,
      r.deductionTier,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "detailed_deduction.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "Exported detailed_deduction.csv successfully.",
    });
  }

  // Skeleton Loader Component
  const SkeletonLoader = ({ rows = 5 }: { rows?: number }) => (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );

  // Filtered data
  const filteredControllerData = filterData(
    analytics?.controllerData || [],
    controllerSearch
  );
  const filteredTeacherData = filterData(
    analytics?.teacherData || [],
    teacherSearch
  );

  // UI
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiBarChart2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Lateness Analytics
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Track and analyze teacher lateness patterns and deductions
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 sticky top-4 z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiClock className="inline h-4 w-4 mr-2" />
                  Date Range
                </label>
                <DatePickerWithRange date={date} setDate={setDate} />
              </div>
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiUsers className="inline h-4 w-4 mr-2" />
                  Filter by Controller
                </label>
                <select
                  value={controllerId}
                  onChange={(e) => setControllerId(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="">All Controllers</option>
                  {controllers.map((c) => (
                    <option key={c.wdt_ID} value={c.wdt_ID}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-4 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    onClick={() =>
                      exportToCSV(
                        analytics?.dailyTrend || [],
                        "lateness_analytics.csv"
                      )
                    }
                    className="flex-1 bg-black hover:bg-gray-800 text-white px-4 py-4 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiDownload className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lateness Deduction Config Manager */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <LatenessDeductionConfigManager />
        </div>

        {/* Main Analytics */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
            <p className="text-black font-medium text-lg">
              Loading analytics...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Please wait while we fetch the data
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-12 text-center">
            <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
              <FiAlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-4">
              Error Loading Analytics
            </h3>
            <p className="text-red-600 text-xl">{error}</p>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Debug Info */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Debug Info</h3>
              <div className="text-xs text-blue-700 space-y-2">
                <p>Daily Trend Records: {analytics.dailyTrend?.length || 0}</p>
                <p>Controller Records: {analytics.controllerData?.length || 0}</p>
                <p>Teacher Records: {analytics.teacherData?.length || 0}</p>
                <p>Date Range: {date?.from ? format(date.from, "yyyy-MM-dd") : "N/A"} to {date?.to ? format(date.to, "yyyy-MM-dd") : "N/A"}</p>
                
                {/* Sample Daily Trend Data */}
                {analytics.dailyTrend?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Sample Daily Trend:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(analytics.dailyTrend[0], null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Sample Controller Data */}
                {analytics.controllerData?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Sample Controller:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(analytics.controllerData[0], null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Sample Teacher Data */}
                {analytics.teacherData?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Sample Teacher:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(analytics.teacherData[0], null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Summary Stats Debug */}
                <div className="mt-2">
                  <p className="font-semibold">Calculated Stats:</p>
                  <p>Total Events: {totalEvents}</p>
                  <p>Total Deduction: {totalDeduction}</p>
                  <p>Avg Lateness: {avgLateness}</p>
                </div>
                
                {/* Daily Records Debug */}
                <div className="mt-2">
                  <p className="font-semibold">Daily Records Sample ({dailyRecords.length} total):</p>
                  {dailyRecords.length > 0 ? (
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(dailyRecords.slice(0, 2), null, 2)}
                    </pre>
                  ) : (
                    <p className="text-red-600">No daily records found for {format(dailyDate, "yyyy-MM-dd")}</p>
                  )}
                  
                  {/* Lateness Summary */}
                  {dailyRecords.length > 0 && (
                    <div className="mt-2 text-xs">
                      <p className="font-semibold">Lateness Summary:</p>
                      <p>Records with lateness > 0: {dailyRecords.filter(r => r.latenessMinutes > 0).length}</p>
                      <p>Records with deduction > 0: {dailyRecords.filter(r => r.deductionApplied > 0).length}</p>
                      <p>Max lateness: {Math.max(...dailyRecords.map(r => r.latenessMinutes))} min</p>
                      <p>Total deductions: {dailyRecords.reduce((sum, r) => sum + r.deductionApplied, 0)} ETB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {analytics.dailyTrend && analytics.dailyTrend.length > 0 && (
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black rounded-xl">
                      <FiBarChart2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-black">
                        Lateness & Deduction Trend
                      </h2>
                      <p className="text-gray-600">Daily analytics overview</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8 lg:p-10">
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analytics.dailyTrend}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#4b5563" />
                        <YAxis
                          yAxisId="left"
                          label={{
                            value: "Lateness (min)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#4b5563",
                          }}
                          stroke="#4b5563"
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          label={{
                            value: "Deduction (ETB)",
                            angle: 90,
                            position: "insideRight",
                            fill: "#4b5563",
                          }}
                          stroke="#4b5563"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e5e7eb",
                          }}
                          labelStyle={{ color: "#4b5563" }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="Average Lateness"
                          stroke="#000000"
                          name="Avg. Lateness (min)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="Total Deduction"
                          stroke="#6b7280"
                          name="Total Deduction (ETB)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            {/* Per Controller Table */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black rounded-xl">
                      <FiUsers className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-black">
                        Per Controller
                      </h2>
                      <p className="text-gray-600">
                        Lateness analytics by controller
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search controllers..."
                        value={controllerSearch}
                        onChange={(e) => setControllerSearch(e.target.value)}
                        className="pl-10 w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-sm"
                      />
                    </div>
                    <select
                      value={controllerPageSize}
                      onChange={(e) =>
                        setControllerPageSize(Number(e.target.value))
                      }
                      className="px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    >
                      {[5, 10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size} per page
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100 bg-white/95 backdrop-blur-md">
                <table className="min-w-full text-sm divide-y divide-indigo-100">
                  <thead className="bg-indigo-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                        Controller
                      </th>
                      <th
                        className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider cursor-pointer"
                        onClick={() => {
                          setSortKey("Average Lateness");
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        }}
                      >
                        Avg. Lateness (min){" "}
                        {sortKey === "Average Lateness" &&
                          (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider cursor-pointer"
                        onClick={() => {
                          setSortKey("Total Deduction");
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        }}
                      >
                        Total Deduction (ETB){" "}
                        {sortKey === "Total Deduction" &&
                          (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                        Total Events
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-8">
                          <SkeletonLoader rows={controllerPageSize} />
                        </td>
                      </tr>
                    ) : filteredControllerData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-indigo-500 py-8"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-4xl">😕</span>
                            <span className="text-sm font-semibold">
                              No controllers found.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortData(filteredControllerData, sortKey, sortDir)
                        .slice(
                          (controllerPage - 1) * controllerPageSize,
                          controllerPage * controllerPageSize
                        )
                        .map((c: any, i: number) => (
                          <tr
                            key={c.name}
                            className={`hover:bg-indigo-50 transition-all ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="px-4 py-3 flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold">
                                {getInitials(c.name)}
                              </span>
                              <span className="text-indigo-900 font-semibold">
                                {c.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-indigo-700">
                              {c["Average Lateness"]}
                            </td>
                            <td className="px-4 py-3 text-indigo-700">
                              {c["Total Deduction"]}
                            </td>
                            <td className="px-4 py-3 text-indigo-700">
                              {c["Total Events"]}
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
                      onClick={() => setControllerPage(1)}
                      disabled={controllerPage === 1}
                      className="border-indigo-200 text-indigo-800"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setControllerPage(Math.max(1, controllerPage - 1))
                      }
                      disabled={controllerPage === 1}
                      className="border-indigo-200 text-indigo-800"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-indigo-700">
                      Page {controllerPage} of{" "}
                      {Math.ceil(
                        filteredControllerData.length / controllerPageSize
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setControllerPage(controllerPage + 1)}
                      disabled={
                        controllerPage >=
                        Math.ceil(
                          filteredControllerData.length / controllerPageSize
                        )
                      }
                      className="border-indigo-200 text-indigo-800"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setControllerPage(
                          Math.ceil(
                            filteredControllerData.length / controllerPageSize
                          )
                        )
                      }
                      disabled={
                        controllerPage >=
                        Math.ceil(
                          filteredControllerData.length / controllerPageSize
                        )
                      }
                      className="border-indigo-200 text-indigo-800"
                    >
                      Last
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCSV(
                        filteredControllerData,
                        "lateness_per_controller.csv"
                      )
                    }
                    className="border-indigo-200 text-indigo-800"
                  >
                    <FiDownload className="mr-2 w-4 h-4" /> Export All
                  </Button>
                </div>
              </div>
            </div>
            {/* Per Teacher Table */}
            <div className="mb-10">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <h2 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-indigo-500" /> Per Teacher
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search teachers..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64 border-indigo-200 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <select
                    value={teacherPageSize}
                    onChange={(e) => setTeacherPageSize(Number(e.target.value))}
                    className="px-4 py-2 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size} per page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100 bg-white/95 backdrop-blur-md">
                <table className="min-w-full text-sm divide-y divide-indigo-100">
                  <thead className="bg-indigo-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th
                        className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider cursor-pointer"
                        onClick={() => {
                          setSortKey("Average Lateness");
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        }}
                      >
                        Avg. Lateness (min){" "}
                        {sortKey === "Average Lateness" &&
                          (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider cursor-pointer"
                        onClick={() => {
                          setSortKey("Total Deduction");
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        }}
                      >
                        Total Deduction (ETB){" "}
                        {sortKey === "Total Deduction" &&
                          (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                        Total Events
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-8">
                          <SkeletonLoader rows={teacherPageSize} />
                        </td>
                      </tr>
                    ) : filteredTeacherData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-indigo-500 py-8"
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
                      sortData(filteredTeacherData, sortKey, sortDir)
                        .slice(
                          (teacherPage - 1) * teacherPageSize,
                          teacherPage * teacherPageSize
                        )
                        .map((t: any, i: number) => (
                          <React.Fragment key={t.name}>
                            <tr
                              className={`cursor-pointer hover:bg-indigo-50 transition-all ${
                                i % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                              onClick={() => openTeacherModal(t.name, t.id)}
                            >
                              <td className="px-4 py-3 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                                  {getInitials(t.name)}
                                </span>
                                <span className="text-indigo-900 font-semibold">
                                  {t.name}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-indigo-700">
                                {t["Average Lateness"]}
                              </td>
                              <td className="px-4 py-3 text-indigo-700">
                                {t["Total Deduction"]}
                              </td>
                              <td className="px-4 py-3 text-indigo-700">
                                {t["Total Events"]}
                              </td>
                            </tr>
                            {/* Modal for teacher breakdown */}
                            {expandedTeacher === t.name && showModal && (
                              <Modal
                                isOpen={showModal}
                                onClose={() => {
                                  setShowModal(false);
                                  setExpandedTeacher(null);
                                  setExpandedTeacherId(null);
                                }}
                              >
                                <div className="w-full max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 text-indigo-500 hover:text-indigo-700"
                                    onClick={() => {
                                      setShowModal(false);
                                      setExpandedTeacher(null);
                                      setExpandedTeacherId(null);
                                    }}
                                    aria-label="Close modal"
                                  >
                                    <FiX className="w-6 h-6" />
                                  </Button>
                                  <div className="font-extrabold text-lg sm:text-xl md:text-2xl text-indigo-900 mb-4 sm:mb-6 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl">
                                      {getInitials(t.name)}
                                    </span>
                                    Daily Breakdown for {t.name}
                                  </div>
                                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                                    {teacherModalLoading ? (
                                      <div className="h-48 flex items-center justify-center text-indigo-600">
                                        <FiAlertCircle className="w-8 h-8 animate-pulse mr-2" />
                                        <span className="text-lg font-semibold">
                                          Loading breakdown...
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="mb-4 h-48 flex items-center justify-center bg-indigo-50 rounded-lg">
                                          <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                          >
                                            <BarChart
                                              data={teacherDaily}
                                              margin={{
                                                top: 10,
                                                right: 30,
                                                left: 0,
                                                bottom: 0,
                                              }}
                                            >
                                              <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#e0e7ff"
                                              />
                                              <XAxis
                                                dataKey="date"
                                                stroke="#4b5563"
                                              />
                                              <YAxis
                                                yAxisId="left"
                                                label={{
                                                  value: "Lateness (min)",
                                                  angle: -90,
                                                  position: "insideLeft",
                                                  fill: "#4b5563",
                                                }}
                                                stroke="#4b5563"
                                              />
                                              <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                label={{
                                                  value: "Deduction (ETB)",
                                                  angle: 90,
                                                  position: "insideRight",
                                                  fill: "#4b5563",
                                                }}
                                                stroke="#4b5563"
                                              />
                                              <Tooltip
                                                contentStyle={{
                                                  backgroundColor: "#ffffff",
                                                  borderColor: "#e0e7ff",
                                                }}
                                                labelStyle={{
                                                  color: "#4b5563",
                                                }}
                                              />
                                              <Legend />
                                              <Bar
                                                yAxisId="left"
                                                dataKey="Average Lateness"
                                                fill="#4F46E5"
                                                name="Avg. Lateness (min)"
                                              />
                                              <Bar
                                                yAxisId="right"
                                                dataKey="Total Deduction"
                                                fill="#EF4444"
                                                name="Total Deduction (ETB)"
                                              />
                                            </BarChart>
                                          </ResponsiveContainer>
                                        </div>
                                        <table className="min-w-full bg-white/95 border border-indigo-100 rounded-lg overflow-hidden text-xs sm:text-sm divide-y divide-indigo-100">
                                          <thead className="bg-indigo-50">
                                            <tr>
                                              <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                Date
                                              </th>
                                              <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                Avg. Lateness
                                              </th>
                                              <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                Total Deduction
                                              </th>
                                              <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                Present
                                              </th>
                                              <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                Absent
                                              </th>
                                              <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                Total
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-indigo-100">
                                            {teacherDaily.map((d, j) => (
                                              <tr
                                                key={d.date}
                                                className={`hover:bg-indigo-50 transition-all ${
                                                  j % 2 === 0
                                                    ? "bg-white"
                                                    : "bg-gray-50"
                                                }`}
                                              >
                                                <td className="px-2 sm:px-4 py-2 text-indigo-900">
                                                  {d.date}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                  {d["Average Lateness"]}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                  {d["Total Deduction"]}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                  {d.Present}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                  {d.Absent}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                  {d.Total}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex justify-end mt-4 sm:mt-6 mb-2">
                                    <Button
                                      variant="outline"
                                      className="border-teal-200 text-teal-800 hover:bg-teal-100"
                                      onClick={() => {
                                        if (
                                          !showDeductionDetail &&
                                          expandedTeacherId
                                        )
                                          fetchDeductionDetail(
                                            expandedTeacherId
                                          );
                                        setShowDeductionDetail((v) => !v);
                                      }}
                                      aria-label={
                                        showDeductionDetail
                                          ? "Hide detailed deduction"
                                          : "Show detailed deduction"
                                      }
                                    >
                                      {showDeductionDetail
                                        ? "Hide Detailed Deduction"
                                        : "Show Detailed Deduction"}
                                    </Button>
                                  </div>
                                  {showDeductionDetail && (
                                    <div className="max-h-[40vh] overflow-y-auto border border-indigo-100 rounded-lg mb-4 bg-white/95">
                                      {deductionDetailLoading ? (
                                        <div className="py-8 text-center text-indigo-600 flex flex-col items-center gap-3">
                                          <FiAlertCircle className="w-8 h-8 animate-pulse" />
                                          <span className="text-lg font-semibold">
                                            Loading detailed deduction...
                                          </span>
                                        </div>
                                      ) : deductionDetail.length === 0 ? (
                                        <div className="py-8 text-center text-indigo-500 flex flex-col items-center gap-3">
                                          <span className="text-4xl">😕</span>
                                          <span className="text-sm font-semibold">
                                            No lateness events found for this
                                            period.
                                          </span>
                                        </div>
                                      ) : (
                                        <>
                                          <table className="min-w-full text-xs sm:text-sm divide-y divide-indigo-100">
                                            <thead className="bg-indigo-50">
                                              <tr>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Date
                                                </th>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Student
                                                </th>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Scheduled
                                                </th>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Actual Start
                                                </th>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Minutes Late
                                                </th>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Deduction
                                                </th>
                                                <th className="px-2 sm:px-4 py-2 font-bold text-indigo-900 uppercase">
                                                  Tier
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-indigo-100">
                                              {deductionDetail.map((r, i) => (
                                                <tr
                                                  key={
                                                    r.studentId +
                                                    "-" +
                                                    r.scheduledTime +
                                                    "-" +
                                                    i
                                                  }
                                                  className={`hover:bg-indigo-50 transition-all ${
                                                    i % 2 === 0
                                                      ? "bg-white"
                                                      : "bg-gray-50"
                                                  }`}
                                                >
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-900">
                                                    {formatLocalDateTime(
                                                      r.scheduledTime
                                                    )}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-900">
                                                    {r.studentName}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {formatLocalDateTime(
                                                      r.scheduledTime
                                                    )}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {formatLocalDateTime(
                                                      r.actualStartTime
                                                    )}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {r.latenessMinutes}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {r.deductionApplied}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {r.deductionTier}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 border-t border-indigo-100 bg-indigo-50">
                                            <span className="font-semibold text-indigo-700 text-sm sm:text-base">
                                              Total Deduction:
                                            </span>
                                            <span className="font-bold text-indigo-900 text-sm sm:text-base">
                                              {deductionDetailTotal} ETB
                                            </span>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={
                                                exportDeductionDetailToCSV
                                              }
                                              className="mt-2 sm:mt-0 border-indigo-200 text-indigo-800"
                                            >
                                              Export CSV
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Modal>
                            )}
                          </React.Fragment>
                        ))
                    )}
                  </tbody>
                </table>
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTeacherPage(1)}
                      disabled={teacherPage === 1}
                      className="border-indigo-200 text-indigo-800"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTeacherPage(Math.max(1, teacherPage - 1))
                      }
                      disabled={teacherPage === 1}
                      className="border-indigo-200 text-indigo-800"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-indigo-700">
                      Page {teacherPage} of{" "}
                      {Math.ceil(filteredTeacherData.length / teacherPageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTeacherPage(teacherPage + 1)}
                      disabled={
                        teacherPage >=
                        Math.ceil(filteredTeacherData.length / teacherPageSize)
                      }
                      className="border-indigo-200 text-indigo-800"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTeacherPage(
                          Math.ceil(
                            filteredTeacherData.length / teacherPageSize
                          )
                        )
                      }
                      disabled={
                        teacherPage >=
                        Math.ceil(filteredTeacherData.length / teacherPageSize)
                      }
                      className="border-indigo-200 text-indigo-800"
                    >
                      Last
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCSV(
                        filteredTeacherData,
                        "lateness_per_teacher.csv"
                      )
                    }
                    className="border-indigo-200 text-indigo-800"
                  >
                    <FiDownload className="mr-2 w-4 h-4" /> Export All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-12 text-center">
            <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
              <FiAlertCircle className="h-16 w-16 text-gray-500" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-4">
              No Analytics Data
            </h3>
            <p className="text-gray-600 text-xl">
              No analytics data available for the selected period.
            </p>
          </div>
        )}

        {/* Daily Lateness Management */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiClock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Daily Lateness Management
                  </h2>
                  <p className="text-gray-600">Track daily lateness records</p>
                </div>
              </div>
              <select
                value={dailyPageSize}
                onChange={(e) => setDailyPageSize(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black text-sm"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
              <input
                type="date"
                value={format(dailyDate, "yyyy-MM-dd")}
                onChange={(e) => setDailyDate(new Date(e.target.value))}
                className="w-full sm:w-48 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black text-base"
              />
              <select
                value={dailyControllerId}
                onChange={(e) => setDailyControllerId(e.target.value)}
                className="w-full sm:w-48 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black text-base"
              >
                <option value="">All Controllers</option>
                {controllers.map((c) => (
                  <option key={c.wdt_ID} value={c.wdt_ID}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={dailyTeacherId}
                onChange={(e) => setDailyTeacherId(e.target.value)}
                className="w-full sm:w-48 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black text-base"
              >
                <option value="">All Teachers</option>
                {filteredTeacherData.map((t: any) => (
                  <option key={t.id ?? t.name} value={t.id ?? t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {dailyLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
                <p className="text-black font-medium text-lg">
                  Loading daily lateness...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Please wait while we fetch the data
                </p>
              </div>
            ) : dailyError ? (
              <div className="text-center py-12">
                <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
                  <FiAlertCircle className="h-16 w-16 text-red-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">
                  Error Loading Records
                </h3>
                <p className="text-red-600 text-xl">{dailyError}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Controller
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Scheduled
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Actual Start
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Minutes Late
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Deduction
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Tier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-20">
                          <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                            <FiClock className="h-16 w-16 text-gray-500" />
                          </div>
                          <h3 className="text-3xl font-bold text-black mb-4">
                            No Records Found
                          </h3>
                          <p className="text-gray-600 text-xl">
                            No lateness records found for the selected date.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      dailyRecords.map((r: any, i: number) => (
                        <tr
                          key={r.studentId + "-" + r.scheduledTime}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-6 py-4 text-black font-semibold">
                            {r.studentName}
                          </td>
                          <td className="px-6 py-4 text-black">
                            {r.teacherName}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {r.controllerName || "-"}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {formatLocalDateTime(r.scheduledTime)}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {formatLocalDateTime(r.actualStartTime)}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {r.latenessMinutes}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {r.deductionApplied}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {r.deductionTier}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="flex justify-between items-center p-6 border-t border-gray-200">
                  <p className="text-lg font-semibold text-gray-700">
                    Page {dailyPage} of {Math.ceil(dailyTotal / dailyPageSize)}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setDailyPage(Math.max(1, dailyPage - 1))}
                      disabled={dailyPage === 1}
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => setDailyPage(dailyPage + 1)}
                      disabled={
                        dailyPage >= Math.ceil(dailyTotal / dailyPageSize)
                      }
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronRight className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() =>
                        exportToCSV(
                          dailyRecords,
                          "lateness_daily_management.csv"
                        )
                      }
                      className="bg-black hover:bg-gray-800 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <FiDownload className="h-4 w-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center text-indigo-500 text-sm py-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md mt-12">
          © {new Date().getFullYear()} DarulKubra Admin Portal. All rights
          reserved.
        </footer>
      </div>
    </div>
  );
}
