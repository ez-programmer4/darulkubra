"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ConfirmModal from "../components/ConfirmModal";
import { Toaster, toast } from "react-hot-toast";
import AttendanceListSkeleton from "./AttendanceListSkeleton";
import {
  FiArrowLeft,
  FiUser,
  FiCheckSquare,
  FiMail,
  FiRefreshCw,
  FiDownload,
  FiSearch,
  FiX,
  FiBell,
  FiCalendar,
  FiFilter,
  FiBarChart,
  FiFileText,
} from "react-icons/fi";
import {
  format,
  parseISO,
  differenceInMinutes,
  isValid,
  startOfWeek,
  addDays,
} from "date-fns";
import { motion } from "framer-motion";

interface IntegratedRecord {
  student_id: number;
  studentName: string;
  ustazName: string;
  scheduledAt: string | null;
  links: Array<{
    id: number;
    link: string;
    sent_time: string | null;
    clicked_at: string | null;
    expiration_date?: string | null;
    report?: string | null;
    tracking_token?: string | null;
  }>;
  attendance_status: string;
  absentDaysCount?: number;
  scheduledDateObj?: Date | null;
  clickedDateObj?: Date | null;
  sentRaw?: string;
}

interface Stats {
  totalLinks: number;
  totalSent: number;
  totalClicked: number;
  missedDeadlines?: number;
  responseRate: string;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  permissionCount?: number;
  notTakenCount?: number;
}

