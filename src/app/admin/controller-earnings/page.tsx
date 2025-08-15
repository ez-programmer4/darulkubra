"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiTarget,
  FiAward,
  FiBarChart,
  FiActivity,
  FiDownload,
  FiSearch,
  FiSettings,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiInfo,
} from "react-icons/fi";
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
  const [earningsData, setEarningsData] = useState<AdminEarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchEarnings();
      fetchEarningsConfig();
    }
  }, [status, session, selectedMonth]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/controller-earnings?month=${selectedMonth}`);
      if (!response.ok) throw new Error("Failed to fetch earnings");
      const data = await response.json();
      setEarningsData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await fetch("/api/admin/controller-earnings-config");
      if (!response.ok) throw new Error("Failed to fetch earnings configuration");
      const data = await response.json();
      if (data.current) {
        setConfig(data.current);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load earnings configuration",
        variant: "destructive",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const updateEarningsConfig = async (newConfig: EarningsConfig) => {
    try {
      setConfigLoading(true);
      const response = await fetch("/api/admin/controller-earnings-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) throw new Error("Failed to update earnings configuration");
      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      toast({
        title: "Success",
        description: "Earnings configuration updated successfully!",
      });
      await fetchEarnings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update earnings configuration",
        variant: "destructive",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ETB`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const filteredEarnings = earningsData?.earnings.filter((earning) => {
    const matchesSearch = earning.controllerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (earning.teamName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeam === "all" || earning.teamId.toString() === selectedTeam;
    return matchesSearch && matchesTeam;
  }) || [];

  const exportToCSV = () => {
    if (!earningsData) return;
    const headers = ["Controller Name", "Team Name", "Total Earnings", "Active Students", "Paid Students", "Growth Rate", "Achievement %"];
    const rows = filteredEarnings.map((earning) => [
      earning.controllerName,
      earning.teamName,
      earning.totalEarnings,
      earning.activeStudents,
      earning.paidThisMonth,
      `${earning.growthRate.toFixed(1)}%`,
      `${earning.achievementPercentage.toFixed(1)}%`,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
          <p className="text-black font-medium text-lg">Loading earnings data...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  if (!earningsData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
            <FiBarChart className="h-16 w-16 text-gray-500" />
          </div>
          <h3 className="text-3xl font-bold text-black mb-4">No Earnings Data</h3>
          <p className="text-gray-600 text-xl">No earnings data found for the selected period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiDollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Controller Earnings
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Analytics and management for {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiDollarSign className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Total Earnings</span>
                </div>
                <div className="text-2xl font-bold text-black">{formatCurrency(earningsData.summary.totalEarnings)}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Controllers</span>
                </div>
                <div className="text-2xl font-bold text-black">{earningsData.summary.totalControllers}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiActivity className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Active Students</span>
                </div>
                <div className="text-2xl font-bold text-black">{earningsData.summary.totalActiveStudents}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiTarget className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Average</span>
                </div>
                <div className="text-2xl font-bold text-black">{formatCurrency(earningsData.summary.averageEarnings)}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiTarget className="inline h-4 w-4 mr-2" />
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Controllers
                </label>
                <input
                  type="text"
                  placeholder="Search controllers or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiUsers className="inline h-4 w-4 mr-2" />
                  Filter by Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="all">All Teams</option>
                  {earningsData.teamStats.map((team: any) => (
                    <option key={team.teamId} value={team.teamId}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiSettings className="h-4 w-4" />
                    Config
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiDownload className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Configuration */}
        {showConfig && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-black rounded-xl">
                <FiSettings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Earnings Configuration</h2>
                <p className="text-gray-600">Configure rates and multipliers for calculating controller earnings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-black mb-3">Main Base Rate (ETB)</label>
                <input
                  type="number"
                  value={config.mainBaseRate}
                  onChange={(e) => setConfig({ ...config, mainBaseRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="40"
                />
                <p className="text-xs text-gray-500 mt-1">Base rate for earnings, leave penalty, unpaid penalty</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3">Referral Base Rate (ETB)</label>
                <input
                  type="number"
                  value={config.referralBaseRate}
                  onChange={(e) => setConfig({ ...config, referralBaseRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="40"
                />
                <p className="text-xs text-gray-500 mt-1">Base rate for referral bonus</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3">Leave Penalty Multiplier</label>
                <input
                  type="number"
                  value={config.leavePenaltyMultiplier}
                  onChange={(e) => setConfig({ ...config, leavePenaltyMultiplier: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="3"
                />
                <p className="text-xs text-gray-500 mt-1">Multiplier for leave penalty after threshold</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3">Leave Threshold</label>
                <input
                  type="number"
                  value={config.leaveThreshold}
                  onChange={(e) => setConfig({ ...config, leaveThreshold: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="5"
                />
                <p className="text-xs text-gray-500 mt-1">Number of leaves before penalty applies</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3">Unpaid Penalty Multiplier</label>
                <input
                  type="number"
                  value={config.unpaidPenaltyMultiplier}
                  onChange={(e) => setConfig({ ...config, unpaidPenaltyMultiplier: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="2"
                />
                <p className="text-xs text-gray-500 mt-1">Multiplier for unpaid active students</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-3">Referral Bonus Multiplier</label>
                <input
                  type="number"
                  value={config.referralBonusMultiplier}
                  onChange={(e) => setConfig({ ...config, referralBonusMultiplier: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="4"
                />
                <p className="text-xs text-gray-500 mt-1">Multiplier for referral bonus</p>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">Target Earnings (ETB)</label>
                <input
                  type="number"
                  value={config.targetEarnings}
                  onChange={(e) => setConfig({ ...config, targetEarnings: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  placeholder="3000"
                />
                <p className="text-xs text-gray-500 mt-1">Monthly target earnings for achievement percentage calculation</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfig(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                disabled={configLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => updateEarningsConfig(config)}
                className={`bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 ${
                  configLoading ? "opacity-75" : ""
                }`}
                disabled={configLoading}
              >
                {configLoading ? <FiLoader className="animate-spin h-4 w-4" /> : <FiCheckCircle className="h-4 w-4" />}
                Save Configuration
              </button>
            </div>
          </div>
        )}

        {/* Team Performance */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Team Performance</h2>
                <p className="text-gray-600">Overview of team earnings and statistics</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {earningsData.teamStats.map((team: any) => (
                <div key={team.teamId} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-black mb-2">{team.teamName}</h3>
                  <p className="text-gray-600 mb-4">Leader: {team.teamLeader}</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Earnings:</span>
                      <span className="font-bold text-black">{formatCurrency(team.totalEarnings)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Controllers:</span>
                      <span className="font-bold text-black">{team.controllers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Students:</span>
                      <span className="font-bold text-black">{team.totalActiveStudents}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controllers Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiActivity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Controller Details</h2>
                <p className="text-gray-600">{filteredEarnings.length} controllers found</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {filteredEarnings.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiUsers className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Controllers Found</h3>
                <p className="text-gray-600 text-xl">No controllers match your current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Controller</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Team</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Earnings</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Students</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Growth</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredEarnings.map((earning, index) => (
                      <tr
                        key={earning.controllerId}
                        className={`hover:bg-gray-50 transition-all duration-200 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-black">{earning.controllerName}</div>
                            <div className="text-sm text-gray-500">{earning.controllerId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-semibold text-xs">
                            {earning.teamName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-black">{formatCurrency(earning.totalEarnings)}</div>
                          <div className="text-sm text-gray-500">
                            {formatPercentage(earning.achievementPercentage)} of target
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-black">{earning.activeStudents}</div>
                          <div className="text-sm text-gray-500">{earning.paidThisMonth} paid</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {earning.growthRate >= 0 ? (
                              <FiTrendingUp className="text-green-500 h-4 w-4" />
                            ) : (
                              <FiTrendingDown className="text-red-500 h-4 w-4" />
                            )}
                            <span className={earning.growthRate >= 0 ? "text-green-600" : "text-red-600"}>
                              {formatPercentage(Math.abs(earning.growthRate))}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
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
                                width: `${Math.min(earning.achievementPercentage, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatPercentage(earning.achievementPercentage)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}