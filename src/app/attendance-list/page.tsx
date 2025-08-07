"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Toaster, toast } from "react-hot-toast";
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
  FiCheck,
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
  controllerName: string;
  scheduledAt: string;
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
  daypackages: string;
}

interface Stats {
  totalLinks: number;
  totalSent: number;
  totalClicked: number;
  missedDeadlines: number;
  responseRate: string;
}

// Utility to format attendance status
const formatAttendanceStatus = (status: string): string => {
  const validStatuses = ["Present", "Absent", "Permission", "Not Taken"];
  const normalizedStatus =
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return validStatuses.includes(normalizedStatus)
    ? normalizedStatus
    : "Not Taken";
};

// Modal component for confirmations
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 sm:p-6 max-w-md w-full border border-indigo-100">
        <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-4">
          {title}
        </h3>
        <p className="text-sm text-indigo-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg transition-all duration-300"
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-300"
            aria-label="Confirm"
          >
            Confirm
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Skeleton component for loading state
const AttendanceListSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-indigo-200 rounded w-1/4 mb-6"></div>
          <div className="flex flex-wrap gap-2 mb-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-indigo-100 rounded w-20"></div>
            ))}
          </div>
          <div className="h-10 bg-indigo-100 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-indigo-50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AttendanceList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<IntegratedRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ustaz, setUstaz] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [dayPackageFilter, setDayPackageFilter] = useState("all");
  const [sentStatus, setSentStatus] = useState("");
  const [clickedStatus, setClickedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const selectedDayName = useMemo(
    () => new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
    [date]
  );

  const dayPackages = useMemo(() => {
    const uniquePackages = [
      ...new Set(data.map((record) => record.daypackages)),
    ];
    return ["all", ...uniquePackages.filter(Boolean).sort()];
  }, [data]);

  useEffect(() => {
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
        controllerId: session?.user?.id || "",
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(notifyStudentId && { notify: notifyStudentId.toString() }),
      });
      const response = await fetch(
        `/api/attendance-list?${params.toString()}`,
        {
          credentials: "include",
        }
      );
      const result = await response.json();
      console.log("API response:", result);
      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }
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
        setError("No attendance data available");
      } else {
        const updatedData = result.integratedData.map((record: any) => {
          let selectedLink = null;
          if (record.links && record.links.length > 0) {
            selectedLink = [...record.links].sort((a: any, b: any) => {
              if (!a.sent_time) return 1;
              if (!b.sent_time) return -1;
              return (
                new Date(b.sent_time).getTime() -
                new Date(a.sent_time).getTime()
              );
            })[0];
          }
          let scheduled: Date | null = null;
          try {
            scheduled = parseISO(record.scheduledAt);
            if (!isValid(scheduled)) scheduled = null;
          } catch {
            scheduled = null;
          }
          return {
            ...record,
            scheduledDateObj: scheduled,
            selectedLink,
            attendance_status: formatAttendanceStatus(record.attendance_status),
          };
        });
        setData(updatedData);
        setTotal(result.total || 0);
        setStats(result.stats || null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err instanceof Error
          ? `Failed to load attendance list: ${err.message}`
          : "Failed to load attendance list"
      );
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedStudents.length === 0 || !bulkStatus) {
      toast.error("Please select students and a status to update.");
      return;
    }

    try {
      const updates = selectedStudents.map((studentId) => ({
        student_id: studentId,
        date,
        attendance_status: bulkStatus,
      }));

      const response = await fetch("/api/attendance-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update attendance");
      }

      toast.success("Attendance updated successfully!");
      setSelectedStudents([]);
      setBulkStatus("");
      setShowBulkConfirm(false);
      fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update attendance"
      );
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchData();
    }
  }, [
    date,
    ustaz,
    attendanceStatus,
    sentStatus,
    clickedStatus,
    page,
    limit,
    status,
    session,
  ]);

  if (status === "loading") return <AttendanceListSkeleton />;
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

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
      "Student Name,Ustadz Name,Controller Name,Link,Scheduled At,Sent Time,Clicked Time,Time Difference,Attendance Status,Day Package",
    ];
    const rows = filteredData.map((record) => {
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
      let diffLabel = "N/A";
      if (link && link.sent_time && record.scheduledAt) {
        try {
          const scheduled = parseISO(record.scheduledAt);
          const sent = parseISO(link.sent_time);
          if (isValid(scheduled) && isValid(sent)) {
            const diff = Math.round(
              (sent.getTime() - scheduled.getTime()) / 60000
            );
            if (diff < 0) diffLabel = `${Math.abs(diff)} min early`;
            else if (diff <= 3) diffLabel = "Early";
            else if (diff <= 5) diffLabel = "On Time";
            else diffLabel = "Very Late";
          }
        } catch {
          diffLabel = "N/A";
        }
      }
      return [
        record.studentName,
        record.ustazName,
        record.controllerName,
        link ? link.link : "N/A",
        formatDateSafely(record.scheduledAt),
        link && link.sent_time ? formatDateSafely(link.sent_time) : "N/A",
        link && link.clicked_at ? formatDateSafely(link.clicked_at) : "N/A",
        diffLabel,
        record.attendance_status,
        record.daypackages,
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
    setUstaz("");
    setAttendanceStatus("");
    setDayPackageFilter("all");
    setSentStatus("");
    setClickedStatus("");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setSelectedStudents([]);
    setBulkStatus("");
  };

  const handleNotifyClick = (studentId: number, scheduledDate: string) => {
    setStudentToNotify(`${studentId}|${scheduledDate}`);
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
          `Failed to send notification: ${result.error || "Unknown error"}`
        );
      }
    } catch (err) {
      toast.error("An unexpected error occurred while sending the SMS.");
    } finally {
      setStudentToNotify(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDateSafely = (dateStr: string) => {
    if (!dateStr || dateStr === "Not Sent" || dateStr === "N/A") {
      return "N/A";
    }
    try {
      const datePart = dateStr.substring(0, 10);
      const timePart = dateStr.substring(11, 16);
      return `${datePart} ${timePart}`;
    } catch {
      return "N/A";
    }
  };

  const filteredData = useMemo(() => {
    return data
      .filter((record) =>
        record.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((record) => {
        if (!attendanceStatus) return true;
        return (
          record.attendance_status.toLowerCase() ===
          attendanceStatus.toLowerCase()
        );
      })
      .filter((record) => {
        if (dayPackageFilter === "all") return true;
        if (!record.daypackages) return dayPackageFilter === "All days";
        const daypackagesLower = record.daypackages.toLowerCase();
        return (
          daypackagesLower.includes(dayPackageFilter.toLowerCase()) ||
          dayPackageFilter.toLowerCase() === "all days" ||
          (["Monday", "Wednesday", "Friday"].includes(selectedDayName) &&
            daypackagesLower.includes("mwf")) ||
          (["Tuesday", "Thursday", "Saturday"].includes(selectedDayName) &&
            daypackagesLower.includes("tts"))
        );
      })
      .filter((record) => {
        if (!sentStatus) return true;
        const hasSentLink = record.links.some((l) => l.sent_time);
        return sentStatus === "sent" ? hasSentLink : !hasSentLink;
      })
      .filter((record) => {
        if (!clickedStatus) return true;
        const hasClickedLink = record.links.some((l) => l.clicked_at);
        return clickedStatus === "clicked" ? hasClickedLink : !hasClickedLink;
      });
  }, [
    data,
    searchQuery,
    dayPackageFilter,
    selectedDayName,
    attendanceStatus,
    sentStatus,
    clickedStatus,
  ]);

  const attendanceStats = filteredData.reduce(
    (
      acc: {
        total: number;
        present: number;
        absent: number;
        permission: number;
        notTaken: number;
      },
      record
    ) => {
      acc.total++;
      const status = record.attendance_status.toLowerCase();
      if (status === "present") acc.present++;
      else if (status === "absent") acc.absent++;
      else if (status === "permission") acc.permission++;
      else if (status === "not taken") acc.notTaken++;
      return acc;
    },
    { total: 0, present: 0, absent: 0, permission: 0, notTaken: 0 }
  );

  if (loading) {
    return <AttendanceListSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-red-700 mb-2">
            Error
          </h2>
          <p className="text-sm sm:text-base text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-red-500"
            aria-label="Retry loading data"
          >
            <FiRefreshCw className="mr-2" /> Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6">
      <Toaster position="top-center" reverseOrder={false} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push("/controller")}
              className="group flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
              aria-label="Back to dashboard"
            >
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push("/analytics")}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
              aria-label="View analytics"
            >
              <FiBarChart className="mr-2" />
              Analytics
            </button>
            <button
              onClick={() => router.push("/reports")}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
              aria-label="View reports"
            >
              <FiFileText className="mr-2" />
              Reports
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 bg-indigo-50/60 border border-indigo-100 px-3 sm:px-4 py-2 rounded-lg shadow-sm">
            <FiCalendar className="text-indigo-500 w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base font-medium text-indigo-700">
              Selected Date: {format(parseISO(date), "MMMM dd, yyyy")}
            </span>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 flex flex-wrap gap-1 sm:gap-2 items-center">
          {daysOfWeek.map((d) => (
            <button
              key={d.label}
              onClick={() => setDate(d.getDate())}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                date === d.getDate()
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-md"
                  : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
              }`}
              aria-label={`Select ${d.label}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500 w-5 h-5 sm:w-6 sm:h-6" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name..."
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                aria-label="Search students"
              />
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 justify-end">
            <button
              onClick={handleRefresh}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
              aria-label="Refresh data"
            >
              <FiRefreshCw className="mr-2" /> Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
              aria-label="Export to CSV"
            >
              <FiDownload className="mr-2" /> Export CSV
            </button>
            <button
              onClick={clearFilters}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-indigo-50 text-indigo-700 text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-indigo-200 hover:border-indigo-300 transform hover:scale-105"
              aria-label="Clear filters"
            >
              <FiX className="mr-2" /> Clear Filters
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-2xl shadow-lg bg-white border border-indigo-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-indigo-500 w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-lg sm:text-xl font-semibold text-indigo-900">
              Filters
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
              <span className="text-xs font-semibold text-indigo-700 mb-1">
                Absent Days Range
              </span>
              <p className="text-xs text-indigo-600 mb-2">
                Select date range to see absent days count
              </p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Start date for absent days range"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="End date for absent days range"
              />
            </div>
            <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
              <span className="text-xs font-semibold text-indigo-700 mb-1">
                Single Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Select date"
              />
            </div>
            <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
              <span className="text-xs font-semibold text-indigo-700 mb-1">
                Ustadz
              </span>
              <select
                value={ustaz}
                onChange={(e) => setUstaz(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Filter by Ustadz"
              >
                <option value="">All</option>
                {[...new Set(data.map((d) => d.ustazName))].sort().map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
              <span className="text-xs font-semibold text-indigo-700 mb-1">
                Attendance Status
              </span>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Filter by attendance status"
              >
                <option value="">All</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Permission">Permission</option>
                <option value="Not Taken">Not Taken</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
              <span className="text-xs font-semibold text-indigo-700 mb-1">
                Day Package
              </span>
              <select
                value={dayPackageFilter}
                onChange={(e) => setDayPackageFilter(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Filter by day package"
              >
                {dayPackages.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg === "all" ? "All Days" : pkg}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 bg-indigo-50 rounded-xl p-3 min-w-[160px]">
              <span className="text-xs font-semibold text-indigo-700 mb-1">
                Link Status
              </span>
              <select
                value={sentStatus}
                onChange={(e) => setSentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Filter by sent status"
              >
                <option value="">Sent (all)</option>
                <option value="sent">Sent</option>
                <option value="notSent">Not Sent</option>
              </select>
              <select
                value={clickedStatus}
                onChange={(e) => setClickedStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                aria-label="Filter by clicked status"
              >
                <option value="">Clicked? (all)</option>
                <option value="clicked">Clicked</option>
                <option value="notClicked">Not Clicked</option>
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-4 sm:mb-6 p-4 sm:p-6 bg-white border border-indigo-100 rounded-2xl shadow-lg"
        >
          <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-2 sm:mb-4">
            Bulk Update Attendance
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-indigo-200 rounded-lg bg-white text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
              aria-label="Select bulk update status"
            >
              <option value="">Select Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Permission">Permission</option>
              <option value="Not Taken">Not Taken</option>
            </select>
            <button
              onClick={() => setShowBulkConfirm(true)}
              disabled={selectedStudents.length === 0 || !bulkStatus}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:bg-gray-200 disabled:text-gray-400 focus:ring-2 focus:ring-indigo-500"
              aria-label="Apply bulk update"
            >
              <FiCheck className="mr-2 inline" /> Apply to{" "}
              {selectedStudents.length} Student(s)
            </button>
          </div>
        </motion.div>

        {startDate && endDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-4 sm:mb-6 p-4 sm:p-6 bg-white border border-indigo-100 rounded-2xl shadow-lg"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-2 sm:mb-4">
              Absent Days Legend
            </h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></span>
                <span className="text-indigo-700">
                  Green: Perfect attendance (0 absent)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full"></span>
                <span className="text-indigo-700">
                  Yellow: Moderate (1-3 absent)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-100 border border-red-300 rounded-full"></span>
                <span className="text-indigo-700">
                  Red: Concerning (4+ absent)
                </span>
              </div>
            </div>
            <p className="text-sm text-indigo-600 mt-2 sm:mt-4">
              Showing absent days from{" "}
              {format(parseISO(startDate), "MMMM dd, yyyy")} to{" "}
              {format(parseISO(endDate), "MMMM dd, yyyy")}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-4 sm:mb-6"
        >
          <div className="mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-2 sm:mb-4">
              📊 Analytics for {format(parseISO(date), "MMMM dd, yyyy")}
            </h3>
            <p className="text-sm text-indigo-600">
              Showing attendance statistics for the selected date
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Total Students",
                value: attendanceStats.total,
                color: "blue",
              },
              {
                label: "Present",
                value: attendanceStats.present,
                color: "green",
              },
              { label: "Absent", value: attendanceStats.absent, color: "red" },
              {
                label: "Permission",
                value: attendanceStats.permission,
                color: "yellow",
              },
              {
                label: "Not Taken",
                value: attendanceStats.notTaken,
                color: "gray",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`bg-${stat.color}-50 rounded-2xl p-4 shadow-md flex flex-col items-center border border-${stat.color}-100`}
              >
                <span
                  className={`text-xl sm:text-2xl font-bold text-${stat.color}-700`}
                >
                  {stat.value}
                </span>
                <span className={`text-sm text-${stat.color}-800 mt-1`}>
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
          {stats && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-2xl p-4 shadow-md border border-blue-100">
                <span className="text-sm text-blue-800">Total Links</span>
                <span className="text-xl font-bold text-blue-700">
                  {stats.totalLinks}
                </span>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 shadow-md border border-green-100">
                <span className="text-sm text-green-800">Links Sent</span>
                <span className="text-xl font-bold text-green-700">
                  {stats.totalSent}
                </span>
              </div>
              <div className="bg-purple-50 rounded-2xl p-4 shadow-md border border-purple-100">
                <span className="text-sm text-purple-800">Links Clicked</span>
                <span className="text-xl font-bold text-purple-700">
                  {stats.totalClicked}
                </span>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 shadow-md border border-red-100">
                <span className="text-sm text-red-800">Missed Deadlines</span>
                <span className="text-xl font-bold text-red-700">
                  {stats.missedDeadlines}
                </span>
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 shadow-md border border-teal-100">
                <span className="text-sm text-teal-800">Response Rate</span>
                <span className="text-xl font-bold text-teal-700">
                  {stats.responseRate}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100"
        >
          <table className="min-w-[900px] w-full divide-y divide-indigo-100 text-sm">
            <thead className="bg-indigo-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-indigo-900 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={
                      selectedStudents.length === filteredData.length &&
                      filteredData.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(
                          filteredData.map((record) => record.student_id)
                        );
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    aria-label="Select all students"
                  />
                </th>
                {[
                  "Student Name",
                  "Ustadz Name",
                  "Controller",
                  "Link",
                  "Scheduled At",
                  "Sent Time",
                  "Clicked Time",
                  "Time Difference",
                  "Attendance Status",
                  "Absent Days",
                  "Day Package",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-indigo-900 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-indigo-100">
              {filteredData.length > 0 ? (
                filteredData.map((record) => {
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
                    <motion.tr
                      key={record.student_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-indigo-50 transition-all duration-200"
                      onClick={() => setExpandedStudentId(record.student_id)}
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(record.student_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents((prev) => [
                                ...prev,
                                record.student_id,
                              ]);
                            } else {
                              setSelectedStudents((prev) =>
                                prev.filter((id) => id !== record.student_id)
                              );
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          aria-label={`Select ${record.studentName}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {record.studentName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {record.ustazName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {record.controllerName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {sortedLinks && sortedLinks.length > 1 ? (
                          <div className="flex items-center gap-2">
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
                              className="border border-indigo-200 rounded-lg px-2 py-1 text-indigo-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              aria-label="Select link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {sortedLinks.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.sent_time
                                    ? formatDateSafely(l.sent_time)
                                    : "No Sent Time"}
                                </option>
                              ))}
                            </select>
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
                              className="text-indigo-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open
                            </a>
                          </div>
                        ) : sortedLinks && sortedLinks.length === 1 ? (
                          <a
                            href={sortedLinks[0].link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Link
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {formatDateSafely(record.scheduledAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {link && link.sent_time
                          ? formatDateSafely(link.sent_time)
                          : "N/A"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {link && link.clicked_at
                          ? formatDateSafely(link.clicked_at)
                          : "N/A"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {(() => {
                          let colorClass = "bg-gray-100 text-gray-800";
                          let diffLabel = "N/A";
                          if (link && link.sent_time && record.scheduledAt) {
                            try {
                              const scheduled = parseISO(record.scheduledAt);
                              const sent = parseISO(link.sent_time);
                              if (isValid(scheduled) && isValid(sent)) {
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
                            } catch {
                              diffLabel = "N/A";
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
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        <select
                          value={record.attendance_status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              const response = await fetch(
                                "/api/attendance-list",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    updates: [
                                      {
                                        student_id: record.student_id,
                                        date,
                                        attendance_status: newStatus,
                                      },
                                    ],
                                  }),
                                  credentials: "include",
                                }
                              );
                              if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(
                                  errorData.error ||
                                    "Failed to update attendance"
                                );
                              }
                              toast.success("Attendance updated successfully!");
                              fetchData();
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to update attendance"
                              );
                            }
                          }}
                          className="border border-indigo-200 rounded-lg px-2 py-1 text-indigo-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          aria-label="Update attendance status"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Permission">Permission</option>
                          <option value="Not Taken">Not Taken</option>
                        </select>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
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
                            <span className="text-xs text-indigo-500 mt-1">
                              {format(parseISO(startDate), "MMM dd")} -{" "}
                              {format(parseISO(endDate), "MMM dd")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start">
                            <span className="text-indigo-500 text-xs">
                              No date range set
                            </span>
                            <span className="text-xs text-indigo-500">
                              Set range above to see absent count
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {record.daypackages || "All days"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-medium">
                        {(() => {
                          const isNotified =
                            notifiedStudentDateKeys.includes(notifyKey);
                          const canNotify =
                            (!record.links ||
                              record.links.length === 0 ||
                              !record.links.some((l) => l.sent_time)) &&
                            record.scheduledAt &&
                            new Date() >
                              new Date(
                                new Date(record.scheduledAt).getTime() +
                                  5 * 60000
                              );
                          if (isNotified) {
                            return (
                              <button
                                disabled
                                className="px-3 py-1 bg-green-200 text-green-800 rounded-lg flex items-center shadow-sm cursor-not-allowed"
                                aria-label="Notification already sent"
                              >
                                <FiCheckSquare className="mr-1" /> Notified
                              </button>
                            );
                          }
                          if (canNotify) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotifyClick(
                                    record.student_id,
                                    scheduledDateStr
                                  );
                                }}
                                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center shadow-md transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-yellow-500"
                                title="Notify the teacher that the link was not sent after 5 minutes past scheduled time"
                                aria-label="Notify teacher"
                              >
                                <FiBell className="mr-1" /> Notify Teacher
                              </button>
                            );
                          }
                          return (
                            <span className="px-3 py-1 text-xs text-indigo-500">
                              No Action
                            </span>
                          );
                        })()}
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 sm:px-6 py-8 text-center text-indigo-500 bg-white rounded-b-2xl"
                  >
                    No data available. Try adjusting filters or refreshing the
                    data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>

        {total > limit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4"
          >
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:bg-gray-200 disabled:text-gray-400 focus:ring-2 focus:ring-indigo-500"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm sm:text-base text-indigo-700 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() =>
                setPage((prev) => (prev < totalPages ? prev + 1 : prev))
              }
              disabled={page === totalPages}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:bg-gray-200 disabled:text-gray-400 focus:ring-2 focus:ring-indigo-500"
              aria-label="Next page"
            >
              Next
            </button>
          </motion.div>
        )}

        <ConfirmModal
          open={!!studentToNotify}
          title="Confirm Notification"
          message="Are you sure you want to send an SMS reminder to this teacher?"
          onConfirm={confirmNotify}
          onCancel={() => setStudentToNotify(null)}
        />

        <ConfirmModal
          open={showBulkConfirm}
          title="Confirm Bulk Update"
          message={`Are you sure you want to update the attendance status to "${formatAttendanceStatus(
            bulkStatus
          )}" for ${selectedStudents.length} student(s)?`}
          onConfirm={handleBulkUpdate}
          onCancel={() => setShowBulkConfirm(false)}
        />

        {expandedStudentId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 sm:p-6 max-w-md w-full relative border border-indigo-100">
              <button
                className="absolute top-2 right-2 text-indigo-500 hover:text-indigo-700"
                onClick={() => setExpandedStudentId(null)}
                aria-label="Close details"
              >
                <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-4">
                Attendance Details
              </h3>
              {(() => {
                const student = data.find(
                  (r) => r.student_id === expandedStudentId
                );
                if (!student)
                  return <p className="text-indigo-700">Student not found.</p>;
                return (
                  <div className="space-y-4 text-sm text-indigo-700">
                    <p>
                      <strong>Student Name:</strong> {student.studentName}
                    </p>
                    <p>
                      <strong>Ustadz Name:</strong> {student.ustazName}
                    </p>
                    <p>
                      <strong>Controller Name:</strong> {student.controllerName}
                    </p>
                    <p>
                      <strong>Day Package:</strong>{" "}
                      {student.daypackages || "All days"}
                    </p>
                    <p>
                      <strong>Scheduled At:</strong>{" "}
                      {formatDateSafely(student.scheduledAt)}
                    </p>
                    <p>
                      <strong>Attendance Status:</strong>{" "}
                      {student.attendance_status}
                    </p>
                    <p>
                      <strong>Absent Days:</strong>{" "}
                      {student.absentDaysCount !== undefined
                        ? `${student.absentDaysCount} (from ${format(
                            parseISO(startDate),
                            "MMM dd"
                          )} to ${format(parseISO(endDate), "MMM dd")})`
                        : "Set date range to view"}
                    </p>
                    <div>
                      <strong>Zoom Links:</strong>
                      {student.links.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {student.links.map((link) => (
                            <li
                              key={link.id}
                              className="border-t border-indigo-100 pt-2"
                            >
                              <p>
                                <strong>Link:</strong>{" "}
                                <a
                                  href={link.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline"
                                >
                                  {link.link.substring(0, 30)}...
                                </a>
                              </p>
                              <p>
                                <strong>Sent Time:</strong>{" "}
                                {link.sent_time
                                  ? formatDateSafely(link.sent_time)
                                  : "Not Sent"}
                              </p>
                              <p>
                                <strong>Clicked Time:</strong>{" "}
                                {link.clicked_at
                                  ? formatDateSafely(link.clicked_at)
                                  : "Not Clicked"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2">No links available.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
