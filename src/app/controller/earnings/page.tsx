"use client";

import { useEffect, useState, useMemo } from "react";
import { PaymentSkeleton } from "@/app/components/PaymentSkeleton";
import { FiSearch, FiFilter, FiDownload, FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ControllerEarning {
  id: string;
  studentId: string;
  amount: number;
  createdAt: string;
  paidOut: boolean;
}

const ITEMS_PER_PAGE = 10;

export default function ControllerEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<ControllerEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [paidOutFilter, setPaidOutFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch("/api/controller/earnings")
      .then((res) => res.json())
      .then(setEarnings)
      .catch((e) => setError(e.message || "Failed to fetch earnings"))
      .finally(() => setLoading(false));
  }, []);

  // Filtering
  const filteredEarnings = useMemo(() => {
    return earnings.filter((e) => {
      const matchesSearch =
        !search || e.studentId.toLowerCase().includes(search.toLowerCase());
      const matchesPaidOut =
        !paidOutFilter ||
        (paidOutFilter === "paid" && e.paidOut) ||
        (paidOutFilter === "unpaid" && !e.paidOut);
      return matchesSearch && matchesPaidOut;
    });
  }, [earnings, search, paidOutFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEarnings.length / ITEMS_PER_PAGE);
  const paginatedEarnings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEarnings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEarnings, currentPage]);

  // Summaries
  const total = filteredEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const paid = filteredEarnings
    .filter((e) => e.paidOut)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const unpaid = filteredEarnings
    .filter((e) => !e.paidOut)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Export to CSV
  const handleExportCSV = () => {
    const header = ["Amount", "Student ID", "Date", "Paid Out"];
    const rows = filteredEarnings.map((e) => [
      Number(e.amount).toFixed(2),
      e.studentId,
      new Date(e.createdAt).toLocaleDateString(),
      e.paidOut ? "Yes" : "No",
    ]);
    const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6 px-1 sm:py-10 sm:px-2">
      <div className="max-w-full mx-auto">
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl border border-indigo-100 mb-8 w-full">
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-800 mb-2">
              Your Earnings
            </h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold shadow transition-all w-full sm:w-auto"
              >
                <FiDownload /> Export CSV
              </button>
              <button
                className="flex items-center gap-2 bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-xl font-semibold shadow transition-all w-full sm:w-auto"
                onClick={() => router.push("/controller")}
              >
                <FiArrowLeft />
                Back to Dashboard
              </button>
            </div>
          </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
              <div className="text-gray-500 text-sm sm:text-base">
                Total Earnings
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                ${total.toFixed(2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-gray-500 text-sm sm:text-base">Paid Out</div>
              <div className="text-xl sm:text-2xl font-bold">
                ${paid.toFixed(2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="text-gray-500 text-sm sm:text-base">Unpaid</div>
              <div className="text-xl sm:text-2xl font-bold">
                ${unpaid.toFixed(2)}
              </div>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="relative w-full sm:w-1/2">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Student ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-sm sm:text-base"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <FiFilter className="text-indigo-400" />
              <select
                value={paidOutFilter}
                onChange={(e) => {
                  setPaidOutFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="p-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-sm sm:text-base w-full sm:w-auto"
              >
                <option value="">All</option>
                <option value="paid">Paid Out</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
          {/* Table or Skeleton */}
          {loading ? (
            <PaymentSkeleton />
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto border border-indigo-100 rounded-xl">
              <table className="min-w-full text-sm sm:text-base divide-y divide-indigo-200">
                <thead className="bg-indigo-100">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">
                      Student ID
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider whitespace-nowrap">
                      Paid Out
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEarnings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-6 text-gray-500"
                      >
                        No earnings found.
                      </td>
                    </tr>
                  ) : (
                    paginatedEarnings.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-indigo-50 transition-colors"
                      >
                        <td className="px-2 sm:px-6 py-2 font-semibold text-green-700 whitespace-nowrap">
                          ${Number(e.amount).toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-6 py-2 whitespace-nowrap">
                          {e.studentId}
                        </td>
                        <td className="px-2 sm:px-6 py-2 whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 sm:px-6 py-2 font-semibold whitespace-nowrap">
                          {e.paidOut ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-yellow-600">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-50 w-full sm:w-auto"
              >
                Prev
              </button>
              <span className="text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-50 w-full sm:w-auto"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
