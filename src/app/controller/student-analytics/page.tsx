"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiArrowLeft,
  FiMessageCircle,
  FiPhone,
  FiBook,
  FiTrendingUp,
} from "react-icons/fi";

interface StudentAnalytics {
  id: number;
  name: string;
  phoneNo: string;
  ustazname: string;
  tglink: string;
  whatsapplink: string;
  isKid: boolean;
  chatid: string | null;
  activePackage: string;
  studentProgress: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function StudentAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [progressFilter, setProgressFilter] = useState<
    "all" | "notstarted" | "inprogress" | "completed"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (status === "loading") return;

    fetchStudents();
  }, [session, status, router, searchTerm, progressFilter, currentPage]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        progress: progressFilter,
        page: currentPage.toString(),
        limit: "10",
      });

      const response = await fetch(
        `/api/controller/student-analytics?${params}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch students");
      }

      setStudents(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: string) => {
    if (progress === "completed") return "bg-green-100 text-green-800";
    if (progress === "notstarted") return "bg-gray-100 text-gray-800";
    return "bg-blue-100 text-blue-800";
  };

  const getProgressIcon = (progress: string) => {
    if (progress === "completed") return "✅";
    if (progress === "notstarted") return "⏸️";
    return "📚";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error: {error}</div>
          <button
            onClick={() => router.push("/controller")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/controller")}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Student Analytics
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={progressFilter}
                onChange={(e) => {
                  setProgressFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Progress</option>
                <option value="notstarted">Not Started</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        {pagination && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <FiUsers className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {pagination.totalRecords}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <FiBook className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Active Packages
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {new Set(students.map((s) => s.activePackage)).size}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <FiTrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    In Progress
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      students.filter(
                        (s) =>
                          s.studentProgress !== "completed" &&
                          s.studentProgress !== "notstarted"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <FiMessageCircle className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Connected</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {students.filter((s) => s.chatid).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {student.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.ustazname || "Not assigned"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.activePackage}
                      </div>
                      {student.isKid && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Kid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProgressColor(
                          student.studentProgress
                        )}`}
                      >
                        {getProgressIcon(student.studentProgress)}{" "}
                        {student.studentProgress}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <a
                          href={student.whatsapplink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900"
                          title="WhatsApp"
                        >
                          <FiPhone className="h-4 w-4" />
                        </a>
                        <a
                          href={student.tglink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                          title="Telegram"
                        >
                          <FiMessageCircle className="h-4 w-4" />
                        </a>
                        {student.chatid && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Connected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1)
                    )
                  }
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage +
                        1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.currentPage * pagination.itemsPerPage,
                        pagination.totalRecords
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {pagination.totalRecords}
                    </span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={!pagination.hasPreviousPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(pagination.totalPages, currentPage + 1)
                        )
                      }
                      disabled={!pagination.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {students.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || progressFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No students are assigned to your control."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
