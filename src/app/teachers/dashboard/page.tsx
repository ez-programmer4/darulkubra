"use client";

import { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
dayjs.extend(weekday);
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiBell,
  FiMenu,
  FiX,
  FiHome,
  FiAward,
  FiClipboard,
  FiLogOut,
  FiUser,
  FiDownload,
  FiChevronUp,
  FiChevronDown,
  FiTrendingUp,
  FiArrowRight,
} from "react-icons/fi";
import Link from "next/link";
import { signOut } from "next-auth/react";
import JSConfetti from "js-confetti";

type QualityData = {
  rating: string;
  ratingColor: string;
  strengths: { title: string; note: string; rating?: number }[];
  focuses: { title: string; note: string; rating?: number }[];
  studentsPassed: number;
  studentsTotal: number;
  avgExaminerRating: number;
  bonusAmount?: number;
  advice: string;
  examinerNotes?: string;
};

type Notification = {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
};

const navItems = [
  { href: "/teachers/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/teachers/permissions", label: "Permissions", icon: FiClipboard },

  { href: "/teachers/salary", label: "Salary", icon: FiTrendingUp },
];

export default function TeacherDashboard() {
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const router = useRouter();
  const confettiRef = useRef<JSConfetti | null>(null);

  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [positiveFeedbackOpen, setPositiveFeedbackOpen] = useState(false);
  const [negativeFeedbackOpen, setNegativeFeedbackOpen] = useState(false);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(() => {
    // Default to current month
    const now = new Date();
    const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    return result;
  });

  // Generate all week start dates for the current month
  const [monthWeeks, setMonthWeeks] = useState<string[]>([]);

  useEffect(() => {
    confettiRef.current = new JSConfetti();
    return () => {
      confettiRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Calculate all Mondays (or week starts) in the current month
    const now = dayjs();
    const startOfMonth = now.startOf("month");
    const endOfMonth = now.endOf("month");
    let weekStart = startOfMonth.startOf("week").add(1, "day"); // Monday
    const weeks: string[] = [];
    while (weekStart.isBefore(endOfMonth)) {
      if (weekStart.month() === now.month()) {
        weeks.push(weekStart.format("YYYY-MM-DD"));
      }
      weekStart = weekStart.add(1, "week");
    }
    setMonthWeeks(weeks);
  }, []);

  useEffect(() => {
    // Set the current week as default when monthWeeks are calculated
    if (monthWeeks.length > 0) {
      const currentWeekStart = dayjs()
        .startOf("week")
        .add(1, "day")
        .format("YYYY-MM-DD");
      const currentWeekIndex = monthWeeks.findIndex(
        (w) => w === currentWeekStart
      );
      if (currentWeekIndex !== -1) {
        setSelectedWeek(monthWeeks[currentWeekIndex]);
      } else {
        // If current week not found, select the last week of the month
        setSelectedWeek(monthWeeks[monthWeeks.length - 1]);
      }
    }
  }, [monthWeeks]);

  useEffect(() => {
    if (!selectedWeek || !user?.id) return;
    async function fetchQuality() {
      try {
        setQualityLoading(true);
        setError(null); // Clear any previous errors
        // Try Monday start first (API default)
        let res = await fetch(
          `/api/teachers/quality?weekStart=${selectedWeek}`
        );
        if (res.status === 404) {
          const sundayStart = dayjs(selectedWeek)
            .subtract(1, "day")
            .format("YYYY-MM-DD");
          res = await fetch(`/api/teachers/quality?weekStart=${sundayStart}`);
        }

        if (res.status === 404) {
          setQuality(null);
          // Don't set error for 404 - this is expected when no data exists
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch quality data");
        }

        const data = await res.json();
        const assessment = data.teachers.find(
          (t: any) => t.teacherId === user?.id
        );
        if (assessment) {
          const strengths = (assessment.controllerFeedback?.positive || []).map(
            (item: any) => ({
              title: item.description || item.title || "Strength",
              note: item.note || "",
              rating: item.rating,
            })
          );
          const focuses = (assessment.controllerFeedback?.negative || []).map(
            (item: any) => ({
              title: item.description || item.title || "Focus",
              note: item.note || "",
              rating: item.rating,
            })
          );
          const ratingColorMap: Record<string, string> = {
            Bad: "red",
            Good: "yellow",
            Better: "blue",
            Excellent: "green",
            Exceptional: "teal",
          };
          const qualityData = {
            rating: assessment.overallQuality || "N/A",
            ratingColor: ratingColorMap[assessment.overallQuality] || "gray",
            strengths,
            focuses,
            studentsPassed: assessment.examPassRate ?? 0,
            studentsTotal: assessment.studentsTotal ?? 100,
            avgExaminerRating: assessment.examinerRating || 0,
            bonusAmount: assessment.bonusAwarded,
            advice: assessment.overrideNotes || "",
            examinerNotes: assessment.examinerNotes || "",
          };
          setQuality(qualityData);
          setError(null);

          if (assessment.bonusAwarded) {
            setNotifications((prev) => [
              ...prev,
              {
                id: `bonus-${selectedWeek}`,
                message: `You received a bonus of ${assessment.bonusAwarded} ETB for ${selectedWeek}!`,
                type: "success",
                timestamp: new Date().toISOString(),
              },
            ]);
            confettiRef.current?.addConfetti({
              emojis: ["🎉", "🏆", "💰"],
              emojiSize: 30,
              confettiNumber: 100,
            });
          }
        } else {
          setQuality(null);
          // Don't set error - just no data available
        }
      } catch (err) {
        setQuality(null);
        setError("Unable to load quality data. Please try again later.");
      } finally {
        setQualityLoading(false);
      }
    }
    fetchQuality();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, user?.id]);

  useEffect(() => {
    async function fetchStudentCount() {
      try {
        const res = await fetch("/api/teachers/students");
        if (!res.ok) throw new Error("Failed to fetch student count");
        const data = await res.json();
        setStudentCount(data.count || 0);
      } catch (err) {
        setError("Unable to load student count. Please try again later.");
      }
    }

    async function fetchSalaryData() {
      try {
        setSalaryLoading(true);
        // Parse selected month (format: "2025-06")
        const [year, month] = selectedSalaryMonth.split("-");
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month); // Keep as 1-indexed

        const from = new Date(selectedYear, selectedMonth - 1, 1); // Convert to 0-indexed for Date constructor
        const to = new Date(selectedYear, selectedMonth, 0); // Convert to 0-indexed for Date constructor

        const res = await fetch(
          `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
            to.toISOString().split("T")[0]
          }`
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error("Failed to fetch salary data");
        }

        const data = await res.json();
        setSalaryData(data);
      } catch (error) {
      } finally {
        setSalaryLoading(false);
      }
    }

    fetchStudentCount();
    fetchSalaryData();
  }, [selectedSalaryMonth]);

  const downloadReport = () => {
    if (!quality) return;
    const reportContent = `
Teacher Quality Report
Week: ${dayjs(selectedWeek).format("MMM D, YYYY")}
Teacher: ${user?.name} (ID: ${user?.id})

Quality Rating: ${quality.rating}
Students Passed: ${quality.studentsPassed}/${quality.studentsTotal}
Average Examiner Rating: ${quality.avgExaminerRating}/10
Bonus: ${quality.bonusAmount ? `${quality.bonusAmount} ETB` : "None"}

Strengths:
${quality.strengths.map((s) => `- ${s.title}: ${s.note}`).join("\n")}

Focuses:
${quality.focuses.map((f) => `- ${f.title}: ${f.note}`).join("\n")}

Advice:
${quality.advice || "No advice provided."}

Examiner Notes:
${quality.examinerNotes || "No notes provided."}
    `;
    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Teacher_Quality_Report_${selectedWeek}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-600 font-bold animate-slide-in">
        <FiAlertTriangle className="inline-block mr-2 h-6 w-6" />
        User not found or not authorized. Please contact support.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 text-gray-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-500 text-white flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 shadow-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-200 bg-gray-400">
          <span className="text-2xl font-extrabold flex items-center gap-3">
            <FiUser className="h-8 w-8 text-teal-400" />
            <span>Teacher Portal</span>
          </span>
          <button
            className="md:hidden text-green-300 hover:text-white absolute right-4"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-green-700 scrollbar-track-green-900">
          {navItems.map((item, idx) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 ${
                item.href === "/teachers/dashboard"
                  ? "bg-green-600 text-white shadow-md"
                  : "text-green-200 hover:bg-green-800 hover:text-white"
              } animate-slide-in`}
              style={{ animationDelay: `${idx * 50}ms` }}
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-green-800 bg-green-900">
          <button
            onClick={() => signOut({ callbackUrl: "/teachers/login" })}
            className="w-full flex items-center gap-3 p-3 text-base font-medium text-green-200 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200"
            aria-label="Logout"
          >
            <FiLogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-lg border-b border-green-100">
          <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                className="md:hidden text-green-600 hover:text-green-700"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FiMenu size={24} />
              </button>
              <span className="text-2xl font-extrabold text-green-900 hidden sm:block">
                Welcome,{" "}
                {user && user.name && typeof user.name === "string"
                  ? user.name
                  : "Teacher"}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <button
                  className="text-green-600 hover:text-green-700 relative p-2 rounded-full hover:bg-green-100 focus:ring-2 focus:ring-green-500 transition-all"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Notifications"
                  aria-haspopup="true"
                >
                  <FiBell size={24} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-green-200 p-4 z-50 max-h-96 overflow-y-auto animate-fade-in">
                    <h3 className="text-lg font-bold text-green-900 mb-3">
                      Notifications
                    </h3>
                    {notifications.length === 0 ? (
                      <p className="text-gray-500 text-center">
                        No notifications.
                      </p>
                    ) : (
                      notifications.map((notification, idx) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg mb-2 flex items-center gap-3 animate-slide-in ${
                            notification.type === "success"
                              ? "bg-green-50 text-green-700"
                              : notification.type === "error"
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          {notification.type === "success" && (
                            <FiCheckCircle className="text-green-500" />
                          )}
                          {notification.type === "error" && (
                            <FiAlertTriangle className="text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {dayjs(notification.timestamp).format(
                                "MMM D, YYYY h:mm A"
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                  {user && user.name && typeof user.name === "string"
                    ? user.name.charAt(0)
                    : "T"}
                </div>
                <span className="text-sm font-semibold text-green-900 hidden md:block">
                  {user && user.name && typeof user.name === "string"
                    ? user.name
                    : "Teacher"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 max-w-7xl mx-auto space-y-8">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-lg flex items-center gap-3 animate-slide-in">
              <FiAlertTriangle className="text-red-600 h-6 w-6 animate-pulse" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="w-full mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
              {[
                {
                  href: "/teachers/permissions/request",
                  text: "Request Permission",
                  icon: <FiClipboard className="w-5 h-5" />,
                },
                {
                  href: "/teachers/permissions",
                  text: "My Permissions",
                  icon: <FiAward className="w-5 h-5" />,
                },
                {
                  href: "/teachers/salary",
                  text: "Salary",
                  icon: <FiTrendingUp className="w-5 h-5" />,
                },
              ].map((action, idx) => (
                <Button
                  key={idx}
                  asChild
                  className="flex-1 min-w-[180px] bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-4 rounded-xl shadow-lg transition-all hover:scale-105 focus:ring-2 focus:ring-green-400 focus:outline-none flex items-center justify-center gap-3 text-base"
                >
                  <Link
                    href={action.href}
                    className="flex items-center gap-2 w-full justify-center"
                    aria-label={action.text}
                  >
                    {action.icon}
                    {action.text}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Week Selector */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-green-100 p-6 mb-8 animate-slide-in">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="font-semibold text-green-900 text-lg">
                Select Week:
              </label>
              <div className="flex gap-2 flex-wrap">
                {monthWeeks.map((week, idx) => {
                  const isCurrentWeek =
                    week ===
                    dayjs().startOf("week").add(1, "day").format("YYYY-MM-DD");
                  const isSelected = selectedWeek === week;
                  return (
                    <Button
                      key={week}
                      variant={isSelected ? "default" : "outline"}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        isSelected
                          ? "bg-green-600 text-white"
                          : isCurrentWeek
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-white text-green-700 border-green-300"
                      }`}
                      onClick={() => {
                        setSelectedWeek(week);
                      }}
                    >
                      Week {idx + 1}
                      {isCurrentWeek && " (Current)"}
                    </Button>
                  );
                })}
              </div>
              {quality && (
                <Button
                  onClick={downloadReport}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 rounded-lg shadow-md hover:scale-105 transition-all"
                  aria-label="Download quality report"
                >
                  <FiDownload className="w-5 h-5" />
                  Download Report
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <StatsCard
              icon={<FiUsers size={24} className="text-green-600" />}
              label="Total Students"
              value={studentCount}
              color="green"
            />
            <StatsCard
              icon={<FiCheckCircle size={24} className="text-teal-600" />}
              label="Pass Rate"
              value={
                quality
                  ? Math.round(
                      (quality.studentsPassed / quality.studentsTotal) * 100
                    )
                  : 0
              }
              color="teal"
              unit="%"
            />
            <StatsCard
              icon={<FiAward size={24} className="text-yellow-600" />}
              label="Examiner Rating"
              value={quality?.avgExaminerRating || 0}
              color="yellow"
              unit="/10"
            />
            <StatsCard
              icon={<FiAward size={24} className="text-purple-600" />}
              label="Bonus Earned"
              value={quality?.bonusAmount || 0}
              color="purple"
              unit=" ETB"
            />
          </div>

          {/* Quality Overview */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-green-100 p-8 mb-8 animate-slide-in">
            {qualityLoading ? (
              <PageLoading />
            ) : quality ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <h2 className="text-2xl font-extrabold text-green-900 mb-4 flex items-center gap-3 animate-slide-in">
                    <FiCheckCircle className="text-green-600 h-8 w-8" />
                    Quality:{" "}
                    <span className="text-green-600">{quality.rating}</span>
                  </h2>
                  {/* Positive Feedback Dropdown */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-green-200 shadow-sm">
                    <button
                      onClick={() =>
                        setPositiveFeedbackOpen(!positiveFeedbackOpen)
                      }
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-green-50/50 transition-colors rounded-xl"
                      aria-expanded={positiveFeedbackOpen}
                      aria-label="Toggle positive feedback"
                    >
                      <div className="flex items-center gap-3">
                        <FiCheckCircle className="text-green-600 h-6 w-6" />
                        <h3 className="text-xl font-bold text-green-700">
                          Strengths ({quality.strengths.length})
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {positiveFeedbackOpen ? (
                          <FiChevronUp className="text-green-600 h-5 w-5" />
                        ) : (
                          <FiChevronDown className="text-green-600 h-5 w-5" />
                        )}
                      </div>
                    </button>
                    {positiveFeedbackOpen && (
                      <div className="px-4 pb-4 animate-slide-in">
                        {quality.strengths.length > 0 ? (
                          <ul className="space-y-3">
                            {quality.strengths.map((s, i) => (
                              <li
                                key={i}
                                className="bg-green-50/50 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] animate-slide-in"
                                style={{ animationDelay: `${i * 50}ms` }}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                  <span className="font-semibold text-green-800 text-lg">
                                    {s.title}
                                    {typeof s.rating === "number" && (
                                      <span className="ml-2 text-sm text-green-600 font-medium">
                                        ({s.rating}/10)
                                      </span>
                                    )}
                                  </span>
                                  {s.note && (
                                    <span className="text-sm text-gray-600">
                                      {s.note}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">
                            No positive feedback recorded for this week.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Negative Feedback Dropdown */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm">
                    <button
                      onClick={() =>
                        setNegativeFeedbackOpen(!negativeFeedbackOpen)
                      }
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-red-50/50 transition-colors rounded-xl"
                      aria-expanded={negativeFeedbackOpen}
                      aria-label="Toggle negative feedback"
                    >
                      <div className="flex items-center gap-3">
                        <FiAlertTriangle className="text-red-600 h-6 w-6" />
                        <h3 className="text-xl font-bold text-red-700">
                          Areas for Improvement ({quality.focuses.length})
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {negativeFeedbackOpen ? (
                          <FiChevronUp className="text-red-600 h-5 w-5" />
                        ) : (
                          <FiChevronDown className="text-red-600 h-5 w-5" />
                        )}
                      </div>
                    </button>
                    {negativeFeedbackOpen && (
                      <div className="px-4 pb-4 animate-slide-in">
                        {quality.focuses.length > 0 ? (
                          <ul className="space-y-3">
                            {quality.focuses.map((f, i) => (
                              <li
                                key={i}
                                className="bg-red-50/50 border border-red-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] animate-slide-in"
                                style={{ animationDelay: `${i * 50}ms` }}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                  <span className="font-semibold text-red-800 text-lg">
                                    {f.title}
                                    {typeof f.rating === "number" && (
                                      <span className="ml-2 text-sm text-red-600 font-medium">
                                        ({f.rating}/10)
                                      </span>
                                    )}
                                  </span>
                                  {f.note && (
                                    <span className="text-sm text-gray-600">
                                      {f.note}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">
                            No negative feedback recorded for this week.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  {quality.bonusAmount ? (
                    <div className="relative bg-gradient-to-r from-green-500 via-teal-500 to-indigo-500 p-8 rounded-2xl text-center text-white shadow-2xl border border-green-300 overflow-hidden animate-slide-in">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-teal-500 to-indigo-500 animate-gradient-bg"></div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-extrabold mb-3 flex items-center justify-center gap-3">
                          <FiAward className="w-8 h-8 animate-pulse" />
                          Bonus Awarded!
                        </h3>
                        <p className="text-4xl font-extrabold mb-3">
                          {quality.bonusAmount} ETB
                        </p>
                        <p className="text-lg">
                          Congratulations on your exceptional performance!
                        </p>
                        <Button
                          onClick={() =>
                            confettiRef.current?.addConfetti({
                              emojis: ["🎉", "🏆", "💰"],
                              emojiSize: 30,
                              confettiNumber: 100,
                            })
                          }
                          className="mt-4 bg-white text-green-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg shadow-md hover:scale-105 transition-all"
                          aria-label="Celebrate bonus"
                        >
                          Celebrate Again!
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-600 p-6 rounded-lg text-center animate-slide-in">
                      <p className="text-lg font-semibold">
                        No bonus this week.
                      </p>
                    </div>
                  )}
                  {quality.examinerNotes && (
                    <div className="bg-white/95 backdrop-blur-md p-6 rounded-lg shadow-lg border border-green-100 animate-slide-in">
                      <p className="font-semibold text-green-900 text-lg">
                        Examiner Notes:
                      </p>
                      <p className="text-gray-600 mt-2">
                        {quality.examinerNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                No quality data available for this week.
              </p>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full text-center text-green-500 text-sm py-6 border-t border-green-100 bg-white/90 backdrop-blur-md mt-12">
          © {new Date().getFullYear()} DarulKubra Teacher Portal. All rights
          reserved.
        </footer>

        {/* Tailwind Animation Styles */}
        <style jsx>{`
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
          @keyframes gradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.5s ease-out;
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 8s ease infinite;
          }
          .animate-gradient-bg {
            background-size: 200% 200%;
            animation: gradient 8s ease infinite;
          }
        `}</style>
      </div>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  color,
  unit = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  unit?: string;
}) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-lg border border-green-100 flex items-center gap-3 sm:gap-4 hover:shadow-xl transition-all hover:scale-[1.02] animate-slide-in min-w-0`}
    >
      <div
        className={`rounded-lg bg-${color}-100 p-2 sm:p-3 shadow-sm flex-shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="text-xs sm:text-sm font-semibold text-green-600 truncate"
          title={label}
        >
          {label}
        </h3>
        <p
          className={`text-lg sm:text-2xl font-bold text-${color}-600 break-words truncate overflow-hidden`}
          title={String(value) + (unit || "")}
        >
          {value}
          {unit}
        </p>
      </div>
    </div>
  );
}
