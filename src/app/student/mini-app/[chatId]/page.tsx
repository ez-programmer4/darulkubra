"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { I18nProvider, useI18n } from "@/lib/i18n";
import {
  Calendar,
  BookOpen,
  Award,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  GraduationCap,
  BarChart3,
  FileText,
  Sun,
  Moon,
  Star,
  Zap,
  Heart,
  Sparkles,
  Trophy,
  Activity,
  BookMarked,
  Brain,
  ChevronRight,
  RefreshCw,
  Settings,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Home,
  Eye,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  CreditCard,
} from "lucide-react";

interface StudentData {
  student: {
    name: string;
    package: string;
    subject: string;
    classfee: number;
    daypackages: string;
    teacher: string;
  };
  stats: {
    attendancePercent: number;
    totalZoomSessions: number;
    testsThisMonth: number;
    terbiaProgress: number;
  };
  attendance: {
    presentDays: number;
    absentDays: number;
    totalDays: number;
    thisMonth: Array<{
      date: string;
      status: "present" | "absent";
    }>;
  };
  recentTests: Array<{
    testName: string;
    date: string;
    score: number;
    passed: boolean;
    passingResult: number;
  }>;
  terbia: {
    courseName: string;
    progressPercent: number;
    completedChapters: number;
    totalChapters: number;
  } | null;
  recentZoomSessions: Array<{
    date: string;
    teacher: string;
  }>;
  occupiedTimes: Array<{
    timeSlot: string;
    dayPackage: string;
    occupiedAt: string;
    endAt: string | null;
    teacher: string;
  }>;
  payments: {
    summary: {
      totalDeposits: number;
      totalMonthlyPayments: number;
      remainingBalance: number;
      paidMonths: number;
      unpaidMonths: number;
    };
    deposits: Array<{
      id: number;
      amount: number;
      reason: string;
      date: string;
      status: string;
      transactionId: string;
    }>;
    monthlyPayments: Array<{
      id: number;
      month: string;
      amount: number;
      status: string;
      type: string;
      startDate: string | null;
      endDate: string | null;
      isFreeMonth: boolean;
      freeReason: string | null;
    }>;
    paidMonths: Array<{
      month: string;
      amount: number;
      type: string;
      isFreeMonth: boolean;
      freeReason: string | null;
    }>;
    unpaidMonths: Array<{
      month: string;
      amount: number;
      status: string;
    }>;
  };
}

