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
} from "react-icons/fi";

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

export default function RegistrarEarningsPage() {
  const { data: session } = useSession();
  const [earnings, setEarnings] = useState<RegistrarEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/registrar-earnings?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch earnings');
      const data = await response.json();
      setEarnings(data.earnings || []);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [selectedMonth]);

  const totalReward = earnings.reduce((sum, item) => sum + item.reward, 0);
  const totalRegistrations = earnings.reduce((sum, item) => sum + item.totalReg, 0);
  const totalSuccess = earnings.reduce((sum, item) => sum + item.successReg, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <FiDollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Registrar Earnings</h1>
                <p className="text-gray-600 text-lg mt-2">Track registrar performance and rewards</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FiCalendar className="h-5 w-5 text-gray-500" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <button
                onClick={fetchEarnings}
                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FiBarChart className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-semibold">Total Rewards</p>
                <p className="text-3xl font-bold text-green-900">${totalReward}</p>
              </div>
              <FiDollarSign className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-semibold">Total Registrations</p>
                <p className="text-3xl font-bold text-blue-900">{totalRegistrations}</p>
              </div>
              <FiUsers className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-50 rounded-2xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-semibold">Success Rate</p>
                <p className="text-3xl font-bold text-purple-900">
                  {totalRegistrations > 0 ? Math.round((totalSuccess / totalRegistrations) * 100) : 0}%
                </p>
              </div>
              <FiTrendingUp className="h-12 w-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-50 rounded-2xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 font-semibold">Active Registrars</p>
                <p className="text-3xl font-bold text-orange-900">{earnings.length}</p>
              </div>
              <FiAward className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Registrar Performance</h2>
            <p className="text-gray-600 mt-1">Detailed breakdown of registrar earnings and performance</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Registrar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Total Reg
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Success Reg
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Reading ($50)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Hifz ($100)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Not Success
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Total Reward
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {earnings.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {item.registral.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{item.registral}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.level && (
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          item.level === 'Level 1' 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {item.level}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {item.totalReg}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {item.successReg}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {item.reading}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {item.hifz}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {item.notSuccess}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiDollarSign className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-lg font-bold text-green-600">{item.reward}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {earnings.length === 0 && (
            <div className="text-center py-12">
              <FiUsers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Data Available</h3>
              <p className="text-gray-500">No registrar earnings found for the selected month.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}