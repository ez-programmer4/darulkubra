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
  FiSettings,
  FiX,
  FiSave,
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

interface Settings {
  reading_reward: number;
  hifz_reward: number;
}

export default function RegistrarEarningsPage() {
  const { data: session } = useSession();
  const [earnings, setEarnings] = useState<RegistrarEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({ reading_reward: 50, hifz_reward: 100 });
  const [tempSettings, setTempSettings] = useState<Settings>({ reading_reward: 50, hifz_reward: 100 });
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
      console.log('API Response:', data); // Debug log
      setEarnings(data.earnings || []);
      if (data.settings) {
        setSettings(data.settings);
        setTempSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setEarnings([]); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempSettings)
      });
      if (response.ok) {
        setSettings(tempSettings);
        setShowSettings(false);
        fetchEarnings(); // Refresh data with new settings
      }
    } catch (error) {
      console.error('Error saving settings:', error);
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
                onClick={() => setShowSettings(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiSettings className="h-4 w-4" />
                Settings
              </button>
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

        {/* Debug Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
          <p className="text-yellow-700 text-sm">Selected Month: {selectedMonth}</p>
          <p className="text-yellow-700 text-sm">Earnings Count: {earnings.length}</p>
          <p className="text-yellow-700 text-sm">Total Registrations: {totalRegistrations}</p>
          <p className="text-yellow-700 text-sm">Total Success: {totalSuccess}</p>
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
                    Reading (${settings.reading_reward})
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Hifz (${settings.hifz_reward})
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

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <FiSettings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Registrar Earnings Configuration</h3>
                      <p className="text-green-100 mt-1">Configure reward amounts for different subjects</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Reading Reward */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <FiDollarSign className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Reading Subjects</h4>
                        <p className="text-sm text-gray-500">Nethor & Qaidah rewards</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Reward Amount per Student
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input
                          type="number"
                          value={tempSettings.reading_reward}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, reading_reward: Number(e.target.value) }))}
                          className="w-full pl-8 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                          min="0"
                          step="1"
                          placeholder="50"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Amount earned per successful reading student registration</p>
                    </div>
                  </div>

                  {/* Hifz Reward */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <FiAward className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Hifz Subject</h4>
                        <p className="text-sm text-gray-500">Memorization rewards</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Reward Amount per Student
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input
                          type="number"
                          value={tempSettings.hifz_reward}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, hifz_reward: Number(e.target.value) }))}
                          className="w-full pl-8 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-lg font-semibold"
                          min="0"
                          step="1"
                          placeholder="100"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Amount earned per successful Hifz student registration</p>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiBarChart className="h-5 w-5 text-gray-600" />
                    Earnings Preview
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">1 Reading Student</div>
                      <div className="text-2xl font-bold text-blue-600">${tempSettings.reading_reward}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">1 Hifz Student</div>
                      <div className="text-2xl font-bold text-purple-600">${tempSettings.hifz_reward}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Mixed (2R + 1H)</div>
                      <div className="text-2xl font-bold text-green-600">${(tempSettings.reading_reward * 2) + tempSettings.hifz_reward}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Changes will apply to all future earnings calculations
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSettings(false)}
                      className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveSettings}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 font-medium shadow-lg"
                    >
                      <FiSave size={18} />
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}