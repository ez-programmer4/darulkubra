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
  lastSeen: string;
  activePackageId: string;
  result: { total: number; correct: number; score: number };
  hasFinalExam: boolean;
  isUpdateProhibited: boolean;
  attendance: string;
  totalSessions: number;
}

interface PackageDetails {
  id: string;
  title: string;
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  notStartedChapters: number;
  progressPercent: number;
  status: "notstarted" | "inprogress" | "completed";
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
  const [allStudents, setAllStudents] = useState<StudentAnalytics[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [progressFilter, setProgressFilter] = useState<
    "all" | "notstarted" | "inprogress" | "completed"
  >("all");
  const [lastSeenFilter, setLastSeenFilter] = useState<
    "all" | "today" | "week" | "month" | "inactive"
  >("all");
  const [examFilter, setExamFilter] = useState<
    "all" | "taken" | "nottaken" | "passed" | "failed"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [packageDetails, setPackageDetails] = useState<PackageDetails[] | null>(
    null
  );
  const [showPackageModal, setShowPackageModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    fetchStudents();
    fetchAllStudents();
  }, [
    session,
    status,
    router,
    searchTerm,
    progressFilter,
    lastSeenFilter,
    examFilter,
    currentPage,
  ]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        progress: progressFilter,
        lastSeen: lastSeenFilter,
        examStatus: examFilter,
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

  const fetchAllStudents = async () => {
    try {
      const params = new URLSearchParams({
        progress: "all",
        page: "1",
        limit: "1000",
      });

      const response = await fetch(
        `/api/controller/student-analytics?${params}`
      );
      const result = await response.json();

      if (response.ok) {
        setAllStudents(result.data);
      }
    } catch (err) {
      // Silent fail for stats
    }
  };

  const fetchPackageDetails = async (studentId: number) => {
    try {
      const response = await fetch(
        `/api/controller/student-analytics?packageDetails=${studentId}`
      );
      const result = await response.json();
      if (response.ok) {
        setPackageDetails(result.packageDetails);
        setSelectedStudent(studentId);
        setShowPackageModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch package details:", err);
    }
  };

  const getLastSeenColor = (lastSeen: string) => {
    if (lastSeen === "Today") return "bg-green-100 text-green-800";
    if (lastSeen.includes("day")) return "bg-blue-100 text-blue-800";
    if (lastSeen.includes("week")) return "bg-yellow-100 text-yellow-800";
    if (
      lastSeen.includes("month") ||
      lastSeen.includes("year") ||
      lastSeen === "-"
    )
      return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
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

  const getExamStatusColor = (student: StudentAnalytics) => {
    if (!student.hasFinalExam && student.studentProgress === "completed")
      return "bg-yellow-100 text-yellow-800";
    if (student.hasFinalExam && student.result.score >= 0.6)
      return "bg-green-100 text-green-800";
    if (student.hasFinalExam && student.result.score < 0.6)
      return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getExamStatusText = (student: StudentAnalytics) => {
    if (!student.hasFinalExam && student.studentProgress === "completed")
      return "📝 Not Taken";
    if (student.hasFinalExam && student.result.score >= 0.6)
      return `✅ Passed (${Math.round(student.result.score * 100)}%)`;
    if (student.hasFinalExam && student.result.score < 0.6)
      return `❌ Failed (${Math.round(student.result.score * 100)}%)`;
    return "➖ N/A";
  };

  const getAttendanceColor = (attendance: string) => {
    const [, present, absent] = attendance.match(/P-(\d+) A-(\d+)/) || [];
    const presentNum = parseInt(present) || 0;
    const absentNum = parseInt(absent) || 0;
    const total = presentNum + absentNum;
    if (total === 0) return "bg-gray-100 text-gray-800";
    const rate = presentNum / total;
    if (rate >= 0.8) return "bg-green-100 text-green-800";
    if (rate >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
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
            <div className="md:w-48">
              <select
                value={lastSeenFilter}
                onChange={(e) => {
                  setLastSeenFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Activity</option>
                <option value="today">Active Today</option>
                <option value="week">Active This Week</option>
                <option value="month">Active This Month</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="md:w-48">
              <select
                value={examFilter}
                onChange={(e) => {
                  setExamFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Exams</option>
                <option value="taken">Exam Taken</option>
                <option value="nottaken">Not Taken</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Stats */}
        {pagination && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold">
                    {pagination.totalRecords}
                  </p>
                </div>
                <FiUsers className="h-8 w-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">
                    Completed
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      allStudents.filter(
                        (s) => s.studentProgress === "completed"
                      ).length
                    }
                  </p>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    In Progress
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      allStudents.filter(
                        (s) =>
                          s.studentProgress !== "completed" &&
                          s.studentProgress !== "notstarted"
                      ).length
                    }
                  </p>
                </div>
                <div className="text-2xl">📚</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">
                    Active Today
                  </p>
                  <p className="text-2xl font-bold">
                    {allStudents.filter((s) => s.lastSeen === "Today").length}
                  </p>
                </div>
                <div className="text-2xl">🔥</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">
                    Exam Passed
                  </p>
                  <p className="text-2xl font-bold">
                    {
                      allStudents.filter(
                        (s) => s.hasFinalExam && s.result?.score >= 0.6
                      ).length
                    }
                  </p>
                </div>
                <div className="text-2xl">🎯</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Need Exam</p>
                  <p className="text-2xl font-bold">
                    {
                      allStudents.filter(
                        (s) =>
                          !s.hasFinalExam && s.studentProgress === "completed"
                      ).length
                    }
                  </p>
                </div>
                <div className="text-2xl">📝</div>
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
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
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
                              {student.name?.charAt(0)?.toUpperCase() || "?"}
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
                      <button
                        onClick={() => fetchPackageDetails(student.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {student.activePackage}
                      </button>
                      {student.isKid && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLastSeenColor(
                          student.lastSeen
                        )}`}
                      >
                        {student.lastSeen}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExamStatusColor(
                          student
                        )}`}
                      >
                        {getExamStatusText(student)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAttendanceColor(
                          student.attendance
                        )}`}
                        title={`Present: ${
                          student.attendance.match(/P-(\d+)/)?.[1] || 0
                        }, Absent: ${
                          student.attendance.match(/A-(\d+)/)?.[1] || 0
                        }, Total: ${student.totalSessions}`}
                      >
                        {student.attendance}
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

        {/* Enhanced Package Details Modal */}
        {showPackageModal && packageDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">
                      📊 Course Progress Overview
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Detailed learning analytics and progress tracking
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPackageModal(false)}
                    className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-full"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
                <div className="space-y-6">
                  {packageDetails.map((course, index) => (
                    <div
                      key={course.id}
                      className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Course Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              course.status === "completed"
                                ? "bg-green-500"
                                : course.status === "inprogress"
                                ? "bg-blue-500"
                                : "bg-gray-400"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">
                              {course.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {course.totalChapters} chapters total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-2xl font-bold ${
                              course.progressPercent === 100
                                ? "text-green-600"
                                : course.progressPercent > 0
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                          >
                            {course.progressPercent}%
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {course.completedChapters}/{course.totalChapters}{" "}
                            completed
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>{course.progressPercent}% Complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ease-out ${
                              course.progressPercent === 100
                                ? "bg-gradient-to-r from-green-400 to-green-600"
                                : course.progressPercent > 0
                                ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                : "bg-gray-300"
                            }`}
                            style={{ width: `${course.progressPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {course.completedChapters}
                          </div>
                          <div className="text-xs text-green-700 font-medium">
                            ✅ Completed
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {course.inProgressChapters}
                          </div>
                          <div className="text-xs text-blue-700 font-medium">
                            📚 In Progress
                          </div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-gray-600">
                            {course.notStartedChapters}
                          </div>
                          <div className="text-xs text-gray-700 font-medium">
                            ⏸️ Not Started
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-4 flex justify-center">
                        <span
                          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                            course.status === "completed"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : course.status === "inprogress"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-gray-100 text-gray-800 border border-gray-300"
                          }`}
                        >
                          {course.status === "completed"
                            ? "🎉 Course Completed!"
                            : course.status === "inprogress"
                            ? "🚀 Learning in Progress"
                            : "📋 Ready to Start"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Footer */}
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                  <div className="text-center">
                    <h5 className="text-lg font-bold text-indigo-800 mb-2">
                      📈 Learning Summary
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xl font-bold text-indigo-600">
                          {packageDetails.length}
                        </div>
                        <div className="text-indigo-700">Total Courses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {
                            packageDetails.filter(
                              (c) => c.status === "completed"
                            ).length
                          }
                        </div>
                        <div className="text-green-700">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {
                            packageDetails.filter(
                              (c) => c.status === "inprogress"
                            ).length
                          }
                        </div>
                        <div className="text-blue-700">In Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {Math.round(
                            packageDetails.reduce(
                              (acc, c) => acc + c.progressPercent,
                              0
                            ) / packageDetails.length
                          ) || 0}
                          %
                        </div>
                        <div className="text-purple-700">Overall Progress</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {students.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ||
              progressFilter !== "all" ||
              lastSeenFilter !== "all" ||
              examFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "No students are assigned to your control."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
