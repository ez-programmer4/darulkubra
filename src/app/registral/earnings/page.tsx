"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiCalendar,
  FiAward,
  FiBarChart,
  FiTarget,
  FiStar,
  FiTrendingDown,
  FiActivity,
  FiInfo,
} from "react-icons/fi";
import { motion } from "framer-motion";

interface RegistrarEarning {
  registral: string;
  totalReg: number;
  successReg: number;
  reading: number;
  hifz: number;
  notSuccess: number;
  reward: number;
  level: string | null;
}

export default function RegistralEarningsPage() {
  const { data: session } = useSession();
  const [earnings, setEarnings] = useState<RegistrarEarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/registral/earnings?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch earnings');
      const data = await response.json();
      setEarnings(data.earnings || null);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl border border-emerald-200 p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5"></div>
          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl">
                <FiDollarSign className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  My Earnings Dashboard
                </h1>
                <p className="text-gray-600 text-lg mt-2">Track your performance and rewards</p>
                <p className="text-emerald-600 font-semibold mt-1">Welcome, {session?.user?.name}!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white rounded-2xl p-3 shadow-lg border border-emerald-200">
                <FiCalendar className="h-5 w-5 text-emerald-500" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border-0 focus:ring-0 text-gray-700 font-medium bg-transparent"
                />
              </div>
              <button
                onClick={fetchEarnings}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FiBarChart className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {earnings ? (
          <>
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <FiDollarSign className="h-12 w-12 text-emerald-100" />
                    <span className="text-emerald-100 text-sm font-semibold px-3 py-1 bg-white/20 rounded-full">
                      Total Reward
                    </span>
                  </div>
                  <div className="text-4xl font-bold mb-2">${earnings.reward}</div>
                  <div className="text-emerald-100">Your monthly earnings</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <FiUsers className="h-12 w-12 text-blue-100" />
                    <span className="text-blue-100 text-sm font-semibold px-3 py-1 bg-white/20 rounded-full">
                      Registrations
                    </span>
                  </div>
                  <div className="text-4xl font-bold mb-2">{earnings.totalReg}</div>
                  <div className="text-blue-100">Total this month</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <FiTrendingUp className="h-12 w-12 text-purple-100" />
                    <span className="text-purple-100 text-sm font-semibold px-3 py-1 bg-white/20 rounded-full">
                      Success Rate
                    </span>
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {earnings.totalReg > 0 ? Math.round((earnings.successReg / earnings.totalReg) * 100) : 0}%
                  </div>
                  <div className="text-purple-100">Conversion rate</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <FiAward className="h-12 w-12 text-orange-100" />
                    <span className="text-orange-100 text-sm font-semibold px-3 py-1 bg-white/20 rounded-full">
                      Level
                    </span>
                  </div>
                  <div className="text-2xl font-bold mb-2">{earnings.level || "Standard"}</div>
                  <div className="text-orange-100">Your current level</div>
                </div>
              </motion.div>
            </div>

            {/* Detailed Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Performance Breakdown</h2>
                <p className="text-gray-600">Detailed analysis of your monthly performance</p>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Success Registrations */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiTarget className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-2">{earnings.successReg}</div>
                    <div className="text-gray-600 font-medium">Success Registrations</div>
                    <div className="text-sm text-gray-500 mt-1">Students who started & paid</div>
                  </div>

                  {/* Reading Students */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiActivity className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{earnings.reading}</div>
                    <div className="text-gray-600 font-medium">Reading Students</div>
                    <div className="text-sm text-gray-500 mt-1">Nethor & Qaidah ($50 each)</div>
                  </div>

                  {/* Hifz Students */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiStar className="h-10 w-10 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">{earnings.hifz}</div>
                    <div className="text-gray-600 font-medium">Hifz Students</div>
                    <div className="text-sm text-gray-500 mt-1">Memorization ($100 each)</div>
                  </div>

                  {/* Not Success */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiTrendingDown className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold text-red-600 mb-2">{earnings.notSuccess}</div>
                    <div className="text-gray-600 font-medium">Not Success</div>
                    <div className="text-sm text-gray-500 mt-1">Students who didn't continue</div>
                  </div>

                  {/* Reward Calculation */}
                  <div className="md:col-span-2 lg:col-span-2">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                      <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <FiDollarSign className="h-6 w-6" />
                        Reward Calculation
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Reading Students ({earnings.reading} × $50)</span>
                          <span className="font-bold text-emerald-600">${earnings.reading * 50}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Hifz Students ({earnings.hifz} × $100)</span>
                          <span className="font-bold text-emerald-600">${earnings.hifz * 100}</span>
                        </div>
                        <div className="border-t border-emerald-200 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-emerald-800">Total Reward</span>
                            <span className="text-2xl font-bold text-emerald-600">${earnings.reward}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-12 text-center"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiUsers className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">No Earnings Data</h3>
            <p className="text-gray-500 text-lg">No earnings found for the selected month.</p>
            <p className="text-gray-400 mt-2">Try selecting a different month or start registering students!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}