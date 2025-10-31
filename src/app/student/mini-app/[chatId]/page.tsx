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

// Telegram BottomButton interface
interface BottomButton {
  type: "main" | "secondary";
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  hasShineEffect: boolean;
  position?: "left" | "right" | "top" | "bottom";
  isProgressVisible: boolean;
  setText: (text: string) => BottomButton;
  onClick: (callback: () => void) => BottomButton;
  offClick: (callback: () => void) => BottomButton;
  show: () => BottomButton;
  hide: () => BottomButton;
  enable: () => BottomButton;
  disable: () => BottomButton;
  showProgress: (leaveActive?: boolean) => BottomButton;
  hideProgress: () => BottomButton;
  setParams: (params: {
    text?: string;
    color?: string;
    text_color?: string;
    has_shine_effect?: boolean;
    position?: "left" | "right" | "top" | "bottom";
    is_active?: boolean;
    is_visible?: boolean;
  }) => BottomButton;
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
  mainButton: BottomButton;
  secondaryButton?: BottomButton;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
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

  // Apply safe area insets to document root as CSS variables
  const applySafeAreaInsets = (inset: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }) => {
    const root = document.documentElement;
    root.style.setProperty("--tg-safe-area-inset-top", `${inset.top}px`);
    root.style.setProperty("--tg-safe-area-inset-bottom", `${inset.bottom}px`);
    root.style.setProperty("--tg-safe-area-inset-left", `${inset.left}px`);
    root.style.setProperty("--tg-safe-area-inset-right", `${inset.right}px`);
  };

  // Apply content safe area insets to document root as CSS variables
  const applyContentSafeAreaInsets = (inset: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }) => {
    const root = document.documentElement;
    root.style.setProperty(
      "--tg-content-safe-area-inset-top",
      `${inset.top}px`
    );
    root.style.setProperty(
      "--tg-content-safe-area-inset-bottom",
      `${inset.bottom}px`
    );
    root.style.setProperty(
      "--tg-content-safe-area-inset-left",
      `${inset.left}px`
    );
    root.style.setProperty(
      "--tg-content-safe-area-inset-right",
      `${inset.right}px`
    );
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
          applySafeAreaInsets(tg.safeAreaInset);
        }
        if (tg.contentSafeAreaInset) {
          setContentSafeAreaInset(tg.contentSafeAreaInset);
          applyContentSafeAreaInsets(tg.contentSafeAreaInset);
        }

        // Initialize theme params
        if (tg.themeParams) {
          setThemeParams(tg.themeParams);
          applyThemeToDocument(tg.themeParams);
        }

        // Initialize bottom buttons
        if (tg.mainButton) {
          // Set up main button with default configuration
          tg.mainButton.setText("Continue");

          // Set button colors from theme if available
          if (
            tg.themeParams?.button_color &&
            tg.themeParams?.button_text_color
          ) {
            tg.mainButton.setParams({
              color: tg.themeParams.button_color,
              text_color: tg.themeParams.button_text_color,
            });
          }

          // Set main button click handler
          tg.mainButton.onClick(() => {
            console.log("Main button clicked");
            // Add your main button action here
            // For example: handleSubmit(), navigate(), etc.
          });
        }

        if (tg.secondaryButton) {
          // Set up secondary button with default configuration
          tg.secondaryButton.setText("Cancel");

          // Set button colors from theme if available
          if (
            tg.themeParams?.bottom_bar_bg_color &&
            tg.themeParams?.button_color
          ) {
            tg.secondaryButton.setParams({
              color: tg.themeParams.bottom_bar_bg_color,
              text_color: tg.themeParams.button_color,
            });
          }

          // Set secondary button click handler
          tg.secondaryButton.onClick(() => {
            console.log("Secondary button clicked");
            // Add your secondary button action here
            // For example: handleCancel(), goBack(), etc.
          });
        }

        // Event handlers
        const handleActivated = () => setIsActive(true);
        const handleDeactivated = () => setIsActive(false);
        const handleSafeAreaChanged = () => {
          if (tg.safeAreaInset) {
            setSafeAreaInset(tg.safeAreaInset);
            applySafeAreaInsets(tg.safeAreaInset);
          }
        };
        const handleContentSafeAreaChanged = () => {
          if (tg.contentSafeAreaInset) {
            setContentSafeAreaInset(tg.contentSafeAreaInset);
            applyContentSafeAreaInsets(tg.contentSafeAreaInset);
          }
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

            // Update button colors to match new theme
            // Main button uses button_color and button_text_color by default
            if (
              tg.mainButton &&
              tg.themeParams.button_color &&
              tg.themeParams.button_text_color
            ) {
              tg.mainButton.setParams({
                color: tg.themeParams.button_color,
                text_color: tg.themeParams.button_text_color,
              });
            }

            // Secondary button uses bottom_bar_bg_color and button_color by default
            if (
              tg.secondaryButton &&
              tg.themeParams.bottom_bar_bg_color &&
              tg.themeParams.button_color
            ) {
              tg.secondaryButton.setParams({
                color: tg.themeParams.bottom_bar_bg_color,
                text_color: tg.themeParams.button_color,
              });
            }
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

  // Bottom Button helper functions
  const setMainButtonText = (text: string) => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.setText(text);
    }
  };

  const showMainButton = () => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.show();
    }
  };

  const hideMainButton = () => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.hide();
    }
  };

  const enableMainButton = () => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.enable();
    }
  };

  const disableMainButton = () => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.disable();
    }
  };

  const showMainButtonProgress = (leaveActive = false) => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.showProgress(leaveActive);
    }
  };

  const hideMainButtonProgress = () => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.hideProgress();
    }
  };

  const setMainButtonParams = (params: {
    text?: string;
    color?: string;
    text_color?: string;
    has_shine_effect?: boolean;
    is_active?: boolean;
    is_visible?: boolean;
  }) => {
    if (tgWebApp?.mainButton) {
      tgWebApp.mainButton.setParams(params);
    }
  };

  const setSecondaryButtonText = (text: string) => {
    if (tgWebApp?.secondaryButton) {
      tgWebApp.secondaryButton.setText(text);
    }
  };

  const showSecondaryButton = () => {
    if (tgWebApp?.secondaryButton) {
      tgWebApp.secondaryButton.show();
    }
  };

  const hideSecondaryButton = () => {
    if (tgWebApp?.secondaryButton) {
      tgWebApp.secondaryButton.hide();
    }
  };

  const setSecondaryButtonParams = (params: {
    text?: string;
    color?: string;
    text_color?: string;
    has_shine_effect?: boolean;
    position?: "left" | "right" | "top" | "bottom";
    is_active?: boolean;
    is_visible?: boolean;
  }) => {
    if (tgWebApp?.secondaryButton) {
      tgWebApp.secondaryButton.setParams(params);
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

  // Calculate header padding using safe area insets
  const headerPaddingTop =
    safeAreaInset.top > 0
      ? safeAreaInset.top + (tgWebApp?.isExpanded ? 12 : 48)
      : tgWebApp?.isExpanded
      ? 12
      : 48;

  return (
    <div
      className="min-h-screen transition-all duration-300 pb-20"
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
            <div className="flex items-center space-x-3">
              <button
                onClick={goBack}
                className="p-2 rounded-full transition-all duration-200"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#374151" : "#f3f4f6"),
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#ffffff" : "#374151"),
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1
                  className="text-lg font-semibold"
                  style={{
                    color:
                      themeParams.text_color ||
                      (isDarkMode ? "#ffffff" : "#111827"),
                  }}
                >
                  {t ? t("studentDashboard") : "Student Dashboard"}
                </h1>
                <p
                  className="text-xs"
                  style={{
                    color:
                      themeParams.hint_color ||
                      themeParams.subtitle_text_color ||
                      (isDarkMode ? "#9ca3af" : "#6b7280"),
                  }}
                >
                  {t ? t("overview") : "Overview"}
                </p>
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
                className="px-2 py-1 rounded text-xs border"
                style={{
                  borderColor:
                    themeParams.section_separator_color ||
                    (isDarkMode ? "#374151" : "#d1d5db"),
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#e5e7eb" : "#374151"),
                }}
              >
                {lang === "en" ? "AM" : "EN"}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-full transition-all duration-200 ${
                  refreshing ? "animate-spin" : ""
                }`}
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#374151" : "#f3f4f6"),
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#ffffff" : "#374151"),
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full transition-all duration-200"
                style={{
                  backgroundColor:
                    themeParams.secondary_bg_color ||
                    (isDarkMode ? "#374151" : "#f3f4f6"),
                  color:
                    themeParams.text_color ||
                    (isDarkMode ? "#ffffff" : "#374151"),
                }}
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
      <div
        className="px-4 py-4"
        style={{
          paddingBottom: `${contentSafeAreaInset.bottom || 0}px`,
        }}
      >
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
  const [safeAreaInset, setSafeAreaInset] = React.useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [themeParams, setThemeParams] = React.useState<ThemeParams>({});
  const navItems = [
    { id: "overview", label: t("overview"), icon: Home },
    { id: "terbia", label: t("terbia"), icon: BookMarked },
    { id: "attendance", label: t("attendance"), icon: Calendar },
    { id: "tests", label: t("tests"), icon: Award },
    { id: "payments", label: t("payments"), icon: CreditCard },
    { id: "schedule", label: t("schedule"), icon: Clock },
  ];

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
      console.error("Error setting up bottom nav safe area:", error);
    }
  }, []);

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

  // Calculate active button index for indicator animation
  const activeIndex = navItems.findIndex((item) => item.id === active);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        paddingBottom: `${safeAreaInset.bottom || 0}px`,
        paddingLeft: `${safeAreaInset.left || 0}px`,
        paddingRight: `${safeAreaInset.right || 0}px`,
      }}
    >
      {/* Background with blur effect */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{
          backgroundColor:
            themeParams.bottom_bar_bg_color ||
            themeParams.bg_color ||
            "rgba(255, 255, 255, 0.8)",
          borderTop: `1px solid ${
            themeParams.section_separator_color || "rgba(229, 231, 235, 0.5)"
          }`,
        }}
      />

      {/* Gradient overlay for modern look */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background:
            "linear-gradient(to top, rgba(59, 130, 246, 0.3), transparent)",
        }}
      />

      {/* Navigation container */}
      <div className="relative flex items-center justify-around px-2 py-3">
        {/* Active indicator background */}
        <motion.div
          className="absolute h-12 rounded-2xl"
          style={{
            backgroundColor:
              themeParams.button_color ||
              themeParams.accent_text_color ||
              "rgba(59, 130, 246, 0.1)",
            left: `${(100 / navItems.length) * activeIndex}%`,
            width: `${100 / navItems.length}%`,
          }}
          layoutId="activeTab"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const activeColor =
            themeParams.accent_text_color ||
            themeParams.link_color ||
            themeParams.button_color ||
            "#2563eb";
          const inactiveColor =
            themeParams.hint_color ||
            themeParams.subtitle_text_color ||
            "#6b7280";

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="relative flex flex-col items-center justify-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-200 flex-1 min-w-0"
              style={{
                color: isActive ? activeColor : inactiveColor,
              }}
            >
              {/* Icon container with animation */}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                className="relative"
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive ? "drop-shadow-sm" : ""
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Active dot indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: activeColor,
                    }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  fontSize: isActive ? "0.7rem" : "0.65rem",
                  fontWeight: isActive ? 600 : 500,
                }}
                className="text-center leading-tight truncate w-full"
              >
                {item.label}
              </motion.span>

              {/* Ripple effect on click */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    backgroundColor: activeColor,
                    opacity: 0.1,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
