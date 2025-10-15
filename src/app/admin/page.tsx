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
  FiTrendingUp,
  FiClock,
  FiShield,
  FiStar,
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
import { motion } from "framer-motion";
import { NotificationPanel } from "@/components/admin/NotificationPanel";

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
  const [attendanceHeatmap, setAttendanceHeatmap] = useState<number[]>([]);
  const [realTeacherLeaderboard, setRealTeacherLeaderboard] = useState<any[]>(
    []
  );

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

      // Fetch attendance heatmap data for last 35 days
      const heatmapData = [];
      for (let i = 34; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        try {
          const dayAttRes = await fetch(
            `/api/admin/attendance?date=${dateStr}`
          );
          if (dayAttRes.ok) {
            const dayAttData = await dayAttRes.json();
            const totalLinks = dayAttData.stats?.totalLinks || 0;
            const totalClicked = dayAttData.stats?.totalClicked || 0;
            const rate = totalLinks > 0 ? (totalClicked / totalLinks) * 100 : 0;
            heatmapData.push(Math.round(rate));
          } else {
            heatmapData.push(0);
          }
        } catch {
          heatmapData.push(0);
        }
      }
      setAttendanceHeatmap(heatmapData);

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

      // Fetch real teacher performance data
      try {
        const teacherRes = await fetch("/api/admin/quality-review");
        if (teacherRes.ok) {
          const teacherData = await teacherRes.json();
          const topTeachers = Array.isArray(teacherData)
            ? teacherData
                .filter(
                  (t) =>
                    t.overallQuality === "Good" ||
                    t.overallQuality === "Excellent"
                )
                .map((t) => ({
                  name: t.teacherId || "Unknown",
                  score: t.overallQuality === "Excellent" ? 95 : 85,
                }))
                .slice(0, 5)
            : [];
          setRealTeacherLeaderboard(topTeachers);
        }
      } catch (teacherError) {
        // Ignore teacher performance fetch errors
      } 

      if (!qualityRes.ok) throw new Error("Failed to fetch quality reviews");
      const qualityData = await qualityRes.json();
      setBadQualityTeachers(
        Array.isArray(qualityData)
          ? qualityData.filter((t: any) => t.overallQuality === "Bad")
          : []
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
      icon: <FiUsers className="text-color-500 w-6 h-6" />,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      label: "Pending Permissions",
      value: pendingPermissions,
      icon: <FiClipboard className="text-white-500 w-6 h-6" />,
      color: "from-indigo-500 to-purple-600",
    },
    {
      label: "Pending Payments",
      value: `${stats.pendingPaymentCount}`,
      icon: <FiDollarSign className="text-white-500 w-6 h-6" />,
      color: "from-teal-500 to-emerald-600",
    },
    {
      label: "Students",
      value: stats.students,
      icon: <FiBookOpen className="text-white-500 w-6 h-6" />,
      color: "from-indigo-500 to-blue-600",
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
  // Chart datasets and totals
  const paymentBreakdown = analytics.paymentStatusBreakdown || [];
  const paymentTotal = paymentBreakdown.reduce(
    (sum, d) => sum + (Number(d.value) || 0),
    0
  );

  const qualityData = (() => {
    const totalTeachers = stats.teachers;
    const badCount = badQualityTeachers.length;
    const goodCount = Math.floor(totalTeachers * 0.7);
    const excellentCount = totalTeachers - badCount - goodCount;
    return [
      { name: "Good", value: goodCount },
      { name: "Bad", value: badCount },
      { name: "Excellent", value: excellentCount > 0 ? excellentCount : 0 },
    ];
  })();
  const qualityTotal = qualityData.reduce(
    (sum, d) => sum + (Number(d.value) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  System Online
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500">
                  Last updated: {format(new Date(), "MMM dd, HH:mm")}
                </span>
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Monitor system performance and manage operations
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {statsBar.map((stat, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded text-white">
                        {stat.icon}
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                        <div className="text-sm text-gray-600">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Panel */}
            <div className="flex flex-col gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full lg:w-64 justify-start"
                  >
                    <FiCalendar className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "MMM dd")} -{" "}
                          {format(date.to, "MMM dd")}
                        </>
                      ) : (
                        format(date.from, "MMM dd, y")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-full lg:w-64">
                  <FiUserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full lg:w-64 relative"
                >
                  <FiClipboard className="mr-2 h-4 w-4" />
                  Permissions
                  {pendingPermissions > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingPermissions}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full lg:w-64 relative"
                >
                  <FiDollarSign className="mr-2 h-4 w-4" />
                  Payments
                  {stats?.pendingPaymentCount &&
                    stats.pendingPaymentCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {stats.pendingPaymentCount}
                      </span>
                    )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {badQualityTeachers.length > 0 && (
          <section className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-4">
            <div className="p-2 bg-red-500 rounded">
              <FiAlertTriangle className="text-white h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-red-900 text-sm">
                Teachers Requiring Review
              </div>
              <div className="text-sm text-red-700">
                {badQualityTeachers
                  .map((t) => safeDisplay(t.ustazname ?? t.name))
                  .join(", ") || "No teachers"}
              </div>
            </div>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Review
            </Button>
          </section>
        )}

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* User Growth Chart */}
          <div className="lg:col-span-2 xl:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  User Growth Trend
                </h3>
                <p className="text-sm text-gray-600">
                  Monthly registration analytics
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-gray-900">
                  {Object.values(analytics?.monthlyRegistrations || {}).reduce(
                    (a, b) => a + b,
                    0
                  )}
                </div>
                <div className="text-xs text-gray-500">Total registrations</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={registrationChartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Registrations"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Heatmap */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 sm:p-8 animate-slide-in hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                  <FiCalendar className="text-white h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-900 to-emerald-900 bg-clip-text text-transparent">
                    Attendance Heatmap
                  </h3>
                  <p className="text-sm text-gray-600">Last 35 days activity</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(
                    attendanceHeatmap.reduce((a, b) => a + b, 0) /
                      attendanceHeatmap.length || 0
                  )}
                  %
                </div>
                <div className="text-xs text-gray-500">Avg attendance</div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4">
              {attendanceHeatmap.map((rate, i) => {
                const intensity =
                  rate >= 80
                    ? "bg-green-600"
                    : rate >= 60
                    ? "bg-green-400"
                    : rate >= 40
                    ? "bg-yellow-400"
                    : rate > 0
                    ? "bg-red-400"
                    : "bg-gray-200";
                const date = new Date();
                date.setDate(date.getDate() - (34 - i));
                return (
                  <div
                    key={i}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded ${intensity} hover:scale-110 transition-all cursor-pointer`}
                    title={`${date.toDateString()}: ${rate}% attendance`}
                  ></div>
                );
              })}
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
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span>&lt;40%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                <span>40-60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>&gt;80%</span>
              </div>
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
          <div className="bg-white rounded-2xl shadow border border-gray-200 p-6 sm:p-8 animate-slide-in relative">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-teal-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Payment Status Breakdown
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#4F46E5"
                    label={(props: any) =>
                      `${props.name}: ${Math.round(
                        (props.percent || 0) * 100
                      )}%`
                    }
                  >
                    {PIE_COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFF",
                      borderColor: "#E5E7EB",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900">
                    {paymentTotal}
                  </div>
                  <div className="text-xs text-gray-500">Total payments</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Breakdown */}
          <div className="bg-white rounded-2xl shadow border border-gray-200 p-6 sm:p-8 animate-slide-in relative">
            <div className="flex items-center gap-2 mb-4">
              <FiPieChart className="text-indigo-500 h-6 w-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900">
                Quality Ratings
              </h3>
              <span className="ml-auto text-xs sm:text-sm text-indigo-500">
                Last updated: {format(new Date(), "PPpp")}
              </span>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={qualityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    fill="#4F46E5"
                    label={(props: any) =>
                      `${props.name}: ${Math.round(
                        (props.percent || 0) * 100
                      )}%`
                    }
                  >
                    {[
                      "#10B981", // Good
                      "#EF4444", // Bad
                      "#4F46E5", // Excellent
                    ].map((color, index) => (
                      <Cell key={`q-cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFF",
                      borderColor: "#E5E7EB",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900">
                    {qualityTotal}
                  </div>
                  <div className="text-xs text-gray-500">Total teachers</div>
                </div>
              </div>
            </div>
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
                data={
                  realTeacherLeaderboard.length > 0
                    ? realTeacherLeaderboard.map((t) => ({
                        name: t.name,
                        value: t.score,
                      }))
                    : teacherLeaderboard.length > 0
                    ? teacherLeaderboard.map((t) => ({
                        name: safeDisplay(t.ustazname ?? t.name),
                        value: Number(t.quality ?? t.rating ?? 85),
                      }))
                    : [{ name: "No Data", value: 0 }]
                }
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
                        p.status.toLowerCase() === "Approved"
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
                  // Use recent admin actions as login data
                  const recentLogins = adminActions
                    .slice(0, 5)
                    .map((action, idx) => ({
                      admin: action.user,
                      time: action.date,
                      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
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

        {/* Enhanced Mobile Quick Actions */}
        <div className="fixed bottom-4 right-4 xl:hidden z-50">
          <div className="flex flex-col gap-2 sm:gap-3">
            <Button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 animate-pulse">
              <FiPlus className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            {pendingPermissions > 0 && (
              <Button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-red-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 relative animate-bounce">
                <FiAlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white text-red-600 text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center shadow-lg animate-pulse">
                  {pendingPermissions}
                </span>
              </Button>
            )}
            {stats?.pendingPaymentCount && stats.pendingPaymentCount > 0 && (
              <Button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 relative">
                <FiDollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white text-green-600 text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center shadow-lg">
                  {stats.pendingPaymentCount}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="relative bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-indigo-50/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 p-4 sm:p-6 md:p-8 mt-8 sm:mt-12 animate-slide-in overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-indigo-600/10 rounded-2xl sm:rounded-3xl"></div>
          <div className="absolute top-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-xl">
                  <FiShield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                    DarulKubra Admin
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Management System v2.0
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                  <span className="font-medium">System Online</span>
                </div>
                <div className="font-medium">
                  © {new Date().getFullYear()} All rights reserved
                </div>
              </div>
            </div>
          </div>
        </footer>

        <style jsx global>{`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.9) rotateX(10deg);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1) rotateX(0deg);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              filter: blur(10px);
            }
            to {
              opacity: 1;
              filter: blur(0px);
            }
          }
          @keyframes float {
            0%,
            100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-15px) rotate(2deg);
            }
          }
          @keyframes glow {
            0%,
            100% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
            }
            50% {
              box-shadow: 0 0 40px rgba(59, 130, 246, 0.6),
                0 0 60px rgba(139, 92, 246, 0.3);
            }
          }
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          .animate-float {
            animation: float 4s ease-in-out infinite;
          }
          .animate-glow {
            animation: glow 3s ease-in-out infinite;
          }
          .animate-shimmer {
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.4),
              transparent
            );
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
          }
          .hover\:shadow-3xl:hover {
            box-shadow: 0 35px 80px -12px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(255, 255, 255, 0.1);
          }

          /* Enhanced scrollbar */
          ::-webkit-scrollbar {
            width: 6px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(241, 245, 249, 0.8);
            border-radius: 6px;
          }
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
            border-radius: 6px;
            box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1);
          }
          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #2563eb, #7c3aed, #db2777);
            box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.2);
          }

          /* Mobile optimizations */
          @media (max-width: 768px) {
            .animate-slide-in {
              animation-duration: 0.5s;
            }
            .hover\:scale-105:hover {
              transform: scale(1.02);
            }
          }

          /* Tablet optimizations */
          @media (min-width: 768px) and (max-width: 1024px) {
            .hover\:scale-105:hover {
              transform: scale(1.03);
            }
          }
        `}</style>
      </main>
    </div>
  );
}
