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
  FiFilter,
  FiDownload,
  FiSearch,
  FiSettings,
} from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ControllerEarnings } from "@/lib/earningsCalculator";

interface EarningsConfig {
  mainBaseRate: number;
  referralBaseRate: number;
  leavePenaltyMultiplier: number;
  leaveThreshold: number;
  unpaidPenaltyMultiplier: number;
  referralBonusMultiplier: number;
  targetEarnings: number;
}

interface AdminEarningsData {
  earnings: ControllerEarnings[];
  summary: {
    totalControllers: number;
    totalEarnings: number;
    totalActiveStudents: number;
    totalPaidStudents: number;
    averageEarnings: number;
  };
  teamStats: any[];
}

export default function AdminControllerEarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [earningsData, setEarningsData] = useState<AdminEarningsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Earnings configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<EarningsConfig>({
    mainBaseRate: 40,
    referralBaseRate: 40,
    leavePenaltyMultiplier: 3,
    leaveThreshold: 5,
    unpaidPenaltyMultiplier: 2,
    referralBonusMultiplier: 4,
    targetEarnings: 3000,
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configHistory, setConfigHistory] = useState<any[]>([]);

  // Check authentication and role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Fetch earnings data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchEarnings();
      fetchEarningsConfig();
    }
  }, [status, session, selectedMonth]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/controller-earnings?month=${selectedMonth}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch earnings");
      }

      const data = await response.json();
      setEarningsData(data);
    } catch (error) {
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await fetch("/api/admin/controller-earnings-config");

      if (!response.ok) {
        throw new Error("Failed to fetch earnings configuration");
      }

      const data = await response.json();
      if (data.current) {
        setConfig(data.current);
      }
      setConfigHistory(data.history || []);
    } catch (error) {
      toast.error("Failed to load earnings configuration");
    } finally {
      setConfigLoading(false);
    }
  };

  const updateEarningsConfig = async (newConfig: EarningsConfig) => {
    try {
      setConfigLoading(true);
      const response = await fetch("/api/admin/controller-earnings-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error("Failed to update earnings configuration");
      }

      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      toast.success("Earnings configuration updated successfully!");

      // Refresh earnings data to reflect new rates
      await fetchEarnings();
    } catch (error) {
      toast.error("Failed to update earnings configuration");
    } finally {
      setConfigLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const filteredEarnings =
    earningsData?.earnings.filter((earning) => {
      const matchesSearch =
        earning.controllerName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (earning.teamName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesTeam =
        selectedTeam === "all" || earning.teamId.toString() === selectedTeam;
      return matchesSearch && matchesTeam;
    }) || [];

  const exportToCSV = () => {
    if (!earningsData) return;

    const headers = [
      "Controller Name",
      "Team Name",
      "Total Earnings",
      "Active Students",
      "Paid Students",
      "Growth Rate",
      "Achievement %",
    ];

    const rows = filteredEarnings.map((earning) => [
      earning.controllerName,
      earning.teamName,
      earning.totalEarnings,
      earning.activeStudents,
      earning.paidThisMonth,
      `${earning.growthRate.toFixed(1)}%`,
      `${earning.achievementPercentage.toFixed(1)}%`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `controller-earnings-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  if (!earningsData) {
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex flex-col gap-1 sm:gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Controller Earnings Analytics
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Overview of all controllers' earnings for{" "}
                {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
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
                Refresh
              </Button>
              <Button
                onClick={() => setShowConfig(!showConfig)}
                variant="outline"
                className="w-full sm:w-auto bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] px-3 sm:px-4"
              >
                <FiTarget className="mr-2 h-4 w-4" />
                Earnings Config
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="w-full sm:w-auto text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] px-3 sm:px-4"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Earnings Configuration Section */}
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <Card className="border-2 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <FiTarget className="mr-2" />
                  Earnings Configuration
                </CardTitle>
                <p className="text-yellow-700 text-sm">
                  Configure the rates and multipliers used for calculating
                  controller earnings
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Main Base Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Base Rate (ETB)
                    </label>
                    <Input
                      type="number"
                      value={config.mainBaseRate}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mainBaseRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="40"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Base rate for earnings, leave penalty, unpaid penalty
                    </p>
                  </div>

                  {/* Referral Base Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referral Base Rate (ETB)
                    </label>
                    <Input
                      type="number"
                      value={config.referralBaseRate}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          referralBaseRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="40"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Base rate for referral bonus (can be different from main
                      rate)
                    </p>
                  </div>

                  {/* Leave Penalty Multiplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Penalty Multiplier
                    </label>
                    <Input
                      type="number"
                      value={config.leavePenaltyMultiplier}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          leavePenaltyMultiplier:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Multiplier for leave penalty after threshold
                    </p>
                  </div>

                  {/* Leave Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Threshold
                    </label>
                    <Input
                      type="number"
                      value={config.leaveThreshold}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          leaveThreshold: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of leaves before penalty applies
                    </p>
                  </div>

                  {/* Unpaid Penalty Multiplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unpaid Penalty Multiplier
                    </label>
                    <Input
                      type="number"
                      value={config.unpaidPenaltyMultiplier}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          unpaidPenaltyMultiplier:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Multiplier for unpaid active students
                    </p>
                  </div>

                  {/* Referral Bonus Multiplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referral Bonus Multiplier
                    </label>
                    <Input
                      type="number"
                      value={config.referralBonusMultiplier}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          referralBonusMultiplier:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="4"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Multiplier for referral bonus
                    </p>
                  </div>

                  {/* Target Earnings */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Earnings (ETB)
                    </label>
                    <Input
                      type="number"
                      value={config.targetEarnings}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          targetEarnings: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full"
                      placeholder="3000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Monthly target earnings for achievement percentage
                      calculation
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <Button
                    onClick={() => setShowConfig(false)}
                    variant="outline"
                    disabled={configLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => updateEarningsConfig(config)}
                    disabled={configLoading}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {configLoading ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Summary Stats */}
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
                  {formatCurrency(earningsData.summary.totalEarnings)}
                </div>
                <div className="text-sm mt-2">
                  {earningsData.summary.totalControllers} controllers
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
                  {earningsData.summary.totalActiveStudents}
                </div>
                <div className="text-sm mt-2">Across all controllers</div>
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
                  <FiAward className="mr-2" />
                  Paid Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {earningsData.summary.totalPaidStudents}
                </div>
                <div className="text-sm mt-2">This month</div>
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
                  <FiTarget className="mr-2" />
                  Average Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(earningsData.summary.averageEarnings)}
                </div>
                <div className="text-sm mt-2">Per controller</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search controllers or teams..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiFilter className="text-gray-400" />
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="all">All Teams</option>
                    {earningsData.teamStats.map((team: any) => (
                      <option key={team.teamId} value={team.teamId}>
                        {team.teamName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiPieChart className="mr-2" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {earningsData.teamStats.map((team: any) => (
                  <div key={team.teamId} className="p-4 border rounded-lg">
                    <h3 className="font-semibold text-gray-900">
                      {team.teamName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Leader: {team.teamLeader}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Earnings:</span>
                        <span className="font-semibold">
                          {formatCurrency(team.totalEarnings)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Controllers:
                        </span>
                        <span className="font-semibold">
                          {team.controllers.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Students:</span>
                        <span className="font-semibold">
                          {team.totalActiveStudents}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controllers Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiActivity className="mr-2" />
                Controller Details ({filteredEarnings.length} controllers)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">
                        Controller
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Team
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Earnings
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Students
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Growth
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEarnings.map((earning, index) => (
                      <motion.tr
                        key={earning.controllerId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold">
                              {earning.controllerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {earning.controllerId}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{earning.teamName}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">
                            {formatCurrency(earning.totalEarnings)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatPercentage(earning.achievementPercentage)} of
                            target
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">
                            {earning.activeStudents}
                          </div>
                          <div className="text-sm text-gray-500">
                            {earning.activePayingStudents} paying,{" "}
                            {earning.paidThisMonth} paid
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {earning.growthRate >= 0 ? (
                              <FiTrendingUp className="text-green-500 mr-1" />
                            ) : (
                              <FiTrendingDown className="text-red-500 mr-1" />
                            )}
                            <span
                              className={
                                earning.growthRate >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {formatPercentage(Math.abs(earning.growthRate))}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                earning.achievementPercentage >= 80
                                  ? "bg-green-600"
                                  : earning.achievementPercentage >= 60
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                              }`}
                              style={{
                                width: `${Math.min(
                                  earning.achievementPercentage,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
