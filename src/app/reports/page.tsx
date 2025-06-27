"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Toaster, toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiDownload,
  FiFileText,
  FiUsers,
  FiUser,
  FiCalendar,
  FiBarChart,
  FiRefreshCw,
  FiFilter,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
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

interface ReportData {
  reportType: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary?: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalAbsent: number;
    totalPermission: number;
    overallAttendanceRate: number;
  };
  studentDetails?: any[];
  teacherDetails?: any[];
  dailyData?: any[];
  recommendations?: any[];
}

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportType, setReportType] = useState("comprehensive");

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

  const reportTypes = [
    {
      value: "comprehensive",
      label: "Comprehensive Report",
      icon: FiBarChart,
      description: "Complete overview with all metrics and recommendations",
    },
    {
      value: "student",
      label: "Student Report",
      icon: FiUsers,
      description: "Detailed student performance analysis",
    },
    {
      value: "teacher",
      label: "Teacher Report",
      icon: FiUser,
      description: "Teacher performance and student breakdown",
    },
    {
      value: "daily",
      label: "Daily Report",
      icon: FiCalendar,
      description: "Day-by-day attendance analysis",
    },
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        type: reportType,
      });

      const response = await fetch(`/api/reports?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      setReportData(data);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (preset: (typeof datePresets)[0]) => {
    const dates = preset.getDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  const exportReport = () => {
    if (!reportData) return;

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${reportType}_${format(
      parseISO(startDate),
      "yyyyMMdd"
    )}_${format(parseISO(endDate), "yyyyMMdd")}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report exported successfully!");
  };

  const exportCSV = () => {
    if (!reportData) return;

    let csvContent = "";

    switch (reportType) {
      case "student":
        csvContent =
          "Student Name,Teacher,Phone,Attendance Rate,Total Sessions,Present,Absent,Permission,Max Consecutive Absences\n";
        reportData.studentDetails?.forEach((student: any) => {
          csvContent += `"${student.studentName}","${student.teacherName}","${student.phoneNumber}",${student.attendanceRate},${student.totalSessions},${student.presentSessions},${student.absentSessions},${student.permissionSessions},${student.maxConsecutiveAbsences}\n`;
        });
        break;
      case "teacher":
        csvContent =
          "Teacher Name,Total Students,Attendance Rate,Total Sessions,Present,Absent,Permission\n";
        reportData.teacherDetails?.forEach((teacher: any) => {
          csvContent += `"${teacher.teacherName}",${teacher.totalStudents},${teacher.attendanceRate},${teacher.totalSessions},${teacher.presentSessions},${teacher.absentSessions},${teacher.permissionSessions}\n`;
        });
        break;
      case "daily":
        csvContent = "Date,Total,Present,Absent,Permission,Attendance Rate\n";
        reportData.dailyData?.forEach((day: any) => {
          csvContent += `${day.date},${day.total},${day.present},${day.absent},${day.permission},${day.attendanceRate}\n`;
        });
        break;
      default:
        csvContent =
          "Report Type,Period,Total Students,Overall Attendance Rate\n";
        csvContent += `"${reportData.reportType}","${reportData.period.startDate} to ${reportData.period.endDate}",${reportData.summary?.totalStudents},${reportData.summary?.overallAttendanceRate}\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${reportType}_${format(
      parseISO(startDate),
      "yyyyMMdd"
    )}_${format(parseISO(endDate), "yyyyMMdd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/controller")}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-50/60 border border-blue-100 px-4 py-2 rounded-lg shadow-sm">
            <FiFileText className="text-blue-400" />
            <span className="text-sm font-medium text-blue-600">
              Advanced Reports
            </span>
          </div>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <FiFilter className="text-indigo-500 text-xl" />
          <span className="text-xl font-semibold text-indigo-700">
            Report Configuration
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Report Type Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Report Type
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      reportType === type.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-25"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="text-xl" />
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm opacity-75">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Date Range
            </h3>

            {/* Date Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-800 flex items-center shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FiRefreshCw className="mr-2 animate-spin" />
            ) : (
              <FiFileText className="mr-2" />
            )}
            {loading ? "Generating Report..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 capitalize">
                  {reportData.reportType} Report
                </h2>
                <p className="text-gray-600 mt-1">
                  {format(
                    parseISO(reportData.period.startDate),
                    "MMM dd, yyyy"
                  )}{" "}
                  -{" "}
                  {format(parseISO(reportData.period.endDate), "MMM dd, yyyy")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportReport}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg hover:from-green-600 hover:to-green-800 flex items-center shadow-md transition-transform hover:scale-105"
                >
                  <FiDownload className="mr-2" /> Export JSON
                </button>
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg hover:from-blue-600 hover:to-blue-800 flex items-center shadow-md transition-transform hover:scale-105"
                >
                  <FiDownload className="mr-2" /> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {reportData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">
                      Total Students
                    </p>
                    <p className="text-3xl font-bold text-blue-800">
                      {reportData.summary.totalStudents}
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
                      {reportData.summary.overallAttendanceRate}%
                    </p>
                  </div>
                  <FiBarChart className="text-4xl text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">
                      Total Sessions
                    </p>
                    <p className="text-3xl font-bold text-purple-800">
                      {reportData.summary.totalSessions}
                    </p>
                  </div>
                  <FiCalendar className="text-4xl text-purple-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">
                      Present Sessions
                    </p>
                    <p className="text-3xl font-bold text-orange-800">
                      {reportData.summary.totalPresent}
                    </p>
                  </div>
                  <FiCheckCircle className="text-4xl text-orange-600" />
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {reportData.recommendations &&
            reportData.recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FiAlertTriangle className="mr-2 text-yellow-500" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {reportData.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.priority === "high"
                          ? "border-red-500 bg-red-50"
                          : rec.priority === "medium"
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-blue-500 bg-blue-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <FiInfo
                          className={`mt-1 ${
                            rec.priority === "high"
                              ? "text-red-500"
                              : rec.priority === "medium"
                              ? "text-yellow-500"
                              : "text-blue-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-800">
                            {rec.message}
                          </p>
                          {rec.students && (
                            <p className="text-sm text-gray-600 mt-1">
                              Students: {rec.students.join(", ")}
                            </p>
                          )}
                          {rec.teachers && (
                            <p className="text-sm text-gray-600 mt-1">
                              Teachers: {rec.teachers.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Detailed Data Tables */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Detailed Data
            </h3>

            {reportType === "student" && reportData.studentDetails && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max Absences
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.studentDetails
                      .slice(0, 20)
                      .map((student: any) => (
                        <tr key={student.studentId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.studentName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.phoneNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.teacherName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                student.attendanceRate >= 90
                                  ? "bg-green-100 text-green-800"
                                  : student.attendanceRate >= 70
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {student.attendanceRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.presentSessions}/{student.totalSessions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.maxConsecutiveAbsences}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "teacher" && reportData.teacherDetails && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.teacherDetails
                      .slice(0, 20)
                      .map((teacher: any) => (
                        <tr key={teacher.teacherId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {teacher.teacherName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {teacher.totalStudents}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                teacher.attendanceRate >= 90
                                  ? "bg-green-100 text-green-800"
                                  : teacher.attendanceRate >= 75
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {teacher.attendanceRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {teacher.presentSessions}/{teacher.totalSessions}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === "daily" && reportData.dailyData && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.dailyData.slice(0, 30).map((day: any) => (
                      <tr key={day.date}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {format(parseISO(day.date), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {day.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {day.present}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {day.absent}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                          {day.permission}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              day.attendanceRate >= 90
                                ? "bg-green-100 text-green-800"
                                : day.attendanceRate >= 70
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {day.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
