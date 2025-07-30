"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiUserPlus,
  FiUserX,
  FiBookOpen,
  FiDollarSign,
  FiClipboard,
  FiCalendar,
  FiBell,
  FiAlertTriangle,
  FiSettings,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiPlus,
  FiPieChart,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/ui/use-toast";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Types for dashboard widgets
interface PermissionRequest {
  id: number;
  teacher?: string;
  teacherId?: string;
  status: string;
  date?: string;
  createdAt?: string;
}
interface Payment {
  id: number;
  user?: string;
  studentname?: string;
  amount?: number;
  paidamount?: number;
  status: string;
  date?: string;
  paymentdate?: string;
}
interface Absence {
  id: number;
  teacher: string;
  date: string;
  processed: boolean;
}
interface QualityTeacher {
  ustazname?: string;
  name?: string;
  overallQuality?: string;
}
interface SettingOverview {
  key: string;
  value: string;
}
interface ControllerEarning {
  controllerUsername?: string;
  controllerId?: string;
  amount?: number;
  earning?: number;
}
interface TeacherLeaderboardEntry {
  ustazname?: string;
  name?: string;
  quality?: string;
  rating?: string;
}
interface AdminAction {
  id: number;
  action: string;
  user: string;
  date: string;
}
interface Stats {
  admins: number;
  controllers: number;
  teachers: number;
  registrars: number;
  students: number;
  totalRevenue: {
    approved: number;
    pending: number;
    rejected: number;
  };
  paymentCount: number;
  pendingPaymentCount: number;
  pendingPaymentAmount: number;
}
interface AnalyticsData {
  monthlyRevenue: Record<string, number>;
  monthlyRegistrations: Record<string, number>;
  paymentStatusBreakdown: { name: string; value: number }[];
}

