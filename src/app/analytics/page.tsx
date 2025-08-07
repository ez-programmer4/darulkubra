"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [period, setPeriod] = useState("monthly");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherDetails, setTeacherDetails] = useState<any>(null);
  const [loadingTeacherDetails, setLoadingTeacherDetails] = useState(false);

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

  const exportStudentReport = (studentId: number) => {
    if (!studentDetails || !selectedStudent) return;

    const reportData = {
      student: {
        id: studentId,
        name: selectedStudent.studentName,
        teacher: selectedStudent.teacherName,
        attendanceRate: selectedStudent.attendanceRate,
        totalSessions: selectedStudent.totalSessions,
      },
      period: {
        startDate,
        endDate,
      },
      details: studentDetails,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student_report_${selectedStudent.studentName.replace(
      /\s+/g,
      "_"
    )}_${format(parseISO(startDate), "yyyyMMdd")}_${format(
      parseISO(endDate),
      "yyyyMMdd"
    )}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const fetchStudentDetails = async (studentId: number) => {
    setLoadingStudentDetails(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await fetch(
        `/api/students/${studentId}/details?${params.toString()}`,
        {
          credentials: "include",
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch student details");
      }

      setStudentDetails(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load student details"
      );
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  const fetchTeacherDetails = async (teacherId: string) => {
    setLoadingTeacherDetails(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await fetch(
        `/api/teachers/${teacherId}/details?${params.toString()}`,
        {
          credentials: "include",
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch teacher details");
      }

      setTeacherDetails(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load teacher details"
      );
    } finally {
      setLoadingTeacherDetails(false);
    }
  };

  const generateStudentCSV = (studentData: any) => {
    const headers = [
      "Date",
      "Status",
      "Time Difference",
      "Link Sent",
      "Link Clicked",
    ];
    const rows = studentData.attendanceRecords.map((record: any) => [
      format(parseISO(record.date), "yyyy-MM-dd"),
      record.attendance_status,
      record.time_difference || "N/A",
      record.link_sent ? "Yes" : "No",
      record.link_clicked ? "Yes" : "No",
    ]);
    return [headers, ...rows]
      .map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");
  };

  const generateTeacherCSV = (teacherData: any) => {
    const headers = [
      "Student Name",
      "Total Sessions",
      "Present Sessions",
      "Absent Sessions",
      "Permission Sessions",
      "Attendance Rate (%)",
      "Links Sent",
      "Links Clicked",
      "Status",
    ];
    const rows = teacherData.studentPerformance.map((student: any) => [
      student.studentName,
      student.totalSessions,
      student.presentSessions,
      student.absentSessions,
      student.permissionSessions,
      student.attendanceRate,
      student.linksSent,
      student.linksClicked,
      student.isAtRisk ? "At Risk" : "Good",
    ]);
    return [headers, ...rows]
      .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Unauthorized</div>;
  const user = session?.user;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-2 sm:p-6 bg-white min-h-screen">
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
      <div className="max-w-7xl mx-auto p-2 sm:p-6 bg-white min-h-screen">
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
      <div className="max-w-7xl mx-auto p-2 sm:p-6 bg-white min-h-screen">
        <div className="text-center text-gray-500">
          No analytics data available
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-6 bg-white min-h-screen">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-8">
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
      <div className="mb-8 p-2 sm:p-4 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6 mb-8">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Student Rankings */}
        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiAward className="mr-2 text-yellow-500" />
            Top Student Rankings
          </h3>

          {/* Needs Attention Section */}
          {data.studentRankings.filter((student) => student.attendanceRate < 80)
            .length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                ⚠️ Students Needing Attention
              </h4>
              <div className="space-y-1">
                {data.studentRankings
                  .filter((student) => student.attendanceRate < 80)
                  .slice(0, 3)
                  .map((student) => (
                    <div
                      key={student.studentId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-red-700">
                        {student.studentName}
                      </span>
                      <span className="text-red-600 font-medium">
                        {student.attendanceRate}%
                      </span>
                    </div>
                  ))}
                {data.studentRankings.filter(
                  (student) => student.attendanceRate < 80
                ).length > 3 && (
                  <p className="text-xs text-red-600">
                    +
                    {data.studentRankings.filter(
                      (student) => student.attendanceRate < 80
                    ).length - 3}{" "}
                    more students below 80%
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.studentRankings.map((student, index) => {
              const isAtRisk = student.attendanceRate < 80;
              return (
                <div
                  key={student.studentId}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${
                    isAtRisk ? "bg-red-50 border border-red-200" : "bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedStudent(student);
                    setIsStudentModalOpen(true);
                    fetchStudentDetails(student.studentId);
                  }}
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
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-800">
                          {student.studentName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {student.teacherName}
                        </p>
                      </div>
                      {isAtRisk && (
                        <span
                          className="text-red-500 text-lg"
                          title="Low attendance rate"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        isAtRisk ? "text-red-700" : "text-gray-800"
                      }`}
                    >
                      {student.attendanceRate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.presentSessions}/{student.totalSessions} sessions
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teacher Performance */}
        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiUsers className="mr-2 text-blue-500" />
            Teacher Performance
          </h3>

          {/* Needs Attention Section for Teachers */}
          {data.teacherPerformance.filter(
            (teacher) => teacher.attendanceRate < 80
          ).length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
                ⚠️ Teachers Needing Attention
              </h4>
              <div className="space-y-1">
                {data.teacherPerformance
                  .filter((teacher) => teacher.attendanceRate < 80)
                  .slice(0, 3)
                  .map((teacher) => (
                    <div
                      key={teacher.teacherId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-orange-700">
                        {teacher.teacherName}
                      </span>
                      <span className="text-orange-600 font-medium">
                        {teacher.attendanceRate}%
                      </span>
                    </div>
                  ))}
                {data.teacherPerformance.filter(
                  (teacher) => teacher.attendanceRate < 80
                ).length > 3 && (
                  <p className="text-xs text-orange-600">
                    +
                    {data.teacherPerformance.filter(
                      (teacher) => teacher.attendanceRate < 80
                    ).length - 3}{" "}
                    more teachers below 80%
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.teacherPerformance.map((teacher, index) => {
              const isAtRisk = teacher.attendanceRate < 80;
              return (
                <div
                  key={teacher.teacherId}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${
                    isAtRisk
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedTeacher(teacher);
                    setIsTeacherModalOpen(true);
                    fetchTeacherDetails(teacher.teacherId);
                  }}
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
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-800">
                          {teacher.teacherName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {teacher.totalStudents} students
                        </p>
                      </div>
                      {isAtRisk && (
                        <span
                          className="text-orange-500 text-lg"
                          title="Low attendance rate"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        isAtRisk ? "text-orange-700" : "text-gray-800"
                      }`}
                    >
                      {teacher.attendanceRate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {teacher.presentSessions}/{teacher.totalSessions} sessions
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Trends Chart */}
        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiTrendingUp className="mr-2 text-green-500" />
            Attendance Trends
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.attendanceTrends.slice(-14)}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(parseISO(value), "MM/dd")}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (
                      active &&
                      payload &&
                      payload.length &&
                      typeof label === "string"
                    ) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-medium text-gray-800">
                            {format(parseISO(label), "MMM dd, yyyy")}
                          </p>
                          <p className="text-sm text-green-600">
                            Attendance Rate: {data.attendanceRate}%
                          </p>
                          <p className="text-sm text-gray-600">
                            Present: {data.Present} | Absent: {data.Absent} |
                            Permission: {data.Permission}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: {data.total} students
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendanceRate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                  name="Attendance Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Last 14 days attendance rate trend - Hover for details
          </div>
        </div>
      </div>

      {/* Student Drilldown Modal */}
      {isStudentModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-2 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Student Details: {selectedStudent.studentName}
              </h2>
              <button
                onClick={() => {
                  setIsStudentModalOpen(false);
                  setSelectedStudent(null);
                  setStudentDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingStudentDetails ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">
                  Loading student details...
                </span>
              </div>
            ) : studentDetails ? (
              <div className="space-y-6">
                {/* Student Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Teacher</p>
                    <p className="text-lg font-semibold text-blue-800">
                      {selectedStudent.teacherName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Attendance Rate
                    </p>
                    <p className="text-lg font-semibold text-blue-800">
                      {selectedStudent.attendanceRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Total Sessions
                    </p>
                    <p className="text-lg font-semibold text-blue-800">
                      {selectedStudent.totalSessions}
                    </p>
                  </div>
                </div>

                {/* Attendance Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-800">
                      {studentDetails.attendanceBreakdown?.presentSessions || 0}
                    </p>
                    <p className="text-sm text-green-600">Present</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-800">
                      {studentDetails.attendanceBreakdown?.absentSessions || 0}
                    </p>
                    <p className="text-sm text-red-600">Absent</p>
                  </div>
                  <div className="bg-yellow-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-800">
                      {studentDetails.attendanceBreakdown?.permissionSessions ||
                        0}
                    </p>
                    <p className="text-sm text-yellow-600">Permission</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-800">
                      {studentDetails.attendanceBreakdown?.notTakenSessions ||
                        0}
                    </p>
                    <p className="text-sm text-gray-600">Not Taken</p>
                  </div>
                </div>

                {/* Attendance History */}
                {studentDetails.attendanceHistory &&
                studentDetails.attendanceHistory.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Attendance History
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-4 max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-1 sm:gap-2">
                        {studentDetails.attendanceHistory.map(
                          (session: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-white rounded border"
                            >
                              <div>
                                <p className="font-medium text-gray-800">
                                  {format(
                                    parseISO(session.date),
                                    "MMM dd, yyyy"
                                  )}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {session.scheduledTime || "No time recorded"}
                                </p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  session.status === "Present"
                                    ? "bg-green-100 text-green-800"
                                    : session.status === "Absent"
                                    ? "bg-red-100 text-red-800"
                                    : session.status === "Permission"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {session.status
                                  ?.replace("-", " ")
                                  .replace(/\b\w/g, (c: string) =>
                                    c.toUpperCase()
                                  ) || "Not Taken"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No detailed attendance history available for this period.
                  </div>
                )}

                {/* Export Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      exportStudentReport(selectedStudent.studentId)
                    }
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                  >
                    <FiDownload className="mr-2" />
                    Export Student Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Failed to load student details. Please try again.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teacher Drilldown Modal */}
      {isTeacherModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-2 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Teacher Details: {selectedTeacher.teacherName}
              </h2>
              <button
                onClick={() => {
                  setIsTeacherModalOpen(false);
                  setSelectedTeacher(null);
                  setTeacherDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingTeacherDetails ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">
                  Loading teacher details...
                </span>
              </div>
            ) : teacherDetails ? (
              <div className="space-y-6">
                {/* Teacher Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Total Students
                    </p>
                    <p className="text-lg font-semibold text-blue-800">
                      {selectedTeacher.totalStudents}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Total Sessions
                    </p>
                    <p className="text-lg font-semibold text-blue-800">
                      {selectedTeacher.totalSessions}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Attendance Rate
                    </p>
                    <p className="text-lg font-semibold text-blue-800">
                      {selectedTeacher.attendanceRate}%
                    </p>
                  </div>
                </div>

                {/* Teacher Details */}
                <div className="space-y-6">
                  {/* Attendance Breakdown */}
                  <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Attendance Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {teacherDetails.summary.totalPresent}
                        </p>
                        <p className="text-sm text-green-700">Present</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
                          {teacherDetails.summary.totalAbsent}
                        </p>
                        <p className="text-sm text-red-700">Absent</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">
                          {teacherDetails.summary.totalPermission}
                        </p>
                        <p className="text-sm text-yellow-700">Permission</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">
                          {teacherDetails.summary.totalNotTaken}
                        </p>
                        <p className="text-sm text-gray-700">Not Taken</p>
                      </div>
                    </div>
                  </div>

                  {/* Link Response Rate */}
                  <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Zoom Link Response Rate
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {teacherDetails.summary.totalLinksSent}
                        </p>
                        <p className="text-sm text-blue-700">Links Sent</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {teacherDetails.summary.linkResponseRate}%
                        </p>
                        <p className="text-sm text-purple-700">Response Rate</p>
                      </div>
                    </div>
                  </div>

                  {/* Student Performance Table */}
                  <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Student Performance
                      </h3>
                      <button
                        onClick={() => {
                          const csvContent = generateTeacherCSV(teacherDetails);
                          downloadCSV(
                            csvContent,
                            `${selectedTeacher.teacherName}_students_${startDate}_to_${endDate}.csv`
                          );
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        <FiDownload className="w-4 h-4" />
                        Export CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[700px] w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 font-medium text-gray-700">
                              Student Name
                            </th>
                            <th className="text-center py-2 font-medium text-gray-700">
                              Sessions
                            </th>
                            <th className="text-center py-2 font-medium text-gray-700">
                              Present
                            </th>
                            <th className="text-center py-2 font-medium text-gray-700">
                              Absent
                            </th>
                            <th className="text-center py-2 font-medium text-gray-700">
                              Permission
                            </th>
                            <th className="text-center py-2 font-medium text-gray-700">
                              Rate
                            </th>
                            <th className="text-center py-2 font-medium text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherDetails.studentPerformance.map(
                            (student: any, index: number) => (
                              <tr
                                key={student.studentId}
                                className={`border-b border-gray-100 ${
                                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                                }`}
                              >
                                <td className="py-2 font-medium text-gray-800">
                                  {student.studentName}
                                </td>
                                <td className="py-2 text-center text-gray-600">
                                  {student.totalSessions}
                                </td>
                                <td className="py-2 text-center text-green-600 font-medium">
                                  {student.presentSessions}
                                </td>
                                <td className="py-2 text-center text-red-600 font-medium">
                                  {student.absentSessions}
                                </td>
                                <td className="py-2 text-center text-yellow-600 font-medium">
                                  {student.permissionSessions}
                                </td>
                                <td className="py-2 text-center font-medium">
                                  <span
                                    className={`${
                                      student.attendanceRate >= 80
                                        ? "text-green-600"
                                        : student.attendanceRate >= 60
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {student.attendanceRate}%
                                  </span>
                                </td>
                                <td className="py-2 text-center">
                                  {student.isAtRisk ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      ⚠️ At Risk
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Good
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* At-Risk Students Summary */}
                  {teacherDetails.atRiskStudents.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-4">
                      <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                        ⚠️ Students Needing Attention (
                        {teacherDetails.atRiskStudents.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {teacherDetails.atRiskStudents.map((student: any) => (
                          <div
                            key={student.studentId}
                            className="flex items-center justify-between p-2 bg-white rounded border border-red-200"
                          >
                            <span className="text-red-700 font-medium">
                              {student.studentName}
                            </span>
                            <span className="text-red-600 font-bold">
                              {student.attendanceRate}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Failed to load teacher details. Please try again.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
