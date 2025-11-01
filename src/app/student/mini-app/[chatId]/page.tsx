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
  ExternalLink,
} from "lucide-react";

interface StudentData {
  student: {
    wdt_ID: number;
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
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
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
  HapticFeedback?: {
    impactOccurred: (
      style: "light" | "medium" | "heavy" | "rigid" | "soft"
    ) => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
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

function StudentMiniAppInner({
  params,
  selectedStudentId: externalSelectedStudentId,
  onStudentSelected,
  students: externalStudents,
  loadingStudents: externalLoadingStudents,
}: {
  params: { chatId: string };
  selectedStudentId?: number | null;
  onStudentSelected?: (id: number | null) => void;
  students?: StudentListItem[];
  loadingStudents?: boolean;
}) {
  const { t, lang, setLang } = useI18n();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [internalStudents, setInternalStudents] = useState<StudentListItem[]>(
    []
  );
  const students = externalStudents ?? internalStudents;
  const [internalSelectedStudentId, setInternalSelectedStudentId] = useState<
    number | null
  >(null);
  const selectedStudentId =
    externalSelectedStudentId ?? internalSelectedStudentId;
  const setSelectedStudentId = (id: number | null) => {
    if (onStudentSelected) {
      onStudentSelected(id);
    } else {
      setInternalSelectedStudentId(id);
    }
  };
  const [loading, setLoading] = useState(true);
  const [internalLoadingStudents, setInternalLoadingStudents] = useState(true);
  const loadingStudents = externalLoadingStudents ?? internalLoadingStudents;
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
  const [showTerbiaIframe, setShowTerbiaIframe] = useState(false);
  const [terbiaLoading, setTerbiaLoading] = useState(true);

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

  // Load students list first (only if not provided externally)
  useEffect(() => {
    if (!externalStudents) {
      loadStudentsList();
    } else {
      setInternalLoadingStudents(false);
    }
  }, [params.chatId, externalStudents]);

  // Load student data when a student is selected
  useEffect(() => {
    if (selectedStudentId) {
      loadStudentData();
    }
  }, [selectedStudentId, params.chatId]);

  const loadStudentsList = async () => {
    setInternalLoadingStudents(true);
    setError("");

    try {
      const response = await fetch(
        `/api/student/mini-app/${params.chatId}?list=true`
      );
      const data = await response.json();

      if (data.success) {
        const studentsList = data.students || [];
        setInternalStudents(studentsList);
        // Auto-select if only one student (and not already selected externally)
        if (studentsList.length === 1 && !externalSelectedStudentId) {
          setSelectedStudentId(studentsList[0].id);
        }
      } else {
        setError(data.error || "Failed to load students");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setInternalLoadingStudents(false);
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

  // Helper function to open Terbia in iframe
  const openTerbiaInApp = () => {
    try {
      // Trigger haptic feedback if available
      if (tgWebApp?.HapticFeedback?.impactOccurred) {
        tgWebApp.HapticFeedback.impactOccurred("light");
      }
      setTerbiaLoading(true);
      setShowTerbiaIframe(true);
    } catch (error) {
      console.error("Failed to open Terbia:", error);
    }
  };

  const closeTerbiaIframe = () => {
    try {
      if (tgWebApp?.HapticFeedback?.impactOccurred) {
        tgWebApp.HapticFeedback.impactOccurred("light");
      }
      setShowTerbiaIframe(false);
    } catch (error) {
      console.error("Failed to close Terbia:", error);
    }
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
  // OR if no student selected at all
  if (!selectedStudentId && !loadingStudents) {
    if (students.length > 1) {
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
    // If only one student but not selected yet, auto-select it
    if (students.length === 1) {
      setSelectedStudentId(students[0].id);
      return null; // Will re-render with selected student
    }
  }

  if (loadingStudents || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor:
            themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
          paddingLeft: `${contentSafeAreaInset.left || 0}px`,
          paddingRight: `${contentSafeAreaInset.right || 0}px`,
        }}
      >
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{
                backgroundColor:
                  themeParams.button_color ||
                  themeParams.accent_text_color ||
                  "#3b82f6",
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-spin border-4 border-transparent"
              style={{
                borderTopColor:
                  themeParams.button_color ||
                  themeParams.accent_text_color ||
                  "#3b82f6",
                borderRightColor:
                  themeParams.button_color ||
                  themeParams.accent_text_color ||
                  "#3b82f6",
              }}
            />
          </div>
          <p
            className="text-lg font-semibold mb-2"
            style={{
              color:
                themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
            }}
          >
            {t ? t("loadingProgress") : "Loading your progress..."}
          </p>
          <p
            className="text-sm"
            style={{
              color:
                themeParams.hint_color ||
                themeParams.subtitle_text_color ||
                (isDarkMode ? "#9ca3af" : "#6b7280"),
            }}
          >
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor:
            themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
          paddingLeft: `${contentSafeAreaInset.left || 0}px`,
          paddingRight: `${contentSafeAreaInset.right || 0}px`,
        }}
      >
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: themeParams.destructive_text_color
                ? `${themeParams.destructive_text_color}20`
                : "rgba(239, 68, 68, 0.1)",
            }}
          >
            <XCircle
              className="w-12 h-12"
              style={{
                color:
                  themeParams.destructive_text_color ||
                  (isDarkMode ? "#f87171" : "#ef4444"),
              }}
            />
          </div>
          <h2
            className="text-xl font-bold mb-3"
            style={{
              color:
                themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
            }}
          >
            {t ? t("error") : "Error"}
          </h2>
          <p
            className="text-base mb-6"
            style={{
              color:
                themeParams.hint_color ||
                themeParams.subtitle_text_color ||
                (isDarkMode ? "#9ca3af" : "#6b7280"),
            }}
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="py-3 px-6 rounded-xl font-semibold transition-all active:scale-95 shadow-md"
            style={{
              backgroundColor:
                themeParams.button_color ||
                themeParams.accent_text_color ||
                "#3b82f6",
              color:
                themeParams.button_text_color ||
                (isDarkMode ? "#ffffff" : "#ffffff"),
            }}
          >
            {t ? t("retry") : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor:
            themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
          paddingLeft: `${contentSafeAreaInset.left || 0}px`,
          paddingRight: `${contentSafeAreaInset.right || 0}px`,
        }}
      >
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
            style={{
              backgroundColor:
                themeParams.secondary_bg_color ||
                (isDarkMode ? "#374151" : "#f3f4f6"),
            }}
          >
            <Users
              className="w-12 h-12"
              style={{
                color:
                  themeParams.hint_color ||
                  themeParams.subtitle_text_color ||
                  (isDarkMode ? "#9ca3af" : "#6b7280"),
              }}
            />
          </div>
          <h2
            className="text-xl font-bold mb-3"
            style={{
              color:
                themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
            }}
          >
            {t ? t("noDataTitle") : "No Data Found"}
          </h2>
          <p
            className="text-base"
            style={{
              color:
                themeParams.hint_color ||
                themeParams.subtitle_text_color ||
                (isDarkMode ? "#9ca3af" : "#6b7280"),
            }}
          >
            {t ? t("noDataSubtitle") : "Unable to load your progress data."}
          </p>
        </div>
      </div>
    );
  }

  // Calculate header padding using safe area insets - compact for more content space
  const headerPaddingTop = safeAreaInset.top > 0 ? safeAreaInset.top + 8 : 8;

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{
        backgroundColor:
          themeParams.bg_color || (isDarkMode ? "#111827" : "#f9fafb"),
        color: themeParams.text_color || (isDarkMode ? "#ffffff" : "#111827"),
        paddingTop: `${safeAreaInset.top || 0}px`,
        paddingBottom: `${(safeAreaInset.bottom || 0) + 140}px`,
        paddingLeft: `${contentSafeAreaInset.left || 0}px`,
        paddingRight: `${contentSafeAreaInset.right || 0}px`,
      }}
    >
      {/* Integrated Bottom Header/Navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t shadow-2xl"
        style={{
          backgroundColor:
            themeParams.bottom_bar_bg_color ||
            themeParams.header_bg_color ||
            (isDarkMode
              ? "rgba(17, 24, 39, 0.98)"
              : "rgba(255, 255, 255, 0.98)"),
          borderColor:
            themeParams.section_separator_color ||
            (isDarkMode ? "rgba(55, 65, 81, 0.6)" : "rgba(229, 231, 235, 0.6)"),
          paddingBottom: `${safeAreaInset.bottom || 8}px`,
          paddingLeft: `${safeAreaInset.left || 0}px`,
          paddingRight: `${safeAreaInset.right || 0}px`,
        }}
      >
        {/* Student Profile Bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            {/* Student Avatar & Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar with multiple student indicator */}
              <button
                onClick={() => {
                  if (students.length > 1) {
                    setSelectedStudentId(null);
                  }
                }}
                className="relative flex-shrink-0"
                disabled={students.length <= 1}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg border-2 transition-all active:scale-95"
                  style={{
                    backgroundColor:
                      themeParams.button_color ||
                      themeParams.accent_text_color ||
                      getAvatarColor(0),
                    borderColor:
                      themeParams.button_color ||
                      themeParams.accent_text_color ||
                      "#3b82f6",
                    color:
                      themeParams.button_text_color ||
                      (isDarkMode ? "#ffffff" : "#ffffff"),
                  }}
                >
                  {studentData?.student?.name?.charAt(0).toUpperCase() || "S"}
                </div>
                {students.length > 1 && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md border-2"
                    style={{
                      backgroundColor:
                        themeParams.accent_text_color || "#ef4444",
                      borderColor:
                        themeParams.bottom_bar_bg_color ||
                        (isDarkMode ? "#111827" : "#ffffff"),
                      color: "#ffffff",
                    }}
                  >
                    {students.length}
                  </div>
                )}
              </button>

              {/* Student Info */}
              <div className="flex-1 min-w-0">
                <h1
                  className="text-sm font-bold truncate"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {studentData?.student?.name || "Dashboard"}
                </h1>
                <div className="flex items-center gap-2 text-[10px]">
                  <span
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    {studentData?.student?.subject}
                  </span>
                  <span
                    style={{
                      color:
                        themeParams.hint_color ||
                        (isDarkMode ? "#4b5563" : "#d1d5db"),
                    }}
                  >
                    •
                  </span>
                  <span
                    className="font-semibold"
                    style={{
                      color: themeParams.accent_text_color || "#10b981",
                    }}
                  >
                    ETB {studentData?.student?.classfee?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {tgWebApp && (
                <button
                  onClick={
                    isFullscreen
                      ? handleExitFullscreen
                      : handleRequestFullscreen
                  }
                  className="p-2 rounded-xl transition-all active:scale-95"
                  style={{
                    backgroundColor:
                      themeParams.secondary_bg_color ||
                      (isDarkMode
                        ? "rgba(55, 65, 81, 0.6)"
                        : "rgba(243, 244, 246, 0.9)"),
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#374151"),
                  }}
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
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color ||
                    (isDarkMode
                      ? "rgba(55, 65, 81, 0.6)"
                      : "rgba(243, 244, 246, 0.9)"),
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#e5e7eb" : "#374151"),
                }}
              >
                {lang === "en" ? "አማ" : "EN"}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Integrated */}
        <div className="px-2 pb-1">
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: "overview", icon: Home, label: "Overview" },
              { id: "terbia", icon: BookOpen, label: "Terbia" },
              { id: "attendance", icon: Calendar, label: "Attendance" },
              { id: "tests", icon: Trophy, label: "Tests" },
              { id: "payments", icon: CreditCard, label: "Payments" },
              { id: "schedule", icon: Clock, label: "Schedule" },
            ].map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    window.dispatchEvent(
                      new CustomEvent("dk:setTab", { detail: item.id })
                    );
                  }}
                  className="flex flex-col items-center py-2 rounded-xl transition-all active:scale-95"
                  style={{
                    backgroundColor: isActive
                      ? themeParams.button_color
                        ? `${themeParams.button_color}20`
                        : isDarkMode
                        ? "rgba(59, 130, 246, 0.2)"
                        : "rgba(59, 130, 246, 0.15)"
                      : "transparent",
                  }}
                >
                  <Icon
                    className="w-5 h-5 mb-0.5"
                    style={{
                      color: isActive
                        ? themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#3b82f6"
                        : themeParams.hint_color ||
                          (isDarkMode ? "#9ca3af" : "#6b7280"),
                      strokeWidth: isActive ? 2.5 : 2,
                    }}
                  />
                  <span
                    className="text-[9px] font-semibold"
                    style={{
                      color: isActive
                        ? themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#3b82f6"
                        : themeParams.hint_color ||
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
      </div>

      {/* Tab Content - Scrollable from top */}
      <div className="px-3 py-4 pb-4">
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
                className="p-4 rounded-2xl shadow-sm border"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                  borderColor:
                    themeParams.section_separator_color ||
                    (isDarkMode
                      ? "rgba(55, 65, 81, 0.3)"
                      : "rgba(229, 231, 235, 0.5)"),
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
                className="p-4 rounded-2xl shadow-sm border"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                  borderColor:
                    themeParams.section_separator_color ||
                    (isDarkMode
                      ? "rgba(55, 65, 81, 0.3)"
                      : "rgba(229, 231, 235, 0.5)"),
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
                className="p-4 rounded-2xl shadow-sm border"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                  borderColor:
                    themeParams.section_separator_color ||
                    (isDarkMode
                      ? "rgba(55, 65, 81, 0.3)"
                      : "rgba(229, 231, 235, 0.5)"),
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
                className="p-4 rounded-2xl shadow-sm border"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                  borderColor:
                    themeParams.section_separator_color ||
                    (isDarkMode
                      ? "rgba(55, 65, 81, 0.3)"
                      : "rgba(229, 231, 235, 0.5)"),
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

            {/* Terbia Quick Access Card */}
            <div
              className="p-5 rounded-2xl shadow-md border"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
                borderColor:
                  themeParams.section_separator_color ||
                  (isDarkMode
                    ? "rgba(55, 65, 81, 0.3)"
                    : "rgba(249, 115, 22, 0.3)"),
              }}
            >
              {studentData.terbia ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{
                          backgroundColor:
                            themeParams.button_color ||
                            themeParams.accent_text_color ||
                            "rgba(249, 115, 22, 0.15)",
                          color:
                            themeParams.button_color ||
                            themeParams.accent_text_color ||
                            "#f97316",
                        }}
                      >
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3
                          className="font-bold text-base"
                          style={{
                            color:
                              themeParams.text_color ||
                              (isDarkMode ? "#ffffff" : "#111827"),
                          }}
                        >
                          Terbia Learning
                        </h3>
                        <p
                          className="text-xs"
                          style={{
                            color:
                              themeParams.hint_color ||
                              themeParams.subtitle_text_color ||
                              (isDarkMode ? "#9ca3af" : "#6b7280"),
                          }}
                        >
                          {studentData.terbia.courseName}
                        </p>
                      </div>
                    </div>
                    <div
                      className="text-2xl font-bold"
                      style={{
                        color:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#f97316",
                      }}
                    >
                      {studentData.terbia.progressPercent}%
                    </div>
                  </div>

                  <div
                    className="w-full rounded-full h-2.5 mb-4"
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
                      transition={{ duration: 1.5, delay: 0.3 }}
                      className="h-2.5 rounded-full shadow-sm"
                      style={{
                        backgroundColor:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          themeParams.link_color ||
                          "#f97316",
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCurrentTab("terbia");
                        window.dispatchEvent(
                          new CustomEvent("dk:setTab", { detail: "terbia" })
                        );
                      }}
                      className="flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all active:scale-95 border"
                      style={{
                        backgroundColor:
                          themeParams.secondary_bg_color ||
                          (isDarkMode ? "#374151" : "#f3f4f6"),
                        color:
                          themeParams.text_color ||
                          (isDarkMode ? "#ffffff" : "#111827"),
                        borderColor:
                          themeParams.section_separator_color ||
                          (isDarkMode ? "#4b5563" : "#d1d5db"),
                      }}
                    >
                      View Progress
                    </button>
                    <button
                      onClick={openTerbiaInApp}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all active:scale-95 shadow-sm border"
                      style={{
                        backgroundColor:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#f97316",
                        color:
                          themeParams.button_text_color ||
                          (isDarkMode ? "#ffffff" : "#ffffff"),
                        borderColor:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#f97316",
                      }}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Open Terbia</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* No Terbia progress yet - Just show the button */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{
                          backgroundColor:
                            themeParams.button_color ||
                            themeParams.accent_text_color ||
                            "rgba(249, 115, 22, 0.15)",
                          color:
                            themeParams.button_color ||
                            themeParams.accent_text_color ||
                            "#f97316",
                        }}
                      >
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3
                          className="font-bold text-base"
                          style={{
                            color:
                              themeParams.text_color ||
                              (isDarkMode ? "#ffffff" : "#111827"),
                          }}
                        >
                          Terbia Learning System
                        </h3>
                        <p
                          className="text-xs"
                          style={{
                            color:
                              themeParams.hint_color ||
                              themeParams.subtitle_text_color ||
                              (isDarkMode ? "#9ca3af" : "#6b7280"),
                          }}
                        >
                          Access your learning platform
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={openTerbiaInApp}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all active:scale-95 shadow-md border"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                      color:
                        themeParams.button_text_color ||
                        (isDarkMode ? "#ffffff" : "#ffffff"),
                      borderColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                    }}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Open Terbia Learning System</span>
                  </button>
                </>
              )}
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
              className="p-4 rounded-2xl shadow-sm border"
              style={{
                backgroundColor:
                  themeParams.section_bg_color ||
                  themeParams.secondary_bg_color ||
                  (isDarkMode ? "#1f2937" : "#ffffff"),
                borderColor:
                  themeParams.section_separator_color ||
                  (isDarkMode
                    ? "rgba(55, 65, 81, 0.3)"
                    : "rgba(229, 231, 235, 0.5)"),
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
                      className="flex items-center justify-between p-3 rounded-xl border shadow-sm"
                      style={{
                        backgroundColor:
                          themeParams.section_bg_color ||
                          themeParams.secondary_bg_color ||
                          (isDarkMode ? "#1f2937" : "#ffffff"),
                        borderColor:
                          themeParams.section_separator_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.3)"
                            : "rgba(229, 231, 235, 0.5)"),
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
                      className="flex items-center justify-between p-4 rounded-xl shadow-sm border"
                      style={{
                        backgroundColor:
                          themeParams.section_bg_color ||
                          themeParams.secondary_bg_color ||
                          (isDarkMode ? "#1f2937" : "#ffffff"),
                        borderColor:
                          themeParams.section_separator_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.3)"
                            : "rgba(229, 231, 235, 0.5)"),
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
        {currentTab === "terbia" && (
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
                  Terbia Learning
                </h3>
                {studentData.terbia && (
                  <button
                    onClick={() => toggleSection("terbia")}
                    className="p-1"
                  >
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
                )}
              </div>

              {studentData.terbia && expandedSections.terbia && (
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
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

                  {/* Open Terbia Button */}
                  <button
                    onClick={openTerbiaInApp}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold shadow-lg transition-all active:scale-95 border"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                      color:
                        themeParams.button_text_color ||
                        (isDarkMode ? "#ffffff" : "#ffffff"),
                      borderColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                    }}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Open Full Terbia System</span>
                  </button>
                </>
              )}

              {/* Show button even when no terbia data */}
              {!studentData.terbia && (
                <div className="text-center py-4">
                  <p
                    className="text-sm mb-4"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    Start your learning journey on the Terbia platform
                  </p>
                  <button
                    onClick={openTerbiaInApp}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold shadow-lg transition-all active:scale-95 border"
                    style={{
                      backgroundColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                      color:
                        themeParams.button_text_color ||
                        (isDarkMode ? "#ffffff" : "#ffffff"),
                      borderColor:
                        themeParams.button_color ||
                        themeParams.accent_text_color ||
                        "#f97316",
                    }}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Open Terbia Learning System</span>
                  </button>
                </div>
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
                  className="p-3 rounded-lg border shadow-sm"
                  style={{
                    backgroundColor:
                      themeParams.section_bg_color ||
                      themeParams.secondary_bg_color ||
                      (isDarkMode ? "#1f2937" : "#ffffff"),
                    borderColor:
                      themeParams.section_separator_color ||
                      (isDarkMode
                        ? "rgba(55, 65, 81, 0.3)"
                        : "rgba(34, 197, 94, 0.2)"),
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
                  className="p-3 rounded-lg border shadow-sm"
                  style={{
                    backgroundColor:
                      themeParams.section_bg_color ||
                      themeParams.secondary_bg_color ||
                      (isDarkMode ? "#1f2937" : "#ffffff"),
                    borderColor:
                      themeParams.section_separator_color ||
                      (isDarkMode
                        ? "rgba(55, 65, 81, 0.3)"
                        : "rgba(59, 130, 246, 0.2)"),
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
                  className="p-3 rounded-lg border shadow-sm"
                  style={{
                    backgroundColor:
                      themeParams.section_bg_color ||
                      themeParams.secondary_bg_color ||
                      (isDarkMode ? "#1f2937" : "#ffffff"),
                    borderColor:
                      themeParams.section_separator_color ||
                      (isDarkMode
                        ? "rgba(55, 65, 81, 0.3)"
                        : "rgba(168, 85, 247, 0.2)"),
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
                  className="p-3 rounded-lg border shadow-sm"
                  style={{
                    backgroundColor:
                      themeParams.section_bg_color ||
                      themeParams.secondary_bg_color ||
                      (isDarkMode ? "#1f2937" : "#ffffff"),
                    borderColor:
                      themeParams.section_separator_color ||
                      (isDarkMode
                        ? "rgba(55, 65, 81, 0.3)"
                        : "rgba(249, 115, 22, 0.2)"),
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
                      className="flex justify-between items-center p-4 rounded-xl shadow-sm border"
                      style={{
                        backgroundColor:
                          themeParams.section_bg_color ||
                          themeParams.secondary_bg_color ||
                          (isDarkMode ? "#1f2937" : "#ffffff"),
                        borderColor:
                          themeParams.section_separator_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.3)"
                            : "rgba(229, 231, 235, 0.5)"),
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
                    className="p-4 rounded-xl text-center border shadow-sm"
                    style={{
                      backgroundColor:
                        themeParams.section_bg_color ||
                        themeParams.secondary_bg_color ||
                        (isDarkMode ? "#1f2937" : "#ffffff"),
                      borderColor:
                        themeParams.section_separator_color ||
                        (isDarkMode
                          ? "rgba(55, 65, 81, 0.3)"
                          : "rgba(229, 231, 235, 0.5)"),
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
                      className="flex justify-between items-center p-4 rounded-xl shadow-sm border"
                      style={{
                        backgroundColor:
                          themeParams.section_bg_color ||
                          themeParams.secondary_bg_color ||
                          (isDarkMode ? "#1f2937" : "#ffffff"),
                        borderColor:
                          themeParams.section_separator_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.3)"
                            : "rgba(229, 231, 235, 0.5)"),
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
                    className="p-4 rounded-xl text-center border shadow-sm"
                    style={{
                      backgroundColor:
                        themeParams.section_bg_color ||
                        themeParams.secondary_bg_color ||
                        (isDarkMode ? "#1f2937" : "#ffffff"),
                      borderColor:
                        themeParams.section_separator_color ||
                        (isDarkMode
                          ? "rgba(55, 65, 81, 0.3)"
                          : "rgba(229, 231, 235, 0.5)"),
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
                      className="p-4 rounded-xl shadow-sm border"
                      style={{
                        backgroundColor:
                          themeParams.section_bg_color ||
                          themeParams.secondary_bg_color ||
                          (isDarkMode ? "#1f2937" : "#ffffff"),
                        borderColor:
                          themeParams.section_separator_color ||
                          (isDarkMode
                            ? "rgba(55, 65, 81, 0.3)"
                            : "rgba(229, 231, 235, 0.5)"),
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
                    className="p-4 rounded-xl text-center border shadow-sm"
                    style={{
                      backgroundColor:
                        themeParams.section_bg_color ||
                        themeParams.secondary_bg_color ||
                        (isDarkMode ? "#1f2937" : "#ffffff"),
                      borderColor:
                        themeParams.section_separator_color ||
                        (isDarkMode
                          ? "rgba(55, 65, 81, 0.3)"
                          : "rgba(229, 231, 235, 0.5)"),
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

      {/* Terbia Iframe Overlay */}
      {showTerbiaIframe && studentData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            backgroundColor:
              themeParams.bg_color || (isDarkMode ? "#111827" : "#ffffff"),
            paddingTop: `${safeAreaInset.top || 0}px`,
            paddingBottom: `${safeAreaInset.bottom || 0}px`,
            paddingLeft: `${safeAreaInset.left || 0}px`,
            paddingRight: `${safeAreaInset.right || 0}px`,
          }}
        >
          {/* Terbia Header */}
          <div
            className="flex items-center justify-between p-3 border-b backdrop-blur-lg"
            style={{
              backgroundColor:
                themeParams.header_bg_color ||
                (isDarkMode
                  ? "rgba(31, 41, 55, 0.95)"
                  : "rgba(255, 255, 255, 0.95)"),
              borderColor:
                themeParams.section_separator_color ||
                (isDarkMode
                  ? "rgba(55, 65, 81, 0.5)"
                  : "rgba(229, 231, 235, 0.5)"),
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={closeTerbiaIframe}
                className="p-1.5 rounded-lg active:scale-95 transition-transform"
                style={{
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#ffffff" : "#111827"),
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2
                  className="text-base font-bold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  Terbia Learning
                </h2>
                <p
                  className="text-[10px]"
                  style={{
                    color:
                      themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                  }}
                >
                  {studentData.student.name}
                </p>
              </div>
            </div>
            <button
              onClick={closeTerbiaIframe}
              className="p-1.5 rounded-lg transition-all active:scale-95"
              style={{
                backgroundColor:
                  themeParams.secondary_bg_color ||
                  (isDarkMode
                    ? "rgba(55, 65, 81, 0.6)"
                    : "rgba(243, 244, 246, 0.8)"),
                color:
                  themeParams.text_color ||
                  (isDarkMode ? "#ffffff" : "#374151"),
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Iframe Container */}
          <div className="flex-1 relative overflow-hidden">
            {/* Loading Indicator */}
            {terbiaLoading && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10"
                style={{
                  backgroundColor:
                    themeParams.bg_color ||
                    (isDarkMode ? "#111827" : "#f9fafb"),
                }}
              >
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-20"
                      style={{
                        backgroundColor:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#f97316",
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-full animate-spin border-4 border-transparent"
                      style={{
                        borderTopColor:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#f97316",
                        borderRightColor:
                          themeParams.button_color ||
                          themeParams.accent_text_color ||
                          "#f97316",
                      }}
                    />
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color:
                        themeParams.text_color ||
                        (isDarkMode ? "#ffffff" : "#111827"),
                    }}
                  >
                    Loading Terbia...
                  </p>
                </div>
              </div>
            )}

            <iframe
              src={`https://terbia.darelkubra.com/en/student/${studentData.student.wdt_ID}`}
              className="w-full h-full border-0"
              title="Terbia Learning System"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={() => setTerbiaLoading(false)}
            />
          </div>
        </motion.div>
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
        <div className="px-4 py-6">
          <div className="text-center mb-8">
            <Users
              className="w-16 h-16 mx-auto mb-4"
              style={{
                color:
                  themeParams.button_color ||
                  themeParams.accent_text_color ||
                  "#3b82f6",
              }}
            />
            <h1
              className="text-2xl font-bold mb-2"
              style={{
                color:
                  themeParams.text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
              }}
            >
              Select Your Account
            </h1>
            <p
              className="text-sm"
              style={{
                color:
                  themeParams.hint_color ||
                  themeParams.subtitle_text_color ||
                  (isDarkMode ? "#9ca3af" : "#6b7280"),
              }}
            >
              Choose the student account to view
            </p>
          </div>

          {/* Student Cards - Vertical list */}
          <div className="space-y-3 max-w-md mx-auto">
            {students.map((student, index) => (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl shadow-md border-2 transition-all active:scale-98 hover:shadow-lg"
                style={{
                  backgroundColor:
                    themeParams.section_bg_color ||
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#1f2937" : "#ffffff"),
                  borderColor: getAvatarBorderColor(index),
                }}
              >
                {/* Avatar */}
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg relative overflow-hidden"
                    style={{
                      backgroundColor: getAvatarColor(index),
                      border: `3px solid ${getAvatarBorderColor(index)}`,
                      color: getAvatarBorderColor(index),
                    }}
                  >
                    <span className="relative z-10">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, transparent 0%, ${getAvatarBorderColor(
                          index
                        )} 100%)`,
                      }}
                    />
                  </div>
                  {/* Active indicator for first student */}
                  {index === 0 && (
                    <div
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2"
                      style={{
                        backgroundColor: "#10b981",
                        borderColor:
                          themeParams.bg_color ||
                          (isDarkMode ? "#1f2937" : "#ffffff"),
                      }}
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Student Info */}
                <div className="flex-1 text-left min-w-0">
                  <h3
                    className="text-base font-bold mb-1 truncate"
                    style={{
                      color:
                        themeParams.text_color ||
                        (isDarkMode ? "#ffffff" : "#111827"),
                    }}
                  >
                    {student.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${getAvatarBorderColor(index)}20`,
                        color: getAvatarBorderColor(index),
                      }}
                    >
                      {student.package}
                    </div>
                  </div>
                  <p
                    className="text-xs flex items-center gap-1"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    <BookOpen className="w-3 h-3" />
                    {student.subject}
                  </p>
                  <p
                    className="text-xs flex items-center gap-1 mt-0.5"
                    style={{
                      color:
                        themeParams.hint_color ||
                        themeParams.subtitle_text_color ||
                        (isDarkMode ? "#9ca3af" : "#6b7280"),
                    }}
                  >
                    <User className="w-3 h-3" />
                    {student.teacher}
                  </p>
                </div>

                {/* Arrow indicator */}
                <ChevronRight
                  className="w-5 h-5 flex-shrink-0"
                  style={{
                    color:
                      themeParams.hint_color ||
                      (isDarkMode ? "#6b7280" : "#9ca3af"),
                  }}
                />
              </button>
            ))}
          </div>

          {/* Back button at bottom */}
          <div className="mt-8 text-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 shadow-md border"
              style={{
                backgroundColor:
                  themeParams.secondary_bg_color ||
                  (isDarkMode ? "#374151" : "#f3f4f6"),
                color:
                  themeParams.text_color ||
                  (isDarkMode ? "#ffffff" : "#111827"),
                borderColor:
                  themeParams.section_separator_color ||
                  (isDarkMode ? "#4b5563" : "#d1d5db"),
              }}
            >
              Go Back
            </button>
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
  const [selectedStudentId, setSelectedStudentId] = React.useState<
    number | null
  >(null);
  const [students, setStudents] = React.useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(true);

  React.useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(
          `/api/student/mini-app/${params.chatId}?list=true`
        );
        const data = await response.json();
        if (data.success) {
          setStudents(data.students || []);
          if (data.students && data.students.length === 1) {
            setSelectedStudentId(data.students[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, [params.chatId]);

  return (
    <I18nProvider>
      <StudentMiniAppInner
        params={params}
        selectedStudentId={selectedStudentId}
        onStudentSelected={setSelectedStudentId}
        students={students}
        loadingStudents={loadingStudents}
      />
    </I18nProvider>
  );
}
