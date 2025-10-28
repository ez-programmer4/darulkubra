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
        className="bg-white shadow-lg border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {view === "details" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToChildren}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Parent Portal
                  </h1>
                  <p className="text-sm text-gray-500">
                    {view === "children"
                      ? "Select your child"
                      : "Academic Progress"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Your Children
                </h2>
                <p className="text-gray-600">
                  Select a child to view their academic progress
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                      {/* Avatar */}
                      <div className="flex items-center mb-4">
                        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-xl font-bold mr-4">
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                            {child.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getStatusColor(child.status)}>
                              {getStatusIcon(child.status)}
                              <span className="ml-1">{child.status}</span>
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Package:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {child.package}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Teacher:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {child.teacher.ustazname}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Registered:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(child.registrationdate)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-6">
                        <div className="w-full bg-gray-900 text-white py-2 px-4 rounded-xl text-center font-medium group-hover:bg-gray-800 transition-all duration-300">
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
                <div className="space-y-8">
                  {/* Enhanced Student Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8 overflow-hidden"
                  >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full translate-y-12 -translate-x-12 opacity-50"></div>

                    <div className="relative">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
                        <div className="flex items-center space-x-4 sm:space-x-6">
                          <div className="relative">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
                              {studentData.student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                              {studentData.student.name}
                            </h2>
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                              <Badge
                                className={`${getStatusColor(
                                  studentData.student.status
                                )} px-3 py-1 text-sm font-medium`}
                              >
                                {getStatusIcon(studentData.student.status)}
                                <span className="ml-2">
                                  {studentData.student.status}
                                </span>
                              </Badge>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span className="font-medium">ID:</span>
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                  {studentData.student.wdt_ID}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <BookOpen className="w-4 h-4" />
                                <span>{studentData.student.package}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{studentData.student.daypackages}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Attendance Rate Card */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 text-center border border-green-200 shadow-lg">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                            {studentData.student.attendance.percentage}%
                          </div>
                          <div className="text-sm font-medium text-gray-600 mb-2">
                            Attendance Rate
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                              style={{
                                width: `${studentData.student.attendance.percentage}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Enhanced Stats Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6"
                  >
                    {/* Present Days Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="group relative bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg border border-green-200 p-6 text-center overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-green-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {studentData.student.attendance.presentDays}
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          Present Days
                        </div>
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          Attendance
                        </div>
                      </div>
                    </motion.div>

                    {/* Absent Days Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="group relative bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl shadow-lg border border-red-200 p-6 text-center overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <XCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {studentData.student.attendance.absentDays}
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          Absent Days
                        </div>
                        <div className="mt-2 text-xs text-red-600 font-medium">
                          Missed
                        </div>
                      </div>
                    </motion.div>

                    {/* Zoom Sessions Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="group relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg border border-blue-200 p-6 text-center overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {studentData.student.summary.totalZoomSessions}
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          Zoom Sessions
                        </div>
                        <div className="mt-2 text-xs text-blue-600 font-medium">
                          Online Learning
                        </div>
                      </div>
                    </motion.div>

                    {/* Total Tests Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="group relative bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl shadow-lg border border-purple-200 p-6 text-center overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {studentData.student.summary.totalTests}
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          Total Tests
                        </div>
                        <div className="mt-2 text-xs text-purple-600 font-medium">
                          Assessments
                        </div>
                      </div>
                    </motion.div>

                    {/* Passed Tests Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="group relative bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl shadow-lg border border-emerald-200 p-6 text-center overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {studentData.student.summary.passedTests}
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          Passed Tests
                        </div>
                        <div className="mt-2 text-xs text-emerald-600 font-medium">
                          Success
                        </div>
                      </div>
                    </motion.div>

                    {/* Average Score Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="group relative bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl shadow-lg border border-orange-200 p-6 text-center overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-orange-200 rounded-full -translate-y-8 translate-x-8 opacity-30"></div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {studentData.student.summary.averageScore}%
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          Avg Score
                        </div>
                        <div className="mt-2 text-xs text-orange-600 font-medium">
                          Performance
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Detailed Attendance Records */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gray-600" />
                      Recent Attendance & Progress
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {studentData.student.attendance.recentRecords.length >
                      0 ? (
                        studentData.student.attendance.recentRecords.map(
                          (record, index) => (
                            <motion.div
                              key={record.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      record.status?.toLowerCase() ===
                                        "present" ||
                                      record.status?.toLowerCase() ===
                                        "attended"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                                  ></div>
                                  <span className="text-sm sm:text-base font-medium text-gray-900">
                                    {formatDate(record.date)}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs sm:text-sm px-2 py-1 rounded-full ${
                                    record.status?.toLowerCase() ===
                                      "present" ||
                                    record.status?.toLowerCase() === "attended"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </div>

                              {(record.surah ||
                                record.lesson ||
                                record.level) && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                                  {record.surah && (
                                    <div>
                                      <span className="text-gray-500">
                                        Surah:
                                      </span>
                                      <span className="ml-1 font-medium text-gray-900">
                                        {record.surah}
                                      </span>
                                    </div>
                                  )}
                                  {record.lesson && (
                                    <div>
                                      <span className="text-gray-500">
                                        Lesson:
                                      </span>
                                      <span className="ml-1 font-medium text-gray-900">
                                        {record.lesson}
                                      </span>
                                    </div>
                                  )}
                                  {record.level && (
                                    <div>
                                      <span className="text-gray-500">
                                        Level:
                                      </span>
                                      <span className="ml-1 font-medium text-gray-900">
                                        {record.level}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {record.pages_read && (
                                <div className="mt-2 text-xs sm:text-sm">
                                  <span className="text-gray-500">
                                    Pages Read:
                                  </span>
                                  <span className="ml-1 font-medium text-gray-900">
                                    {record.pages_read}
                                  </span>
                                </div>
                              )}

                              {record.notes && (
                                <div className="mt-2 text-xs sm:text-sm">
                                  <span className="text-gray-500">Notes:</span>
                                  <span className="ml-1 text-gray-900">
                                    {record.notes}
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )
                        )
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-gray-500">
                          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm sm:text-base">
                            No attendance records found
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Test Results */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gray-600" />
                      Test Results
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {studentData.student.testResults.length > 0 ? (
                        studentData.student.testResults.map((test, index) => (
                          <motion.div
                            key={test.testId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                                  {test.testName}
                                </h4>
                                {test.appointmentDate && (
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    Test Date:{" "}
                                    {formatDate(test.appointmentDate)}
                                  </p>
                                )}
                                {test.lastSubject && (
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    Subject: {test.lastSubject}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div
                                  className={`text-lg sm:text-xl font-bold ${
                                    test.passed
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {test.score}%
                                </div>
                                <div
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    test.passed
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {test.passed ? "Passed" : "Failed"}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                              <div className="text-center">
                                <div className="text-gray-500">Questions</div>
                                <div className="font-medium text-gray-900">
                                  {test.totalQuestions}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">Correct</div>
                                <div className="font-medium text-gray-900">
                                  {test.correctAnswers}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">Passing</div>
                                <div className="font-medium text-gray-900">
                                  {test.passingResult}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500">Score</div>
                                <div
                                  className={`font-medium ${
                                    test.passed
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {test.score}%
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-gray-500">
                          <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm sm:text-base">
                            No test results found
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Terbia Progress */}
                  {studentData.terbiaProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6"
                    >
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gray-600" />
                        Terbia Learning Progress
                      </h3>

                      {studentData.terbiaProgress.hasProgress ? (
                        <div className="space-y-6">
                          {/* Overall Progress */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {studentData.terbiaProgress.activePackage}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Overall Progress
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                                  {
                                    studentData.terbiaProgress.overallProgress
                                      ?.overallPercent
                                  }
                                  %
                                </div>
                                <div className="text-xs text-gray-600">
                                  Complete
                                </div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                                style={{
                                  width: `${
                                    studentData.terbiaProgress.overallProgress
                                      ?.overallPercent || 0
                                  }%`,
                                }}
                              ></div>
                            </div>

                            {/* Progress Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="text-lg font-bold text-green-600">
                                  {studentData.terbiaProgress.overallProgress
                                    ?.completedCourses || 0}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Completed
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-yellow-600">
                                  {studentData.terbiaProgress.overallProgress
                                    ?.inProgressCourses || 0}
                                </div>
                                <div className="text-xs text-gray-600">
                                  In Progress
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-gray-600">
                                  {studentData.terbiaProgress.overallProgress
                                    ?.notStartedCourses || 0}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Not Started
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-blue-600">
                                  {studentData.terbiaProgress.overallProgress
                                    ?.totalCourses || 0}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Total Courses
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Current Status */}
                          <div className="bg-gray-50 rounded-xl p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">
                              Current Status
                            </h5>
                            <p className="text-sm text-gray-700">
                              {studentData.terbiaProgress.progress}
                            </p>
                          </div>

                          {/* Course Details */}
                          {studentData.terbiaProgress.packageDetails &&
                            studentData.terbiaProgress.packageDetails.length >
                              0 && (
                              <div>
                                <h5 className="font-semibold text-gray-900 mb-4">
                                  Course Progress
                                </h5>
                                <div className="space-y-3">
                                  {studentData.terbiaProgress.packageDetails.map(
                                    (course, index) => (
                                      <motion.div
                                        key={course.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <h6 className="font-medium text-gray-900 text-sm sm:text-base">
                                            {course.title}
                                          </h6>
                                          <div className="flex items-center space-x-2">
                                            <span
                                              className={`text-xs px-2 py-1 rounded-full ${
                                                course.status === "completed"
                                                  ? "bg-green-100 text-green-800"
                                                  : course.status ===
                                                    "inprogress"
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : "bg-gray-100 text-gray-800"
                                              }`}
                                            >
                                              {course.status === "completed"
                                                ? "Completed"
                                                : course.status === "inprogress"
                                                ? "In Progress"
                                                : "Not Started"}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-700">
                                              {course.progressPercent}%
                                            </span>
                                          </div>
                                        </div>

                                        {/* Course Progress Bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                          <div
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                              course.status === "completed"
                                                ? "bg-green-500"
                                                : course.status === "inprogress"
                                                ? "bg-yellow-500"
                                                : "bg-gray-300"
                                            }`}
                                            style={{
                                              width: `${course.progressPercent}%`,
                                            }}
                                          ></div>
                                        </div>

                                        {/* Chapter Stats */}
                                        <div className="grid grid-cols-3 gap-4 text-center text-xs">
                                          <div>
                                            <div className="font-semibold text-green-600">
                                              {course.completedChapters}
                                            </div>
                                            <div className="text-gray-600">
                                              Completed
                                            </div>
                                          </div>
                                          <div>
                                            <div className="font-semibold text-yellow-600">
                                              {course.inProgressChapters}
                                            </div>
                                            <div className="text-gray-600">
                                              In Progress
                                            </div>
                                          </div>
                                          <div>
                                            <div className="font-semibold text-gray-600">
                                              {course.notStartedChapters}
                                            </div>
                                            <div className="text-gray-600">
                                              Not Started
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-600">
                            {studentData.terbiaProgress.message ||
                              "No Terbia progress available"}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
