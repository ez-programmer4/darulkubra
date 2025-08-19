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
  }, [status, session, selectedDate, selectedController, attendanceFilter]);

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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiCalendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Daily Attendance
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Monitor student attendance and zoom link activity
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Students
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {attendanceData.length}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiLink className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Links Sent
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {stats.totalSent}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiEye className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Clicked
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {stats.totalClicked}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiCheckCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Response Rate
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {stats.responseRate}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">
                  <FiCalendar className="inline h-4 w-4 mr-2" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
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
                  className="w-full px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">
                  Student Attendance & Zoom Links
                </h2>
                <p className="text-gray-600">
                  {selectedDate} - {attendanceData.length} students
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                    Student
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                    Zoom Link
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record) => (
                  <tr
                    key={record.student_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
      </div>
    </div>
  );
}