function StudentMiniAppInner({ params }: { params: { chatId: string } }) {
  const { t, lang, setLang } = useI18n();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    attendance: true,
    tests: true,
    terbia: true,
    zoom: true,
  });

  useEffect(() => {
    loadStudentData();
  }, [params.chatId]);

  const loadStudentData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch(`/api/student/mini-app/${params.chatId}`);
      const data = await response.json();

      if (data.success) {
        setStudentData(data.data);
      } else {
        setError(data.error || "Failed to load data");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadStudentData(true);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Listen for bottom nav tab changes
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail) setCurrentTab(e.detail);
    };
    window.addEventListener("dk:setTab", handler);
    return () => window.removeEventListener("dk:setTab", handler);
  }, []);

  const goBack = () => {
    // In a real app, this would navigate back
    window.history.back();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <div
            className={`loader mx-auto mb-4 ${isDarkMode ? "dark" : ""}`}
          ></div>
          <p
            className={`text-lg font-medium ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {t ? t("loadingProgress") : "Loading your progress..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t ? t("noDataTitle") : "No Data Found"}
          </h2>
          <p className="text-gray-600">
            {t ? t("noDataSubtitle") : "Unable to load your progress data."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-all duration-300 pb-20 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* Mobile App Header */}
      <div
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 6px)" }}
      >
        <div className="px-4 py-3">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={goBack}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {t ? t("studentDashboard") : "Student Dashboard"}
                </h1>
                <p
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {t ? t("overview") : "Overview"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setLang ? setLang((lang === "en" ? "am" : "en") as any) : null
                }
                className={`px-2 py-1 rounded text-xs border ${
                  isDarkMode
                    ? "border-gray-700 text-gray-200"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                {lang === "en" ? "AM" : "EN"}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                } ${refreshing ? "animate-spin" : ""}`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Student Profile Card */}
          <div
            className={`rounded-2xl p-4 ${
              isDarkMode
                ? "bg-gradient-to-r from-blue-600 to-purple-600"
                : "bg-gradient-to-r from-blue-500 to-purple-500"
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold text-white">
                {studentData.student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  {studentData.student.name}
                </h2>
                <div className="flex items-center space-x-4 text-xs text-white/80">
                  <span>{studentData.student.package}</span>
                  <span>•</span>
                  <span>{studentData.student.daypackages}</span>
                </div>
                <div className="text-xs text-white/70 mt-1">
                  {t ? t("teacher") : "Teacher"}: {studentData.student.teacher}
                </div>
              </div>
            </div>

            {/* Student Information Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-white/70">Subject</p>
                <p className="font-semibold text-white">
                  {studentData.student.subject || "N/A"}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-white/70">Class Fee</p>
                <p className="font-semibold text-white">
                  ETB {studentData.student.classfee || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation removed in favor of sticky bottom navigation */}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {/* Overview Tab */}
        {currentTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-4 rounded-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-green-600" : "bg-green-100"
                    }`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-white" : "text-green-600"
                      }`}
                    />
                  </div>
                  <button className="p-1">
                    <Eye
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  </button>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {studentData.stats.attendancePercent}%
                </div>
                <div
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Attendance
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-blue-600" : "bg-blue-100"
                    }`}
                  >
                    <BarChart3
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-white" : "text-blue-600"
                      }`}
                    />
                  </div>
                  <button className="p-1">
                    <Eye
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  </button>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {studentData.stats.totalZoomSessions}
                </div>
                <div
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Zoom Sessions
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-purple-600" : "bg-purple-100"
                    }`}
                  >
                    <Trophy
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-white" : "text-purple-600"
                      }`}
                    />
                  </div>
                  <button className="p-1">
                    <Eye
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  </button>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {studentData.stats.testsThisMonth}
                </div>
                <div
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Tests Taken
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-orange-600" : "bg-orange-100"
                    }`}
                  >
                    <Brain
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-white" : "text-orange-600"
                      }`}
                    />
                  </div>
                  <button className="p-1">
                    <Eye
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  </button>
                </div>
                <div
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {studentData.stats.terbiaProgress}%
                </div>
                <div
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Terbia Progress
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Attendance Tab */}
        {currentTab === "attendance" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Attendance Summary Card */}
            <div
              className={`p-4 rounded-2xl shadow-sm ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Attendance Record
                </h3>
                <button
                  onClick={() => toggleSection("attendance")}
                  className="p-1"
                >
                  {expandedSections.attendance ? (
                    <ChevronUp
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {studentData.attendance.presentDays}
                  </div>
                  <div
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Present
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    {studentData.attendance.absentDays}
                  </div>
                  <div
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Absent
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {studentData.attendance.totalDays}
                  </div>
                  <div
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Total Days
                  </div>
                </div>
              </div>

              {expandedSections.attendance && (
                <div className="space-y-2">
                  {studentData.attendance.thisMonth.map((day, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            day.status === "present"
                              ? isDarkMode
                                ? "bg-green-400"
                                : "bg-green-500"
                              : isDarkMode
                              ? "bg-red-400"
                              : "bg-red-500"
                          }`}
                        />
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {formatDate(day.date)}
                          </span>
                          <div
                            className={`text-xs ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "long",
                            })}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          day.status === "present"
                            ? isDarkMode
                              ? "bg-green-900/30 text-green-300"
                              : "bg-green-100 text-green-700"
                            : isDarkMode
                            ? "bg-red-900/30 text-red-300"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {day.status === "present" ? "Present" : "Absent"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tests Tab */}
        {currentTab === "tests" && studentData.recentTests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div
              className={`p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Test Results
                </h3>
                <button onClick={() => toggleSection("tests")} className="p-1">
                  {expandedSections.tests ? (
                    <ChevronUp
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  )}
                </button>
              </div>

              {expandedSections.tests && (
                <div className="space-y-3">
                  {studentData.recentTests.map((test, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-xl shadow-sm ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            test.passed
                              ? isDarkMode
                                ? "bg-green-600"
                                : "bg-green-100"
                              : isDarkMode
                              ? "bg-red-600"
                              : "bg-red-100"
                          }`}
                        >
                          {test.passed ? (
                            <CheckCircle
                              className={`w-4 h-4 ${
                                isDarkMode ? "text-white" : "text-green-600"
                              }`}
                            />
                          ) : (
                            <XCircle
                              className={`w-4 h-4 ${
                                isDarkMode ? "text-white" : "text-red-600"
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <div
                            className={`font-medium ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {test.testName}
                          </div>
                          <div
                            className={`text-xs ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {formatDate(test.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            test.passed
                              ? isDarkMode
                                ? "text-green-400"
                                : "text-green-600"
                              : isDarkMode
                              ? "text-red-400"
                              : "text-red-600"
                          }`}
                        >
                          {test.score}%
                        </div>
                        <div
                          className={`text-xs ${
                            test.passed
                              ? isDarkMode
                                ? "text-green-300"
                                : "text-green-700"
                              : isDarkMode
                              ? "text-red-300"
                              : "text-red-700"
                          }`}
                        >
                          {test.passed ? "Passed" : "Failed"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Terbia Tab */}
        {currentTab === "terbia" && studentData.terbia && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div
              className={`p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Terbia Progress
                </h3>
                <button onClick={() => toggleSection("terbia")} className="p-1">
                  {expandedSections.terbia ? (
                    <ChevronUp
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`w-4 h-4 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  )}
                </button>
              </div>

              {expandedSections.terbia && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {studentData.terbia.courseName}
                      </span>
                      <div
                        className={`px-3 py-1 rounded-full ${
                          isDarkMode
                            ? "bg-orange-600 text-white"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        <span className="text-sm font-bold">
                          {studentData.terbia.progressPercent}%
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-full rounded-full h-2 ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${studentData.terbia.progressPercent}%`,
                        }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className={`h-2 rounded-full ${
                          isDarkMode ? "bg-orange-500" : "bg-orange-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div
                        className={`text-xl font-bold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {studentData.terbia.completedChapters}
                      </div>
                      <div
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-xl font-bold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {studentData.terbia.totalChapters}
                      </div>
                      <div
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {t ? t("totalChapters") : "Total Chapters"}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Payments Tab */}
        {currentTab === "payments" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Payment Summary */}
            <div
              className={`p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                {t("paymentSummary")}
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-green-50"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-green-600"
                    }`}
                  >
                    {t("totalDeposits")}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-white" : "text-green-700"
                    }`}
                  >
                    ${studentData?.payments?.summary?.totalDeposits || 0}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-blue-50"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-blue-600"
                    }`}
                  >
                    {t("monthlyPayments")}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-white" : "text-blue-700"
                    }`}
                  >
                    ${studentData?.payments?.summary?.totalMonthlyPayments || 0}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-purple-50"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-purple-600"
                    }`}
                  >
                    {t("remainingBalance")}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-white" : "text-purple-700"
                    }`}
                  >
                    ${studentData?.payments?.summary?.remainingBalance || 0}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-orange-50"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-orange-600"
                    }`}
                  >
                    {t("paidMonths")}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isDarkMode ? "text-white" : "text-orange-700"
                    }`}
                  >
                    {studentData?.payments?.summary?.paidMonths || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Deposits */}
            <div
              className={`p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {t("recentDeposits")}
              </h3>
              <div className="space-y-2">
                {studentData?.payments?.deposits
                  ?.slice(0, 5)
                  .map((deposit: any, index: number) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-4 rounded-xl shadow-sm ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          ${deposit.amount}
                        </p>
                        <p
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {deposit.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            deposit.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : deposit.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {deposit.status}
                        </span>
                        <p
                          className={`text-xs mt-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {deposit.date}
                        </p>
                      </div>
                    </div>
                  ))}
                {(!studentData?.payments?.deposits ||
                  studentData.payments.deposits.length === 0) && (
                  <div
                    className={`p-4 rounded-xl text-center ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {t ? t("noPayments") : "No payment data available"}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Payments */}
            <div
              className={`p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {t("monthlyPayments")}
              </h3>
              <div className="space-y-2">
                {studentData?.payments?.monthlyPayments
                  ?.slice(0, 6)
                  .map((payment: any, index: number) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-4 rounded-xl shadow-sm ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {payment.month}
                        </p>
                        <p
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {payment.type} - ${payment.amount}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            payment.status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {payment.status}
                        </span>
                        {payment.isFreeMonth && (
                          <p
                            className={`text-xs mt-1 ${
                              isDarkMode ? "text-purple-400" : "text-purple-600"
                            }`}
                          >
                            {t ? t("freeMonth") : "Free Month"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                {(!studentData?.payments?.monthlyPayments ||
                  studentData.payments.monthlyPayments.length === 0) && (
                  <div
                    className={`p-4 rounded-xl text-center ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {t ? t("noPayments") : "No payment data available"}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Schedule Tab */}
        {currentTab === "schedule" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div
              className={`p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                <Clock className="w-5 h-5" />
                {t("scheduledTimes")}
              </h3>
              <div className="space-y-2">
                {studentData?.occupiedTimes
                  ?.slice(0, 10)
                  .map((time: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl shadow-sm ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock
                              className={`w-4 h-4 ${
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              }`}
                            />
                            <p
                              className={`text-sm font-semibold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {time.timeSlot}
                            </p>
                          </div>
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {time.dayPackage} • {time.teacher}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`px-2 py-1 rounded-full text-xs ${
                              isDarkMode
                                ? "bg-blue-900/30 text-blue-300"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {time.occupiedAt}
                          </div>
                          {time.endAt && (
                            <p
                              className={`text-xs mt-1 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {t ? t("until") : "Until"} {time.endAt}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {(!studentData?.occupiedTimes ||
                  studentData.occupiedTimes.length === 0) && (
                  <div
                    className={`p-4 rounded-xl text-center ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {t ? t("noSchedule") : "No scheduled times found"}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function StudentMiniApp({
  params,
}: {
  params: { chatId: string };
}) {
  return (
    <I18nProvider>
      <StudentMiniAppInner params={params} />
      {/* Sticky Bottom Navigation */}
      <BottomNav />
    </I18nProvider>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const [active, setActive] = React.useState<string>("overview");
  const setTab = (tab: string) => {
    setActive(tab);
    window.dispatchEvent(new CustomEvent("dk:setTab", { detail: tab }));
  };
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail) setActive(e.detail);
    };
    window.addEventListener("dk:setTab", handler);
    return () => window.removeEventListener("dk:setTab", handler);
  }, []);

  const btnCls = (tab: string) =>
    `py-2 flex flex-col items-center gap-1 ${
      active === tab ? "text-blue-600" : "text-gray-600"
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-6 text-xs">
        <button
          onClick={() => setTab("overview")}
          className={btnCls("overview")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3h7v7H3z" />
            <path d="M14 3h7v7h-7z" />
            <path d="M14 14h7v7h-7z" />
            <path d="M3 14h7v7H3z" />
          </svg>
          <span>{t("overview")}</span>
        </button>
        <button onClick={() => setTab("terbia")} className={btnCls("terbia")}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5V6a2 2 0 0 1 2-2h9" />
            <path d="M16 6l3 3-9 9H7l-3 3v-3Z" />
          </svg>
          <span>{t("terbia")}</span>
        </button>
        <button
          onClick={() => setTab("attendance")}
          className={btnCls("attendance")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>
          <span>{t("attendance")}</span>
        </button>
        <button onClick={() => setTab("tests")} className={btnCls("tests")}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 15 3.5 3.5 7-7" />
            <path d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
          </svg>
          <span>{t("tests")}</span>
        </button>
        <button
          onClick={() => setTab("payments")}
          className={btnCls("payments")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <span>{t("payments")}</span>
        </button>
        <button
          onClick={() => setTab("schedule")}
          className={btnCls("schedule")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>{t("schedule")}</span>
        </button>
      </div>
    </div>
  );
}
