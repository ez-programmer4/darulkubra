"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiCalendar,
  FiTarget,
  FiAward,
  FiBarChart,
  FiPieChart,
  FiActivity,
  FiArrowLeft,
  FiStar,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiGift,
  FiRefreshCw,
} from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ControllerEarnings } from "@/lib/earningsCalculator";

export default function ControllerEarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [earnings, setEarnings] = useState<ControllerEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Check authentication and role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (
      status === "authenticated" &&
      session?.user?.role !== "controller"
    ) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Fetch earnings data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "controller") {
      fetchEarnings();
    }
  }, [status, session, selectedMonth]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/controller/earnings?month=${selectedMonth}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch earnings");
      }

      const data = await response.json();
     

      // Ensure we're setting the earnings object correctly
      if (data.earnings && typeof data.earnings === "object") {
        setEarnings(data.earnings);
      } else {
        console.warn("Invalid earnings data structure:", data.earnings);
        setEarnings(null);
      }
    } catch (error) {
      console.error("Fetch earnings error:", error);
      toast.error("Failed to load earnings data");
      setEarnings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/controller");
  };

  // Helper functions for motivational messages and insights
  const getMotivationalMessage = () => {
    if (!earnings) return "";

    if (earnings.achievementPercentage >= 120) {
      return "🎉 Outstanding performance! You're exceeding all expectations!";
    } else if (earnings.achievementPercentage >= 100) {
      return "🌟 Excellent work! You've hit your target!";
    } else if (earnings.achievementPercentage >= 80) {
      return "💪 Great progress! You're very close to your target!";
    } else if (earnings.achievementPercentage >= 60) {
      return "📈 Good effort! Keep pushing to reach your target!";
    } else {
      return "🚀 Keep going! Every step counts towards your goal!";
    }
  };

  const getPerformanceTips = () => {
    if (!earnings) return [];

    const tips: string[] = [];

    if (earnings.unpaidActiveThisMonth && earnings.unpaidActiveThisMonth > 0) {
      tips.push(
        "💡 Focus on getting unpaid students to pay to avoid penalties"
      );
    }

    if (
      earnings.leaveStudentsThisMonth &&
      earnings.leaveStudentsThisMonth > 5
    ) {
      tips.push("💡 Try to reduce student leaves to avoid penalty deductions");
    }

    if (earnings.referencedActiveStudents === 0) {
      tips.push("💡 Encourage referrals to earn bonus rewards");
    }

    if (earnings.activeStudents && earnings.activeStudents < 10) {
      tips.push("💡 Work on increasing your active student count");
    }

    if (earnings.growthRate && earnings.growthRate < 0) {
      tips.push("💡 Focus on improving this month's performance");
    }

    return tips;
  };

  const getAchievementBadges = () => {
    if (!earnings) return [];

    const badges: Array<{ name: string; icon: string; color: string }> = [];

    if (
      earnings.achievementPercentage &&
      earnings.achievementPercentage >= 100
    ) {
      badges.push({
        name: "Target Achiever",
        icon: "🎯",
        color: "bg-green-100 text-green-800",
      });
    }

    if (earnings.growthRate && earnings.growthRate > 0) {
      badges.push({
        name: "Growth Champion",
        icon: "📈",
        color: "bg-blue-100 text-blue-800",
      });
    }

    if (
      earnings.referencedActiveStudents &&
      earnings.referencedActiveStudents > 0
    ) {
      badges.push({
        name: "Referral Master",
        icon: "🎁",
        color: "bg-purple-100 text-purple-800",
      });
    }

    if (
      earnings.unpaidActiveThisMonth !== undefined &&
      earnings.unpaidActiveThisMonth === 0
    ) {
      badges.push({
        name: "Payment Perfect",
        icon: "✅",
        color: "bg-emerald-100 text-emerald-800",
      });
    }

    if (
      earnings.leaveStudentsThisMonth !== undefined &&
      earnings.leaveStudentsThisMonth === 0
    ) {
      badges.push({
        name: "Retention Expert",
        icon: "🤝",
        color: "bg-orange-100 text-orange-800",
      });
    }

    return badges;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">
            Loading earnings data...
          </p>
        </div>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <FiBarChart className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
            No Earnings Data
          </h2>
          <p className="text-sm sm:text-base text-gray-500">
            No earnings data found for the selected period.
          </p>
          <Button
            onClick={handleBackToDashboard}
            className="mt-4 w-full sm:w-auto"
            variant="outline"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const motivationalMessage = getMotivationalMessage();
  const performanceTips = getPerformanceTips() || [];
  const achievementBadges = getAchievementBadges() || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex flex-col gap-3 sm:gap-4">
                <Button
                  onClick={handleBackToDashboard}
                  variant="outline"
                  size="sm"
                  className="w-fit min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 text-sm sm:text-base"
                >
                  <FiArrowLeft className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    My Earningss Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                    Track your performance and earnings for{" "}
                    {new Date(selectedMonth + "-01").toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                      }
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
                />
                <Button
                  onClick={fetchEarnings}
                  variant="outline"
                  className="w-full sm:w-auto text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] px-3 sm:px-4"
                >
                  <FiRefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        {motivationalMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                  <FiStar className="text-yellow-500 text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-xs sm:text-sm font-semibold text-yellow-800 leading-relaxed">
                    {motivationalMessage}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Achievement Badges */}
        {achievementBadges && achievementBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <FiAward className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Your Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {achievementBadges.map((badge, index) => (
                    <Badge
                      key={index}
                      className={`${badge.color} text-xs sm:text-sm px-2 py-1 min-h-[24px] sm:min-h-[28px]`}
                    >
                      <span className="mr-1">{badge.icon}</span>
                      <span className="hidden sm:inline">{badge.name}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <FiDollarSign className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Total Earnings</span>
                  <span className="sm:hidden">Earnings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {formatCurrency(earnings.totalEarnings)}
                </div>
                <div className="flex items-center mt-2">
                  {earnings.growthRate >= 0 ? (
                    <FiTrendingUp className="text-green-300 mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <FiTrendingDown className="text-red-300 mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  <span className="text-xs sm:text-sm">
                    {earnings.growthRate >= 0 ? "+" : ""}
                    {formatPercentage(earnings.growthRate)} vs last month
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <FiUsers className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Active Students</span>
                  <span className="sm:hidden">Students</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {earnings.activeStudents}
                </div>
                <div className="text-xs sm:text-sm mt-2">
                  {earnings.activePayingStudents} paying,{" "}
                  {earnings.linkedStudents} linked
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <FiTarget className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Target Progress</span>
                  <span className="sm:hidden">Target</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {formatPercentage(earnings.achievementPercentage)}
                </div>
                <div className="text-xs sm:text-sm mt-2">
                  {formatCurrency(earnings.totalEarnings)} /{" "}
                  {formatCurrency(earnings.targetEarnings)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm sm:text-base">
                  <FiAward className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {earnings.paidThisMonth}
                </div>
                <div className="text-xs sm:text-sm mt-2">
                  Paid students this month
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Earnings Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <FiPieChart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Earnings Breakdown
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                  How your earnings are calculated
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-1 pr-0 sm:pr-2">
                    <span className="text-sm sm:text-base text-gray-600">
                      Base Earnings
                    </span>
                    <p className="text-xs text-gray-500">
                      {earnings.activeStudents} active students × base rate
                    </p>
                  </div>
                  <span className="font-semibold text-sm sm:text-base flex-shrink-0">
                    {formatCurrency(earnings.baseEarnings)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-1 pr-0 sm:pr-2">
                    <span className="text-sm sm:text-base text-gray-600">
                      Referenced Bonus
                    </span>
                    <p className="text-xs text-gray-500">
                      {earnings.referencedActiveStudents} referrals × bonus rate
                    </p>
                  </div>
                  <span className="font-semibold text-green-600 text-sm sm:text-base flex-shrink-0">
                    +{formatCurrency(earnings.referencedBonus)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-1 pr-0 sm:pr-2">
                    <span className="text-sm sm:text-base text-gray-600">
                      Leave Penalty
                    </span>
                    <p className="text-xs text-gray-500">
                      {earnings.leaveStudentsThisMonth} leaves (after threshold)
                    </p>
                  </div>
                  <span className="font-semibold text-red-600 text-sm sm:text-base flex-shrink-0">
                    -{formatCurrency(earnings.leavePenalty)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-1 pr-0 sm:pr-2">
                    <span className="text-sm sm:text-base text-gray-600">
                      Unpaid Penalty
                    </span>
                    <p className="text-xs text-gray-500">
                      {earnings.unpaidActiveThisMonth} unpaid paying students
                    </p>
                  </div>
                  <span className="font-semibold text-red-600 text-sm sm:text-base flex-shrink-0">
                    -{formatCurrency(earnings.unpaidPenalty)}
                  </span>
                </div>
                <hr className="my-2 sm:my-3" />
                <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                  <span>Total Earnings</span>
                  <span>{formatCurrency(earnings.totalEarnings)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Student Statistics */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <FiActivity className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Student Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="text-lg sm:text-xl font-bold text-green-600">
                      {earnings.activeStudents}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Total Active
                    </div>
                    <div className="text-xs text-gray-500">
                      ({earnings.activePayingStudents} paying)
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
                    <div className="text-lg sm:text-xl font-bold text-yellow-600">
                      {earnings.notYetStudents}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Not Yet
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                    <div className="text-lg sm:text-xl font-bold text-red-600">
                      {earnings.leaveStudentsThisMonth}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Leave (This Month)
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg sm:text-xl font-bold text-blue-600">
                      {earnings.ramadanLeaveStudents}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Ramadan Leave
                    </div>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-medium">
                      Payment Status
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500">
                      {earnings.paidThisMonth}/{earnings.activePayingStudents}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (earnings.paidThisMonth /
                            Math.max(earnings.activePayingStudents, 1)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance Tips */}
        {performanceTips && performanceTips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-6 sm:mb-8"
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center text-base sm:text-lg text-blue-800">
                  <FiInfo className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Performance Tips
                </CardTitle>
                <p className="text-xs sm:text-sm text-blue-700">
                  Suggestions to improve your earnings
                </p>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                {performanceTips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 sm:space-x-3"
                  >
                    <FiInfo className="text-blue-500 mt-0.5 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-blue-800">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Historical Data */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <FiCalendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Historical Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(earnings.previousMonthEarnings)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Previous Month
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(earnings.yearToDateEarnings)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Year to Date
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatPercentage(earnings.growthRate)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Growth Rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How Earnings Work */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-6 sm:mb-8"
        >
          <Card className="border-gray-200">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <FiInfo className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                How Your Earnings Are Calculated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">
                    💰 Base Earnings
                  </h4>
                  <p className="text-xs sm:text-sm">
                    You earn a base amount for each active student under your
                    control (including 0 fee students).
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">
                    🎁 Referral Bonus
                  </h4>
                  <p className="text-xs sm:text-sm">
                    Earn extra for students you refer who are active and paid.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">
                    ⚠️ Leave Penalty
                  </h4>
                  <p className="text-xs sm:text-sm">
                    Penalty for students who leave (after a certain threshold).
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">
                    ❌ Unpaid Penalty
                  </h4>
                  <p className="text-xs sm:text-sm">
                    Penalty for active paying students who haven't paid this
                    month (0 fee students are never considered unpaid).
                  </p>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-xs sm:text-sm text-gray-900">
                  💡 Pro Tip:
                </p>
                <p className="text-xs sm:text-sm">
                  Focus on keeping students active, ensuring payments, and
                  encouraging referrals to maximize your earnings!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
