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
  Phone,
  LogOut,
  User,
  BookOpen,
  Activity,
  ChevronRight,
  Star,
  Award,
  Target,
  BarChart3,
  Eye,
  MessageCircle,
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
    recentActivity: Array<{
      sent_time: string;
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
      recentSessions: number;
      lastSession: string | null;
      totalTests: number;
      passedTests: number;
      averageScore: number;
    };
  };
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
      const response = await fetch(
        `/api/parent/child/${studentId}?parentPhone=${parentPhone}`
      );
      const data = await response.json();

      if (data.success) {
        setStudentData(data);
      } else {
        setError(data.message || "Failed to load student data");
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
        return <User className="w-4 h-4" />;
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
                  {/* Student Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-8"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-4 sm:space-x-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-900 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                          {studentData.student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                            {studentData.student.name}
                          </h2>
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <Badge
                              className={getStatusColor(
                                studentData.student.status
                              )}
                            >
                              {getStatusIcon(studentData.student.status)}
                              <span className="ml-1">
                                {studentData.student.status}
                              </span>
                            </Badge>
                            <span className="text-sm sm:text-base text-gray-600">
                              ID: {studentData.student.wdt_ID}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                          {studentData.student.attendance.percentage}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Attendance Rate
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Stats Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6"
                  >
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.attendance.presentDays}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Present Days
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.attendance.absentDays}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Absent Days
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.summary.totalZoomSessions}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Zoom Sessions
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.summary.recentSessions}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Recent Activity
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.summary.totalTests}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Total Tests
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <Award className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.summary.passedTests}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Passed Tests
                      </div>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      </div>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {studentData.student.summary.averageScore}%
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Avg Score
                      </div>
                    </div>
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

                  {/* Recent Activity */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gray-600" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      {studentData.student.recentActivity.length > 0 ? (
                        studentData.student.recentActivity.map(
                          (activity, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                  Zoom session with{" "}
                                  {activity.wpos_wpdatatable_24?.ustazname ||
                                    "Unknown Teacher"}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500">
                                  {formatDate(activity.sent_time)}
                                </div>
                              </div>
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            </motion.div>
                          )
                        )
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-gray-500">
                          <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm sm:text-base">
                            No recent activity
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Teacher Contact */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gray-600" />
                      Teacher Contact
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">
                            {studentData.student.teacher.ustazname}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            {studentData.student.teacher.phone ||
                              "Phone not available"}
                          </div>
                        </div>
                      </div>
                      {studentData.student.teacher.phone && (
                        <Button className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto">
                          <Phone className="w-4 h-4 mr-2" />
                          Call Teacher
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
