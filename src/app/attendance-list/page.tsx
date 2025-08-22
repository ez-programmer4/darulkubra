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
  FiClock,
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

interface NotificationRecord {
  studentId: number;
  date: string;
  timestamp: number;
  status: "sent" | "failed" | "pending";
}

export default function AttendanceList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<IntegratedRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ustaz, setUstaz] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [sentStatus, setSentStatus] = useState("");
  const [clickedStatus, setClickedStatus] = useState("");
  const [latenessFilter, setLatenessFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(
    null
  );
  const [studentToNotify, setStudentToNotify] = useState<string | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<
    NotificationRecord[]
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notificationHistory");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedLinks, setSelectedLinks] = useState<{
    [studentId: number]: number;
  }>({});
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [allData, setAllData] = useState<IntegratedRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({ key: "", direction: null });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(60000); // 1 minute default

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "notificationHistory",
        JSON.stringify(notificationHistory)
      );
    }
  }, [notificationHistory]);

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
        {
          credentials: "include",
        }
      );
      const result = await response.json();

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      if (notifyStudentId) {
        if (result.message === "Notification sent to teacher") {
          toast.success("SMS notification sent to teacher!");
          setNotificationHistory((prev) => [
            ...prev,
            {
              studentId: notifyStudentId,
              date,
              timestamp: Date.now(),
              status: "sent",
            },
          ]);
        } else {
          toast.error(`Failed to send SMS: ${result.error || "Unknown error"}`);
          setNotificationHistory((prev) => [
            ...prev,
            {
              studentId: notifyStudentId,
              date,
              timestamp: Date.now(),
              status: "failed",
            },
          ]);
        }
        return;
      }
      if (!result.integratedData || !Array.isArray(result.integratedData)) {
        setData([]);
        setTotal(0);
      } else {
        const updatedData = result.integratedData.map((record: any) => {
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
          let scheduled: Date | null = null;
          if (record.scheduledAt && record.scheduledAt !== "null") {
            scheduled = parseISO(record.scheduledAt);
            if (!isValid(scheduled)) scheduled = null;
          }
          return {
            ...record,
            scheduledDateObj: scheduled,
            selectedLink,
          };
        });
        setData(updatedData);
        setTotal(result.total || 0);
        setStats(result.stats || null);
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
    fetchAllDataForEmergencyAsync();
  }, [
    date,
    startDate,
    endDate,
    ustaz,
    attendanceStatus,
    sentStatus,
    clickedStatus,
    page,
    limit,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      fetchAllDataForEmergencyAsync();
    }, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, date, ustaz]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Unauthorized</div>;

  const user = session?.user;

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

  const fetchAllDataForEmergencyAsync = async () => {
    try {
      const params = new URLSearchParams({
        date,
        ustaz,
        attendanceStatus,
        sentStatus,
        clickedStatus,
        page: "1",
        limit: "1000",
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const response = await fetch(
        `/api/attendance-list?${params.toString()}`,
        {
          credentials: "include",
        }
      );
      const result = await response.json();
      if (response.ok && result.integratedData) {
        const updatedData = result.integratedData.map((record: any) => {
          let scheduled: Date | null = null;
          if (record.scheduledAt && record.scheduledAt !== "null") {
            scheduled = parseISO(record.scheduledAt);
            if (!isValid(scheduled)) scheduled = null;
          }
          return {
            ...record,
            scheduledDateObj: scheduled,
          };
        });
        setAllData(updatedData);
      }
    } catch (err) {
      console.error("Failed to fetch all data for emergency:", err);
    }
  };

  const handleRefresh = () => {
    fetchData();
    fetchAllDataForEmergencyAsync();
  };

  const handleNotifyClick = (studentId: number, scheduledDate: string) => {
    const notifyKey = `${studentId}|${scheduledDate}`;
    const lastNotification = notificationHistory.find(
      (n) => n.studentId === studentId && n.date === scheduledDate
    );
    if (lastNotification && Date.now() - lastNotification.timestamp < 300000) {
      toast.error("Please wait 5 minutes before sending another notification");
      return;
    }
    setStudentToNotify(notifyKey);
  };

  const handleBatchNotify = async (studentIds: number[]) => {
    try {
      const promises = studentIds.map(async (studentId) => {
        const response = await fetch(
          `/api/attendance-list?notify=${studentId}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
        const result = await response.json();
        return { studentId, result, response };
      });
      const results = await Promise.all(promises);
      const newNotifications: NotificationRecord[] = results.map(
        ({ studentId, result, response }) => ({
          studentId,
          date,
          timestamp: Date.now(),
          status:
            response.ok && result.message === "Notification sent to teacher"
              ? "sent"
              : "failed",
        })
      );
      setNotificationHistory((prev) => [...prev, ...newNotifications]);
      const successCount = newNotifications.filter(
        (n) => n.status === "sent"
      ).length;
      if (successCount === studentIds.length) {
        toast.success(`Successfully sent ${successCount} notifications!`);
      } else {
        toast.error(
          `Sent ${successCount} notifications, ${
            studentIds.length - successCount
          } failed`
        );
      }
    } catch (err) {
      toast.error("An error occurred while sending batch notifications");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Student Name,Ustadz Name,Link,Scheduled At,Sent Time,Clicked Time,Time Difference,Attendance Status,Absent Days",
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
          record.absentDaysCount || 0,
        ].join(",");
      });
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_list_${
      date ? format(parseISO(date), "yyyyMMdd") : "unknown"
    }.csv`;
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
    setLatenessFilter("");
    setSearchQuery("");
    setPage(1);
  };

  const confirmNotify = async () => {
    if (!studentToNotify || typeof studentToNotify !== "string") return;
    const parts = studentToNotify.split("|");
    if (parts.length !== 2) return;
    const [studentId, scheduledDate] = parts;
    await fetchData(Number(studentId));
    setStudentToNotify(null);
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
      const timePart = dateStr.substring(11, 16);
      const [hours, minutes] = timePart.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch (e) {
      return "N/A";
    }
  };

  const getLatenessStatus = (record: IntegratedRecord) => {
    if (!record.scheduledDateObj)
      return { label: "N/A", colorClass: "bg-gray-100 text-gray-800" };
    const timeDiff =
      (currentTime.getTime() - record.scheduledDateObj.getTime()) / (1000 * 60);
    const hasLink = record.links?.some((link) => link.sent_time);
    const hasClicked = record.links?.some((link) => link.clicked_at);

    if (hasClicked)
      return { label: "Attended", colorClass: "bg-green-100 text-green-800" };
    if (!hasLink && timeDiff >= 1) {
      if (timeDiff < 3)
        return {
          label: `Initial (${timeDiff.toFixed(1)} min)`,
          colorClass: "bg-blue-100 text-blue-800",
        };
      if (timeDiff < 5)
        return {
          label: `Alert (${timeDiff.toFixed(1)} min)`,
          colorClass: "bg-yellow-100 text-yellow-800",
        };
      if (timeDiff < 10)
        return {
          label: `Warning (${timeDiff.toFixed(1)} min)`,
          colorClass: "bg-orange-100 text-orange-800",
        };
      return {
        label: `Severe (${timeDiff.toFixed(1)} min)`,
        colorClass: "bg-red-100 text-red-800",
      };
    }
    return {
      label: hasLink ? "Link Sent" : "N/A",
      colorClass: "bg-gray-100 text-gray-800",
    };
  };

  const filteredData = data.filter((record) => {
    if (
      searchQuery &&
      !record.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (sentStatus) {
      const hasValidLink = record.links.some((link) => link.sent_time);
      if (sentStatus === "sent" && !hasValidLink) return false;
      if (sentStatus === "notSent" && hasValidLink) return false;
    }
    if (clickedStatus) {
      const hasClickedLink = record.links.some((link) => link.clicked_at);
      if (clickedStatus === "clicked" && !hasClickedLink) return false;
      if (clickedStatus === "notClicked" && hasClickedLink) return false;
    }
    if (latenessFilter) {
      const { label } = getLatenessStatus(record);
      if (latenessFilter === "initial" && !label.includes("Initial"))
        return false;
      if (latenessFilter === "alert" && !label.includes("Alert")) return false;
      if (latenessFilter === "warning" && !label.includes("Warning"))
        return false;
      if (latenessFilter === "severe" && !label.includes("Severe"))
        return false;
    }
    return true;
  });

  const emergencyStudents = allData.filter((record) => {
    if (!record.scheduledDateObj) return false;
    const timeDiff =
      (currentTime.getTime() - record.scheduledDateObj.getTime()) / (1000 * 60);
    const hasNoLink =
      !record.links ||
      record.links.length === 0 ||
      !record.links.some((l) => l.sent_time);
    return timeDiff >= 1 && hasNoLink && timeDiff < 15;
  });

  const initialStudents = emergencyStudents.filter((s) => {
    const timeDiff =
      (currentTime.getTime() - (s.scheduledDateObj?.getTime() || 0)) /
      (1000 * 60);
    return timeDiff >= 1 && timeDiff < 3;
  });

  const alertStudents = emergencyStudents.filter((s) => {
    const timeDiff =
      (currentTime.getTime() - (s.scheduledDateObj?.getTime() || 0)) /
      (1000 * 60);
    return timeDiff >= 3 && timeDiff < 5;
  });

  const warningStudents = emergencyStudents.filter((s) => {
    const timeDiff =
      (currentTime.getTime() - (s.scheduledDateObj?.getTime() || 0)) /
      (1000 * 60);
    return timeDiff >= 5 && timeDiff < 10;
  });

  const severeStudents = emergencyStudents.filter((s) => {
    const timeDiff =
      (currentTime.getTime() - (s.scheduledDateObj?.getTime() || 0)) /
      (1000 * 60);
    return timeDiff >= 10 && timeDiff < 15;
  });

  const attendanceStats =
    stats && stats.totalStudents
      ? {
          total: stats.totalStudents,
          Present: stats.presentCount || 0,
          Absent: stats.absentCount || 0,
          Permission: stats.permissionCount || 0,
          "Not Taken": stats.notTakenCount || 0,
        }
      : filteredData.reduce(
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
            acc[record.attendance_status] =
              (acc[record.attendance_status] || 0) + 1;
            return acc;
          },
          { total: 0, Present: 0, Absent: 0, Permission: 0, "Not Taken": 0 }
        );

  const attendanceRate =
    attendanceStats.total > 0
      ? ((attendanceStats.Present / attendanceStats.total) * 100).toFixed(1) +
        "%"
      : "N/A";

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const getValue = (record: IntegratedRecord, key: string) => {
      switch (key) {
        case "studentName":
          return record.studentName.toLowerCase();
        case "ustazName":
          return record.ustazName.toLowerCase();
        case "scheduledAt":
          return record.scheduledDateObj?.getTime() || 0;
        case "timeDifference":
          const linkA = record.links?.find((l) => l.sent_time) || null;
          const linkB = b.links?.find((l) => l.sent_time) || null;
          if (
            !linkA ||
            !linkB ||
            !record.scheduledDateObj ||
            !b.scheduledDateObj
          )
            return 0;
          const diffA =
            (new Date(linkA.sent_time!).getTime() -
              record.scheduledDateObj.getTime()) /
            60000;
          const diffB =
            (new Date(linkB.sent_time!).getTime() -
              b.scheduledDateObj.getTime()) /
            60000;
          return diffA - diffB;
        case "attendanceStatus":
          return record.attendance_status.localeCompare(b.attendance_status);
        default:
          return 0;
      }
    };

    const valueA = getValue(a, sortConfig.key);
    const valueB = getValue(b, sortConfig.key);

    if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  if (loading) {
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
            Selected Date:{" "}
            {date
              ? format(parseISO(date), "MMMM dd, yyyy")
              : "No date selected"}{" "}
            | Current Time: {format(currentTime, "HH:mm:ss")}
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
              const newLimit =
                e.target.value === "all" ? 1000 : parseInt(e.target.value);
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
          <select
            value={autoRefreshInterval / 1000}
            onChange={(e) =>
              setAutoRefreshInterval(Number(e.target.value) * 1000)
            }
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value={30}>Refresh every 30s</option>
            <option value={60}>Refresh every 1min</option>
            <option value={120}>Refresh every 2min</option>
            <option value={300}>Refresh every 5min</option>
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

      <div className="mb-6 p-2 sm:p-4 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-indigo-500 text-xl" />
          <span className="text-lg font-semibold text-indigo-700">Filters</span>
        </div>
        <div className="flex flex-wrap gap-4">
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
          <div className="flex flex-col gap-2 bg-red-50 rounded-xl p-3 min-w-[160px]">
            <span className="text-xs font-semibold text-red-700 mb-1">
              Lateness Status
            </span>
            <select
              value={latenessFilter}
              onChange={(e) => setLatenessFilter(e.target.value)}
              className="w-full px-3 py-2 border border-red-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300 shadow-sm"
            >
              <option value="">All</option>
              <option value="initial">Initial (1-3 min)</option>
              <option value="alert">Alert (3-5 min)</option>
              <option value="warning">Warning (5-10 min)</option>
              <option value="severe">Severe (10-15 min)</option>
            </select>
          </div>
        </div>
      </div>

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
            {startDate ? format(parseISO(startDate), "MMMM dd, yyyy") : "N/A"}{" "}
            to {endDate ? format(parseISO(endDate), "MMMM dd, yyyy") : "N/A"}
          </p>
        </div>
      )}

      <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <FiBell className="text-red-600 text-xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800">
                🚨 Enhanced Lateness Management System
              </h3>
              <p className="text-sm text-red-600">
                Real-time monitoring • Auto-refresh every{" "}
                {autoRefreshInterval / 1000}s • Current time:{" "}
                {format(currentTime, "HH:mm:ss")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                handleBatchNotify(emergencyStudents.map((s) => s.student_id))
              }
              disabled={emergencyStudents.length === 0}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:bg-gray-400 transition-all"
            >
              Notify All ({emergencyStudents.length})
            </button>
            <button
              onClick={() => setShowEmergency(!showEmergency)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-all"
            >
              {showEmergency ? "Hide" : "Show"} Details
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              INITIAL
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {initialStudents.length}
            </div>
            <div className="text-xs text-blue-600">1-3 minutes late</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
            <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
              ALERT
            </div>
            <div className="text-2xl font-bold text-yellow-800">
              {alertStudents.length}
            </div>
            <div className="text-xs text-yellow-600">3-5 minutes late</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm">
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              WARNING
            </div>
            <div className="text-2xl font-bold text-orange-800">
              {warningStudents.length}
            </div>
            <div className="text-xs text-orange-600">5-10 minutes late</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              SEVERE
            </div>
            <div className="text-2xl font-bold text-red-800">
              {severeStudents.length}
            </div>
            <div className="text-xs text-red-600">10-15 minutes late</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-sm text-gray-700 font-medium">
            📊 <strong>Total Overdue:</strong> {emergencyStudents.length}{" "}
            students •<strong>Monitoring:</strong> All students 1+ minutes past
            scheduled time without zoom links
          </p>
          <div className="text-xs text-gray-500 mt-2">
            Debug: All data count: {allData.length} | Students with scheduled
            time: {allData.filter((r) => r.scheduledDateObj).length}
          </div>
        </div>

        {showEmergency && (
          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            {emergencyStudents.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {["severe", "warning", "alert", "initial"].map((severity) => {
                  const students = {
                    severe: severeStudents,
                    warning: warningStudents,
                    alert: alertStudents,
                    initial: initialStudents,
                  }[severity];
                  if (!students || students.length === 0) return null;
                  const colors = {
                    severe: {
                      bg: "bg-red-50",
                      border: "border-red-500",
                      text: "text-red-800",
                      button: "bg-red-500 hover:bg-red-600",
                      badge: "bg-red-500",
                    },
                    warning: {
                      bg: "bg-orange-50",
                      border: "border-orange-500",
                      text: "text-orange-800",
                      button: "bg-orange-500 hover:bg-orange-600",
                      badge: "bg-orange-500",
                    },
                    alert: {
                      bg: "bg-yellow-50",
                      border: "border-yellow-500",
                      text: "text-yellow-800",
                      button: "bg-yellow-500 hover:bg-yellow-600",
                      badge: "bg-yellow-500",
                    },
                    initial: {
                      bg: "bg-blue-50",
                      border: "border-blue-500",
                      text: "text-blue-800",
                      button: "bg-blue-500 hover:bg-blue-600",
                      badge: "bg-blue-500",
                    },
                  }[severity] || {
                    bg: "bg-gray-50",
                    border: "border-gray-500",
                    text: "text-gray-800",
                    button: "bg-gray-500 hover:bg-gray-600",
                    badge: "bg-gray-500",
                  };
                  return (
                    <div key={severity} className="border-b border-gray-200">
                      <div
                        className={`${colors.bg} px-4 py-2 border-l-4 ${colors.border}`}
                      >
                        <h4
                          className={`font-bold ${colors.text} text-sm uppercase`}
                        >
                          {severity} ({students.length})
                        </h4>
                      </div>
                      {students.map((student) => {
                        const timePassed = Math.floor(
                          (currentTime.getTime() -
                            (student.scheduledDateObj?.getTime() || 0)) /
                            (1000 * 60)
                        );
                        const lastNotification = notificationHistory.find(
                          (n) =>
                            n.studentId === student.student_id &&
                            n.date === date
                        );
                        return (
                          <div
                            key={student.student_id}
                            className={`flex justify-between items-center p-3 border-b ${colors.bg.replace(
                              "50",
                              "100"
                            )}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${colors.text}`}>
                                  {student.studentName}
                                </span>
                                <span
                                  className={`text-sm ${colors.text.replace(
                                    "800",
                                    "700"
                                  )}`}
                                >
                                  ({student.ustazName})
                                </span>
                                <span
                                  className={`text-xs ${colors.badge} text-white px-2 py-1 rounded uppercase`}
                                >
                                  {severity}
                                </span>
                                {lastNotification && (
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      lastNotification.status === "sent"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {lastNotification.status === "sent"
                                      ? "Notified"
                                      : "Failed"}{" "}
                                    @{" "}
                                    {format(
                                      new Date(lastNotification.timestamp),
                                      "HH:mm"
                                    )}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-xs ${colors.text.replace(
                                  "800",
                                  "600"
                                )} mt-1`}
                              >
                                Scheduled: {formatTimeOnly(student.scheduledAt)}{" "}
                                | {timePassed} min overdue
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleNotifyClick(
                                  student.student_id,
                                  student.scheduledAt?.substring(0, 10) || ""
                                )
                              }
                              disabled={
                                lastNotification &&
                                Date.now() - lastNotification.timestamp < 300000
                              }
                              className={`px-3 py-1 ${colors.button} text-white rounded text-xs flex items-center transition-all disabled:bg-gray-400 disabled:cursor-not-allowed`}
                            >
                              <FiBell className="mr-1" /> Notify
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-green-600 text-4xl mb-2">✅</div>
                <p className="text-green-700 font-medium">
                  All students are on time!
                </p>
                <p className="text-green-600 text-sm">
                  No overdue zoom links detected
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-4 p-2 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-sm font-semibold text-indigo-800 mb-2">
            📊 Analytics for{" "}
            {date
              ? format(parseISO(date), "MMMM dd, yyyy")
              : "No date selected"}
          </h3>
          <p className="text-xs text-indigo-600">
            Showing attendance statistics for the selected date
          </p>
          <p className="text-xs text-indigo-500 mt-1">
            📋 <strong>Note:</strong> Only Active and "Not yet" students are
            included in attendance tracking and analytics.
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

      <div className="mb-6 p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-indigo-50 to-white border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
            <FiBarChart className="mr-2" />
            Quick Analytics Insights for{" "}
            {date
              ? format(parseISO(date), "MMMM dd, yyyy")
              : "No date selected"}
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
                {date ? format(parseISO(date), "MMM dd") : "N/A"} Performance
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

      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="min-w-[900px] w-full divide-y divide-gray-200 text-xs sm:text-sm">
          <thead className="bg-gradient-to-r from-indigo-100 to-white sticky top-0 z-10">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("studentName")}
              >
                Student Name{" "}
                {sortConfig.key === "studentName" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("ustazName")}
              >
                Ustadz Name{" "}
                {sortConfig.key === "ustazName" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Link
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("scheduledAt")}
              >
                Scheduled At{" "}
                {sortConfig.key === "scheduledAt" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Sent Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Clicked Time
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("timeDifference")}
              >
                Time Difference{" "}
                {sortConfig.key === "timeDifference" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("attendanceStatus")}
              >
                Attendance Status{" "}
                {sortConfig.key === "attendanceStatus" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
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
            {sortedData.length > 0 ? (
              sortedData.map(
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
                  const lastNotification = notificationHistory.find(
                    (n) =>
                      n.studentId === record.student_id &&
                      n.date === scheduledDateStr
                  );
                  const { label: latenessLabel, colorClass: latenessColor } =
                    getLatenessStatus(record);
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
                        <span
                          className={`px-3 py-1 inline-flex text-xs font-medium rounded-full shadow-sm ${latenessColor}`}
                        >
                          {latenessLabel}
                        </span>
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
                              {startDate
                                ? format(parseISO(startDate), "MMM dd")
                                : "N/A"}{" "}
                              -{" "}
                              {endDate
                                ? format(parseISO(endDate), "MMM dd")
                                : "N/A"}
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
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setExpandedStudentId(record.student_id)
                            }
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center shadow-md transition-transform hover:scale-105"
                            title="View details"
                          >
                            <FiUser className="mr-1" /> Details
                          </button>
                          <button
                            onClick={() =>
                              handleNotifyClick(
                                record.student_id,
                                scheduledDateStr
                              )
                            }
                            disabled={
                              lastNotification &&
                              Date.now() - lastNotification.timestamp < 300000
                            }
                            className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center shadow-md transition-transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Notify teacher"
                          >
                            <FiBell className="mr-1" /> Notify
                          </button>
                        </div>
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
        onConfirm={confirmNotify}
        onCancel={() => setStudentToNotify(null)}
        title="Confirm Notification"
        message="Are you sure you want to send an SMS reminder to this teacher?"
      />

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
              const notificationRecords = notificationHistory.filter(
                (n) => n.studentId === student.student_id && n.date === date
              );
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
                    <b>Lateness Status:</b>{" "}
                    <span
                      className={`px-2 py-1 rounded ${
                        getLatenessStatus(student).colorClass
                      }`}
                    >
                      {getLatenessStatus(student).label}
                    </span>
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
                    <b>Notification History:</b>{" "}
                    {notificationRecords.length > 0 ? (
                      <ul className="list-disc pl-4">
                        {notificationRecords.map((n, index) => (
                          <li
                            key={index}
                            className={`text-sm ${
                              n.status === "sent"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {n.status === "sent" ? "Sent" : "Failed"} @{" "}
                            {format(new Date(n.timestamp), "HH:mm:ss")}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "No notifications sent"
                    )}
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
