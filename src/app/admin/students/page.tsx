"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Toaster, toast } from "react-hot-toast";
import {
  FiArrowLeft,
  FiUser,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiUsers,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { format, parseISO } from "date-fns";

interface Student {
  id: number;
  name: string;
  status: "Active" | "Not yet";
  startDate: string | null;
  ustazName?: string;
  phone?: string;
  email?: string;
  registrationDate?: string;
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    totalActive: 0,
    totalNotYet: 0,
    totalStudents: 0,
    monthlyActive: 0,
    monthlyNotYet: 0
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusFilter,
      });

      const response = await fetch(`/api/admin/students?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch students");

      const result = await response.json();
      setStudents(result.students || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      const response = await fetch('/api/admin/students/stats', {
        credentials: "include",
      });
      if (response.ok) {
        const stats = await response.json();
        setGlobalStats(stats);
      }
    } catch (err) {
      console.error('Failed to fetch global stats:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, limit, searchQuery, statusFilter]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Status",
      "Start Date",
      "Ustaz",
      "Phone",
      "Registration Date",
    ];
    const rows = students.map((student) => [
      student.name,
      student.status,
      student.startDate
        ? format(parseISO(student.startDate), "yyyy-MM-dd")
        : "N/A",
      student.ustazName || "N/A",
      student.phone || "N/A",
      student.registrationDate
        ? format(parseISO(student.registrationDate), "yyyy-MM-dd")
        : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student Management
              </h1>
              <p className="text-gray-600">
                Manage active and not yet students
              </p>
            </div>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-medium text-sm">Total Students</p>
                <p className="text-3xl font-bold text-blue-900">{globalStats.totalStudents}</p>
              </div>
              <FiUsers className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-medium text-sm">All Active</p>
                <p className="text-3xl font-bold text-green-900">{globalStats.totalActive}</p>
              </div>
              <FiCheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 font-medium text-sm">All Not Yet</p>
                <p className="text-3xl font-bold text-orange-900">{globalStats.totalNotYet}</p>
              </div>
              <FiClock className="h-12 w-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-medium text-sm">Monthly Active</p>
                <p className="text-3xl font-bold text-purple-900">{globalStats.monthlyActive}</p>
              </div>
              <FiCalendar className="h-12 w-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-600 font-medium text-sm">Monthly Not Yet</p>
                <p className="text-3xl font-bold text-pink-900">{globalStats.monthlyNotYet}</p>
              </div>
              <FiClock className="h-12 w-12 text-pink-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Not yet">Not Yet</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={fetchStudents}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <FiDownload className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Ustaz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.startDate ? (
                        <div className="flex items-center gap-2">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                          {format(parseISO(student.startDate), "MMM dd, yyyy")}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.ustazName || (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {student.phone && (
                          <div className="text-sm text-gray-600">
                            {student.phone}
                          </div>
                        )}
                        {student.email && (
                          <div className="text-sm text-gray-600">
                            {student.email}
                          </div>
                        )}
                        {!student.phone && !student.email && (
                          <span className="text-gray-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.registrationDate ? (
                        format(
                          parseISO(student.registrationDate),
                          "MMM dd, yyyy"
                        )
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} students
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