export default function AttendanceList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<IntegratedRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd")); // 2025-06-20
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ustaz, setUstaz] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [sentStatus, setSentStatus] = useState("");
  const [clickedStatus, setClickedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(
    null
  );
  const [studentToNotify, setStudentToNotify] = useState<string | null>(null);
  const [notifiedStudentDateKeys, setNotifiedStudentDateKeys] = useState<
    string[]
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notifiedStudentDateKeys");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedLinks, setSelectedLinks] = useState<{
    [studentId: number]: number;
  }>({});
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    // Save notified student-date keys to localStorage whenever they change
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "notifiedStudentDateKeys",
        JSON.stringify(notifiedStudentDateKeys)
      );
    }
  }, [notifiedStudentDateKeys]);

  const fetchData = async (notifyStudentId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date,
        ustaz,
        attendanceStatus,
        sentStatus,
        clickedStatus,
        page: page.toString(),
        limit: limit.toString(),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(notifyStudentId && { notify: notifyStudentId.toString() }),
      });
      const response = await fetch(
        `/api/attendance-list?${params.toString()}`,
        { credentials: "include" }
      );
      const result = await response.json();

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      if (notifyStudentId) {
        if (result.message === "Notification sent to teacher") {
          toast.success("SMS notification sent to teacher!");
          setNotifiedStudentDateKeys((prev) => [
            ...prev,
            `${notifyStudentId}|${date}`,
          ]);
        } else {
          toast.error(`Failed to send SMS: ${result.error || "Unknown error"}`);
        }
        return;
      }
      if (!result.integratedData || !Array.isArray(result.integratedData)) {
        setData([]);
        setTotal(0);
      } else {
        const updatedData = result.integratedData.map((record: any) => {
          // Default to the latest link (by sent_time desc)
          let selectedLink = null;
          if (record.links && record.links.length > 0) {
            selectedLink = [...record.links].sort((a, b) => {
              if (!a.sent_time) return 1;
              if (!b.sent_time) return -1;
              return (
                new Date(b.sent_time).getTime() -
                new Date(a.sent_time).getTime()
              );
            })[0];
          }
          // Parse scheduledAt
          let scheduled: Date | null = null;
          if (record.scheduledAt && record.scheduledAt !== "null") {
            scheduled = parseISO(record.scheduledAt);
            if (!isValid(scheduled)) scheduled = null;
          }
          return {
            ...record,
            scheduledDateObj: scheduled,
            selectedLink, // for convenience
          };
        });
        setData(updatedData);
        setTotal(result.total || 0);
        setStats(result.stats || null);
        
        // Extract unique teachers for filter dropdown
        if (result.allTeachers && Array.isArray(result.allTeachers)) {
          setAllTeachers(result.allTeachers);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load attendance list"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date, startDate, endDate, ustaz, attendanceStatus, sentStatus, clickedStatus, page, limit]);

  // Early returns after all hooks
  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Unauthorized</div>;

  const user = session?.user;

  // Quick-select for days
  const daysOfWeek = [
    { label: "Today", getDate: () => format(new Date(), "yyyy-MM-dd") },
    ...[
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].map((day, idx) => ({
      label: day,
      getDate: () => {
        const now = new Date();
        // startOfWeek with { weekStartsOn: 1 } for Monday
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return format(addDays(weekStart, idx), "yyyy-MM-dd");
      },
    })),
  ];

  const handleRefresh = () => {
    fetchData();
  };

  const exportToCSV = () => {
    const headers = [
      "Student Name, Ustadz Name, Link, Scheduled At, Sent Time, Clicked Time, Time Difference, Attendance Status",
    ];
    const rows = data
      .filter((record) =>
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((record) => {
        const sortedLinks = [...record.links].sort((a, b) => {
          if (!a.sent_time) return 1;
          if (!b.sent_time) return -1;
          return (
            new Date(b.sent_time).getTime() - new Date(a.sent_time).getTime()
          );
        });
        let link =
          sortedLinks &&
          sortedLinks.length > 1 &&
          selectedLinks[record.student_id]
            ? sortedLinks.find((l) => l.id === selectedLinks[record.student_id])
            : sortedLinks && sortedLinks.length === 1
            ? sortedLinks[0]
            : null;
        // Calculate time difference
        let diffLabel = "N/A";
        if (link && link.sent_time && record.scheduledAt) {
          const scheduled = new Date(record.scheduledAt);
          const sent = new Date(link.sent_time);
          const diff = Math.round(
            (sent.getTime() - scheduled.getTime()) / 60000
          );
          if (diff < 0) diffLabel = `${Math.abs(diff)} min early`;
          else if (diff <= 3) diffLabel = "Early";
          else if (diff <= 5) diffLabel = "On Time";
          else diffLabel = "Very Late";
        }
        return [
          record.studentName,
          record.ustazName,
          link ? link.link : "N/A",
          formatDateSafely(record.scheduledAt),
          link && link.sent_time ? formatDateSafely(link.sent_time) : "N/A",
          link && link.clicked_at ? formatDateSafely(link.clicked_at) : "N/A",
          diffLabel,
          record.attendance_status || "N/A",
        ].join(",");
      });
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_list_${format(parseISO(date), "yyyyMMdd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStartDate("");
    setEndDate("");
    setUstaz("");
    setAttendanceStatus("");
    setSentStatus("");
    setClickedStatus("");
    setSearchQuery("");
    setPage(1);
  };

  const handleNotifyClick = (studentId: number, scheduledDate: string) => {
    setStudentToNotify(`${studentId}|${scheduledDate ?? ""}`);
  };

  const confirmNotify = async () => {
    if (!studentToNotify || typeof studentToNotify !== "string") return;
    const parts = studentToNotify.split("|");
    if (parts.length !== 2) return;
    const [studentId, scheduledDate] = parts;
    try {
      const response = await fetch(`/api/attendance-list?notify=${studentId}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (response.ok && result.message === "Notification sent to teacher") {
        toast.success("SMS notification sent successfully!");
        setNotifiedStudentDateKeys((prev) => [...prev, studentToNotify]);
      } else {
        toast.error(
          `Failed to send notification: ${
            result.error || result.response?.errors?.[0] || "Unknown error"
          }`
        );
      }
    } catch (err) {
      toast.error("An unexpected error occurred while sending the SMS.");
    } finally {
      setStudentToNotify(null); // Close the modal
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDateSafely = (dateStr: string | null) => {
    if (
      !dateStr ||
      dateStr === "Not Sent" ||
      dateStr === "N/A" ||
      dateStr === "null"
    ) {
      return "N/A";
    }
    try {
      // Directly format the UTC string to avoid local timezone conversion
      // Input: "2025-06-20T16:00:00.000Z" -> Output: "2025-06-20 16:00"
      const datePart = dateStr.substring(0, 10);
      const timePart = dateStr.substring(11, 16);
      return `${datePart} ${timePart}`;
    } catch (e) {
      return "N/A";
    }
  };

  const formatTimeOnly = (dateStr: string | null) => {
    if (
      !dateStr ||
      dateStr === "Not Sent" ||
      dateStr === "N/A" ||
      dateStr === "null"
    ) {
      return "N/A";
    }
    try {
      // Extract time part and convert to 12-hour format
      const timePart = dateStr.substring(11, 16); // "16:00"
      const [hours, minutes] = timePart.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return "N/A";
    }
  };



  // Filter data based on search query only (other filters handled by backend)
  const filteredData = data.filter((record) => {
    // Search query filter
    if (searchQuery && !record.studentName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Sent status filter (frontend only)
    if (sentStatus) {
      const hasValidLink = record.links.some(link => link.sent_time);
      if (sentStatus === 'sent' && !hasValidLink) return false;
      if (sentStatus === 'notSent' && hasValidLink) return false;
    }
    
    // Clicked status filter (frontend only)
    if (clickedStatus) {
      const hasClickedLink = record.links.some(link => link.clicked_at);
      if (clickedStatus === 'clicked' && !hasClickedLink) return false;
      if (clickedStatus === 'notClicked' && hasClickedLink) return false;
    }
    
    return true;
  });

  // Get emergency students (scheduled time passed by 3+ minutes but within 15 minutes, no link sent)
  const emergencyStudents = filteredData.filter(record => {
    if (!record.scheduledDateObj) return false;
    
    const now = new Date();
    const timeDiff = (now.getTime() - record.scheduledDateObj.getTime()) / (1000 * 60); // minutes
    const hasNoLink = !record.links || record.links.length === 0 || !record.links.some(l => l.sent_time);
    
    // Emergency: 3+ minutes overdue but within 15 minutes range
    return timeDiff >= 3 && timeDiff <= 15 && hasNoLink;
  });

  // Attendance statistics calculation based on all data (not just current page)
  
  const attendanceStats = (stats && stats.totalStudents) ? {
    total: stats.totalStudents,
    Present: stats.presentCount || 0,
    Absent: stats.absentCount || 0,
    Permission: stats.permissionCount || 0,
    "Not Taken": stats.notTakenCount || 0
  } : filteredData.reduce(
    (
      acc: {
        [key: string]: number;
        total: number;
        Present: number;
        Absent: number;
        Permission: number;
        "Not Taken": number;
      },
      record
    ) => {
      acc.total++;
      acc[record.attendance_status] = (acc[record.attendance_status] || 0) + 1;
      return acc;
    },
    { total: 0, Present: 0, Absent: 0, Permission: 0, "Not Taken": 0 }
  );

  const attendanceRate =
    attendanceStats.total > 0
      ? ((attendanceStats.Present / attendanceStats.total) * 100).toFixed(1) +
        "%"
      : "N/A";

  if (loading) {
    // Table skeleton loader
    return <AttendanceListSkeleton />;
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

  const totalStudents = filteredData.length;
  const presentCount = filteredData.filter(
    (record) => record.attendance_status === "Present"
  ).length;
  const averageAttendanceRate =
    totalStudents > 0
      ? ((presentCount / totalStudents) * 100).toFixed(2) + "%"
      : "N/A";

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-6 bg-white min-h-screen">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => router.push("/controller")}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/analytics")}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center"
          >
            <FiBarChart className="mr-2" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => router.push("/reports")}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center"
          >
            <FiFileText className="mr-2" />
            <span>Reports</span>
          </button>
        </div>
        <div className="flex items-center gap-3 bg-blue-50/60 border border-blue-100 px-4 py-2 rounded-lg shadow-sm">
          <FiCalendar className="text-blue-400" />
          <span className="text-sm font-medium text-blue-600">
            Selected Date: {format(parseISO(date), "MMMM dd, yyyy")}
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 sm:gap-2 items-center">
        {daysOfWeek.map((d) => (
          <button
            key={d.label}
            onClick={() => setDate(d.getDate())}
            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200
              ${
                date === d.getDate()
                  ? "bg-indigo-500 text-white border-indigo-600 shadow"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-indigo-100"
              }
            `}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Search and Actions Row */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1">
          <div className="relative max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end items-center">
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = e.target.value === 'all' ? 1000 : parseInt(e.target.value);
              setLimit(newLimit);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value="all">All students</option>
          </select>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-800 flex items-center shadow-md transition-transform hover:scale-105"
          >
            <FiRefreshCw className="mr-2" /> Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg hover:from-green-600 hover:to-green-800 flex items-center shadow-md transition-transform hover:scale-105"
          >
            <FiDownload className="mr-2" /> Export CSV
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center shadow-md transition-transform hover:scale-105"
          >
            <FiX className="mr-2" /> Clear Filters
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="mb-6 p-2 sm:p-4 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-indigo-500 text-xl" />
          <span className="text-lg font-semibold text-indigo-700">Filters</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Date Range Group */}
          <div className="flex flex-col gap-2 bg-blue-50 rounded-xl p-3 min-w-[200px]">
            <span className="text-xs font-semibold text-blue-700 mb-1">
              Absent Days Range
            </span>
            <p className="text-xs text-blue-600 mb-2">
              Select date range to see absent days count
            </p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start date"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End date"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
            />
          </div>
          {/* Single Date Group */}
          <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
            <span className="text-xs font-semibold text-indigo-700 mb-1">
              Single Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            />
          </div>
          {/* Ustadz Group */}
          <div className="flex flex-col gap-2 bg-green-50 rounded-xl p-3 min-w-[160px]">
            <span className="text-xs font-semibold text-green-700 mb-1">
              Ustadz
            </span>
            <select
              value={ustaz}
              onChange={(e) => setUstaz(e.target.value)}
              className="w-full px-3 py-2 border border-green-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-sm"
            >
              <option value="">All</option>
              {allTeachers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          {/* Attendance Status Group */}
          <div className="flex flex-col gap-2 bg-yellow-50 rounded-xl p-3 min-w-[160px]">
            <span className="text-xs font-semibold text-yellow-700 mb-1">
              Attendance Status
            </span>
            <select
              value={attendanceStatus}
              onChange={(e) => setAttendanceStatus(e.target.value)}
              className="w-full px-3 py-2 border border-yellow-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300 shadow-sm"
            >
              <option value="">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Permission">Permission</option>
              <option value="Not Taken">Not Taken</option>
            </select>
          </div>
          {/* Sent/Clicked Status Group */}
          <div className="flex flex-col gap-2 bg-purple-50 rounded-xl p-3 min-w-[160px]">
            <span className="text-xs font-semibold text-purple-700 mb-1">
              Link Status
            </span>
            <select
              value={sentStatus}
              onChange={(e) => setSentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-purple-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-sm"
            >
              <option value="">Sent (all)</option>
              <option value="sent">Sent</option>
              <option value="notSent">Not Sent</option>
            </select>
            <select
              value={clickedStatus}
              onChange={(e) => setClickedStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-purple-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-sm"
            >
              <option value="">Clicked? (all)</option>
              <option value="clicked">Clicked</option>
              <option value="notClicked">Not Clicked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Absent Days Info Section */}
      {startDate && endDate && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            Absent Days Legend
          </h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></span>
              <span className="text-green-700">
                Green: Perfect attendance (0 absent)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full"></span>
              <span className="text-yellow-700">
                Yellow: Moderate (1-3 absent)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-100 border border-red-300 rounded-full"></span>
              <span className="text-red-700">Red: Concerning (4+ absent)</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Showing absent days from{" "}
            {format(parseISO(startDate), "MMMM dd, yyyy")} to{" "}
            {format(parseISO(endDate), "MMMM dd, yyyy")}
          </p>
        </div>
      )}

      {/* Emergency Section - Always show for testing */}
      <div className="mb-6 p-4 bg-red-50 rounded-lg border-2 border-red-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-red-800 flex items-center">
            <FiBell className="mr-2 text-red-600" />
            🚨 EMERGENCY: Links Not Sent ({emergencyStudents.length})
          </h3>
          <button
            onClick={() => setShowEmergency(!showEmergency)}
            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
          >
            {showEmergency ? 'Hide' : 'Show'} Details
          </button>
        </div>
        <p className="text-sm text-red-700 mb-3">
          Students whose scheduled time has passed by 3+ minutes without zoom links being sent (within 15min range).
        </p>
        <p className="text-xs text-gray-600 mb-2">
          Debug: Total filtered data: {filteredData.length}, Emergency students: {emergencyStudents.length}
        </p>
        
        {showEmergency && (
          <div className="bg-white rounded-lg p-3 border border-red-200">
            {emergencyStudents.length > 0 ? (
              <div className="grid gap-2">
                {emergencyStudents.map(student => {
                  const timePassed = Math.floor((new Date().getTime() - (student.scheduledDateObj?.getTime() || 0)) / (1000 * 60));
                  return (
                    <div key={student.student_id} className="flex justify-between items-center p-2 bg-red-50 rounded border">
                      <div>
                        <span className="font-medium text-red-800">{student.studentName}</span>
                        <span className="text-sm text-red-600 ml-2">({student.ustazName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-red-700">
                            Scheduled: {formatTimeOnly(student.scheduledAt)}
                          </div>
                          <div className="text-xs text-red-600">
                            {timePassed} minutes overdue
                          </div>
                        </div>
                        <button
                          onClick={() => handleNotifyClick(student.student_id, student.scheduledAt?.substring(0, 10) || '')}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center"
                          title="Notify teacher about missing link"
                        >
                          <FiBell className="mr-1" /> Notify
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No emergency students found</p>
            )}
          </div>
        )}
      </div>

      {/* Original Emergency Section (hidden) */}
      {false && emergencyStudents.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border-2 border-red-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-red-800 flex items-center">
              <FiBell className="mr-2 text-red-600" />
              🚨 EMERGENCY: Links Not Sent ({emergencyStudents.length})
            </h3>
            <button
              onClick={() => setShowEmergency(!showEmergency)}
              className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
            >
              {showEmergency ? 'Hide' : 'Show'} Details
            </button>
          </div>
          <p className="text-sm text-red-700 mb-3">
            Students whose scheduled time has passed by 3+ minutes without zoom links being sent (within 15min range).
          </p>
          
          {showEmergency && (
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <div className="grid gap-2">
                {emergencyStudents.map(student => {
                  const timePassed = Math.floor((new Date().getTime() - (student.scheduledDateObj?.getTime() || 0)) / (1000 * 60));
                  return (
                    <div key={student.student_id} className="flex justify-between items-center p-2 bg-red-50 rounded border">
                      <div>
                        <span className="font-medium text-red-800">{student.studentName}</span>
                        <span className="text-sm text-red-600 ml-2">({student.ustazName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-red-700">
                            Scheduled: {formatTimeOnly(student.scheduledAt)}
                          </div>
                          <div className="text-xs text-red-600">
                            {timePassed} minutes overdue
                          </div>
                        </div>
                        <button
                          onClick={() => handleNotifyClick(student.student_id, student.scheduledAt?.substring(0, 10) || '')}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center"
                          title="Notify teacher about missing link"
                        >
                          <FiBell className="mr-1" /> Notify
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Analytics Section */}
      <div className="mb-8">
        <div className="mb-4 p-2 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-sm font-semibold text-indigo-800 mb-2">
            📊 Analytics for {format(parseISO(date), "MMMM dd, yyyy")}
          </h3>
          <p className="text-xs text-indigo-600">
            Showing attendance statistics for the selected date
          </p>
          <p className="text-xs text-indigo-500 mt-1">
            📋 <strong>Note:</strong> Only Active and "Not yet" students are included in
            attendance tracking and analytics.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 shadow flex flex-col items-center">
            <span className="text-2xl font-bold text-blue-700">
              {attendanceStats.total}
            </span>
            <span className="text-xs text-blue-800 mt-1">Total Students</span>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-4 shadow flex flex-col items-center">
            <span className="text-2xl font-bold text-green-700">
              {attendanceStats.Present}
            </span>
            <span className="text-xs text-green-800 mt-1">Present</span>
          </div>
          <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-xl p-4 shadow flex flex-col items-center">
            <span className="text-2xl font-bold text-red-700">
              {attendanceStats.Absent}
            </span>
            <span className="text-xs text-red-800 mt-1">Absent</span>
          </div>
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl p-4 shadow flex flex-col items-center">
            <span className="text-2xl font-bold text-yellow-700">
              {attendanceStats.Permission}
            </span>
            <span className="text-xs text-yellow-800 mt-1">Permission</span>
          </div>
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow flex flex-col items-center">
            <span className="text-2xl font-bold text-gray-700">
              {attendanceStats["Not Taken"]}
            </span>
            <span className="text-xs text-gray-800 mt-1">Not Taken</span>
          </div>
          <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-4 shadow flex flex-col items-center">
            <span className="text-2xl font-bold text-indigo-700">
              {attendanceRate}
            </span>
            <span className="text-xs text-indigo-800 mt-1">
              Attendance Rate
            </span>
          </div>
        </div>
      </div>

      {/* Quick Analytics Insights */}
      <div className="mb-6 p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-indigo-50 to-white border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
            <FiBarChart className="mr-2" />
            Quick Analytics Insights for{" "}
            {format(parseISO(date), "MMMM dd, yyyy")}
          </h3>
          <button
            onClick={() => router.push("/analytics")}
            className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-all duration-200"
          >
            View Full Analytics
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-indigo-600 font-medium">
                {format(parseISO(date), "MMM dd")} Performance
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  parseFloat(attendanceRate) >= 80
                    ? "bg-green-100 text-green-800"
                    : parseFloat(attendanceRate) >= 60
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {attendanceRate}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {attendanceStats.Present} out of {attendanceStats.total} students
              present
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-indigo-600 font-medium">
                Absent Students
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {attendanceStats.Absent}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {attendanceStats.Absent > 0
                ? `${(
                    (attendanceStats.Absent / attendanceStats.total) *
                    100
                  ).toFixed(1)}% of total students`
                : "All students accounted for"}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-indigo-600 font-medium">Action Items</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {attendanceStats.Absent + attendanceStats.Permission}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {attendanceStats.Absent + attendanceStats.Permission > 0
                ? "Students need follow-up"
                : "No immediate actions needed"}
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-indigo-600">
          💡 <strong>Tip:</strong> Change the date above to see analytics for
          different days. Use the full Analytics Dashboard for detailed trends,
          teacher performance, and comprehensive reports.
        </div>
      </div>

      {/* Add dropdown above the table */}
      {/* Remove the dropdown above the table */}

      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="min-w-[900px] w-full divide-y divide-gray-200 text-xs sm:text-sm">
          <thead className="bg-gradient-to-r from-indigo-100 to-white sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Ustadz Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Link
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Scheduled At
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Sent Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Clicked Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Time Difference
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Attendance Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Absent Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map(
                (
                  record: IntegratedRecord & {
                    scheduledDateObj?: Date | null;
                    clickedDateObj?: Date | null;
                  }
                ) => {
                  const sortedLinks = [...record.links].sort((a, b) => {
                    if (!a.sent_time) return 1;
                    if (!b.sent_time) return -1;
                    return (
                      new Date(b.sent_time).getTime() -
                      new Date(a.sent_time).getTime()
                    );
                  });
                  let link =
                    sortedLinks &&
                    sortedLinks.length > 1 &&
                    selectedLinks[record.student_id]
                      ? sortedLinks.find(
                          (l) => l.id === selectedLinks[record.student_id]
                        )
                      : sortedLinks && sortedLinks.length === 1
                      ? sortedLinks[0]
                      : null;
                  const scheduledDateStr = record.scheduledAt
                    ? record.scheduledAt.substring(0, 10)
                    : "";
                  const notifyKey = `${record.student_id}|${scheduledDateStr}`;
                  return (
                    <tr
                      key={record.student_id}
                      className="hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {record.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {record.ustazName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {sortedLinks && sortedLinks.length > 1 ? (
                          <select
                            value={
                              selectedLinks[record.student_id] ??
                              sortedLinks[0]?.id
                            }
                            onChange={(e) =>
                              setSelectedLinks((prev) => ({
                                ...prev,
                                [record.student_id]: Number(e.target.value),
                              }))
                            }
                            className="border rounded px-2 py-1 text-blue-700 bg-white"
                          >
                            {sortedLinks.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.sent_time
                                  ? formatDateSafely(l.sent_time)
                                  : "No Sent Time"}
                              </option>
                            ))}
                          </select>
                        ) : sortedLinks && sortedLinks.length === 1 ? (
                          <a
                            href={sortedLinks[0].link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Link
                          </a>
                        ) : (
                          "N/A"
                        )}
                        {sortedLinks && sortedLinks.length > 1 && (
                          <a
                            href={
                              sortedLinks.find(
                                (l) =>
                                  l.id ===
                                  (selectedLinks[record.student_id] ??
                                    sortedLinks[0]?.id)
                              )?.link
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatTimeOnly(record.scheduledAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {(() => {
                          let link =
                            sortedLinks && sortedLinks.length > 1
                              ? sortedLinks.find(
                                  (l) =>
                                    l.id ===
                                    (selectedLinks[record.student_id] ??
                                      sortedLinks[0]?.id)
                                )
                              : sortedLinks && sortedLinks.length === 1
                              ? sortedLinks[0]
                              : null;
                          return link && link.sent_time
                            ? formatTimeOnly(link.sent_time)
                            : "N/A";
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {(() => {
                          let link =
                            sortedLinks && sortedLinks.length > 1
                              ? sortedLinks.find(
                                  (l) =>
                                    l.id ===
                                    (selectedLinks[record.student_id] ??
                                      sortedLinks[0]?.id)
                                )
                              : sortedLinks && sortedLinks.length === 1
                              ? sortedLinks[0]
                              : null;
                          return link && link.clicked_at
                            ? formatTimeOnly(link.clicked_at)
                            : "N/A";
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {(() => {
                          let link =
                            sortedLinks && sortedLinks.length > 1
                              ? sortedLinks.find(
                                  (l) =>
                                    l.id ===
                                    (selectedLinks[record.student_id] ??
                                      sortedLinks[0]?.id)
                                )
                              : sortedLinks && sortedLinks.length === 1
                              ? sortedLinks[0]
                              : null;
                          let colorClass = "bg-gray-100 text-gray-800";
                          let diffLabel = "N/A";
                          if (
                            link &&
                            link.sent_time &&
                            record.scheduledAt &&
                            record.scheduledAt !== "null"
                          ) {
                            // Fix malformed scheduledAt format
                            let fixedScheduledAt = record.scheduledAt.replace(
                              /T(\d{1,2}):(\d{2}) (AM|PM)\.000Z/,
                              (match, hour, min, period) => {
                                let h = parseInt(hour);
                                if (period === "PM" && h !== 12) h += 12;
                                if (period === "AM" && h === 12) h = 0;
                                return `T${h
                                  .toString()
                                  .padStart(2, "0")}:${min}:00.000Z`;
                              }
                            );
                            const scheduled = new Date(fixedScheduledAt);
                            const sent = new Date(link.sent_time);
                            if (
                              !isNaN(scheduled.getTime()) &&
                              !isNaN(sent.getTime())
                            ) {
                              const diff = Math.round(
                                (sent.getTime() - scheduled.getTime()) / 60000
                              );
                              if (diff < 0) {
                                diffLabel = `${Math.abs(diff)} min early`;
                                colorClass = "bg-green-100 text-green-800";
                              } else if (diff <= 3) {
                                diffLabel = `Early (${diff} min)`;
                                colorClass = "bg-green-100 text-green-800";
                              } else if (diff <= 5) {
                                diffLabel = `On Time (${diff} min)`;
                                colorClass = "bg-blue-100 text-blue-800";
                              } else {
                                diffLabel = `Very Late (${diff} min)`;
                                colorClass = "bg-red-100 text-red-800";
                              }
                            }
                          }
                          return (
                            <span
                              className={`px-3 py-1 inline-flex text-xs font-medium rounded-full shadow-sm ${colorClass}`}
                            >
                              {diffLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <span
                          className={`px-3 py-1 inline-flex text-xs font-medium rounded-full shadow-sm
                            ${
                              record.attendance_status === "Present"
                                ? "bg-green-100 text-green-800"
                                : record.attendance_status === "Absent"
                                ? "bg-red-100 text-red-800"
                                : record.attendance_status === "Permission"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          `}
                        >
                          {record.attendance_status
                            .replace("-", " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {startDate && endDate ? (
                          <div className="flex flex-col items-start">
                            <span
                              className={`px-3 py-1 inline-flex text-xs font-medium rounded-full shadow-sm ${
                                record.absentDaysCount === 0
                                  ? "bg-green-100 text-green-800"
                                  : record.absentDaysCount &&
                                    record.absentDaysCount <= 3
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {record.absentDaysCount || 0} absent
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {format(parseISO(startDate), "MMM dd")} -{" "}
                              {format(parseISO(endDate), "MMM dd")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start">
                            <span className="text-gray-400 text-xs">
                              No date range set
                            </span>
                            <span className="text-xs text-gray-400">
                              Set range above to see absent count
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <button
                          onClick={() => setExpandedStudentId(record.student_id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center shadow-md transition-transform hover:scale-105"
                          title="View details"
                        >
                          <FiUser className="mr-1" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                }
              )
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-8 text-center text-gray-500 bg-gray-50 rounded-b-lg"
                >
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && limit < 1000 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded-lg hover:from-indigo-200 hover:to-indigo-300 disabled:bg-gray-200 disabled:text-gray-400 font-medium shadow-sm transition-all"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 font-medium">
            Page {page} of {totalPages} ({total} total students)
          </span>
          <button
            onClick={() =>
              setPage((prev) => (prev < totalPages ? prev + 1 : prev))
            }
            disabled={page === totalPages}
            className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded-lg hover:from-indigo-200 hover:to-indigo-300 disabled:bg-gray-200 disabled:text-gray-400 font-medium shadow-sm transition-all"
          >
            Next
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!studentToNotify}
        title="Confirm Notification"
        message="Are you sure you want to send an SMS reminder to this teacher?"
        onConfirm={confirmNotify}
        onCancel={() => setStudentToNotify(null)}
      />

      {/* Attendance Details Modal/Expandable Row */}
      {typeof window !== "undefined" && expandedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setExpandedStudentId(null)}
            >
              <FiX />
            </button>
            <h3 className="text-lg font-bold mb-4">Attendance Details</h3>
            {(() => {
              const student = data.find(
                (r) => r.student_id === expandedStudentId
              );
              if (!student) return <div>Not found</div>;
              let link =
                student.links &&
                student.links.length > 1 &&
                selectedLinks[student.student_id]
                  ? student.links.find(
                      (l) => l.id === selectedLinks[student.student_id]
                    )
                  : student.links && student.links.length === 1
                  ? student.links[0]
                  : null;
              return (
                <div className="space-y-2">
                  <div>
                    <b>Name:</b> {student.studentName}
                  </div>
                  <div>
                    <b>Ustadz:</b> {student.ustazName}
                  </div>
                  <div>
                    <b>Scheduled At:</b> {formatDateSafely(student.scheduledAt)}
                  </div>
                  <div>
                    <b>Sent Time:</b>{" "}
                    {link && link.sent_time
                      ? formatDateSafely(link.sent_time)
                      : "N/A"}
                  </div>
                  <div>
                    <b>Clicked Time:</b>{" "}
                    {link && link.clicked_at
                      ? formatDateSafely(link.clicked_at)
                      : "N/A"}
                  </div>
                  <div>
                    <b>Time Difference:</b>{" "}
                    {(() => {
                      if (!link || !link.sent_time || !student.scheduledAt)
                        return "N/A";
                      const scheduled = new Date(student.scheduledAt);
                      const sent = new Date(link.sent_time);

                      const diff = Math.round(
                        (sent.getTime() - scheduled.getTime()) / 60000
                      );
                      if (diff < 0) return `${Math.abs(diff)} min early`;
                      if (diff <= 3) return `Early (${diff} min)`;
                      if (diff <= 5) return `On Time (${diff} min)`;
                      return `Very Late (${diff} min)`;
                    })()}
                  </div>
                  <div>
                    <b>Status:</b> {student.attendance_status}
                  </div>
                  <div>
                    <b>Link:</b>{" "}
                    {link ? (
                      <a
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Open
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </div>
                  <div>
                    <b>Attendance Status:</b>{" "}
                    {student.attendance_status
                      .replace("-", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
