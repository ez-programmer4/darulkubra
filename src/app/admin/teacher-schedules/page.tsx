"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  FiCalendar,
  FiUsers,
  FiClock,
  FiFilter,
  FiRefreshCw,
  FiLink,
  FiCheckCircle,
} from "react-icons/fi";

interface AttendanceRecord {
  student_id: number;
  studentName: string;
  ustazName: string;
  controllerName: string;
  scheduledAt: string | null;
  links: {
    id: number;
    link: string;
    sent_time: string | null;
    clicked_at: string | null;
    expiration_date: string | null;
    report: number | null;
    tracking_token: string | null;
  }[];
  attendance_status: string;
  absentDaysCount: number;
  daypackages: string;
}

interface Controller {
  code: string;
  name: string;
}

interface Teacher {
  id: number;
  name: string;
  controllerId: string;
}

export default function AdminAttendanceList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedController, setSelectedController] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Check authentication and role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Fetch controllers and attendance data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchControllers();
      fetchAttendanceData();
    }
  }, [
    status,
    session,
    selectedDate,
    selectedController,
    selectedTeacher,
    attendanceFilter,
    studentStatusFilter,
    currentPage,
  ]);

  // Fetch teachers when controller changes
  useEffect(() => {
    if (selectedController) {
      fetchTeachers(selectedController);
      setSelectedTeacher(""); // Reset teacher selection when controller changes
    } else {
      setTeachers([]);
      setSelectedTeacher("");
    }
  }, [selectedController]);

  const fetchControllers = async () => {
    try {
      const response = await fetch("/api/control-options");
      if (response.ok) {
        const data = await response.json();
        setControllers(data.controllers || []);
      }
    } catch (error) {
      console.error("Error fetching controllers:", error);
    }
  };

  const fetchTeachers = async (controllerId: string) => {
    try {
      const response = await fetch(
        `/api/admin/teachers?controlId=${controllerId}`
      );
      if (response.ok) {
        const data = await response.json();

        setTeachers(data.teachers || []);
      } else {
        console.error("Failed to fetch teachers, status:", response.status);
        setTeachers([]);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers([]);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        page: currentPage.toString(),
        limit: "20",
        ...(selectedController && { controllerId: selectedController }),
        ...(selectedTeacher && { teacherId: selectedTeacher }),
        ...(attendanceFilter && { attendanceStatus: attendanceFilter }),
        ...(studentStatusFilter && { studentStatus: studentStatusFilter }),
      });

      const response = await fetch(
        `/api/admin/daily-attendance?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data.integratedData || []);
        setTotalRecords(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Attendance API error:", errorData);
        toast.error(
          `Failed to fetch attendance data: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Error fetching attendance data");
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "permission":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "--";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mb-6"></div>
          <p className="text-black font-medium text-lg">
            Loading attendance data...
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Please wait while we fetch the data
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiCalendar className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black">
                    Daily Attendance
                  </h1>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-green-700">
                      LIVE
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Real-time monitoring of student attendance and zoom link
                  activity
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <FiClock className="h-4 w-4" />
                    <span>Updated {new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Admin Dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-black rounded-lg">
                <FiFilter className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black">
                Filter & Controls
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <FiCalendar className="h-3 w-3 text-blue-600" />
                  </div>
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                  <div className="p-1 bg-emerald-100 rounded">
                    <FiUsers className="h-3 w-3 text-emerald-600" />
                  </div>
                  Controller Filter
                </label>
                <select
                  value={selectedController}
                  onChange={(e) => setSelectedController(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm"
                >
                  <option value="">All Controllers</option>
                  {controllers.map((controller) => (
                    <option key={controller.code} value={controller.code}>
                      {controller.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                  <div className="p-1 bg-purple-100 rounded">
                    <FiUsers className="h-3 w-3 text-purple-600" />
                  </div>
                  Teacher Filter
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  disabled={!selectedController}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedController
                      ? "All Teachers"
                      : "Select Controller First"}
                  </option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                  <div className="p-1 bg-violet-100 rounded">
                    <FiCheckCircle className="h-3 w-3 text-violet-600" />
                  </div>
                  Status Filter
                </label>
                <select
                  value={attendanceFilter}
                  onChange={(e) => {
                    setAttendanceFilter(e.target.value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm"
                >
                  <option value="">All Status</option>
                  <option value="Present">✅ Present</option>
                  <option value="Absent">❌ Absent</option>
                  <option value="Not taken">⏳ Not Taken</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                  <div className="p-1 bg-teal-100 rounded">
                    <FiUsers className="h-3 w-3 text-teal-600" />
                  </div>
                  Student Status
                </label>
                <select
                  value={studentStatusFilter}
                  onChange={(e) => {
                    setStudentStatusFilter(e.target.value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm"
                >
                  <option value="">All Students</option>
                  <option value="Active">🟢 Active</option>
                  <option value="Not yet">🟡 Not Yet</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                  <div className="p-1 bg-amber-100 rounded">
                    <FiRefreshCw className="h-3 w-3 text-amber-600" />
                  </div>
                  Quick Actions
                </label>
                <button
                  onClick={fetchAttendanceData}
                  className="w-full px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiUsers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-black">
                    Student Attendance & Zoom Links
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-gray-600 font-semibold">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-500 font-medium">
                      {attendanceData.length} students
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:ml-auto">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-bold text-green-700">
                    REAL-TIME
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="py-5 px-6 text-left font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FiUsers className="h-4 w-4" />
                      Student
                    </div>
                  </th>
                  <th className="py-5 px-6 text-left font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FiUsers className="h-4 w-4" />
                      Teacher
                    </div>
                  </th>
                  <th className="py-5 px-6 text-left font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FiClock className="h-4 w-4" />
                      Scheduled
                    </div>
                  </th>
                  <th className="py-5 px-6 text-left font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FiLink className="h-4 w-4" />
                      Zoom Link
                    </div>
                  </th>
                  <th className="py-5 px-6 text-left font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="h-4 w-4" />
                      Attendance
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record) => (
                  <tr
                    key={record.student_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-bold text-black">
                          {record.studentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {record.student_id}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-700">{record.ustazName}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-700">
                        {record.scheduledAt
                          ? formatTime(record.scheduledAt)
                          : "Not scheduled"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {record.links.length > 0 ? (
                        <div className="space-y-1">
                          {record.links.map((link) => (
                            <div key={link.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    link.sent_time
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {link.sent_time ? "Sent" : "Not sent"}
                                </span>
                                {link.clicked_at && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Clicked
                                  </span>
                                )}
                              </div>
                              {link.sent_time && (
                                <div className="text-xs text-gray-500">
                                  Sent: {formatTime(link.sent_time)}
                                  {link.clicked_at &&
                                    ` | Clicked: ${formatTime(
                                      link.clicked_at
                                    )}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No links</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getAttendanceStatusColor(
                          record.attendance_status
                        )}`}
                      >
                        {record.attendance_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attendanceData.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                <FiUsers className="h-16 w-16 text-gray-500" />
              </div>
              <h3 className="text-3xl font-bold text-black mb-4">
                No Attendance Data
              </h3>
              <p className="text-gray-600 text-xl">
                No students found for the selected date and filters.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                Showing{" "}
                <span className="font-bold text-black">
                  {(currentPage - 1) * 20 + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-black">
                  {Math.min(currentPage * 20, totalRecords)}
                </span>{" "}
                of <span className="font-bold text-black">{totalRecords}</span>{" "}
                students
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-6 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum =
                      Math.max(1, Math.min(totalPages - 4, currentPage - 2)) +
                      i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          currentPage === pageNum
                            ? "bg-black text-white"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage(Math.min(totalPages, currentPage + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="px-6 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
