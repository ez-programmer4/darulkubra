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
  X,
  Maximize2,
  Minimize2,
  Filter,
  Bell,
  Shield,
  HelpCircle,
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

// Telegram ThemeParams interface
interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  section_separator_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

// Telegram WebApp interface
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  platform: string;
  isExpanded: boolean;
  isActive: boolean;
  isFullscreen: boolean;
  safeAreaInset: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentSafeAreaInset: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  themeParams: ThemeParams;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
}

interface StudentListItem {
  id: number;
  name: string;
  package: string;
  subject: string;
  teacher: string;
}

function StudentMiniAppInner({ params }: { params: { chatId: string } }) {
  const { t, lang, setLang } = useI18n();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");
  const [showContentSection, setShowContentSection] = useState(true); // Start with content visible
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    attendance: true,
    tests: true,
    terbia: true,
    zoom: true,
  });

  // Telegram WebApp state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [safeAreaInset, setSafeAreaInset] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [themeParams, setThemeParams] = useState<ThemeParams>({});
  const [tgWebApp, setTgWebApp] = useState<TelegramWebApp | null>(null);

  // Load students list first
  useEffect(() => {
    loadStudentsList();
  }, [params.chatId]);

  // Load student data when a student is selected
  useEffect(() => {
    if (selectedStudentId) {
      loadStudentData();
    }
  }, [selectedStudentId, params.chatId]);

  const loadStudentsList = async () => {
    setLoadingStudents(true);
    setError("");

    try {
      const response = await fetch(
        `/api/student/mini-app/${params.chatId}?list=true`
      );
      const data = await response.json();

      if (data.success) {
        setStudents(data.students || []);
        // Auto-select if only one student
        if (data.students && data.students.length === 1) {
          setSelectedStudentId(data.students[0].id);
        }
      } else {
        setError(data.error || "Failed to load students");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadStudentData = async (isRefresh = false) => {
    if (!selectedStudentId) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch(
        `/api/student/mini-app/${params.chatId}?studentId=${selectedStudentId}`
      );
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
      if (e?.detail) {
        setCurrentTab(e.detail);
        setShowContentSection(true);
      }
    };
    window.addEventListener("dk:setTab", handler);
    return () => window.removeEventListener("dk:setTab", handler);
  }, []);

  const handleBackFromContent = () => {
    // Go back to overview
    setCurrentTab("overview");
    setShowContentSection(true);
    window.dispatchEvent(new CustomEvent("dk:setTab", { detail: "overview" }));
  };

  // Apply Telegram theme to document root as CSS variables
  const applyThemeToDocument = (params: ThemeParams) => {
    const root = document.documentElement;

    if (params.bg_color) {
      root.style.setProperty("--tg-theme-bg-color", params.bg_color);
    }
    if (params.text_color) {
      root.style.setProperty("--tg-theme-text-color", params.text_color);
    }
    if (params.hint_color) {
      root.style.setProperty("--tg-theme-hint-color", params.hint_color);
    }
    if (params.link_color) {
      root.style.setProperty("--tg-theme-link-color", params.link_color);
    }
    if (params.button_color) {
      root.style.setProperty("--tg-theme-button-color", params.button_color);
    }
    if (params.button_text_color) {
      root.style.setProperty(
        "--tg-theme-button-text-color",
        params.button_text_color
      );
    }
    if (params.secondary_bg_color) {
      root.style.setProperty(
        "--tg-theme-secondary-bg-color",
        params.secondary_bg_color
      );
    }
    if (params.header_bg_color) {
      root.style.setProperty(
        "--tg-theme-header-bg-color",
        params.header_bg_color
      );
    }
    if (params.bottom_bar_bg_color) {
      root.style.setProperty(
        "--tg-theme-bottom-bar-bg-color",
        params.bottom_bar_bg_color
      );
    }
    if (params.accent_text_color) {
      root.style.setProperty(
        "--tg-theme-accent-text-color",
        params.accent_text_color
      );
    }
    if (params.section_bg_color) {
      root.style.setProperty(
        "--tg-theme-section-bg-color",
        params.section_bg_color
      );
    }
    if (params.section_header_text_color) {
      root.style.setProperty(
        "--tg-theme-section-header-text-color",
        params.section_header_text_color
      );
    }
    if (params.section_separator_color) {
      root.style.setProperty(
        "--tg-theme-section-separator-color",
        params.section_separator_color
      );
    }
    if (params.subtitle_text_color) {
      root.style.setProperty(
        "--tg-theme-subtitle-text-color",
        params.subtitle_text_color
      );
    }
    if (params.destructive_text_color) {
      root.style.setProperty(
        "--tg-theme-destructive-text-color",
        params.destructive_text_color
      );
    }
  };

  // Initialize Telegram WebApp
  useEffect(() => {
    try {
      const tg = (window as any)?.Telegram?.WebApp as
        | TelegramWebApp
        | undefined;
      if (tg) {
        tg.ready?.();
        setTgWebApp(tg);

        // Initialize state from WebApp
        setIsFullscreen(!!tg.isFullscreen);
        setIsActive(!!tg.isActive);

        // Initialize safe area insets
        if (tg.safeAreaInset) {
          setSafeAreaInset(tg.safeAreaInset);
        }
        if (tg.contentSafeAreaInset) {
          setContentSafeAreaInset(tg.contentSafeAreaInset);
        }

        // Initialize theme params
        if (tg.themeParams) {
          setThemeParams(tg.themeParams);
          applyThemeToDocument(tg.themeParams);
        }

        // Event handlers
        const handleActivated = () => setIsActive(true);
        const handleDeactivated = () => setIsActive(false);
        const handleSafeAreaChanged = () => {
          if (tg.safeAreaInset) setSafeAreaInset(tg.safeAreaInset);
        };
        const handleContentSafeAreaChanged = () => {
          if (tg.contentSafeAreaInset)
            setContentSafeAreaInset(tg.contentSafeAreaInset);
        };
        const handleFullscreenChanged = () => {
          setIsFullscreen(!!tg.isFullscreen);
        };
        const handleFullscreenFailed = () => {
          console.warn("Fullscreen request failed");
          setIsFullscreen(false);
        };
        const handleThemeChanged = () => {
          if (tg.themeParams) {
            setThemeParams(tg.themeParams);
            applyThemeToDocument(tg.themeParams);
          }
        };

        // Subscribe to events
        if (tg.onEvent) {
          tg.onEvent("activated", handleActivated);
          tg.onEvent("deactivated", handleDeactivated);
          tg.onEvent("safeAreaChanged", handleSafeAreaChanged);
          tg.onEvent("contentSafeAreaChanged", handleContentSafeAreaChanged);
          tg.onEvent("fullscreenChanged", handleFullscreenChanged);
          tg.onEvent("fullscreenFailed", handleFullscreenFailed);
          tg.onEvent("themeChanged", handleThemeChanged);
        }

        // Cleanup
        return () => {
          if (tg.offEvent) {
            tg.offEvent("activated", handleActivated);
            tg.offEvent("deactivated", handleDeactivated);
            tg.offEvent("safeAreaChanged", handleSafeAreaChanged);
            tg.offEvent("contentSafeAreaChanged", handleContentSafeAreaChanged);
            tg.offEvent("fullscreenChanged", handleFullscreenChanged);
            tg.offEvent("fullscreenFailed", handleFullscreenFailed);
            tg.offEvent("themeChanged", handleThemeChanged);
          }
        };
      }
    } catch (error) {
      console.error("Error initializing Telegram WebApp:", error);
    }
  }, []);

  // Fullscreen functions
  const handleRequestFullscreen = () => {
    if (tgWebApp?.requestFullscreen) {
      tgWebApp.requestFullscreen();
    }
  };

  const handleExitFullscreen = () => {
    if (tgWebApp?.exitFullscreen) {
      tgWebApp.exitFullscreen();
    }
  };

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

  // Generate colors for avatars
  const getAvatarColor = (index: number) => {
    const colors = [
      "rgba(59, 130, 246, 0.2)", // blue
      "rgba(236, 72, 153, 0.2)", // pink
      "rgba(34, 197, 94, 0.2)", // green
      "rgba(249, 115, 22, 0.2)", // orange
      "rgba(168, 85, 247, 0.2)", // purple
    ];
    return colors[index % colors.length];
  };

  const getAvatarBorderColor = (index: number) => {
    const colors = [
      "#2563eb", // blue
      "#ec4899", // pink
      "#22c55e", // green
      "#f97316", // orange
      "#a855f7", // purple
    ];
    return colors[index % colors.length];
  };

  // Show student selection screen if multiple students and none selected
  if (!selectedStudentId && !loadingStudents && students.length > 1) {
    return (
      <StudentSelectionScreen
        students={students}
        onSelectStudent={(id) => setSelectedStudentId(id)}
        themeParams={themeParams}
        isDarkMode={isDarkMode}
        safeAreaInset={safeAreaInset}
        contentSafeAreaInset={contentSafeAreaInset}
      />
    );
  }

  if (loadingStudents || loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
        style={{
          backgroundColor:
            themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
          paddingLeft: `${contentSafeAreaInset.left || 0}px`,
          paddingRight: `${contentSafeAreaInset.right || 0}px`,
        }}
      >
        <div className="text-center">
          <div
            className={`loader mx-auto mb-4 ${isDarkMode ? "dark" : ""}`}
          ></div>
          <p
            className={`text-lg font-medium ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
            style={{
              color:
                themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
            }}
          >
            {t ? t("loadingProgress") : "Loading your progress..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4"
        style={{
          paddingLeft: `${contentSafeAreaInset.left || 0}px`,
          paddingRight: `${contentSafeAreaInset.right || 0}px`,
        }}
      >
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
      <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4"
        style={{
          paddingLeft: `${contentSafeAreaInset.left || 0}px`,
          paddingRight: `${contentSafeAreaInset.right || 0}px`,
        }}
      >
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

  // Calculate header padding using safe area insets - increased for better spacing
  const headerPaddingTop =
    safeAreaInset.top > 0
      ? safeAreaInset.top + (tgWebApp?.isExpanded ? 16 : 56)
      : tgWebApp?.isExpanded
      ? 16
      : 56;

  return (
    <div
      className="min-h-screen transition-all duration-300 pb-24"
      style={{
        backgroundColor:
          themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
        color: themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
        paddingLeft: `${contentSafeAreaInset.left || 0}px`,
        paddingRight: `${contentSafeAreaInset.right || 0}px`,
      }}
    >
      {/* Mobile App Header */}
      <div
        className="sticky top-0 z-50 border-b transition-all duration-300"
        style={{
          backgroundColor:
            themeParams.header_bg_color ||
            themeParams.bg_color ||
            (isDarkMode ? "#1f2937" : "#ffffff"),
          borderColor:
            themeParams.section_separator_color ||
            (isDarkMode ? "#374151" : "#e5e7eb"),
          paddingTop: `${headerPaddingTop}px`,
          paddingLeft: `${safeAreaInset.left || 0}px`,
          paddingRight: `${safeAreaInset.right || 0}px`,
        }}
      >
        <div className="px-4 py-3">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => {
                  if (students.length > 1) {
                    setSelectedStudentId(null);
                  } else {
                    window.history.back();
                  }
                }}
                className="p-1"
                style={{
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1
                  className="text-xl font-bold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {studentData?.student?.name || "Dashboard"}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Fullscreen toggle button */}
              {tgWebApp && (
                <button
                  onClick={
                    isFullscreen
                      ? handleExitFullscreen
                      : handleRequestFullscreen
                  }
                  className="p-2 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor:
                      themeParams.secondary_bg_color ||
                      (isDarkMode ? "#374151" : "#f3f4f6"),
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#374151"),
                  }}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={() =>
                  setLang ? setLang((lang === "en" ? "am" : "en") as any) : null
                }
                className="px-3 py-1.5 rounded text-xs border"
                style={{
                  borderColor:
                    themeParams.section_separator_color ||
                    (isDarkMode ? "#374151" : "#d1d5db"),
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#e5e7eb" : "#374151"),
                }}
              >
                {lang === "en" ? "አማርኛ" : "EN"}
              </button>
            </div>
          </div>

          {/* Accounts Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-bold"
                style={{
                  color:
                    themeParams.text_color ||
                    themeParams.section_header_text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                Accounts
              </h2>
              <button
                className="p-1.5 rounded-lg"
                style={{
                  color:
                    themeParams.hint_color ||
                    themeParams.subtitle_text_color ||
                    (isDarkMode ? "#9ca3af" : "#6b7280"),
                }}
                onClick={() => {
                  if (students.length > 1) {
                    setSelectedStudentId(null);
                  }
                }}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal scrolling student list */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {students.map((student, index) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold relative shadow-lg transition-all active:scale-95"
                    style={{
                      backgroundColor:
                        student.id === selectedStudentId
                          ? themeParams.button_color ||
                            themeParams.accent_text_color ||
                            "rgba(59, 130, 246, 0.2)"
                          : getAvatarColor(index),
                      border: `3px solid ${
                        student.id === selectedStudentId
                          ? themeParams.button_color ||
                            themeParams.accent_text_color ||
                            "#2563eb"
                          : getAvatarBorderColor(index)
                      }`,
                      color:
                        student.id === selectedStudentId
                          ? themeParams.button_text_color ||
                            themeParams.button_color ||
                            "#2563eb"
                          : getAvatarBorderColor(index),
                    }}
                  >
                    {student.name.charAt(0).toUpperCase()}
                    {student.id === selectedStudentId && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg border-2 border-white">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold text-center max-w-[80px] truncate"
                    style={{
                      color:
                        themeParams.text_color ||
                        (isDarkMode ? "#ffffff" : "#111827"),
                    }}
                  >
                    {student.name}
                  </span>
                  <span
                    className="text-[10px] text-center max-w-[80px] truncate"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    {student.package}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div
            className="h-px mb-6"
            style={{
              backgroundColor:
                themeParams.section_separator_color ||
                (isDarkMode ? "#374151" : "#e5e7eb"),
            }}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div
        className="px-4 py-4"
        style={{
          paddingBottom: `${contentSafeAreaInset.bottom || 0}px`,
        }}
      >
        {/* Content Section Header with Back Button - Show for all tabs except default overview */}
        {showContentSection && currentTab !== "overview" && (
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={handleBackFromContent}
              className="p-2 rounded-full transition-all active:scale-95"
              style={{
                backgroundColor:
                  themeParams.secondary_bg_color ||
                  themeParams.section_bg_color ||
                  (isDarkMode ? "#374151" : "#f3f4f6"),
                color:
                  themeParams.text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2
              className="text-lg font-bold"
              style={{
                color:
                  themeParams.text_color ||
                  themeParams.section_header_text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
              }}
            >
              {currentTab === "terbia"
                ? "Terbia Progress"
                : currentTab === "attendance"
                ? "Attendance"
                : currentTab === "tests"
                ? "Test Results"
                : currentTab === "payments"
                ? "Payments"
                : currentTab === "schedule"
                ? "Schedule"
                : "Dashboard"}
            </h2>
          </div>
        )}

        {/* Overview Tab - Show by default */}
        {currentTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    themeParams.bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "rgba(34, 197, 94, 0.1)",
                      color:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#22c55e",
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <button className="p-1">
                    <Eye
                      className="w-4 h-4"
                      style={{
                        color:
                          themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      }}
                    />
                  </button>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {studentData.stats.attendancePercent}%
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                  }}
                >
                  Attendance
                </div>
              </div>

              <div
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    themeParams.bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "rgba(59, 130, 246, 0.1)",
                      color:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#3b82f6",
                    }}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <button className="p-1">
                    <Eye
                      className="w-4 h-4"
                      style={{
                        color:
                          themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      }}
                    />
                  </button>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {studentData.stats.totalZoomSessions}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                  }}
                >
                  Zoom Sessions
                </div>
              </div>

              <div
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    themeParams.bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "rgba(168, 85, 247, 0.1)",
                      color:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#a855f7",
                    }}
                  >
                    <Trophy className="w-4 h-4" />
                  </div>
                  <button className="p-1">
                    <Eye
                      className="w-4 h-4"
                      style={{
                        color:
                          themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      }}
                    />
                  </button>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {studentData.stats.testsThisMonth}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                  }}
                >
                  Tests Taken
                </div>
              </div>

              <div
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    themeParams.bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "rgba(249, 115, 22, 0.1)",
                      color:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                    }}
                  >
                    <Brain className="w-4 h-4" />
                  </div>
                  <button className="p-1">
                    <Eye
                      className="w-4 h-4"
                      style={{
                        color:
                          themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      }}
                    />
                  </button>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {studentData.stats.terbiaProgress}%
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                  }}
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
              className="p-4 rounded-2xl shadow-sm"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      themeParams.text_color ||
                      themeParams.section_header_text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  Attendance Record
                </h3>
                <button
                  onClick={() => toggleSection("attendance")}
                  className="p-1"
                >
                  {expandedSections.attendance ? (
                    <ChevronUp
                      className="w-4 h-4"
                      style={{
                        color:
                          themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      }}
                    />
                  ) : (
                    <ChevronDown
                      className="w-4 h-4"
                      style={{
                        color:
                          themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      }}
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
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
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
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    Absent
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{
                      color:
                        themeParams.text_color ||
                        (isDarkMode ? "#ffffff" : "#111827"),
                    }}
                  >
                    {studentData.attendance.totalDays}
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
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
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          themeParams.bg_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.5)"
                            : "rgba(249, 250, 251, 1)"),
                      }}
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
                            className="text-sm font-medium"
                            style={{
                              color:
                                themeParams.text_color ||
                                (isDarkMode ? "#ffffff" : "#111827"),
                            }}
                          >
                            {formatDate(day.date)}
                          </span>
                          <div
                            className={`text-xs ${
                              themeParams.hint_color ||
                              themeParams.subtitle_text_color ||
                              (isDarkMode ? "#9ca3af" : "#6b7280")
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
        {currentTab === "tests" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div
              className="p-4 rounded-2xl"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      themeParams.text_color ||
                      themeParams.section_header_text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
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
                      className="flex items-center justify-between p-4 rounded-xl shadow-sm"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          themeParams.bg_color ||
                          (isDarkMode ? "#374151" : "#f9fafb"),
                      }}
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
                            className="font-medium"
                            style={{
                              color:
                                themeParams.text_color ||
                                (isDarkMode ? "#ffffff" : "#111827"),
                            }}
                          >
                            {test.testName}
                          </div>
                          <div
                            className={`text-xs ${
                              themeParams.hint_color ||
                              themeParams.subtitle_text_color ||
                              (isDarkMode ? "#9ca3af" : "#6b7280")
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
              className="p-4 rounded-2xl"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      themeParams.text_color ||
                      themeParams.section_header_text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
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
                        className="font-medium"
                        style={{
                          color:
                            themeParams.text_color ||
                            (isDarkMode ? "#ffffff" : "#111827"),
                        }}
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
                      className="w-full rounded-full h-2"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          themeParams.bg_color ||
                          (isDarkMode ? "#374151" : "#e5e7eb"),
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${studentData.terbia.progressPercent}%`,
                        }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor:
                            themeParams.button_color ||
                            themeParams.accent_text_color ||
                            themeParams.link_color ||
                            "#f97316",
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div
                        className="text-xl font-bold"
                        style={{
                          color:
                            themeParams.text_color ||
                            (isDarkMode ? "#ffffff" : "#111827"),
                        }}
                      >
                        {studentData.terbia.completedChapters}
                      </div>
                      <div
                        className="text-xs"
                        style={{
                          color:
                            themeParams.hint_color ||
                            themeParams.subtitle_text_color ||
                            (isDarkMode ? "#9ca3af" : "#6b7280"),
                        }}
                      >
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className="text-xl font-bold"
                        style={{
                          color:
                            themeParams.text_color ||
                            (isDarkMode ? "#ffffff" : "#111827"),
                        }}
                      >
                        {studentData.terbia.totalChapters}
                      </div>
                      <div
                        className="text-xs"
                        style={{
                          color:
                            themeParams.hint_color ||
                            themeParams.subtitle_text_color ||
                            (isDarkMode ? "#9ca3af" : "#6b7280"),
                        }}
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
              className="p-4 rounded-2xl"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <h3
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{
                  color:
                    themeParams.text_color ||
                    themeParams.section_header_text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                <CreditCard className="w-5 h-5" />
                {t("paymentSummary")}
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      themeParams.secondary_bg_color ||
                      themeParams.bg_color ||
                      (isDarkMode ? "#374151" : "rgba(34, 197, 94, 0.1)"),
                  }}
                >
                  <p
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#16a34a"),
                    }}
                  >
                    {t("totalDeposits")}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color:
                        themeParams.text_color ||
                        themeParams.accent_text_color ||
                        (isDarkMode ? "#ffffff" : "#15803d"),
                    }}
                  >
                    ${studentData?.payments?.summary?.totalDeposits || 0}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      themeParams.secondary_bg_color ||
                      themeParams.bg_color ||
                      (isDarkMode ? "#374151" : "rgba(59, 130, 246, 0.1)"),
                  }}
                >
                  <p
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#2563eb"),
                    }}
                  >
                    {t("monthlyPayments")}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color:
                        themeParams.text_color ||
                        themeParams.accent_text_color ||
                        (isDarkMode ? "#ffffff" : "#1d4ed8"),
                    }}
                  >
                    ${studentData?.payments?.summary?.totalMonthlyPayments || 0}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      themeParams.secondary_bg_color ||
                      themeParams.bg_color ||
                      (isDarkMode ? "#374151" : "rgba(168, 85, 247, 0.1)"),
                  }}
                >
                  <p
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#9333ea"),
                    }}
                  >
                    {t("remainingBalance")}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color:
                        themeParams.text_color ||
                        themeParams.accent_text_color ||
                        (isDarkMode ? "#ffffff" : "#7e22ce"),
                    }}
                  >
                    ${studentData?.payments?.summary?.remainingBalance || 0}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      themeParams.secondary_bg_color ||
                      themeParams.bg_color ||
                      (isDarkMode ? "#374151" : "rgba(249, 115, 22, 0.1)"),
                  }}
                >
                  <p
                    className="text-xs"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#ea580c"),
                    }}
                  >
                    {t("paidMonths")}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color:
                        themeParams.text_color ||
                        themeParams.accent_text_color ||
                        (isDarkMode ? "#ffffff" : "#c2410c"),
                    }}
                  >
                    {studentData?.payments?.summary?.paidMonths || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Deposits */}
            <div
              className="p-4 rounded-2xl"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{
                  color:
                    themeParams.text_color ||
                    themeParams.section_header_text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                {t("recentDeposits")}
              </h3>
              <div className="space-y-2">
                {studentData?.payments?.deposits
                  ?.slice(0, 5)
                  .map((deposit: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 rounded-xl shadow-sm"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          themeParams.bg_color ||
                          (isDarkMode ? "#374151" : "#f9fafb"),
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{
                            color:
                              themeParams.text_color ||
                              (isDarkMode ? "#ffffff" : "#111827"),
                          }}
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
                    className="p-4 rounded-xl text-center"
                    style={{
                      backgroundColor:
                        themeParams.secondary_bg_color ||
                        themeParams.bg_color ||
                        (isDarkMode ? "#374151" : "#f9fafb"),
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#d1d5db" : "#4b5563"),
                    }}
                  >
                    {t ? t("noPayments") : "No payment data available"}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Payments */}
            <div
              className="p-4 rounded-2xl"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{
                  color:
                    themeParams.text_color ||
                    themeParams.section_header_text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                {t("monthlyPayments")}
              </h3>
              <div className="space-y-2">
                {studentData?.payments?.monthlyPayments
                  ?.slice(0, 6)
                  .map((payment: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 rounded-xl shadow-sm"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          themeParams.bg_color ||
                          (isDarkMode ? "#374151" : "#f9fafb"),
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{
                            color:
                              themeParams.text_color ||
                              (isDarkMode ? "#ffffff" : "#111827"),
                          }}
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
                    className="p-4 rounded-xl text-center"
                    style={{
                      backgroundColor:
                        themeParams.secondary_bg_color ||
                        themeParams.bg_color ||
                        (isDarkMode ? "#374151" : "#f9fafb"),
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#d1d5db" : "#4b5563"),
                    }}
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
              className="p-4 rounded-2xl"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  themeParams.bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
              }}
            >
              <h3
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{
                  color:
                    themeParams.text_color ||
                    themeParams.section_header_text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
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
                      className="p-4 rounded-xl shadow-sm"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          themeParams.bg_color ||
                          (isDarkMode ? "#374151" : "#f9fafb"),
                      }}
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
                              className="text-sm font-semibold"
                              style={{
                                color:
                                  themeParams.text_color ||
                                  (isDarkMode ? "#ffffff" : "#111827"),
                              }}
                            >
                              {time.timeSlot}
                            </p>
                          </div>
                          <p
                            className={`text-xs ${
                              themeParams.hint_color ||
                              themeParams.subtitle_text_color ||
                              (isDarkMode ? "#9ca3af" : "#6b7280")
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
                                themeParams.hint_color ||
                                themeParams.subtitle_text_color ||
                                (isDarkMode ? "#9ca3af" : "#6b7280")
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
                    className="p-4 rounded-xl text-center"
                    style={{
                      backgroundColor:
                        themeParams.secondary_bg_color ||
                        themeParams.bg_color ||
                        (isDarkMode ? "#374151" : "#f9fafb"),
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#d1d5db" : "#4b5563"),
                    }}
                  >
                    {t ? t("noSchedule") : "No scheduled times found"}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Exit Fullscreen Button - Only visible in fullscreen mode */}
      {isFullscreen && tgWebApp && (
        <button
          onClick={handleExitFullscreen}
          className="fixed bottom-24 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-200 border"
          style={{
            backgroundColor:
              themeParams.secondary_bg_color ||
              themeParams.section_bg_color ||
              (isDarkMode ? "#1f2937" : "#ffffff"),
            color:
              themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
            borderColor:
              themeParams.section_separator_color ||
              (isDarkMode ? "#4b5563" : "#e5e7eb"),
            bottom: `${(safeAreaInset.bottom || 0) + 80}px`,
            right: `${(safeAreaInset.right || 0) + 16}px`,
          }}
          title="Exit Fullscreen"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// Student Selection Screen Component
function StudentSelectionScreen({
  students,
  onSelectStudent,
  themeParams,
  isDarkMode,
  safeAreaInset,
  contentSafeAreaInset,
}: {
  students: StudentListItem[];
  onSelectStudent: (id: number) => void;
  themeParams: ThemeParams;
  isDarkMode: boolean;
  safeAreaInset: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}) {
  const headerPaddingTop = safeAreaInset.top > 0 ? safeAreaInset.top + 16 : 16;

  // Generate colors for avatars
  const getAvatarColor = (index: number) => {
    const colors = [
      "rgba(59, 130, 246, 0.2)", // blue
      "rgba(236, 72, 153, 0.2)", // pink
      "rgba(34, 197, 94, 0.2)", // green
      "rgba(249, 115, 22, 0.2)", // orange
      "rgba(168, 85, 247, 0.2)", // purple
    ];
    return colors[index % colors.length];
  };

  const getAvatarBorderColor = (index: number) => {
    const colors = [
      "#2563eb", // blue
      "#ec4899", // pink
      "#22c55e", // green
      "#f97316", // orange
      "#a855f7", // purple
    ];
    return colors[index % colors.length];
  };

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{
        backgroundColor:
          themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
        color: themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
        paddingLeft: `${contentSafeAreaInset.left || 0}px`,
        paddingRight: `${contentSafeAreaInset.right || 0}px`,
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-50 border-b transition-all duration-300"
        style={{
          backgroundColor:
            themeParams.header_bg_color ||
            themeParams.bg_color ||
            (isDarkMode ? "#1f2937" : "#ffffff"),
          borderColor:
            themeParams.section_separator_color ||
            (isDarkMode ? "#374151" : "#e5e7eb"),
          paddingTop: `${headerPaddingTop}px`,
          paddingLeft: `${safeAreaInset.left || 0}px`,
          paddingRight: `${safeAreaInset.right || 0}px`,
        }}
      >
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-1"
              style={{
                color:
                  themeParams.text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1
              className="text-xl font-bold flex-1"
              style={{
                color:
                  themeParams.text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
              }}
            >
              Select Student
            </h1>
          </div>

          {/* Accounts Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-bold"
                style={{
                  color:
                    themeParams.text_color ||
                    themeParams.section_header_text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                Accounts
              </h2>
              <button
                className="p-1.5 rounded-lg"
                style={{
                  color:
                    themeParams.hint_color ||
                    themeParams.subtitle_text_color ||
                    (isDarkMode ? "#9ca3af" : "#6b7280"),
                }}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal scrolling student list */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {students.map((student, index) => (
                <button
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold relative shadow-lg transition-all hover:scale-105"
                    style={{
                      backgroundColor: getAvatarColor(index),
                      border: `3px solid ${getAvatarBorderColor(index)}`,
                      color: getAvatarBorderColor(index),
                    }}
                  >
                    {student.name.charAt(0).toUpperCase()}
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg border-2 border-white">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold text-center max-w-[80px] truncate"
                    style={{
                      color:
                        themeParams.text_color ||
                        (isDarkMode ? "#ffffff" : "#111827"),
                    }}
                  >
                    {student.name}
                  </span>
                  <span
                    className="text-[10px] text-center max-w-[80px] truncate"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    {student.package}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div
            className="h-px mb-6"
            style={{
              backgroundColor:
                themeParams.section_separator_color ||
                (isDarkMode ? "#374151" : "#e5e7eb"),
            }}
          />

          {/* Profile Settings Section */}
          <div>
            <h2
              className="text-lg font-bold mb-4"
              style={{
                color:
                  themeParams.text_color ||
                  themeParams.section_header_text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
              }}
            >
              Profile settings
            </h2>
            <div className="space-y-2">
              {[
                {
                  icon: Bell,
                  label: "Notifications",
                  color: "#ef4444",
                  bgColor: "rgba(239, 68, 68, 0.1)",
                },
                {
                  icon: Clock,
                  label: "Date & Time",
                  color: "#22c55e",
                  bgColor: "rgba(34, 197, 94, 0.1)",
                },
                {
                  icon: Shield,
                  label: "Privacy",
                  color: "#eab308",
                  bgColor: "rgba(234, 179, 8, 0.1)",
                },
                {
                  icon: CreditCard,
                  label: "My cards",
                  color: "#3b82f6",
                  bgColor: "rgba(59, 130, 246, 0.1)",
                },
                {
                  icon: HelpCircle,
                  label: "Help centre",
                  color: "#a855f7",
                  bgColor: "rgba(168, 85, 247, 0.1)",
                },
              ].map((item, index) => (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    backgroundColor:
                      themeParams.section_bg_color ||
                      themeParams.secondary_bg_color ||
                      themeParams.bg_color ||
                      (isDarkMode ? "#1f2937" : "#ffffff"),
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: item.bgColor,
                      color: item.color,
                    }}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-base font-medium flex-1 text-left"
                    style={{
                      color:
                        themeParams.text_color ||
                        (isDarkMode ? "#ffffff" : "#111827"),
                    }}
                  >
                    {item.label}
                  </span>
                  <ChevronRight
                    className="w-5 h-5"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
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
      {/* Profile Settings Navigation (replaces bottom nav) */}
      <ProfileSettingsNav />
    </I18nProvider>
  );
}

function ProfileSettingsNav() {
  const { t } = useI18n();
  const [active, setActive] = React.useState<string>("overview");
  const [safeAreaInset, setSafeAreaInset] = React.useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [themeParams, setThemeParams] = React.useState<ThemeParams>({});
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    try {
      const tg = (window as any)?.Telegram?.WebApp;
      if (tg?.safeAreaInset) {
        setSafeAreaInset(tg.safeAreaInset);
      }
      if (tg?.themeParams) {
        setThemeParams(tg.themeParams);
      }

      // Listen for safe area changes
      const handleSafeAreaChanged = () => {
        if (tg?.safeAreaInset) setSafeAreaInset(tg.safeAreaInset);
      };

      // Listen for theme changes
      const handleThemeChanged = () => {
        if (tg?.themeParams) setThemeParams(tg.themeParams);
      };

      if (tg?.onEvent) {
        tg.onEvent("safeAreaChanged", handleSafeAreaChanged);
        tg.onEvent("themeChanged", handleThemeChanged);
      }

      return () => {
        if (tg?.offEvent) {
          tg.offEvent("safeAreaChanged", handleSafeAreaChanged);
          tg.offEvent("themeChanged", handleThemeChanged);
        }
      };
    } catch (error) {
      console.error("Error setting up profile nav safe area:", error);
    }
  }, []);

  const setTab = (tab: string) => {
    setActive(tab);
    // Force update the main component
    window.dispatchEvent(new CustomEvent("dk:setTab", { detail: tab }));
  };

  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail) setActive(e.detail);
    };
    window.addEventListener("dk:setTab", handler);
    return () => window.removeEventListener("dk:setTab", handler);
  }, []);

  const navItems = [
    {
      id: "overview",
      icon: Home,
      label: t("overview") || "Overview",
      color: "#3b82f6",
    },
    {
      id: "terbia",
      icon: BookOpen,
      label: t("terbia") || "Terbia",
      color: "#8b5cf6",
    },
    {
      id: "attendance",
      icon: Calendar,
      label: t("attendance") || "Attendance",
      color: "#10b981",
    },
    {
      id: "tests",
      icon: Trophy,
      label: t("tests") || "Tests",
      color: "#f59e0b",
    },
    {
      id: "payments",
      icon: CreditCard,
      label: t("payments") || "Payments",
      color: "#ef4444",
    },
    {
      id: "schedule",
      icon: Clock,
      label: t("schedule") || "Schedule",
      color: "#06b6d4",
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl"
      style={{
        backgroundColor:
          themeParams.bottom_bar_bg_color ||
          themeParams.section_bg_color ||
          (isDarkMode ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)"),
        borderTop: `1px solid ${
          themeParams.section_separator_color ||
          (isDarkMode ? "rgba(55, 65, 81, 0.5)" : "rgba(229, 231, 235, 0.5)")
        }`,
        paddingBottom: `${safeAreaInset.bottom || 8}px`,
        paddingLeft: `${safeAreaInset.left || 0}px`,
        paddingRight: `${safeAreaInset.right || 0}px`,
        paddingTop: "8px",
        boxShadow: isDarkMode
          ? "0 -4px 24px rgba(0, 0, 0, 0.3)"
          : "0 -4px 24px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="grid grid-cols-3 gap-2 px-3">
        {navItems.map((item) => {
          const isActive = active === item.id;
          const activeColor =
            themeParams.accent_text_color ||
            themeParams.link_color ||
            themeParams.button_color ||
            item.color;

          return (
            <button
              key={item.id}
              onClick={() => {
                console.log("Nav item clicked:", item.id);
                setTab(item.id);
              }}
              className="flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl transition-all active:scale-95"
              style={{
                backgroundColor: isActive
                  ? themeParams.button_color
                    ? `${themeParams.button_color}20`
                    : `${item.color}20`
                  : "transparent",
              }}
            >
              <div
                className="relative flex items-center justify-center"
                style={{
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.2s ease",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: isActive
                      ? themeParams.button_color
                        ? `${themeParams.button_color}30`
                        : `${item.color}30`
                      : themeParams.secondary_bg_color ||
                        (isDarkMode
                          ? "rgba(55, 65, 81, 0.6)"
                          : "rgba(243, 244, 246, 0.9)"),
                    border: isActive
                      ? `2px solid ${activeColor}`
                      : `1px solid ${
                          themeParams.section_separator_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.3)"
                            : "rgba(229, 231, 235, 0.5)")
                        }`,
                  }}
                >
                  <item.icon
                    className="w-5 h-5 transition-colors"
                    style={{
                      color: isActive
                        ? activeColor
                        : themeParams.hint_color ||
                          themeParams.subtitle_text_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  />
                </div>
                {isActive && (
                  <div
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-sm"
                    style={{
                      backgroundColor: activeColor,
                    }}
                  />
                )}
              </div>
              <span
                className="text-[11px] font-semibold text-center leading-tight max-w-full truncate px-1"
                style={{
                  color: isActive
                    ? activeColor
                    : themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