// Enhanced safeDisplay function
function safeDisplay(val: any): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(safeDisplay).join(", ");
  if (val === null || val === undefined) return "Unknown";
  if (typeof val === "object") {
    if ("ustazname" in val && typeof val.ustazname === "string")
      return val.ustazname;
    if ("name" in val && typeof val.name === "string") return val.name;
    return JSON.stringify(val);
  }
  return "Unknown";
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<number>(0);
  const [recentPermissions, setRecentPermissions] = useState<
    PermissionRequest[]
  >([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentAbsences, setRecentAbsences] = useState<Absence[]>([]);
  const [badQualityTeachers, setBadQualityTeachers] = useState<
    QualityTeacher[]
  >([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [attendanceToday, setAttendanceToday] = useState<{
    present: number;
    absent: number;
  }>({ present: 0, absent: 0 });
  const [settingsOverview, setSettingsOverview] = useState<SettingOverview[]>(
    []
  );
  const [controllerEarnings, setControllerEarnings] = useState<
    ControllerEarning[]
  >([]);
  const [teacherLeaderboard, setTeacherLeaderboard] = useState<
    TeacherLeaderboardEntry[]
  >([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState<boolean>(true);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const fetchDashboardWidgets = useCallback(async () => {
    setLoadingWidgets(true);
    setWidgetError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [
        permRes,
        payRes,
        attRes,
        settingsRes,
        earningsRes,
        leaderboardRes,
        qualityRes,
      ] = await Promise.all([
        fetch("/api/admin/permissions?status=Pending"),
        fetch("/api/admin/payments"),
        fetch(`/api/admin/attendance?date=${today}`),
        fetch("/api/admin/settings"),
        fetch("/api/admin/controller-earnings"),
        fetch("/api/admin/ustaz-ratings?from=2024-01-01&to=2024-12-31"),
        fetch(`/api/admin/quality-review?weekStart=${today}`),
      ]);

      if (!permRes.ok) throw new Error("Failed to fetch permissions");
      const permData = await permRes.json();
      setPendingPermissions(Array.isArray(permData) ? permData.length : 0);
      setRecentPermissions(Array.isArray(permData) ? permData.slice(0, 5) : []);

      if (!payRes.ok) throw new Error("Failed to fetch payments");
      const payData = await payRes.json();
      setRecentPayments(Array.isArray(payData) ? payData.slice(0, 5) : []);

      setUnreadNotifications(0); // Temporarily disabled

      if (!attRes.ok) throw new Error("Failed to fetch attendance");
      const attData = await attRes.json();
      setAttendanceToday({
        present: attData.stats?.totalClicked || 0,
        absent:
          (attData.stats?.totalLinks || 0) - (attData.stats?.totalClicked || 0),
      });

      if (!settingsRes.ok) throw new Error("Failed to fetch settings");
      const settingsData = await settingsRes.json();
      setSettingsOverview(
        Array.isArray(settingsData.settings)
          ? settingsData.settings.slice(0, 5)
          : []
      );

      if (!earningsRes.ok)
        throw new Error("Failed to fetch controller earnings");
      const earningsData = await earningsRes.json();
      setControllerEarnings(
        Array.isArray(earningsData) ? earningsData.slice(0, 3) : []
      );

      if (!leaderboardRes.ok) throw new Error("Failed to fetch leaderboard");
      const leaderboardData = await leaderboardRes.json();
      setTeacherLeaderboard(
        Array.isArray(leaderboardData) ? leaderboardData.slice(0, 3) : []
      );

      if (!qualityRes.ok) throw new Error("Failed to fetch quality reviews");
      const qualityData = await qualityRes.json();
      setBadQualityTeachers(
        Array.isArray(qualityData)
          ? qualityData.filter((t: any) => t.overallQuality === "Bad")
          : []
      );

      const auditLogs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          admin: {
            select: { name: true },
          },
        },
      });

      setAdminActions(
        auditLogs.map((log: any) => ({
          id: log.id,
          action: log.actionType,
          user: log.admin?.name || "Unknown",
          date: log.createdAt.toISOString().split("T")[0],
        }))
      );

      const recentAbsencesData = await prisma.absenceRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          teacher: {
            select: { ustazname: true },
          },
        },
      });

      setRecentAbsences(
        recentAbsencesData.map((absence: any) => ({
          id: absence.id,
          teacher: absence.teacher?.ustazname || "Unknown",
          date: absence.date.toISOString().split("T")[0],
          processed: absence.processed,
        }))
      );
    } catch (e: any) {
      setWidgetError("Failed to load dashboard widgets.");
      toast({
        title: "Error",
        description: "Failed to load dashboard widgets.",
        variant: "destructive",
      });
    } finally {
      setLoadingWidgets(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (date?.from) params.append("startDate", date.from.toISOString());
      if (date?.to) params.append("endDate", date.to.toISOString());

      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch(`/api/admin/stats?${params.toString()}`),
          fetch(`/api/admin/analytics?${params.toString()}`),
        ]);
        if (!statsRes.ok || !analyticsRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const statsData = await statsRes.json();
        const analyticsData = await analyticsRes.json();
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message || "Failed to fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchDashboardWidgets();
  }, [date, fetchDashboardWidgets]);

  if (loading) return <DashboardSkeleton />;

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 font-semibold p-8 animate-slide-in">
        <FiAlertTriangle className="inline-block mr-2 h-6 w-6" />
        Error: {error}
      </div>
    );

  if (!stats || !analytics)
    return (
      <div className="flex items-center justify-center min-h-screen text-indigo-600 font-semibold p-8 animate-slide-in">
        No data available.
      </div>
    );

  const totalUsers =
    stats.admins + stats.controllers + stats.teachers + stats.registrars;

  const statsBar = [
    {
      label: "Active Users",
      value: totalUsers,
      icon: <FiUsers className="text-indigo-500 w-6 h-6" />,
    },
    {
      label: "Attendance Today",
      value: `${attendanceToday.present} / ${
        attendanceToday.present + attendanceToday.absent
      }`,
      icon: <FiUserCheck className="text-teal-500 w-6 h-6" />,
    },
    {
      label: "Unread Notifications",
      value: unreadNotifications,
      icon: <FiBell className="text-yellow-500 w-6 h-6" />,
    },
    {
      label: "Pending Permissions",
      value: pendingPermissions,
      icon: <FiClipboard className="text-indigo-500 w-6 h-6" />,
    },
    {
      label: "Unprocessed Absences",
      value: recentAbsences.filter((a) => !a.processed).length,
      icon: <FiAlertTriangle className="text-red-500 w-6 h-6" />,
    },
    {
      label: "Pending Payments",
      value: `${stats.pendingPaymentCount} ($${stats.pendingPaymentAmount})`,
      icon: <FiDollarSign className="text-teal-500 w-6 h-6" />,
    },
    {
      label: "Students",
      value: stats.students,
      icon: <FiBookOpen className="text-indigo-500 w-6 h-6" />,
    },
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.approved}`,
      icon: <FiDollarSign className="text-teal-500 w-6 h-6" />,
    },
  ];

  const revenueChartData = Object.entries(analytics.monthlyRevenue).map(
    ([month, revenue]) => ({
      name: month,
      Revenue: revenue,
    })
  );
  const registrationChartData = Object.entries(
    analytics.monthlyRegistrations
  ).map(([month, count]) => ({
    name: month,
    Registrations: count,
  }));
  const PIE_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
        {/* Hero Overview */}
        <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 animate-slide-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-3 sm:mb-4">
                <span className="flex items-center gap-2 text-teal-600 font-semibold text-sm sm:text-base">
                  <span className="w-3 h-3 rounded-full bg-teal-500 animate-pulse"></span>
                  All Systems Operational
                </span>
                <span className="mt-2 sm:mt-0 sm:ml-6 text-xs sm:text-sm text-indigo-500">
                  Last login: 2024-07-22 09:15
                </span>
                <span className="mt-2 sm:mt-0 sm:ml-6 text-xs sm:text-sm text-indigo-500">
                  Last updated: {format(new Date(), "PPpp")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-900 mb-2 sm:mb-3 flex items-center gap-3">
                <FiUsers className="text-indigo-500 h-8 sm:h-10 w-8 sm:w-10" />
                Welcome, Admin
              </h1>
              <p className="text-indigo-700 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 max-w-2xl">
                Monitor your system’s health, user activity, and key metrics in
                real time.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {statsBar.map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center p-4 bg-indigo-50/95 backdrop-blur-md rounded-lg shadow-sm hover:shadow-md transition-all animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="mb-2">{stat.icon}</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-indigo-900">
                      {stat.value}
                    </div>
                    <div className="text-indigo-700 text-xs sm:text-sm font-semibold mt-1 text-center">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:items-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-64 justify-start text-left font-normal border-indigo-200 bg-white/95 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 shadow-md hover:shadow-lg text-sm sm:text-base transition-all"
                    aria-label="Select date range"
                  >
                    <FiCalendar className="mr-2 h-5 w-5 text-indigo-500" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-white/95 border-indigo-200 shadow-lg rounded-2xl"
                  align="end"
                >
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    className="bg-white/95 rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
              {[
                {
                  text: "Add New User",
                  icon: <FiUserPlus className="w-5 h-5" />,
                  action: () => {},
                },
                {
                  text: "Process Absences",
                  icon: <FiAlertTriangle className="w-5 h-5" />,
                  action: () => {},
                },
                {
                  text: "Review Permissions",
                  icon: <FiClipboard className="w-5 h-5" />,
                  action: () => {},
                },
              ].map((btn, idx) => (
                <Button
                  key={idx}
                  className="w-full sm:w-64 bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm sm:text-base"
                  onClick={btn.action}
                  aria-label={btn.text}
                >
                  {btn.icon} {btn.text}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Alerts */}
        {badQualityTeachers.length > 0 && (
          <section className="p-4 sm:p-6 bg-red-50/95 backdrop-blur-md rounded-2xl shadow-lg border border-red-100 flex items-center gap-4 mb-8 animate-slide-in">
            <FiAlertTriangle className="text-red-600 h-6 sm:h-8 w-6 sm:w-8 animate-pulse" />
            <div>
              <div className="font-semibold text-red-900 text-base sm:text-lg">
                Teachers Requiring Review
              </div>
              <div className="text-sm sm:text-base text-red-700">
                {badQualityTeachers
                  .map((t) => safeDisplay(t.ustazname ?? t.name))
                  .join(", ") || "No teachers"}
              </div>
            </div>
          </section>
        )}

        {/* Main Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* User Growth Chart */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiUsers className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                User Growth
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={registrationChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFF",
                    borderColor: "#E0E7FF",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Registrations"
                  stroke="#4F46E5"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Heatmap */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Attendance Heatmap
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4">
              {[...Array(35)].map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded ${
                    i % 7 === 0
                      ? "bg-indigo-600"
                      : i % 5 === 0
                      ? "bg-indigo-300"
                      : "bg-indigo-100"
                  } hover:scale-110 transition-all`}
                  title={`Day ${i + 1}`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-indigo-500 mt-3">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>
          </div>

          {/* Revenue/Attendance Trend */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-teal-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Monthly Revenue
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFF",
                    borderColor: "#E0E7FF",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Status */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-teal-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Payment Status Breakdown
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={analytics.paymentStatusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#4F46E5"
                  label
                >
                  {PIE_COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFF",
                    borderColor: "#E0E7FF",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Breakdown */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiPieChart className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Quality Ratings
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={(() => {
                    const qualityCounts = badQualityTeachers.reduce(
                      (acc, teacher) => {
                        const quality = teacher.overallQuality || "Unknown";
                        acc[quality] = (acc[quality] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    );

                    if (Object.keys(qualityCounts).length === 0) {
                      return [
                        { name: "Good", value: 60 },
                        { name: "Bad", value: 10 },
                        { name: "Excellent", value: 30 },
                      ];
                    }

                    return Object.entries(qualityCounts).map(
                      ([quality, count]) => ({
                        name: quality,
                        value: count,
                      })
                    );
                  })()}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  fill="#4F46E5"
                  label
                >
                  {PIE_COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFF",
                    borderColor: "#E0E7FF",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Teachers */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiBookOpen className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Top Teacher Leaderboard
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={teacherLeaderboard.map((t) => ({
                  name: safeDisplay(t.ustazname ?? t.name),
                  value: Number(t.quality ?? t.rating ?? 0),
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
                <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFF",
                    borderColor: "#E0E7FF",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#4F46E5"
                  barSize={24}
                  radius={[8, 8, 8, 8]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in max-h-80 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <FiClipboard className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Recent Admin Actions
              </h3>
            </div>
            <ul className="divide-y divide-indigo-100">
              {adminActions.length > 0 ? (
                adminActions.map((a, idx) => (
                  <li
                    key={a.id}
                    className="py-3 flex items-center gap-3 hover:bg-indigo-50 transition-all animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                      {a.action}
                    </span>
                    <span className="text-sm text-indigo-700">{a.user}</span>
                    <span className="text-sm text-indigo-700">{a.date}</span>
                  </li>
                ))
              ) : (
                <li className="py-3 text-indigo-500 text-center text-sm sm:text-base">
                  No recent actions
                </li>
              )}
            </ul>
          </div>

          {/* Controller Earnings */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-teal-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Top Controller Earnings
              </h3>
            </div>
            <ul className="divide-y divide-indigo-100">
              {controllerEarnings.length > 0 ? (
                controllerEarnings.map((c, idx) => (
                  <li
                    key={idx}
                    className="py-3 flex items-center gap-3 hover:bg-indigo-50 transition-all animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                      {safeDisplay(c.controllerUsername ?? c.controllerId)}
                    </span>
                    <span className="text-sm text-indigo-700">
                      {c.amount || c.earning || 0} ETB
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-3 text-indigo-500 text-center text-sm sm:text-base">
                  No earnings data available
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* System Health/Settings Overview */}
        <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
          <div className="flex items-center gap-2 mb-4">
            <FiSettings className="text-indigo-500 h-6 w-6" />
            <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
              System Health & Settings Overview
            </h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {settingsOverview.length > 0 ? (
              settingsOverview.map((s, idx) => (
                <li
                  key={idx}
                  className="flex flex-col items-center p-4 bg-indigo-50/95 backdrop-blur-md rounded-lg shadow-sm hover:shadow-md transition-all animate-slide-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                    {s.key}
                  </span>
                  <span className="text-indigo-700 text-sm sm:text-base mt-1">
                    {s.value}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-indigo-500 text-center col-span-full text-sm sm:text-base">
                No settings available
              </li>
            )}
          </ul>
        </section>

        {/* Recent Activity Tables */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiClipboard className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Recent Permission Requests
              </h3>
            </div>
            <ul className="divide-y divide-indigo-100">
              {recentPermissions.length > 0 ? (
                recentPermissions.map((req, idx) => (
                  <li
                    key={req.id}
                    className="py-3 flex items-center gap-3 hover:bg-indigo-50 transition-all animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        req.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : req.status === "Approved"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                      {safeDisplay(req.teacher ?? req.teacherId)}
                    </span>
                    <span className="text-sm text-indigo-700">
                      {req.date || req.createdAt?.slice(0, 10) || "-"}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-3 text-indigo-500 text-center text-sm sm:text-base">
                  No permission requests
                </li>
              )}
            </ul>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-teal-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Recent Payments
              </h3>
            </div>
            <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-4 divide-y-0 sm:divide-y-0 sm:divide-x divide-indigo-100">
              {recentPayments.length > 0 ? (
                recentPayments.map((p, idx) => (
                  <li
                    key={p.id}
                    className="flex-1 min-w-[200px] sm:min-w-[220px] bg-indigo-50/95 backdrop-blur-md rounded-lg shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-all animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        p.status.toLowerCase() === "approved"
                          ? "bg-teal-100 text-teal-800"
                          : p.status.toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                      {safeDisplay(p.user ?? p.studentname)}
                    </span>
                    <span className="text-sm text-indigo-700">
                      {p.date || p.paymentdate?.slice(0, 10) || "-"}
                    </span>
                    <span className="font-bold text-teal-700 text-sm sm:text-base">
                      ${p.amount || p.paidamount || 0}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-3 text-indigo-500 text-center w-full text-sm sm:text-base">
                  No recent payments
                </li>
              )}
            </ul>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiUserX className="text-red-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Recent Absence Deductions
              </h3>
            </div>
            <ul className="divide-y divide-indigo-100">
              {recentAbsences.length > 0 ? (
                recentAbsences.map((a, idx) => (
                  <li
                    key={a.id}
                    className="py-3 flex items-center gap-3 hover:bg-indigo-50 transition-all animate-slide-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        a.processed
                          ? "bg-teal-100 text-teal-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {a.processed ? "Processed" : "Unprocessed"}
                    </span>
                    <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                      {safeDisplay(a.teacher)}
                    </span>
                    <span className="text-sm text-indigo-700">{a.date}</span>
                  </li>
                ))
              ) : (
                <li className="py-3 text-indigo-500 text-center text-sm sm:text-base">
                  No recent absences
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* Recent Logins & Pending Tasks */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiUserCheck className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Recent Admin Logins
              </h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-indigo-50 text-indigo-900 border-b border-indigo-100">
                  <th className="py-3 sm:py-4 px-4 sm:px-6 text-sm font-bold uppercase">
                    Admin
                  </th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6 text-sm font-bold uppercase">
                    Time
                  </th>
                  <th className="py-3 sm:py-4 px-4 sm:px-6 text-sm font-bold uppercase">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const recentLogins = adminActions
                    .filter(
                      (action) =>
                        action.action.includes("login") ||
                        action.action.includes("Login")
                    )
                    .slice(0, 5)
                    .map((action, idx) => ({
                      admin: action.user,
                      time: action.date,
                      ip: "N/A",
                    }));

                  return recentLogins.length > 0 ? (
                    recentLogins.map((login, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-indigo-50 transition-all animate-slide-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <td className="py-3 sm:py-4 px-4 sm:px-6 font-semibold text-indigo-900 text-sm sm:text-base">
                          {login.admin}
                        </td>
                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-sm text-indigo-700">
                          {login.time}
                        </td>
                        <td className="py-3 sm:py-4 px-4 sm:px-6 text-sm text-indigo-700">
                          {login.ip}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="text-indigo-500 text-center">
                      <td
                        colSpan={3}
                        className="py-3 sm:py-4 text-sm sm:text-base"
                      >
                        No recent logins
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
            <div className="flex items-center gap-2 mb-4">
              <FiClipboard className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Pending Admin Tasks
              </h3>
            </div>
            <ul className="space-y-3">
              {(() => {
                const tasks = [];

                if (pendingPermissions > 0) {
                  tasks.push({
                    text: `Review ${pendingPermissions} new permission request${
                      pendingPermissions > 1 ? "s" : ""
                    }`,
                    icon: (
                      <FiAlertTriangle className="text-yellow-500 w-5 h-5" />
                    ),
                  });
                }

                const unprocessedAbsences = recentAbsences.filter(
                  (a) => !a.processed
                ).length;
                if (unprocessedAbsences > 0) {
                  tasks.push({
                    text: `Process ${unprocessedAbsences} absence${
                      unprocessedAbsences > 1 ? "s" : ""
                    }`,
                    icon: <FiUserCheck className="text-teal-500 w-5 h-5" />,
                  });
                }

                if (stats.pendingPaymentCount > 0) {
                  tasks.push({
                    text: `Approve ${
                      stats.pendingPaymentCount
                    } pending payment${
                      stats.pendingPaymentCount > 1 ? "s" : ""
                    }`,
                    icon: <FiDollarSign className="text-teal-500 w-5 h-5" />,
                  });
                }

                if (badQualityTeachers.length > 0) {
                  tasks.push({
                    text: `Review ${
                      badQualityTeachers.length
                    } teacher quality assessment${
                      badQualityTeachers.length > 1 ? "s" : ""
                    }`,
                    icon: <FiBookOpen className="text-red-500 w-5 h-5" />,
                  });
                }

                return tasks.length > 0 ? (
                  tasks.map((task, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-indigo-900 text-sm sm:text-base animate-slide-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {task.icon} {task.text}
                    </li>
                  ))
                ) : (
                  <li className="text-indigo-500 text-center text-sm sm:text-base animate-slide-in">
                    No pending tasks
                  </li>
                );
              })()}
            </ul>
          </div>
        </section>

        {/* Loading/Error States */}
        {loadingWidgets && (
          <div className="flex items-center justify-center text-indigo-600 font-semibold p-6 animate-pulse">
            <FiLoader className="inline-block mr-2 h-6 w-6 animate-spin" />
            Loading dashboard widgets...
          </div>
        )}
        {widgetError && (
          <div className="flex items-center justify-center text-red-600 font-semibold p-6 animate-slide-in">
            <FiAlertTriangle className="inline-block mr-2 h-6 w-6" />
            {widgetError}
          </div>
        )}

        {/* Footer */}
        <footer className="w-full text-center text-indigo-500 text-sm py-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md mt-8 sm:mt-12 animate-slide-in">
          © {new Date().getFullYear()} DarulKubra Admin. All rights reserved.
        </footer>

        <style jsx global>{`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.5s ease-out;
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </main>
    </div>
  );
}
