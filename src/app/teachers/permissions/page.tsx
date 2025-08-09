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
  // Request form state
  const [showForm, setShowForm] = useState(true);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [permissionReasons, setPermissionReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch available reasons once
  useEffect(() => {
    const loadReasons = async () => {
      try {
        const res = await fetch("/api/admin/permission-reasons");
        if (!res.ok) return;
        const data = await res.json();
        setPermissionReasons(Array.isArray(data) ? data.map((r: any) => r.reason) : []);
      } catch {}
    };
    loadReasons();
  }, []);

  const reloadPermissions = async () => {
    try {
      const month = selectedMonth.format("YYYY-MM");
      const response = await fetch(`/api/teachers/permissions?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/teachers/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason, details }),
      });
      if (!res.ok) {
        let msg = "Failed to submit request";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      alert("Permission request submitted");
      setDate("");
      setReason("");
      setDetails("");
      setShowForm(false);
      await reloadPermissions();
    } catch (err: any) {
      alert(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      {/* Integrated Request Form */}
      <div className="bg-white/95 rounded-2xl shadow-md border border-indigo-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-900">Request Permission</h2>
          <Button variant="outline" className="border-indigo-200" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Hide" : "New Request"}
          </Button>
        </div>
        {showForm && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={dayjs().format("YYYY-MM-DD")} required className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} required className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>Select a reason</option>
                {permissionReasons.length === 0 ? (
                  <option value="General">General</option>
                ) : (
                  permissionReasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))
                )}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Details</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add any additional details..." className="border rounded-lg px-3 py-2 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" className="border-indigo-200" onClick={() => { setDate(""); setReason(""); setDetails(""); }}>Clear</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">{isSubmitting ? "Submitting..." : "Submit Request"}</Button>
            </div>
          </form>
        )}
      </div>

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
            <FiCalendar className="text-indigo-600" />
            My Permissions
          </h1>
        </div>
        <Button
          onClick={exportToCSV}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0"
          disabled={!permissions.length}
        >
          <FiDownload /> Export CSV
        </Button>
      </div>

      {/* Month Navigation & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={goToPreviousMonth} variant="outline" size="icon" aria-label="Previous month">
            <FiChevronLeft />
          </Button>
          <span className="font-semibold text-indigo-800 text-base sm:text-lg">
            {selectedMonth.format("MMMM YYYY")}
          </span>
          <Button onClick={goToNextMonth} variant="outline" size="icon" aria-label="Next month">
            <FiChevronRight />
          </Button>
          <Button onClick={goToCurrentMonth} variant="ghost" className="ml-0 sm:ml-2 text-indigo-700 font-medium px-3 py-1 border border-indigo-200 rounded-lg">
            Current Month
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1 text-indigo-800 font-semibold text-xs sm:text-sm">
            Total: {summary.total}
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-1 text-violet-800 font-semibold text-xs sm:text-sm">
            Pending: {summary.pending}
          </div>
          <div className="bg-indigo-100 border border-indigo-300 rounded-lg px-3 py-1 text-indigo-900 font-semibold text-xs sm:text-sm">
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
          <div className="h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mr-4"></div>
          <span className="text-indigo-700 text-lg font-semibold">Loading...</span>
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
        <div className="overflow-x-auto rounded-xl shadow border border-indigo-100 bg-white/95 backdrop-blur-sm">
          <table className="min-w-full text-xs sm:text-sm divide-y divide-indigo-100">
            <thead className="bg-indigo-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Date(s)</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Reason</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Details</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => (
                <tr key={idx} className="border-b hover:bg-indigo-50 transition-colors">
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
                      <span className="inline-block px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold">Approved</span>
                    ) : perm.status === "Rejected" ? (
                      <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Rejected</span>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded bg-violet-100 text-violet-700 text-xs font-semibold">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 border-t border-indigo-100 shadow-lg flex justify-around py-2 z-50">
        <Link href="/teachers/dashboard" className="flex flex-col items-center text-xs text-gray-500">
          <FiHome className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/teachers/dashboard?tab=students" className="flex flex-col items-center text-xs text-gray-500">
          <FiUsers className="w-5 h-5" />
          Students
        </Link>
        <Link href="/teachers/permissions" className="flex flex-col items-center text-xs text-indigo-700">
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
