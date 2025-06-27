"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Toaster, toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiCalendar,
  FiBarChart,
  FiAward,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiFileText,
} from "react-icons/fi";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";

interface AnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    overallAttendanceRate: number;
    averageAttendanceRate: number;
  };
  studentRankings: Array<{
    studentId: number;
    studentName: string;
    teacherName: string;
    totalSessions: number;
    presentSessions: number;
    absentSessions: number;
    permissionSessions: number;
    attendanceRate: number;
  }>;
  teacherPerformance: Array<{
    teacherId: string;
    teacherName: string;
    totalStudents: number;
    totalSessions: number;
    presentSessions: number;
    absentSessions: number;
    attendanceRate: number;
  }>;
  attendanceTrends: Array<{
    date: string;
    total: number;
    present: number;
    absent: number;
    permission: number;
    attendanceRate: number;
  }>;
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [period, setPeriod] = useState("monthly");

  // Quick date range presets
  const datePresets = [
    {
      label: "Last 7 Days",
      getDates: () => ({
        start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd"),
      }),
    },
    {
      label: "Last 30 Days",
      getDates: () => ({
        start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd"),
      }),
    },
    {
      label: "This Week",
      getDates: () => ({
        start: format(startOfWeek(new Date()), "yyyy-MM-dd"),
        end: format(endOfWeek(new Date()), "yyyy-MM-dd"),
      }),
    },
    {
      label: "This Month",
      getDates: () => ({
        start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      }),
    },
    {
      label: "Last Month",
      getDates: () => ({
        start: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
        end: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
      }),
    },
  ];

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        period,
      });
      const response = await fetch(`/api/analytics?${params.toString()}`, {
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch analytics");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      console.error("Analytics Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, period]);

  const handleDatePreset = (preset: (typeof datePresets)[0]) => {
    const dates = preset.getDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  const exportReport = () => {
    if (!data) return;

    const reportData = {
      period: data.period,
      summary: data.summary,
      studentRankings: data.studentRankings,
      teacherPerformance: data.teacherPerformance,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_analytics_${format(
      parseISO(startDate),
      "yyyyMMdd"
    )}_${format(parseISO(endDate), "yyyyMMdd")}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.push("/controller")}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center shadow-md transition-transform hover:scale-105"
          >
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
        <div className="text-center text-gray-500">
          No analytics data available
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => router.push("/attendance-list")}
            className="bg-green-300 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiCalendar className="mr-2" />
            Attendance List
          </button>

          <button
            onClick={() => router.push("/reports")}
            className="bg-purple-300 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiFileText className="mr-2" />
            Detailed Reports
          </button>

          <button
            onClick={() => router.push("/controller")}
            className="bg-blue-300 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiArrowLeft className="mr-2" />
            Dashboard
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-100 px-4 py-2 rounded-lg shadow-sm">
            <FiCalendar className="text-blue-400" />
            <span className="text-sm font-medium text-blue-600">
              {format(parseISO(startDate), "MMM dd")} -{" "}
              {format(parseISO(endDate), "MMM dd, yyyy")}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-indigo-500 text-xl" />
          <span className="text-lg font-semibold text-indigo-700">
            Analytics Filters
          </span>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Date Presets */}
          <div className="flex flex-wrap gap-2">
            {datePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleDatePreset(preset)}
                className="px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 bg-white text-gray-700 border-gray-300 hover:bg-indigo-100"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-800 flex items-center shadow-md transition-transform hover:scale-105"
            >
              <FiRefreshCw className="mr-2" /> Refresh
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg hover:from-green-600 hover:to-green-800 flex items-center shadow-md transition-transform hover:scale-105"
            >
              <FiDownload className="mr-2" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">
                Total Students
              </p>
              <p className="text-3xl font-bold text-blue-800">
                {data.summary.totalStudents}
              </p>
            </div>
            <FiUsers className="text-4xl text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">
                Overall Attendance
              </p>
              <p className="text-3xl font-bold text-green-800">
                {data.summary.overallAttendanceRate}%
              </p>
            </div>
            <FiTrendingUp className="text-4xl text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">
                Total Sessions
              </p>
              <p className="text-3xl font-bold text-purple-800">
                {data.summary.totalSessions}
              </p>
            </div>
            <FiBarChart className="text-4xl text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">
                Avg. Student Rate
              </p>
              <p className="text-3xl font-bold text-orange-800">
                {data.summary.averageAttendanceRate}%
              </p>
            </div>
            <FiAward className="text-4xl text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts and Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Student Rankings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiAward className="mr-2 text-yellow-500" />
            Top Student Rankings
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.studentRankings.map((student, index) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-800"
                        : index === 1
                        ? "bg-gray-100 text-gray-800"
                        : index === 2
                        ? "bg-orange-100 text-orange-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {student.studentName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {student.teacherName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {student.attendanceRate}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {student.presentSessions}/{student.totalSessions} sessions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Performance */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiUsers className="mr-2 text-blue-500" />
            Teacher Performance
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.teacherPerformance.map((teacher, index) => (
              <div
                key={teacher.teacherId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-800"
                        : index === 1
                        ? "bg-gray-100 text-gray-800"
                        : index === 2
                        ? "bg-orange-100 text-orange-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {teacher.teacherName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {teacher.totalStudents} students
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {teacher.attendanceRate}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {teacher.presentSessions}/{teacher.totalSessions} sessions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Trends Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiTrendingUp className="mr-2 text-green-500" />
            Attendance Trends
          </h3>
          <div className="h-64 flex items-end justify-between gap-1">
            {data.attendanceTrends.slice(-14).map((trend, index) => (
              <div
                key={trend.date}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className="w-full bg-gray-200 rounded-t"
                  style={{ height: `${trend.attendanceRate}%` }}
                >
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${trend.attendanceRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                  {format(parseISO(trend.date), "MM/dd")}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Last 14 days attendance rate trend
          </div>
        </div>
      </div>
    </div>
  );
}
