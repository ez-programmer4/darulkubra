"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DurationReportResponse } from "@/types/duration-tracking";

type SortField =
  | "name"
  | "meetings"
  | "completed"
  | "hours"
  | "avgTeacher"
  | "avgStudent"
  | "attendance";
type SortOrder = "asc" | "desc";

export default function TeacherDurationsPage() {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [data, setData] = useState<DurationReportResponse | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("hours");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [month]);

  // Auto-refresh only if enabled (disabled by default)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData(true); // Pass true for background refresh
    }, 60000); // 60 seconds (1 minute) - less aggressive

    return () => clearInterval(interval);
  }, [month, autoRefresh]);

  // Sort and filter teachers
  const processedTeachers = useMemo(() => {
    if (!data?.teachers) return [];

    let filtered = data.teachers;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.teacherName.toLowerCase().includes(query) ||
          t.teacherId.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.teacherName;
          bVal = b.teacherName;
          break;
        case "meetings":
          aVal = a.totalMeetings;
          bVal = b.totalMeetings;
          break;
        case "completed":
          aVal = a.completedMeetings;
          bVal = b.completedMeetings;
          break;
        case "hours":
          aVal = a.totalHours;
          bVal = b.totalHours;
          break;
        case "avgTeacher":
          aVal = a.averageTeacherDuration;
          bVal = b.averageTeacherDuration;
          break;
        case "avgStudent":
          aVal = a.averageStudentDuration;
          bVal = b.averageStudentDuration;
          break;
        case "attendance":
          aVal = a.attendanceRate || 0;
          bVal = b.attendanceRate || 0;
          break;
        default:
          aVal = a.totalHours;
          bVal = b.totalHours;
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [data?.teachers, searchQuery, sortField, sortOrder]);

  // Pagination
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return processedTeachers.slice(start, end);
  }, [processedTeachers, currentPage]);

  const totalPages = Math.ceil(processedTeachers.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400">⇅</span>;
    return sortOrder === "asc" ? <span>↑</span> : <span>↓</span>;
  };

  async function fetchData(isBackgroundRefresh = false) {
    try {
      // Only show loading spinner on initial load, not on background refreshes
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);

      const res = await fetch(`/api/admin/teacher-durations?month=${month}`, {
        cache: "no-store", // Prevent caching
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to fetch");
      }

      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching durations:", error);
      if (!isBackgroundRefresh) {
        setError(
          error instanceof Error ? error.message : "Failed to load data"
        );
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  }

  function generateCSV() {
    if (!data) return "";

    const headers = [
      "Teacher ID",
      "Teacher Name",
      "Date",
      "Student Name",
      "Total Duration (min)",
      "Teacher Duration (min)",
      "Student Duration (min)",
      "Teacher Joined",
      "Teacher Left",
      "Student Joined",
      "Student Left",
      "Status",
      "Type",
    ];

    const rows = data.teachers.flatMap((teacher) =>
      teacher.meetings.map((meeting) => [
        teacher.teacherId,
        teacher.teacherName,
        new Date(meeting.date).toLocaleDateString(),
        meeting.studentName || "Unknown",
        meeting.totalDuration || "",
        meeting.teacherDuration || "",
        meeting.studentDuration || "",
        meeting.hostJoinedAt
          ? new Date(meeting.hostJoinedAt).toLocaleString()
          : "",
        meeting.hostLeftAt ? new Date(meeting.hostLeftAt).toLocaleString() : "",
        meeting.studentJoinedAt
          ? new Date(meeting.studentJoinedAt).toLocaleString()
          : "",
        meeting.studentLeftAt
          ? new Date(meeting.studentLeftAt).toLocaleString()
          : "",
        meeting.status,
        meeting.createdViaApi ? "Auto" : "Manual",
      ])
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csv;
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Data</h3>
              <p className="text-red-700">{error}</p>
              <Button
                onClick={() => fetchData(false)}
                className="mt-3"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Teacher Teaching Durations
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Actual teaching hours tracked via Zoom
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Teachers</div>
          <div className="text-2xl font-bold text-blue-600">
            {data.overallStats.totalTeachers}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Meetings</div>
          <div className="text-2xl font-bold text-purple-600">
            {data.overallStats.totalMeetings}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {data.overallStats.totalCompletedMeetings}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Hours</div>
          <div className="text-2xl font-bold text-orange-600">
            {data.overallStats.totalHours}h
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Minutes</div>
          <div className="text-2xl font-bold text-indigo-600">
            {data.overallStats.totalMinutes}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Avg Duration</div>
          <div className="text-2xl font-bold text-teal-600">
            {data.overallStats.averageDurationPerMeeting} min
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by teacher name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {autoRefresh ? "⏸️ Auto-Refresh ON" : "▶️ Auto-Refresh OFF"}
            </Button>
            <Button
              onClick={() => fetchData(false)}
              size="sm"
              variant="outline"
            >
              🔄 Refresh Now
            </Button>
            <Button
              onClick={() => {
                const csvContent = generateCSV();
                downloadCSV(csvContent, `teacher-durations-${month}.csv`);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              📥 Export CSV
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>
            Showing {paginatedTeachers.length} of {processedTeachers.length}{" "}
            teachers
            {searchQuery &&
              ` (filtered from ${data.teachers?.length || 0} total)`}
          </span>
          {autoRefresh && (
            <span className="text-green-600 font-medium animate-pulse">
              ● Auto-refreshing every 60s
            </span>
          )}
        </div>
      </Card>

      {/* Teachers Table */}
      <Card className="p-6">
        {processedTeachers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Teachers Found
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? `No teachers match "${searchQuery}"`
                : `No teachers have completed meetings in ${month}`}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th
                      onClick={() => handleSort("name")}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Teacher <SortIcon field="name" />
                    </th>
                    <th
                      onClick={() => handleSort("meetings")}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Meetings <SortIcon field="meetings" />
                    </th>
                    <th
                      onClick={() => handleSort("completed")}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Completed <SortIcon field="completed" />
                    </th>
                    <th
                      onClick={() => handleSort("hours")}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Hours <SortIcon field="hours" />
                    </th>
                    <th
                      onClick={() => handleSort("avgTeacher")}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      👨‍🏫 Avg <SortIcon field="avgTeacher" />
                    </th>
                    <th
                      onClick={() => handleSort("avgStudent")}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      👨‍🎓 Avg <SortIcon field="avgStudent" />
                    </th>
                    <th
                      onClick={() => handleSort("attendance")}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Attendance <SortIcon field="attendance" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTeachers.map((teacher) => (
                    <React.Fragment key={teacher.teacherId}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {teacher.teacherName}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {teacher.teacherId}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {teacher.totalMeetings}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {teacher.completedMeetings}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {teacher.totalHours}h
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-semibold text-purple-600">
                            {teacher.averageTeacherDuration ||
                              teacher.averageDuration}{" "}
                            min
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-semibold text-green-600">
                            {teacher.averageStudentDuration ||
                              teacher.averageDuration}{" "}
                            min
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`font-semibold ${
                              (teacher.attendanceRate || 0) >= 90
                                ? "text-green-600"
                                : (teacher.attendanceRate || 0) >= 75
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {teacher.attendanceRate || 0}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            onClick={() =>
                              setExpandedTeacher(
                                expandedTeacher === teacher.teacherId
                                  ? null
                                  : teacher.teacherId
                              )
                            }
                            size="sm"
                            variant="outline"
                          >
                            {expandedTeacher === teacher.teacherId
                              ? "Hide"
                              : "View"}{" "}
                            Details
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded Meeting Details */}
                      {expandedTeacher === teacher.teacherId && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-gray-50">
                            <div className="mb-3">
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Meeting History ({teacher.meetings.length}{" "}
                                meetings)
                              </h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border">
                                <thead className="bg-white">
                                  <tr className="border-b">
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Date & Time
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Student
                                    </th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">
                                      Total
                                    </th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">
                                      👨‍🏫 Teacher
                                    </th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">
                                      👨‍🎓 Student
                                    </th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">
                                      Status
                                    </th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">
                                      Type
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {teacher.meetings.map((meeting) => (
                                    <tr
                                      key={meeting.id}
                                      className="hover:bg-white"
                                    >
                                      <td className="px-3 py-3">
                                        <div className="text-sm">
                                          <div className="font-medium text-gray-900">
                                            {new Date(
                                              meeting.date
                                            ).toLocaleDateString()}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {new Date(
                                              meeting.date
                                            ).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 text-sm text-gray-900">
                                        {meeting.studentName || "Unknown"}
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        {meeting.totalDuration ? (
                                          <span className="font-semibold text-blue-600">
                                            {meeting.totalDuration} min
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        {meeting.teacherDuration ? (
                                          <span className="font-semibold text-purple-600">
                                            {meeting.teacherDuration} min
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        {meeting.studentDuration ? (
                                          <span className="font-semibold text-green-600">
                                            {meeting.studentDuration} min
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            meeting.status === "ended"
                                              ? "bg-green-100 text-green-800"
                                              : meeting.status === "active"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {meeting.status}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        <span className="text-xs text-gray-600">
                                          {meeting.createdViaApi
                                            ? "🤖 Auto"
                                            : "✋ Manual"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum =
                      totalPages <= 5
                        ? i + 1
                        : currentPage <= 3
                        ? i + 1
                        : currentPage >= totalPages - 2
                        ? totalPages - 4 + i
                        : currentPage - 2 + i;

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        size="sm"
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        className={
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : ""
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Info Note */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">About Duration Tracking:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>
                <strong>Manual Refresh:</strong> Click "Refresh Now" to update
                data (saves bandwidth)
              </li>
              <li>
                <strong>Auto-Refresh:</strong> Toggle ON for automatic updates
                every 60 seconds (optional)
              </li>
              <li>
                <strong>Sortable columns:</strong> Click any column header to
                sort
              </li>
              <li>
                <strong>Search:</strong> Filter teachers by name or ID
              </li>
              <li>
                <strong>View Details:</strong> Click "View Details" to see
                individual meetings
              </li>
              <li>
                <strong>Pagination:</strong> Shows 20 teachers per page for
                better performance
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
