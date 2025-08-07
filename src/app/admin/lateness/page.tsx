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
  FiUser,
  FiUsers,
  FiClock,
  FiAlertCircle,
  FiX,
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

// Helper function to format dates safely
const formatDateSafely = (dateStr: string) => {
  if (!dateStr || dateStr === "Not Sent" || dateStr === "N/A") {
    return "N/A";
  }
  try {
    const datePart = dateStr.substring(0, 10);
    const timePart = dateStr.substring(11, 16);
    return `${datePart} ${timePart}`;
  } catch (e) {
    return "N/A";
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
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
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
  const [dailyTotal, setDailyTotal] = useState(0);
  const itemsPerPage = 10;

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
    setDailyPage(1);
  }, [dailyDate, dailyControllerId, dailyTeacherId]);

  // Fetch daily lateness records
  useEffect(() => {
    async function fetchDaily() {
      setDailyLoading(true);
      setDailyError(null);
      try {
        const params = new URLSearchParams({
          date: format(dailyDate, "yyyy-MM-dd"),
          page: dailyPage.toString(),
          limit: itemsPerPage.toString(),
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
  }, [dailyDate, dailyControllerId, dailyTeacherId, dailyPage]);

  // Sorting logic
  function sortData<T>(data: T[], key: string, dir: "asc" | "desc") {
    return [...data].sort((a: any, b: any) => {
      if (dir === "asc") return Number(a[key]) - Number(b[key]);
      return Number(b[key]) - Number(a[key]);
    });
  }

  // Export CSV utility
  function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;
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
  const avgLateness =
    analytics && analytics.dailyTrend.length > 0
      ? (
          analytics.dailyTrend.reduce(
            (sum: number, d: any) => sum + (Number(d["Average Lateness"]) || 0),
            0
          ) / analytics.dailyTrend.length
        ).toFixed(2)
      : 0;

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
        date: date?.from ? format(date.from, "yyyy-MM-dd") : "",
        to: date?.to ? format(date.to, "yyyy-MM-dd") : "",
        teacherId: teacherId,
      });
      const res = await fetch(`/api/admin/lateness?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch deduction detail");
      const data = await res.json();
      if (data && data.latenessData) {
        setDeductionDetail(data.latenessData);
        setDeductionDetailTotal(
          data.latenessData.reduce(
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
    if (!deductionDetail || deductionDetail.length === 0) return;
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
      formatDateSafely(
        r.scheduledTime instanceof Date
          ? r.scheduledTime.toISOString()
          : r.scheduledTime
      ),
      r.studentName,
      formatDateSafely(
        r.scheduledTime instanceof Date
          ? r.scheduledTime.toISOString()
          : r.scheduledTime
      ),
      formatDateSafely(
        r.actualStartTime instanceof Date
          ? r.actualStartTime.toISOString()
          : r.actualStartTime
      ),
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
  }

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Lateness Deduction Config Manager */}
        <div className="mb-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 animate-slide-in">
          <LatenessDeductionConfigManager />
        </div>

        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 px-6 py-4 flex items-center justify-between animate-slide-in">
          <div className="flex items-center gap-3">
            <button
              aria-label="Back to Dashboard"
              className="p-2 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-md hover:bg-indigo-200 hover:scale-105 transition-all"
              onClick={() => (window.location.href = "/admin")}
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight">
              Lateness Analytics
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              className="w-full sm:w-auto flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 hover:scale-105 transition-all"
              onClick={() => window.location.reload()}
              aria-label="Refresh page"
            >
              <FiRefreshCw className="w-5 h-5" /> Refresh
            </button>
            <button
              className="w-full sm:w-auto flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-teal-600 text-white font-semibold shadow-md hover:bg-teal-700 hover:scale-105 transition-all"
              onClick={() =>
                exportToCSV(
                  analytics?.dailyTrend || [],
                  "lateness_analytics.csv"
                )
              }
              aria-label="Export analytics to CSV"
            >
              <FiDownload className="w-5 h-5" /> Export CSV
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="sticky top-[72px] z-20 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-2xl shadow-lg px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-6 animate-slide-in">
          <div
            className="flex items-center gap-2 animate-slide-in"
            style={{ animationDelay: "50ms" }}
          >
            <FiClock className="w-5 h-5 text-indigo-500" />
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
          <div
            className="flex items-center gap-2 animate-slide-in"
            style={{ animationDelay: "100ms" }}
          >
            <FiUsers className="w-5 h-5 text-teal-500" />
            <select
              value={controllerId}
              onChange={(e) => setControllerId(e.target.value)}
              className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
              aria-label="Filter by Controller"
            >
              <option value="">All Controllers</option>
              {controllers.map((c) => (
                <option key={c.wdt_ID} value={c.wdt_ID}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 mb-8 px-4 sm:px-6">
          <div
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 flex flex-col items-center hover:shadow-xl transition-all animate-slide-in"
            style={{ animationDelay: "150ms" }}
          >
            <FiBarChart2 className="w-8 h-8 text-indigo-500 mb-2" />
            <div className="text-indigo-700 text-sm font-semibold">
              Total Events
            </div>
            <div className="text-2xl font-extrabold text-indigo-900">
              {totalEvents}
            </div>
          </div>
          <div
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 flex flex-col items-center hover:shadow-xl transition-all animate-slide-in"
            style={{ animationDelay: "200ms" }}
          >
            <FiAlertCircle className="w-8 h-8 text-teal-500 mb-2" />
            <div className="text-indigo-700 text-sm font-semibold">
              Total Deduction (ETB)
            </div>
            <div className="text-2xl font-extrabold text-indigo-900">
              {totalDeduction}
            </div>
          </div>
          <div
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 flex flex-col items-center hover:shadow-xl transition-all animate-slide-in"
            style={{ animationDelay: "250ms" }}
          >
            <FiClock className="w-8 h-8 text-yellow-500 mb-2" />
            <div className="text-indigo-700 text-sm font-semibold">
              Avg. Lateness (min)
            </div>
            <div className="text-2xl font-extrabold text-indigo-900">
              {avgLateness}
            </div>
          </div>
        </div>

        {/* Main Analytics Tables */}
        <div className="px-4 sm:px-6">
          {loading ? (
            <div className="py-16 text-center text-indigo-600 animate-pulse flex flex-col items-center gap-3">
              <FiAlertCircle className="w-8 h-8" />
              <span className="text-lg font-semibold">
                Loading analytics...
              </span>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-600 flex flex-col items-center gap-3 animate-pulse">
              <FiAlertCircle className="w-8 h-8" />
              <span className="text-lg font-semibold">{error}</span>
            </div>
          ) : analytics ? (
            <>
              {analytics &&
                analytics.dailyTrend &&
                analytics.dailyTrend.length > 0 && (
                  <div
                    className="w-full h-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 mb-8 px-6 py-4 flex flex-col animate-slide-in"
                    style={{ animationDelay: "300ms" }}
                  >
                    <h2 className="text-lg font-semibold text-indigo-900 flex items-center gap-2 mb-2">
                      <FiBarChart2 className="w-5 h-5 text-indigo-500" />{" "}
                      Lateness & Deduction Trend
                    </h2>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analytics.dailyTrend}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
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
                            borderColor: "#e0e7ff",
                          }}
                          labelStyle={{ color: "#4b5563" }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="Average Lateness"
                          stroke="#4F46E5"
                          name="Avg. Lateness (min)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="Total Deduction"
                          stroke="#EF4444"
                          name="Total Deduction (ETB)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              {/* Per Controller Table */}
              <div className="mb-10">
                <h2
                  className="text-lg font-semibold text-indigo-900 flex items-center gap-2 mb-2 animate-slide-in"
                  style={{ animationDelay: "350ms" }}
                >
                  <FiUsers className="w-5 h-5 text-teal-500" /> Per Controller
                </h2>
                <div
                  className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100 bg-white/95 backdrop-blur-md animate-slide-in"
                  style={{ animationDelay: "400ms" }}
                >
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
                          Avg. Lateness (min)
                        </th>
                        <th
                          className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider cursor-pointer"
                          onClick={() => {
                            setSortKey("Total Deduction");
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          }}
                        >
                          Total Deduction (ETB)
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                          Total Events
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-100">
                      {sortData(analytics.controllerData, sortKey, sortDir)
                        .slice((controllerPage - 1) * itemsPerPage, controllerPage * itemsPerPage)
                        .map((c: any, i: number) => (
                          <tr
                            key={c.name}
                            className={`hover:bg-indigo-50 transition-all animate-slide-in ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                            style={{ animationDelay: `${(i + 1) * 50}ms` }}
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
                        )
                      )}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setControllerPage(Math.max(1, controllerPage - 1))}
                        disabled={controllerPage === 1}
                        className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 disabled:opacity-50 text-sm"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-indigo-700">
                        Page {controllerPage} of {Math.ceil((analytics?.controllerData?.length || 0) / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setControllerPage(controllerPage + 1)}
                        disabled={controllerPage >= Math.ceil((analytics?.controllerData?.length || 0) / itemsPerPage)}
                        className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 disabled:opacity-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-md hover:bg-indigo-200 hover:scale-105 transition-all text-sm"
                      onClick={() =>
                        exportToCSV(
                          analytics.controllerData,
                          "lateness_per_controller.csv"
                        )
                      }
                      aria-label="Export controller data to CSV"
                    >
                      <FiDownload className="w-4 h-4" /> Export CSV
                    </button>
                  </div>
                </div>
              </div>
              {/* Per Teacher Table */}
              <div className="mb-10">
                <h2
                  className="text-lg font-semibold text-indigo-900 flex items-center gap-2 mb-2 animate-slide-in"
                  style={{ animationDelay: "450ms" }}
                >
                  <FiUser className="w-5 h-5 text-indigo-500" /> Per Teacher
                </h2>
                <div
                  className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100 bg-white/95 backdrop-blur-md animate-slide-in"
                  style={{ animationDelay: "500ms" }}
                >
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
                          Avg. Lateness (min)
                        </th>
                        <th
                          className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider cursor-pointer"
                          onClick={() => {
                            setSortKey("Total Deduction");
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          }}
                        >
                          Total Deduction (ETB)
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                          Total Events
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-100">
                      {sortData(analytics.teacherData, sortKey, sortDir)
                        .slice((teacherPage - 1) * itemsPerPage, teacherPage * itemsPerPage)
                        .map((t: any, i: number) => (
                          <React.Fragment key={t.name}>
                            <tr
                              className={`cursor-pointer hover:bg-indigo-50 transition-all animate-slide-in ${
                                i % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                              onClick={() => openTeacherModal(t.name, t.id)}
                              style={{ animationDelay: `${(i + 1) * 50}ms` }}
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
                                <div className="w-full max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto animate-fade-in">
                                  <button
                                    aria-label="Close modal"
                                    className="absolute top-4 right-4 text-indigo-500 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full z-10 transition-all hover:scale-105"
                                    onClick={() => {
                                      setShowModal(false);
                                      setExpandedTeacher(null);
                                      setExpandedTeacherId(null);
                                    }}
                                  >
                                    <FiX className="w-6 h-6" />
                                  </button>
                                  <div className="font-extrabold text-lg sm:text-xl md:text-2xl text-indigo-900 mb-4 sm:mb-6 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl">
                                      {getInitials(t.name)}
                                    </span>
                                    Daily Breakdown for {t.name}
                                  </div>
                                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                                    {teacherModalLoading ? (
                                      <div className="h-48 flex items-center justify-center text-indigo-600 animate-pulse">
                                        <FiAlertCircle className="w-8 h-8 mr-2" />
                                        <span className="text-lg font-semibold">
                                          Loading breakdown...
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <div
                                          className="mb-4 h-48 flex items-center justify-center bg-indigo-50 rounded-lg animate-slide-in"
                                          style={{ animationDelay: "50ms" }}
                                        >
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
                                                className={`hover:bg-indigo-50 transition-all animate-slide-in ${
                                                  j % 2 === 0
                                                    ? "bg-white"
                                                    : "bg-gray-50"
                                                }`}
                                                style={{
                                                  animationDelay: `${
                                                    (j + 1) * 50
                                                  }ms`,
                                                }}
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
                                  <div
                                    className="flex justify-end mt-4 sm:mt-6 mb-2 animate-slide-in"
                                    style={{ animationDelay: "100ms" }}
                                  >
                                    <button
                                      className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-teal-100 text-teal-800 border border-teal-200 shadow-md hover:bg-teal-200 hover:scale-105 transition-all text-sm sm:text-base"
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
                                    </button>
                                  </div>
                                  {showDeductionDetail && (
                                    <div
                                      className="max-h-[40vh] overflow-y-auto border border-indigo-100 rounded-lg mb-4 bg-white/95 animate-slide-in"
                                      style={{ animationDelay: "150ms" }}
                                    >
                                      {deductionDetailLoading ? (
                                        <div className="py-8 text-center text-indigo-600 animate-pulse flex flex-col items-center gap-3">
                                          <FiAlertCircle className="w-8 h-8" />
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
                                                  className={`hover:bg-indigo-50 transition-all animate-slide-in ${
                                                    i % 2 === 0
                                                      ? "bg-white"
                                                      : "bg-gray-50"
                                                  }`}
                                                  style={{
                                                    animationDelay: `${
                                                      (i + 1) * 50
                                                    }ms`,
                                                  }}
                                                >
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-900">
                                                    {formatDateSafely(
                                                      r.scheduledTime instanceof
                                                        Date
                                                        ? r.scheduledTime.toISOString()
                                                        : r.scheduledTime
                                                    )}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-900">
                                                    {r.studentName}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {formatDateSafely(
                                                      r.scheduledTime instanceof
                                                        Date
                                                        ? r.scheduledTime.toISOString()
                                                        : r.scheduledTime
                                                    )}
                                                  </td>
                                                  <td className="px-2 sm:px-4 py-2 text-indigo-700">
                                                    {formatDateSafely(
                                                      r.actualStartTime instanceof
                                                        Date
                                                        ? r.actualStartTime.toISOString()
                                                        : r.actualStartTime
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
                                          <div
                                            className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 border-t border-indigo-100 bg-indigo-50 animate-slide-in"
                                            style={{ animationDelay: "200ms" }}
                                          >
                                            <span className="font-semibold text-indigo-700 text-sm sm:text-base">
                                              Total Deduction:
                                            </span>
                                            <span className="font-bold text-indigo-900 text-sm sm:text-base">
                                              {deductionDetailTotal} ETB
                                            </span>
                                            <button
                                              className="mt-2 sm:mt-0 ml-0 sm:ml-4 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-md hover:bg-indigo-200 hover:scale-105 transition-all text-sm sm:text-base"
                                              onClick={
                                                exportDeductionDetailToCSV
                                              }
                                              aria-label="Export detailed deduction to CSV"
                                            >
                                              Export CSV
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Modal>
                            )}
                          </React.Fragment>
                        )
                      )}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTeacherPage(Math.max(1, teacherPage - 1))}
                        disabled={teacherPage === 1}
                        className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 disabled:opacity-50 text-sm"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-indigo-700">
                        Page {teacherPage} of {Math.ceil((analytics?.teacherData?.length || 0) / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setTeacherPage(teacherPage + 1)}
                        disabled={teacherPage >= Math.ceil((analytics?.teacherData?.length || 0) / itemsPerPage)}
                        className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 disabled:opacity-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-md hover:bg-indigo-200 hover:scale-105 transition-all text-sm"
                      onClick={() =>
                        exportToCSV(
                          analytics.teacherData,
                          "lateness_per_teacher.csv"
                        )
                      }
                      aria-label="Export teacher data to CSV"
                    >
                      <FiDownload className="w-4 h-4" /> Export CSV
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-indigo-500 flex flex-col items-center gap-3 animate-slide-in">
              <span className="text-4xl">😕</span>
              <span className="text-lg font-semibold">
                No analytics data available.
              </span>
            </div>
          )}
        </div>

        {/* Daily Lateness Management */}
        <div className="px-4 sm:px-6 mb-10">
          <h2
            className="text-lg font-semibold text-indigo-900 flex items-center gap-2 mb-4 animate-slide-in"
            style={{ animationDelay: "550ms" }}
          >
            <FiClock className="w-5 h-5 text-yellow-500" /> Daily Lateness
            Management
          </h2>
          <div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 items-center animate-slide-in"
            style={{ animationDelay: "600ms" }}
          >
            <input
              type="date"
              value={format(dailyDate, "yyyy-MM-dd")}
              onChange={(e) => setDailyDate(new Date(e.target.value))}
              className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
              aria-label="Select date for daily lateness"
            />
            <select
              value={dailyControllerId}
              onChange={(e) => setDailyControllerId(e.target.value)}
              className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
              aria-label="Filter by controller for daily lateness"
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
              className="w-full sm:w-48 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
              aria-label="Filter by teacher for daily lateness"
            >
              <option value="">All Teachers</option>
              {analytics?.teacherData.map((t: any) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {dailyLoading ? (
            <div className="text-center py-8 text-indigo-600 animate-pulse flex flex-col items-center gap-3">
              <FiAlertCircle className="w-8 h-8" />
              <span className="text-lg font-semibold">
                Loading daily lateness...
              </span>
            </div>
          ) : dailyError ? (
            <div className="text-center py-8 text-red-600 flex flex-col items-center gap-3 animate-pulse">
              <FiAlertCircle className="w-8 h-8" />
              <span className="text-lg font-semibold">{dailyError}</span>
            </div>
          ) : (
            <div
              className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100 bg-white/95 backdrop-blur-md animate-slide-in"
              style={{ animationDelay: "650ms" }}
            >
              <table className="min-w-full text-sm divide-y divide-indigo-100">
                <thead className="bg-indigo-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Controller
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Actual Start
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Minutes Late
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Deduction
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-indigo-900 uppercase tracking-wider">
                      Tier
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100">
                  {dailyRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center text-indigo-500 py-8"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-4xl">😕</span>
                          <span className="text-sm font-semibold">
                            No lateness records found.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dailyRecords.map((r: any, i: number) => (
                      <tr
                        key={r.studentId + "-" + r.classDate}
                        className={`hover:bg-indigo-50 transition-all animate-slide-in ${
                          i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                        style={{ animationDelay: `${(i + 1) * 50}ms` }}
                      >
                        <td className="px-4 py-3 text-indigo-900 font-semibold">
                          {r.studentName}
                        </td>
                        <td className="px-4 py-3 text-indigo-900">
                          {r.teacherName}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {r.controllerName || "-"}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {r.scheduledTime
                            ? formatDateSafely(
                                r.scheduledTime instanceof Date
                                  ? r.scheduledTime.toISOString()
                                  : r.scheduledTime
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {r.actualStartTime
                            ? formatDateSafely(
                                r.actualStartTime instanceof Date
                                  ? r.actualStartTime.toISOString()
                                  : r.actualStartTime
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {r.latenessMinutes}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {r.deductionApplied}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {r.deductionTier}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDailyPage(Math.max(1, dailyPage - 1))}
                    disabled={dailyPage === 1}
                    className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 disabled:opacity-50 text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-indigo-700">
                    Page {dailyPage} of {Math.ceil(dailyTotal / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setDailyPage(dailyPage + 1)}
                    disabled={dailyPage >= Math.ceil(dailyTotal / itemsPerPage)}
                    className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 disabled:opacity-50 text-sm"
                  >
                    Next
                  </button>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-md hover:bg-indigo-200 hover:scale-105 transition-all text-sm"
                  onClick={() =>
                    exportToCSV(dailyRecords, "lateness_daily_management.csv")
                  }
                  aria-label="Export daily lateness to CSV"
                >
                  <FiDownload className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="w-full text-center text-indigo-500 text-sm py-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md mt-12 animate-slide-in">
          © {new Date().getFullYear()} DarulKubra Admin Portal. All rights
          reserved.
        </footer>

        {/* Animations */}
        <style jsx>{`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.5s ease-out;
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
