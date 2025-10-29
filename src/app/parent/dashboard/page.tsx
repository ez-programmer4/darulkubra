"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  LogOut,
  BookOpen,
  ChevronRight,
  Star,
  Award,
  Target,
  BarChart3,
  Eye,
  Settings,
  Home,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  Zap,
  Heart,
  Sparkles,
  FileText,
  Trophy,
  Brain,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sun,
  Moon,
  Activity,
  BookMarked,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Child {
  wdt_ID: number;
  name: string;
  package: string;
  status: string;
  ustaz: string;
  daypackages: string;
  registrationdate: string;
  teacher: {
    ustazname: string;
    phone: string;
  };
}

interface TerbiaProgress {
  hasProgress: boolean;
  message?: string;
  studentName?: string;
  activePackage?: string;
  activePackageId?: string;
  progress?: string;
  overallProgress?: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    notStartedCourses: number;
    overallPercent: number;
  };
  packageDetails?: Array<{
    id: string;
    title: string;
    totalChapters: number;
    completedChapters: number;
    inProgressChapters: number;
    notStartedChapters: number;
    progressPercent: number;
    status: string;
  }>;
}

interface StudentData {
  student: {
    wdt_ID: number;
    name: string;
    package: string;
    status: string;
    ustaz: string;
    daypackages: string;
    registrationdate: string;
    classfee: number;
    teacher: {
      ustazname: string;
      phone: string;
    };
    attendance: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      percentage: number;
      recentRecords: Array<{
        id: number;
        date: string;
        status: string;
        surah: string | null;
        pages_read: number | null;
        level: string | null;
        lesson: string | null;
        notes: string | null;
      }>;
    };
    zoomSessions: Array<{
      sent_time: string;
      link: string;
      ustazid: string;
      wpos_wpdatatable_24: {
        ustazname: string;
      };
    }>;
    testResults: Array<{
      testId: string;
      testName: string;
      appointmentDate: string | null;
      totalQuestions: number;
      correctAnswers: number;
      score: number;
      passed: boolean;
      passingResult: number;
      lastSubject: string;
    }>;
    summary: {
      totalZoomSessions: number;
      lastSession: string | null;
      totalTests: number;
      passedTests: number;
      averageScore: number;
    };
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
  };
  terbiaProgress?: TerbiaProgress;
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"children" | "details">("children");
  const [currentTab, setCurrentTab] = useState("overview");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    attendance: true,
    tests: true,
    terbia: true,
    payments: true,
  });
  const router = useRouter();

  useEffect(() => {
    // Load children from localStorage
    const parentPhone = localStorage.getItem("parentPhone");
    const parentChildren = localStorage.getItem("parentChildren");

    if (!parentPhone || !parentChildren) {
      router.push("/parent/login");
      return;
    }

    const childrenData = JSON.parse(parentChildren);
    setChildren(childrenData);

    if (childrenData.length > 0) {
      setSelectedChildId(childrenData[0].wdt_ID.toString());
    }
  }, [router]);

  useEffect(() => {
    if (selectedChildId) {
      loadStudentData(selectedChildId);
    }
  }, [selectedChildId]);

  const loadStudentData = async (studentId: string) => {
    setLoading(true);
    setError("");

    try {
      const parentPhone = localStorage.getItem("parentPhone");

      // Fetch both student data and Terbia progress in parallel
      const [studentResponse, terbiaResponse] = await Promise.all([
        fetch(`/api/parent/child/${studentId}?parentPhone=${parentPhone}`),
        fetch(
          `/api/parent/terbia-progress/${studentId}?parentPhone=${parentPhone}`
        ),
      ]);

      const studentData = await studentResponse.json();
      const terbiaData = await terbiaResponse.json();

      if (studentData.success) {
        // Combine student data with Terbia progress
        const combinedData = {
          ...studentData,
          terbiaProgress: terbiaData.success ? terbiaData.terbiaProgress : null,
        };
        setStudentData(combinedData);
      } else {
        setError(studentData.message || "Failed to load student data");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    setView("details");
  };

  const handleBackToChildren = () => {
    setView("children");
  };

  const handleLogout = () => {
    localStorage.removeItem("parentPhone");
    localStorage.removeItem("parentChildren");
    router.push("/parent/login");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "not yet":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "leave":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "not yet":
        return <AlertCircle className="w-4 h-4" />;
      case "completed":
        return <Award className="w-4 h-4" />;
      case "leave":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  if (loading && !studentData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">
            Loading your children's data...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {view === "details" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToChildren}
                  className="text-gray-600 hover:text-gray-900 p-2"
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    Parent Portal
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {view === "children"
                      ? "Select your child"
                      : "Academic Progress"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3">
              {view === "details" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="text-gray-600 hover:text-gray-900 p-2"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="hidden sm:flex">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="sm:hidden p-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <AnimatePresence mode="wait">
          {view === "children" ? (
            <motion.div
              key="children"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Children Selection */}
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Your Children
                </h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Select a child to view their academic progress
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {children.map((child, index) => (
                  <motion.div
                    key={child.wdt_ID}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChildSelect(child.wdt_ID.toString())}
                    className="group cursor-pointer"
                  >
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                      {/* Avatar */}
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl font-bold mr-3 sm:mr-4">
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors truncate">
                            {child.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`${getStatusColor(child.status)} text-xs`}>
                              {getStatusIcon(child.status)}
                              <span className="ml-1">{child.status}</span>
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                      </div>

                      {/* Details */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">
                            Package:
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">
                            {child.package}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">
                            Teacher:
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">
                            {child.teacher.ustazname}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">
                            Registered:
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-900">
                            {formatDate(child.registrationdate)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 sm:mt-6">
                        <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2 px-4 rounded-xl text-center font-medium group-hover:from-blue-700 group-hover:to-indigo-800 transition-all duration-300 text-sm">
                          View Progress
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              {studentData && (
                <div className="space-y-6">
                  {/* Student Profile Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-3xl shadow-xl border p-4 sm:p-6 overflow-hidden ${
                      isDarkMode 
                        ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700" 
                        : "bg-gradient-to-br from-blue-50 to-indigo-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg">
                          {studentData.student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                          {studentData.student.name}
                        </h2>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          <Badge
                            className={`${getStatusColor(
                              studentData.student.status
                            )} px-2 py-1 text-xs font-medium`}
                          >
                            {getStatusIcon(studentData.student.status)}
                            <span className="ml-1">
                              {studentData.student.status}
                            </span>
                          </Badge>
                          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                            <span className="font-medium">ID:</span>
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                              {studentData.student.wdt_ID}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-3 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{studentData.student.package}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{studentData.student.daypackages}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Tab Navigation */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`rounded-2xl p-1 ${
                      isDarkMode ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    <div className="flex space-x-1 overflow-x-auto scrollbar-thin">
                      {[
                        { id: "overview", label: "Overview", icon: BarChart3 },
                        { id: "attendance", label: "Attendance", icon: Calendar },
                        { id: "tests", label: "Tests", icon: Trophy },
                        { id: "terbia", label: "Terbia", icon: Brain },
                        { id: "payments", label: "Payments", icon: CreditCard },
                        { id: "schedule", label: "Schedule", icon: Clock },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setCurrentTab(tab.id)}
                          className={`flex-shrink-0 flex items-center justify-center space-x-1 py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-fit ${
                            currentTab === tab.id
                              ? isDarkMode
                                ? "bg-gray-700 text-white shadow-lg"
                                : "bg-white text-gray-900 shadow-sm"
                              : isDarkMode
                              ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                          }`}
                        >
                          <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Tab Content */}
                  <div className="space-y-4">
                    {/* Overview Tab */}
                    {currentTab === "overview" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Quick Stats Cards */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                            </div>
                            <div
                              className={`text-2xl font-bold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {studentData.student.attendance.percentage}%
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
                            </div>
                            <div
                              className={`text-2xl font-bold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {studentData.student.summary.totalZoomSessions}
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
                            </div>
                            <div
                              className={`text-2xl font-bold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {studentData.student.summary.totalTests}
                            </div>
                            <div
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Total Tests
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
                            </div>
                            <div
                              className={`text-2xl font-bold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {studentData.terbiaProgress?.overallProgress?.overallPercent || 0}%
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
                                {studentData.student.attendance.presentDays}
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
                                {studentData.student.attendance.absentDays}
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
                                {studentData.student.attendance.totalDays}
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
                              {studentData.student.attendance.recentRecords.slice(0, 5).map((record, index) => (
                                <div
                                  key={record.id}
                                  className={`flex items-center justify-between p-3 rounded-xl ${
                                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        record.status?.toLowerCase() === "present" ||
                                        record.status?.toLowerCase() === "attended"
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
                                        {formatDate(record.date)}
                                      </span>
                                      <div
                                        className={`text-xs ${
                                          isDarkMode ? "text-gray-400" : "text-gray-500"
                                        }`}
                                      >
                                        {new Date(record.date).toLocaleDateString("en-US", {
                                          weekday: "long",
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                                      record.status?.toLowerCase() === "present" ||
                                      record.status?.toLowerCase() === "attended"
                                        ? isDarkMode
                                          ? "bg-green-900/30 text-green-300"
                                          : "bg-green-100 text-green-700"
                                        : isDarkMode
                                        ? "bg-red-900/30 text-red-300"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {record.status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Tests Tab */}
                    {currentTab === "tests" && studentData.student.testResults.length > 0 && (
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
                              {studentData.student.testResults.map((test, index) => (
                                <div
                                  key={test.testId}
                                  className={`flex items-center justify-between p-3 rounded-xl ${
                                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
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
                                        {formatDate(test.appointmentDate || test.testId)}
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
                    {currentTab === "terbia" && studentData.terbiaProgress && (
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

                          {expandedSections.terbia && studentData.terbiaProgress.hasProgress && (
                            <>
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className={`font-medium ${
                                      isDarkMode ? "text-white" : "text-gray-900"
                                    }`}
                                  >
                                    {studentData.terbiaProgress.activePackage}
                                  </span>
                                  <div
                                    className={`px-3 py-1 rounded-full ${
                                      isDarkMode
                                        ? "bg-orange-600 text-white"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    <span className="text-sm font-bold">
                                      {studentData.terbiaProgress.overallProgress?.overallPercent || 0}%
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
                                      width: `${studentData.terbiaProgress.overallProgress?.overallPercent || 0}%`,
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
                                    {studentData.terbiaProgress.overallProgress?.completedCourses || 0}
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
                                    {studentData.terbiaProgress.overallProgress?.totalCourses || 0}
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      isDarkMode ? "text-gray-400" : "text-gray-500"
                                    }`}
                                  >
                                    Total Courses
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
                            Payment Summary
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
                                Total Deposits
                              </p>
                              <p
                                className={`text-lg font-bold ${
                                  isDarkMode ? "text-white" : "text-green-700"
                                }`}
                              >
                                ETB {studentData.student.payments?.summary?.totalDeposits || 0}
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
                                Monthly Payments
                              </p>
                              <p
                                className={`text-lg font-bold ${
                                  isDarkMode ? "text-white" : "text-blue-700"
                                }`}
                              >
                                ETB {studentData.student.payments?.summary?.totalMonthlyPayments || 0}
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
                                Remaining Balance
                              </p>
                              <p
                                className={`text-lg font-bold ${
                                  isDarkMode ? "text-white" : "text-purple-700"
                                }`}
                              >
                                ETB {studentData.student.payments?.summary?.remainingBalance || 0}
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
                                Paid Months
                              </p>
                              <p
                                className={`text-lg font-bold ${
                                  isDarkMode ? "text-white" : "text-orange-700"
                                }`}
                              >
                                {studentData.student.payments?.summary?.paidMonths || 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Recent Deposits */}
                        {studentData.student.payments?.deposits && studentData.student.payments.deposits.length > 0 && (
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
                              Recent Deposits
                            </h3>
                            <div className="space-y-2">
                              {studentData.student.payments.deposits
                                .slice(0, 5)
                                .map((deposit, index) => (
                                  <div
                                    key={index}
                                    className={`flex justify-between items-center p-3 rounded-lg ${
                                      isDarkMode ? "bg-gray-700" : "bg-gray-50"
                                    }`}
                                  >
                                    <div>
                                      <p
                                        className={`text-sm font-medium ${
                                          isDarkMode ? "text-white" : "text-gray-900"
                                        }`}
                                      >
                                        ETB {deposit.amount}
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
                            </div>
                          </div>
                        )}

                        {/* Monthly Payments */}
                        {studentData.student.payments?.monthlyPayments && studentData.student.payments.monthlyPayments.length > 0 && (
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
                              Monthly Payments
                            </h3>
                            <div className="space-y-2">
                              {studentData.student.payments.monthlyPayments
                                .slice(0, 6)
                                .map((payment, index) => (
                                  <div
                                    key={index}
                                    className={`flex justify-between items-center p-3 rounded-lg ${
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
                                        {payment.type} - ETB {payment.amount}
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
                                          Free Month
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
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
                            Scheduled Times
                          </h3>
                          <div className="space-y-2">
                            {studentData.student.occupiedTimes && studentData.student.occupiedTimes.length > 0 ? (
                              studentData.student.occupiedTimes
                                .slice(0, 10)
                                .map((time, index) => (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg ${
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
                                            Until {time.endAt}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <div className="text-center py-6 text-gray-500">
                                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No scheduled times found</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}