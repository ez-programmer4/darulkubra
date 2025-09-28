"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FiEdit,
  FiTrash2,
  FiPlus,
  FiUser,
  FiPhone,
  FiCalendar,
  FiDollarSign,
  FiSearch,
  FiClock,
  FiFlag,
  FiBook,
  FiGlobe,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiDownload,
  FiPrinter,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown,
  FiBarChart2,
  FiLogOut,
} from "react-icons/fi";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import ConfirmModal from "../components/ConfirmModal";
import { useSession, signOut } from "next-auth/react";

interface Registration {
  id: number;
  name: string;
  phoneno: string;
  classfee: number;
  startdate: string;
  control?: string;
  status: string;
  ustazname: string;
  package: string;
  subject: string;
  country?: string;
  rigistral?: string;
  refer?: string;
  selectedTime: string;
  registrationdate: string;
  isTrained?: boolean;
  daypackages?: string;
  chatId?: string;
}

type SortKey = keyof Registration;
type SortOrder = "asc" | "desc";

function to24Hour(time12h: string): string {
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  const [, hour, minute, period] = match;
  let h = parseInt(hour, 10);
  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period.toUpperCase() === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${minute}`;
}

export default function Dashboard() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usStudentCount, setUsStudentCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterPackage, setFilterPackage] = useState<string>("all");
  const [filterTrained, setFilterTrained] = useState<string>("all");
  const [filterDayPackage, setFilterDayPackage] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filterUstaz, setFilterUstaz] = useState<string>("all");
  const [filterConnection, setFilterConnection] = useState<string>("all");
  const [dynamicFilters, setDynamicFilters] = useState<{
    statuses: string[];
    packages: string[];
    subjects: string[];
  }>({ statuses: [], packages: [], subjects: [] });
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "registral") {
      router.push("/controller");
      return;
    }
    setAuthChecked(true);
    fetchRegistrations();
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/filter-options");
      if (response.ok) {
        const data = await response.json();
        setDynamicFilters(data);
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const [regResponse, usResponse] = await Promise.all([
        fetch("/api/registrations", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }),
        fetch("/api/us-student"),
      ]);

      if (!regResponse.ok) {
        throw new Error(`HTTP error! Status: ${regResponse.status}`);
      }
      const data = await regResponse.json();
      if (!Array.isArray(data)) {
        throw new Error("Expected an array of registrations");
      }
      const sanitizedData = data.map((reg) => ({
        ...reg,
        ustaz: reg.ustaz || "Not assigned",
        selectedTime: reg.selectedTime || "Not specified",
      }));
      setRegistrations(sanitizedData);

      // Fetch US student count
      if (usResponse.ok) {
        const usData = await usResponse.json();
        const pendingCount = usData.filter(
          (s: any) => !s.wpos_wpdatatable_23Wdt_ID
        ).length;
        setUsStudentCount(pendingCount);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load registrations"
      );
      setNotification({
        message: "Failed to load registrations",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const showConfirm = (message: string, action: () => Promise<void>) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm(
      "Are you sure you want to delete this registration?",
      async () => {
        try {
          const response = await fetch(`/api/registrations?id=${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (
              errorData.message &&
              errorData.message.toLowerCase().includes("foreign key constraint")
            ) {
              throw new Error(
                "Cannot delete: student has related payment or other records. Please contact admin for further action."
              );
            }
            throw new Error(
              errorData.message || "Failed to delete registration"
            );
          }

          setNotification({
            message: "Registration deleted successfully",
            type: "success",
          });
          fetchRegistrations();
          setExpandedRow(null);
          setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
        } catch (error) {
          setNotification({
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete registration",
            type: "error",
          });
          throw error;
        } finally {
          setConfirmOpen(false);
        }
      }
    );
  };

  const dayPackages = useMemo(
    () =>
      Array.from(
        new Set(
          registrations.map((reg) => (reg.daypackages || "").toLowerCase())
        )
      ).filter((pkg) => pkg),
    [registrations]
  );

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      setNotification({
        message: "Please select at least one student to delete",
        type: "error",
      });
      return;
    }

    showConfirm(
      `Are you sure you want to delete ${selectedRows.length} registration(s)?`,
      async () => {
        try {
          const response = await fetch("/api/registrations?endpoint=bulk", {
            method: "DELETE",
            body: JSON.stringify({ ids: selectedRows }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({
              message: `HTTP error! Status: ${response.status}`,
            }));
            throw new Error(
              errorData.message || "Failed to delete registrations"
            );
          }

          const result = await response.json();
          setNotification({
            message:
              result.message || "Selected registrations deleted successfully",
            type: "success",
          });
          fetchRegistrations();
          setSelectedRows([]);
          setExpandedRow(null);
        } catch (error) {
          setNotification({
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete registrations",
            type: "error",
          });
          throw error;
        } finally {
          setConfirmOpen(false);
        }
      }
    );
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedRows.length === 0) {
      setNotification({
        message: "Please select at least one student to update status",
        type: "error",
      });
      return;
    }

    showConfirm(
      `Are you sure you want to update the status of ${selectedRows.length} registration(s) to "${newStatus}"?`,
      async () => {
        try {
          const response = await fetch(
            "/api/registrations?endpoint=bulk-status",
            {
              method: "PATCH",
              body: JSON.stringify({ ids: selectedRows, status: newStatus }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({
              message: `HTTP error! Status: ${response.status}`,
            }));
            throw new Error(errorData.message || "Failed to update statuses");
          }

          const result = await response.json();
          setNotification({
            message: result.message || "Statuses updated successfully",
            type: "success",
          });
          fetchRegistrations();
          setSelectedRows([]);
        } catch (error) {
          setNotification({
            message:
              error instanceof Error
                ? error.message
                : "Failed to update statuses",
            type: "error",
          });
          throw error;
        } finally {
          setConfirmOpen(false);
        }
      }
    );
  };

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const selectAllRows = () => {
    const currentPageRows = paginatedRegistrations.map((reg) => reg.id);
    const allSelectedOnPage = currentPageRows.every((id) =>
      selectedRows.includes(id)
    );

    if (allSelectedOnPage) {
      setSelectedRows((prev) =>
        prev.filter((id) => !currentPageRows.includes(id))
      );
    } else {
      setSelectedRows((prev) => [...new Set([...prev, ...currentPageRows])]);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const matchesSearch =
        (reg.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (reg.phoneno || "").includes(searchQuery);
      const matchesStatus =
        filterStatus === "all" ||
        (reg.status || "").toLowerCase() === filterStatus.toLowerCase();
      const matchesPackage =
        filterPackage === "all" ||
        (reg.package || "").toLowerCase() === filterPackage.toLowerCase();
      const matchesTrained =
        filterTrained === "all" ||
        (filterTrained === "trained" && reg.isTrained) ||
        (filterTrained === "nottrained" && !reg.isTrained);
      const matchesDayPackage =
        filterDayPackage === "all" ||
        (reg.daypackages || "").toLowerCase() ===
          filterDayPackage.toLowerCase();
      const matchesUstaz =
        filterUstaz === "all" ||
        (reg.ustazname || "").toLowerCase() === filterUstaz.toLowerCase();
      const matchesSubject =
        filterSubject === "all" ||
        (reg.subject || "").toLowerCase() === filterSubject.toLowerCase();
      const matchesConnection =
        filterConnection === "all" ||
        (filterConnection === "connected" && reg.chatId) ||
        (filterConnection === "not-connected" && !reg.chatId);
      return (
        matchesSearch &&
        matchesStatus &&
        matchesPackage &&
        matchesDayPackage &&
        matchesSubject &&
        matchesUstaz &&
        matchesTrained &&
        matchesConnection
      );
    });
  }, [
    registrations,
    searchQuery,
    filterStatus,
    filterPackage,
    filterDayPackage,
    filterSubject,
    filterUstaz,
    filterTrained,
    filterConnection,
  ]);

  const sortedRegistrations = useMemo(() => {
    return [...filteredRegistrations].sort((a, b) => {
      let valueA = a[sortKey] as string | number | undefined;
      let valueB = b[sortKey] as string | number | undefined;

      if (sortKey === "startdate" || sortKey === "registrationdate") {
        valueA = new Date(valueA ?? "").getTime();
        valueB = new Date(valueB ?? "").getTime();
      } else if (sortKey === "classfee") {
        valueA = Number(valueA ?? 0);
        valueB = Number(valueB ?? 0);
      } else {
        valueA = valueA?.toString().toLowerCase() || "";
        valueB = valueB?.toString().toLowerCase() || "";
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRegistrations, sortKey, sortOrder]);
  const uniqueUstaz = useMemo(
    () =>
      Array.from(
        new Set(registrations.map((reg) => reg.ustazname || ""))
      ).filter((u) => u && u !== "Not assigned"),
    [registrations]
  );

  const { activeStudents, packages, subjects, statusCounts } = useMemo(() => {
    const active = registrations.filter(
      (reg) => (reg.status || "").toLowerCase() === "active"
    ).length;
    const revenue = registrations.reduce(
      (sum, reg) => sum + (Number(reg.classfee) || 0),
      0
    );
    const uniquePackages = Array.from(
      new Set(registrations.map((reg) => (reg.package || "").toLowerCase()))
    );
    const uniqueSubjects = Array.from(
      new Set(registrations.map((reg) => (reg.subject || "").toLowerCase()))
    );

    const counts = registrations.reduce(
      (acc, reg) => {
        const key = (reg.status || "").toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {
        active: 0,
        leave: 0,
        "remadan leave": 0,
        "Not yet": 0,
        fresh: 0,
      } as Record<string, number>
    );
    const avg = registrations.length ? revenue / registrations.length : 0;

    return {
      activeStudents: active,
      totalRevenue: revenue,
      packages: uniquePackages,
      subjects: uniqueSubjects,
      statusCounts: counts,
      avgFee: avg,
    };
  }, [registrations]);

  const markAsTrained = async (id: number) => {
    try {
      const response = await fetch(`/api/registrations?id=${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isTrained: true }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      setNotification({
        message: "Student marked as trained",
        type: "success",
      });
      fetchRegistrations();
    } catch {
      setNotification({ message: "Failed to update status", type: "error" });
    }
  };

  const paginatedRegistrations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedRegistrations.slice(startIndex, endIndex);
  }, [sortedRegistrations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedRegistrations.length / itemsPerPage);

  const exportToCSV = () => {
    const dataToExport = filteredRegistrations.map((reg) => ({
      ID: reg.id,
      Name: reg.name,
      Phone: reg.phoneno,
      Status: reg.status,
      Package: reg.package,
      Subject: reg.subject,
      "Class Fee": `$${Number(reg.classfee).toLocaleString()}`,
      Teacher: reg.ustazname,
      "Start Date": new Date(reg.startdate).toLocaleDateString(),
      "Time Slot": reg.selectedTime
        ? (() => {
            const t24 = to24Hour(reg.selectedTime);
            return t24
              ? new Date(`1970-01-01T${t24}`).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : reg.selectedTime;
          })()
        : "Not specified",
      Country: reg.country || "-",
      Registral: reg.rigistral || "-",
      Referral: reg.refer || "-",
      "Registration Date": reg.registrationdate
        ? new Date(reg.registrationdate).toLocaleDateString()
        : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `students_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportSelectedToCSV = () => {
    if (selectedRows.length === 0) {
      setNotification({
        message: "Please select at least one student to export",
        type: "error",
      });
      return;
    }

    const dataToExport = filteredRegistrations
      .filter((reg) => selectedRows.includes(reg.id))
      .map((reg) => ({
        ID: reg.id,
        Name: reg.name,
        Phone: reg.phoneno,
        Status: reg.status,
        Package: reg.package,
        Subject: reg.subject,
        "Class Fee": `$${Number(reg.classfee).toLocaleString()}`,
        Teacher: reg.ustazname,
        "Start Date": new Date(reg.startdate).toLocaleDateString(),
        "Time Slot": reg.selectedTime
          ? new Date(`1970-01-01T${reg.selectedTime}`).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "Not specified",
        Country: reg.country || "-",
        Registral: reg.rigistral || "-",
        Referral: reg.refer || "-",
        "Registration Date": reg.registrationdate
          ? new Date(reg.registrationdate).toLocaleDateString()
          : "-",
      }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Students");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `selected_students_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const printSelected = () => {
    if (selectedRows.length === 0) {
      setNotification({
        message: "Please select at least one student to print",
        type: "error",
      });
      return;
    }

    const printContent = filteredRegistrations
      .filter((reg) => selectedRows.includes(reg.id))
      .map(
        (reg, idx) => `
      <div class="student-card">
        <div class="student-header">
          <div class="avatar">${reg.name?.charAt(0)?.toUpperCase() || "?"}</div>
          <div>
            <h2>${reg.name}</h2>
            <div class="student-status ${reg.status
              .toLowerCase()
              .replace(/\s/g, "-")}">${reg.status}</div>
          </div>
        </div>
        <div class="student-details">
          <div><span>Phone:</span> ${reg.phoneno}</div>
          <div><span>Teacher:</span> ${reg.ustazname}</div>
          <div><span>Package:</span> ${reg.package}</div>
          <div><span>Subject:</span> ${reg.subject}</div>
          <div><span>Class Fee:</span> $${Number(
            reg.classfee
          ).toLocaleString()}</div>
          <div><span>Start Date:</span> ${new Date(
            reg.startdate
          ).toLocaleDateString()}</div>
          <div><span>Time Slot:</span> ${
            reg.selectedTime
              ? (() => {
                  const t24 = to24Hour(reg.selectedTime);
                  return t24
                    ? new Date(`1970-01-01T${t24}`).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : reg.selectedTime;
                })()
              : "Not specified"
          }</div>
          <div><span>Country:</span> ${reg.country || "-"}</div>
          <div><span>Registral:</span> ${reg.rigistral || "-"}</div>
          <div><span>Referral:</span> ${reg.refer || "-"}</div>
          <div><span>Registration Date:</span> ${
            reg.registrationdate
              ? new Date(reg.registrationdate).toLocaleDateString()
              : "-"
          }</div>
        </div>
      </div>
      ${idx < selectedRows.length - 1 ? '<div class="page-break"></div>' : ""}
    `
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
      <html>
        <head>
          <title>Student Records</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: #f7fafc;
              color: #222;
              padding: 32px;
            }
            h1 {
              color: #1d3557;
              text-align: center;
              margin-bottom: 32px;
              font-size: 2.2rem;
              letter-spacing: 1px;
            }
            .student-card {
              background: #fff;
              border-radius: 18px;
              box-shadow: 0 2px 12px rgba(30, 64, 175, 0.08);
              margin: 0 auto 32px auto;
              max-width: 600px;
              padding: 32px 28px 24px 28px;
              border-left: 6px solid #38bdf8;
              transition: box-shadow 0.2s;
              page-break-inside: avoid;
            }
            .student-header {
              display: flex;
              align-items: center;
              margin-bottom: 18px;
            }
            .avatar {
              width: 54px;
              height: 54px;
              background: linear-gradient(135deg, #38bdf8 60%, #6366f1 100%);
              color: #fff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 2rem;
              font-weight: bold;
              margin-right: 18px;
              box-shadow: 0 2px 8px rgba(56,189,248,0.12);
            }
            .student-header h2 {
              margin: 0;
              font-size: 1.5rem;
              font-weight: 700;
              color: #22223b;
            }
            .student-status {
              display: inline-block;
              margin-top: 4px;
              padding: 2px 12px;
              border-radius: 12px;
              font-size: 0.95rem;
              font-weight: 500;
              letter-spacing: 0.5px;
              background: #e0f2fe;
              color: #0284c7;
            }
            .student-status.active { background: #d1fae5; color: #059669; }
            .student-status.leave, .student-status.remadan-leave { background: #fee2e2; color: #dc2626; }
            .student-status.fresh { background: #e0e7ff; color: #6366f1; }
            .student-status.Not yet { background: #f3f4f6; color: #6b7280; }
            .student-status.pending { background: #fef9c3; color: #b45309; }
            .student-status.inactive { background: #f3f4f6; color: #6b7280; }
            .student-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 24px;
              font-size: 1.05rem;
              margin-top: 8px;
            }
            .student-details div {
              margin-bottom: 2px;
            }
            .student-details span {
              font-weight: 600;
              color: #1d3557;
              margin-right: 6px;
            }
            .page-break {
              page-break-after: always;
            }
            @media print {
              body { background: #fff; }
              .student-card { box-shadow: none; border-left: 4px solid #38bdf8; }
              .page-break { display: block; }
            }
          </style>
        </head>
        <body>
          <h1>Student Records (${selectedRows.length} selected)</h1>
          ${printContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 200);
            };
          </script>
        </body>
      </html>
    `);
      printWindow.document.close();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      setNotification({
        message: "Failed to logout",
        type: "error",
      });
    }
  };

  if (!authChecked) {
    return null; // Or a spinner if you want
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8 font-sans">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border-l-4 border-green-500"
                : "bg-red-50 text-red-800 border-l-4 border-red-500"
            }`}
          >
            <div className="mr-3">
              {notification.type === "success" ? (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <div>{notification.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Student Management Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-sm">
                Welcome, {session?.user?.name}! Efficiently manage student
                registrations.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Link
                href="/registration"
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all duration-300"
              >
                <FiPlus className="mr-2" /> New Registration
              </Link>

              <Link
                href="/registral/earnings"
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all duration-300"
              >
                <FiPlus className="mr-2" /> My earning
              </Link>
              <Link
                href="/us-student"
                className="relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all duration-300"
              >
                <FiUser className="mr-2" /> US Students
                {usStudentCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
                    {usStudentCount}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all duration-300"
              >
                <FiLogOut className="mr-2" /> Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:bg-gray-50 transition-all duration-300"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                  <FiUser size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {registrations.length}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:bg-gray-50 transition-all duration-300"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-green-100 text-green-700">
                  <FiUser size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Active Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {activeStudents}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:bg-gray-50 transition-all duration-300"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-red-100 text-red-700">
                  <FiBarChart2 size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Students on Leave
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statusCounts.leave + statusCounts["remadan leave"]}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:bg-gray-50 transition-all duration-300"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gray-100 text-gray-700">
                  <FiBarChart2 size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    New Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statusCounts.fresh}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Student Registrations
            </h2>
            <div className="flex items-center space-x-4">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <FiFilter size={18} />
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 py-4 border-b border-gray-200 bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All Statuses</option>
                      {dynamicFilters.statuses.map((status, index) => (
                        <option key={index} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day Package
                    </label>
                    <select
                      value={filterDayPackage}
                      onChange={(e) => {
                        setFilterDayPackage(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All Day Packages</option>
                      <option value="All days">All days</option>
                      <option value="MWF">MWF</option>
                      <option value="TTS">TTS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Package Region
                    </label>
                    <select
                      value={filterPackage}
                      onChange={(e) => {
                        setFilterPackage(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All Package Regions</option>
                      {dynamicFilters.packages.map((pkg, index) => (
                        <option key={index} value={pkg}>
                          {pkg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={filterSubject}
                      onChange={(e) => {
                        setFilterSubject(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All Subjects</option>
                      {dynamicFilters.subjects.map((subject, index) => (
                        <option key={index} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ustaz (Teacher)
                    </label>
                    <select
                      value={filterUstaz}
                      onChange={(e) => {
                        setFilterUstaz(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All Ustaz</option>
                      {uniqueUstaz.map((u, idx) => (
                        <option key={idx} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trained Status
                    </label>
                    <select
                      value={filterTrained}
                      onChange={(e) => {
                        setFilterTrained(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All</option>
                      <option value="trained">Trained</option>
                      <option value="nottrained">Not Trained</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Connection Status
                    </label>
                    <select
                      value={filterConnection}
                      onChange={(e) => {
                        setFilterConnection(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="all">All</option>
                      <option value="connected">Connected</option>
                      <option value="not-connected">Not Connected</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedRows.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
              <div className="text-sm text-blue-800">
                {selectedRows.length} student(s) selected
              </div>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportSelectedToCSV}
                  className="flex items-center px-3 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <FiDownload className="mr-2" /> Export Selected
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={printSelected}
                  className="flex items-center px-3 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <FiPrinter className="mr-2" /> Print Selected
                </motion.button>

                <div className="relative">
                  <select
                    onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                    className="flex items-center px-3 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors appearance-none"
                  >
                    <option value="">Update Status</option>
                    {dynamicFilters.statuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg shadow-md m-6">
              <p className="text-red-700 font-medium">Error: {error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"
              />
            </div>
          ) : paginatedRegistrations.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={
                            paginatedRegistrations.length > 0 &&
                            paginatedRegistrations.every((reg) =>
                              selectedRows.includes(reg.id)
                            )
                          }
                          onChange={selectAllRows}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center"
                        >
                          Student
                          {sortKey === "name" &&
                            (sortOrder === "asc" ? (
                              <FiArrowUp className="ml-1" />
                            ) : (
                              <FiArrowDown className="ml-1" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("phoneno")}
                          className="flex items-center"
                        >
                          Contact
                          {sortKey === "phoneno" &&
                            (sortOrder === "asc" ? (
                              <FiArrowUp className="ml-1" />
                            ) : (
                              <FiArrowDown className="ml-1" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("status")}
                          className="flex items-center"
                        >
                          Status
                          {sortKey === "status" &&
                            (sortOrder === "asc" ? (
                              <FiArrowUp className="ml-1" />
                            ) : (
                              <FiArrowDown className="ml-1" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("package")}
                          className="flex items-center"
                        >
                          Package
                          {sortKey === "package" &&
                            (sortOrder === "asc" ? (
                              <FiArrowUp className="ml-1" />
                            ) : (
                              <FiArrowDown className="ml-1" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("classfee")}
                          className="flex items-center"
                        >
                          Fee
                          {sortKey === "classfee" &&
                            (sortOrder === "asc" ? (
                              <FiArrowUp className="ml-1" />
                            ) : (
                              <FiArrowDown className="ml-1" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("startdate")}
                          className="flex items-center"
                        >
                          Start Date
                          {sortKey === "startdate" &&
                            (sortOrder === "asc" ? (
                              <FiArrowUp className="ml-1" />
                            ) : (
                              <FiArrowDown className="ml-1" />
                            ))}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        is Trained ?
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRegistrations.map((reg) => (
                      <React.Fragment key={reg.id}>
                        <motion.tr
                          key={reg.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(reg.id)}
                              onChange={() => toggleRowSelection(reg.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-medium">
                                {reg.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {reg.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiPhone
                                className="text-gray-400 mr-2"
                                size={14}
                              />
                              <span className="text-sm text-gray-900">
                                {reg.phoneno}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                (reg.status || "").toLowerCase() === "active"
                                  ? "bg-green-100 text-green-800"
                                  : (reg.status || "").toLowerCase() ===
                                    "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : (reg.status || "").toLowerCase() === "fresh"
                                  ? "bg-blue-100 text-blue-800"
                                  : (reg.status || "").toLowerCase() ===
                                    "Not yet"
                                  ? "bg-gray-100 text-gray-800"
                                  : (reg.status || "").toLowerCase() ===
                                      "leave" ||
                                    (reg.status || "").toLowerCase() ===
                                      "remadan leave"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {reg.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reg.package}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${Number(reg.classfee).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <FiCalendar
                                className="text-gray-400 mr-2"
                                size={14}
                              />
                              {new Date(reg.startdate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => toggleRow(reg.id)}
                                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title={
                                  expandedRow === reg.id
                                    ? "Collapse Details"
                                    : "Expand Details"
                                }
                              >
                                {expandedRow === reg.id ? (
                                  <FiChevronUp size={18} />
                                ) : (
                                  <FiChevronDown size={18} />
                                )}
                              </motion.button>
                              <Link
                                href={`/registration?id=${reg.id}&step=3`}
                                className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <FiEdit size={18} />
                              </Link>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(reg.id)}
                                className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 size={18} />
                              </motion.button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {reg.isTrained ? (
                              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-green-200 to-green-50 text-green-900 px-5 py-1.5 rounded-full text-xs font-extrabold shadow border border-green-400">
                                <svg
                                  className="w-5 h-5 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="#bbf7d0"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 12l3 3 5-5"
                                  />
                                </svg>
                                <span className="font-bold tracking-wide drop-shadow">
                                  Trained
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-200 to-yellow-50 text-yellow-900 px-5 py-1.5 rounded-full text-xs font-extrabold shadow border border-yellow-400">
                                <svg
                                  className="w-5 h-5 text-yellow-500"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="#fef9c3"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 8v4h4"
                                  />
                                </svg>
                                <span className="font-bold tracking-wide drop-shadow">
                                  Not Trained
                                </span>
                                <button
                                  className="ml-3 px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full font-semibold shadow transition"
                                  onClick={() => markAsTrained(reg.id)}
                                  title="Mark this student as trained"
                                >
                                  Mark as Trained
                                </button>
                              </span>
                            )}
                          </td>
                        </motion.tr>
                        <AnimatePresence>
                          {expandedRow === reg.id && (
                            <motion.tr
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-gray-50"
                            >
                              <td colSpan={8} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <DetailItem
                                    icon={<FiUser className="text-blue-600" />}
                                    label="Name"
                                    value={reg.name}
                                  />
                                  <DetailItem
                                    icon={<FiPhone className="text-blue-600" />}
                                    label="Phone"
                                    value={reg.phoneno}
                                  />
                                  <DetailItem
                                    icon={
                                      <FiDollarSign className="text-blue-600" />
                                    }
                                    label="Class Fee"
                                    value={`$${Number(
                                      reg.classfee
                                    ).toLocaleString()}`}
                                  />
                                  <DetailItem
                                    icon={
                                      <FiCalendar className="text-blue-600" />
                                    }
                                    label="Start Date"
                                    value={new Date(
                                      reg.startdate
                                    ).toLocaleDateString()}
                                  />
                                  <DetailItem
                                    icon={<FiFlag className="text-blue-600" />}
                                    label="Status"
                                    value={reg.status}
                                  />
                                  <DetailItem
                                    icon={<FiUser className="text-blue-600" />}
                                    label="Teacher"
                                    value={reg.ustazname || "Not assigned"}
                                  />
                                  <DetailItem
                                    icon={<FiBook className="text-blue-600" />}
                                    label="Package"
                                    value={reg.package}
                                  />
                                  <DetailItem
                                    icon={<FiBook className="text-blue-600" />}
                                    label="Day Packages"
                                    value={reg.daypackages || "-"}
                                  />
                                  <DetailItem
                                    icon={<FiBook className="text-blue-600" />}
                                    label="Subject"
                                    value={reg.subject}
                                  />
                                  <DetailItem
                                    icon={<FiGlobe className="text-blue-600" />}
                                    label="Country"
                                    value={reg.country || "-"}
                                  />
                                  <DetailItem
                                    icon={<FiUser className="text-blue-600" />}
                                    label="Registral"
                                    value={reg.rigistral || "-"}
                                  />
                                  <DetailItem
                                    icon={<FiUser className="text-blue-600" />}
                                    label="Referral"
                                    value={reg.refer || "-"}
                                  />
                                  <DetailItem
                                    icon={<FiClock className="text-blue-600" />}
                                    label="Time Slot"
                                    value={
                                      reg.selectedTime
                                        ? (() => {
                                            const t24 = to24Hour(
                                              reg.selectedTime
                                            );
                                            return t24
                                              ? new Date(
                                                  `1970-01-01T${t24}`
                                                ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  hour12: true,
                                                })
                                              : reg.selectedTime;
                                          })()
                                        : "Not specified"
                                    }
                                  />
                                  <DetailItem
                                    icon={
                                      <FiCalendar className="text-blue-600" />
                                    }
                                    label="Registration Date"
                                    value={
                                      reg.registrationdate
                                        ? new Date(
                                            reg.registrationdate
                                          ).toLocaleDateString()
                                        : "-"
                                    }
                                  />
                                  <DetailItem
                                    icon={<FiUser className="text-blue-600" />}
                                    label="Chat ID"
                                    value={reg.chatId || "Not Connected"}
                                  />
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center">
                <div className="text-sm text-gray-600 mb-2 sm:mb-0">
                  Showing {paginatedRegistrations.length} of{" "}
                  {sortedRegistrations.length} entries
                </div>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg ${
                      currentPage === 1
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <FiChevronLeft size={18} />
                  </motion.button>
                  {(() => {
                    const pages: React.ReactNode[] = [];
                    const pageNumbers = Array.from(
                      { length: totalPages },
                      (_, i) => i + 1
                    ).filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                    );

                    let lastPage = 0;
                    pageNumbers.forEach((page) => {
                      if (page - lastPage > 1) {
                        pages.push(
                          <span
                            key={`ellipsis-${page}`}
                            className="text-gray-500 px-2"
                          >
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <motion.button
                          key={`page-${page}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </motion.button>
                      );
                      lastPage = page;
                    });
                    return pages;
                  })()}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg ${
                      currentPage === totalPages
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <FiChevronRight size={18} />
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="mx-auto w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <FiUser className="text-gray-400" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {searchQuery ||
                filterStatus !== "all" ||
                filterPackage !== "all" ||
                filterSubject !== "all"
                  ? "No matching students found"
                  : "No student registrations yet"}
              </h3>
              <p className="text-gray-500 mt-4 max-w-lg mx-auto">
                {searchQuery ||
                filterStatus !== "all" ||
                filterPackage !== "all" ||
                filterSubject !== "all"
                  ? "Try adjusting your search or filters to find what you're looking for"
                  : "Get started by creating your first student registration"}
              </p>
              <Link
                href="/registration"
                className="mt-6 inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
              >
                <FiPlus className="mr-2" /> Add New Student
              </Link>
            </div>
          )}
        </div>
        <ConfirmModal
          open={confirmOpen}
          message={confirmMessage}
          onConfirm={async () => {
            if (confirmAction) {
              await confirmAction();
            }
          }}
          onCancel={() => setConfirmOpen(false)}
        />

        <div className="mt-6 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToCSV}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            <FiDownload className="mr-2" /> Export All to Excel
          </motion.button>
        </div>

        <div className="mt-12 text-center text-sm text-gray-600 border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <p className="font-medium">
              © {new Date().getFullYear()} Darulkubra Quran Academy
            </p>
            <span className="hidden md:block">•</span>
            <p>
              Need help?{" "}
              <a
                href="mailto:support@darulkubra.com"
                className="text-blue-600 hover:underline font-medium transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-base text-gray-900">{value}</p>
      </div>
    </div>
  );
}
