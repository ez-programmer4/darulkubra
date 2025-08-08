"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiDownload,
  FiHome,
  FiUsers,
  FiClipboard,
  FiTrendingUp,
} from "react-icons/fi";
import Link from "next/link";

export default function TeacherPermissionsPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    dayjs().startOf("month")
  );

  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const month = selectedMonth.format("YYYY-MM");
        const response = await fetch(
          `/api/teachers/permissions?month=${month}`
        );
        if (!response.ok) throw new Error("Failed to fetch permissions");
        const data = await response.json();
        setPermissions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || "Could not fetch permissions.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPermissions();
  }, [selectedMonth]);

  // Summary
  const summary = permissions.reduce(
    (acc, perm) => {
      acc.total++;
      if (perm.status === "Approved") acc.approved++;
      else if (perm.status === "Rejected") acc.rejected++;
      else acc.pending++;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  );

  // Export to CSV
  const exportToCSV = () => {
    if (!permissions.length) return;
    const headers = ["Date(s)", "Reason", "Details", "Status"];
    const rows = permissions.map((perm) => [
      Array.isArray(perm.dates)
        ? perm.dates
            .map((d: string) => dayjs(d).format("MMM D, YYYY"))
            .join(", ")
        : dayjs(perm.date).format("MMM D, YYYY"),
      perm.reason,
      perm.details || "-",
      perm.status || "Pending",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permissions_${selectedMonth.format("YYYY_MM")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Month navigation
  const goToPreviousMonth = () =>
    setSelectedMonth((m) => m.subtract(1, "month"));
  const goToNextMonth = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToCurrentMonth = () => setSelectedMonth(dayjs().startOf("month"));

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6 max-w-4xl mx-auto pb-16 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Link href="/teachers/dashboard">
            <Button
              variant="outline"
              className="mr-0 sm:mr-4 w-full sm:w-auto mb-2 sm:mb-0"
            >
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FiCalendar className="text-green-600" />
            My Permissions
          </h1>
        </div>
        <Button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0"
          disabled={!permissions.length}
        >
          <FiDownload /> Export CSV
        </Button>
      </div>

      {/* Month Navigation & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={goToPreviousMonth}
            variant="outline"
            size="icon"
            aria-label="Previous month"
          >
            <FiChevronLeft />
          </Button>
          <span className="font-semibold text-green-800 text-base sm:text-lg">
            {selectedMonth.format("MMMM YYYY")}
          </span>
          <Button
            onClick={goToNextMonth}
            variant="outline"
            size="icon"
            aria-label="Next month"
          >
            <FiChevronRight />
          </Button>
          <Button
            onClick={goToCurrentMonth}
            variant="ghost"
            className="ml-0 sm:ml-2 text-green-700 font-medium px-3 py-1 border border-green-200 rounded-lg"
          >
            Current Month
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1 text-green-800 font-semibold text-xs sm:text-sm">
            Total: {summary.total}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 text-blue-800 font-semibold text-xs sm:text-sm">
            Pending: {summary.pending}
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg px-3 py-1 text-green-900 font-semibold text-xs sm:text-sm">
            Approved: {summary.approved}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-red-700 font-semibold text-xs sm:text-sm">
            Rejected: {summary.rejected}
          </div>
        </div>
      </div>

      {/* Table or Loading/Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 animate-pulse">
          <div className="h-8 w-8 rounded-full border-4 border-green-200 border-t-green-600 animate-spin mr-4"></div>
          <span className="text-green-700 text-lg font-semibold">Loading...</span>
        </div>
      ) : error ? (
        <div className="text-red-600 font-bold">{error}</div>
      ) : permissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="#F3F4F6" />
            <path d="M8 12h8M8 16h5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="8" r="1.5" fill="#9CA3AF" />
          </svg>
          <div className="mt-4 text-lg">No permissions for this month.</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow border border-green-100 bg-white">
          <table className="min-w-full text-xs sm:text-sm divide-y divide-green-100">
            <thead className="bg-green-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-green-800 uppercase tracking-wider whitespace-nowrap">Date(s)</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-green-800 uppercase tracking-wider whitespace-nowrap">Reason</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-green-800 uppercase tracking-wider whitespace-nowrap">Details</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-green-800 uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => (
                <tr key={idx} className="border-b hover:bg-green-50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    {Array.isArray(perm.dates)
                      ? perm.dates.map((d: string) => dayjs(d).format("MMM D, YYYY")).join(", ")
                      : dayjs(perm.date).format("MMM D, YYYY")}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">{perm.reason}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 max-w-xs truncate" title={perm.details}>
                    {perm.details || "-"}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    {perm.status === "Approved" ? (
                      <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Approved</span>
                    ) : perm.status === "Rejected" ? (
                      <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Rejected</span>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 border-t border-green-100 shadow-lg flex justify-around py-2 z-50">
        <Link href="/teachers/dashboard" className="flex flex-col items-center text-xs text-gray-500">
          <FiHome className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/teachers/dashboard?tab=students" className="flex flex-col items-center text-xs text-gray-500">
          <FiUsers className="w-5 h-5" />
          Students
        </Link>
        <Link href="/teachers/permissions" className="flex flex-col items-center text-xs text-green-700">
          <FiClipboard className="w-5 h-5" />
          Permissions
        </Link>
        <Link href="/teachers/salary" className="flex flex-col items-center text-xs text-gray-500">
          <FiTrendingUp className="w-5 h-5" />
          Salary
        </Link>
      </nav>
    </div>
  );
}
