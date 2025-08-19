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
  FiXCircle,
  FiAlertCircle,
  FiSend,
  FiEye,
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

export default function AdminAttendanceList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedController, setSelectedController] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalSent: 0,
    totalClicked: 0,
    missedDeadlines: 0,
    responseRate: "0%",
  });

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
  }, [status, session, selectedDate, selectedController, attendanceFilter, currentPage]);

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

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        page: currentPage.toString(),
        limit: "20",
        ...(selectedController && { controllerId: selectedController }),
        ...(attendanceFilter && { attendanceStatus: attendanceFilter }),
      });

      const response = await fetch(`/api/admin/daily-attendance?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data.integratedData || []);
        setTotalRecords(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setStats(data.stats || {
          totalLinks: 0,
          totalSent: 0,
          totalClicked: 0,
          missedDeadlines: 0,
          responseRate: "0%",
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Attendance API error:', errorData);
        toast.error(`Failed to fetch attendance data: ${errorData.error || 'Unknown error'}`);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 p-6 sm:p-8 lg:p-10 hover:shadow-3xl transition-all duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-gradient-to-br from-black to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <FiCalendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent mb-2">
                  Daily Attendance
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Monitor student attendance and zoom link activity
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center border border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-blue-700">
                    Students
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {attendanceData.length}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 text-center border border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiLink className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-green-700">
                    Links Sent
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {stats.totalSent}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center border border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiEye className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-purple-700">
                    Clicked
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {stats.totalClicked}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 text-center border border-orange-200 hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiCheckCircle className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-orange-700">
                    Response Rate
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {stats.responseRate}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  <FiCalendar className="inline h-4 w-4 mr-2" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Controller
                </label>
                <select
                  value={selectedController}
                  onChange={(e) => setSelectedController(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="">All Controllers</option>
                  {controllers.map((controller) => (
                    <option key={controller.code} value={controller.code}>
                      {controller.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  <FiCheckCircle className="inline h-4 w-4 mr-2" />
                  Attendance
                </label>
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Permission">Permission</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  Actions
                </label>
                <button
                  onClick={fetchAttendanceData}
                  className="w-full px-4 py-3 bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white rounded-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 group"
                >
                  <FiRefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden hover:shadow-3xl transition-all duration-300">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200/50 bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-black to-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">
                  Student Attendance & Zoom Links
                </h2>
                <p className="text-gray-600 font-medium">
                  {selectedDate} - {attendanceData.length} students
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr className="border-b border-gray-200/50">
                  <th className="py-4 px-6 text-left font-bold text-gray-800 uppercase tracking-wider hover:text-black transition-colors">
                    Student
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-gray-800 uppercase tracking-wider hover:text-black transition-colors">
                    Teacher
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-gray-800 uppercase tracking-wider hover:text-black transition-colors">
                    Scheduled
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-gray-800 uppercase tracking-wider hover:text-black transition-colors">
                    Zoom Link
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-gray-800 uppercase tracking-wider hover:text-black transition-colors">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record) => (
                  <tr
                    key={record.student_id}
                    className="border-b border-gray-100/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300 hover:shadow-sm group"
                  >
                    <td className="py-4 px-6">
                      <div className="group-hover:scale-105 transition-transform duration-200">
                        <div className="font-bold text-black group-hover:text-blue-900">
                          {record.studentName}
                        </div>
                        <div className="text-sm text-gray-500 group-hover:text-gray-600">
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
                        <span className="text-gray-500 text-sm">
                          No links
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          getAttendanceStatusColor(record.attendance_status)
                        }`}
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
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 p-6 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700 bg-gray-50 px-4 py-2 rounded-lg">
                Showing <span className="font-bold text-black">{((currentPage - 1) * 20) + 1}</span> to <span className="font-bold text-black">{Math.min(currentPage * 20, totalRecords)}</span> of <span className="font-bold text-black">{totalRecords}</span> students
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-6 py-2 border border-gray-300 rounded-lg bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:from-gray-50 hover:to-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md font-medium"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-black to-gray-800 text-white shadow-lg scale-105'
                            : 'bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:from-gray-50 hover:to-gray-100 border border-gray-300 hover:shadow-md hover:scale-105'
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
                  className="px-6 py-2 border border-gray-300 rounded-lg bg-gradient-to-r from-white to-gray-50 text-gray-700 hover:from-gray-50 hover:to-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md font-medium"
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
