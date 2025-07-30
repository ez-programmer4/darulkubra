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
      setEarnings(data.earnings);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/controller");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiBarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No Earnings Data
          </h2>
          <p className="text-gray-500">
            No earnings data found for the selected period.
          </p>
          <Button
            onClick={handleBackToDashboard}
            className="mt-4"
            variant="outline"
          >
            <FiArrowLeft className="mr-2" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBackToDashboard}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <FiArrowLeft className="mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  My Earnings Dashboard
                </h1>
                <p className="text-gray-600 mt-2">
                  Track your performance and earnings for{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <Button onClick={fetchEarnings} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <FiDollarSign className="mr-2" />
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(earnings.totalEarnings)}
                </div>
                <div className="flex items-center mt-2">
                  {earnings.growthRate >= 0 ? (
                    <FiTrendingUp className="text-green-300 mr-1" />
                  ) : (
                    <FiTrendingDown className="text-red-300 mr-1" />
                  )}
                  <span className="text-sm">
                    {earnings.growthRate >= 0 ? "+" : ""}
                    {formatPercentage(earnings.growthRate)} vs last month
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <FiUsers className="mr-2" />
                  Active Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {earnings.activeStudents}
                </div>
                <div className="text-sm mt-2">
                  {earnings.linkedStudents} linked to chat
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <FiTarget className="mr-2" />
                  Target Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPercentage(earnings.achievementPercentage)}
                </div>
                <div className="text-sm mt-2">
                  {formatCurrency(earnings.totalEarnings)} /{" "}
                  {formatCurrency(earnings.targetEarnings)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <FiAward className="mr-2" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {earnings.paidThisMonth}
                </div>
                <div className="text-sm mt-2">Paid students this month</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Earnings Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FiPieChart className="mr-2" />
                  Earnings Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base Earnings</span>
                  <span className="font-semibold">
                    {formatCurrency(earnings.baseEarnings)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Referenced Bonus</span>
                  <span className="font-semibold text-green-600">
                    +{formatCurrency(earnings.referencedBonus)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Leave Penalty</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(earnings.leavePenalty)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unpaid Penalty</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(earnings.unpaidPenalty)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Earnings</span>
                  <span>{formatCurrency(earnings.totalEarnings)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Student Statistics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FiActivity className="mr-2" />
                  Student Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {earnings.activeStudents}
                    </div>
                    <div className="text-sm text-gray-600">Active</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {earnings.notYetStudents}
                    </div>
                    <div className="text-sm text-gray-600">Not Yet</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {earnings.leaveStudentsThisMonth}
                    </div>
                    <div className="text-sm text-gray-600">
                      Leave (This Month)
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {earnings.ramadanLeaveStudents}
                    </div>
                    <div className="text-sm text-gray-600">Ramadan Leave</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Payment Status</span>
                    <span className="text-sm text-gray-500">
                      {earnings.paidThisMonth}/{earnings.activeStudents}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (earnings.paidThisMonth /
                            Math.max(earnings.activeStudents, 1)) *
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

        {/* Historical Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiCalendar className="mr-2" />
                Historical Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(earnings.previousMonthEarnings)}
                  </div>
                  <div className="text-sm text-gray-600">Previous Month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(earnings.yearToDateEarnings)}
                  </div>
                  <div className="text-sm text-gray-600">Year to Date</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPercentage(earnings.growthRate)}
                  </div>
                  <div className="text-sm text-gray-600">Growth Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
