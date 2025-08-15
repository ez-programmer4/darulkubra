"use client";

import React, { useState, useEffect } from "react";
import { AttendanceAnalytics } from "./components/AttendanceAnalytics";
import { useSession } from "next-auth/react";
import {
  FiBarChart,
  FiUsers,
  FiTrendingUp,
  FiFilter,
  FiCalendar,
  FiTarget,
  FiActivity,
  FiClock,
} from "react-icons/fi";

interface Controller {
  code: string;
  name: string;
}

export default function AttendancePage() {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [selectedController, setSelectedController] = useState<string>("");
  const [latenessRecords, setLatenessRecords] = useState<any[]>([]);
  const [latenessLoading, setLatenessLoading] = useState(false);
  const [latenessError, setLatenessError] = useState<string | null>(null);
  const [teacherFilter, setTeacherFilter] = useState("");

  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const res = await fetch("/api/control-options", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch controllers");
        const controllerData = await res.json();
        setControllers(
          Array.isArray(controllerData.controllers)
            ? controllerData.controllers
            : []
        );
      } catch (err) {}
    };
    fetchControllers();
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchLatenessRecords();
    }
  }, [session]);

  async function fetchLatenessRecords() {
    setLatenessLoading(true);
    setLatenessError(null);
    try {
      const res = await fetch("/api/admin/lateness");
      if (!res.ok) throw new Error("Failed to fetch lateness records");
      const data = await res.json();
      setLatenessRecords(data.latenessData || []);
    } catch (e: any) {
      setLatenessError(e.message);
    } finally {
      setLatenessLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiBarChart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Attendance Analytics
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Analyze attendance trends and performance across the institution
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Controllers</span>
                </div>
                <div className="text-2xl font-bold text-black">{controllers.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiTrendingUp className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Trends</span>
                </div>
                <div className="text-2xl font-bold text-black">Live</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiActivity className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Records</span>
                </div>
                <div className="text-2xl font-bold text-black">{latenessRecords.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiClock className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Status</span>
                </div>
                <div className="text-2xl font-bold text-black">Active</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 sticky top-4 z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-6">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Filter by Controller
                </label>
                <select
                  value={selectedController}
                  onChange={(e) => setSelectedController(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="">All Controllers</option>
                  {Array.isArray(controllers) &&
                    controllers.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="lg:col-span-6">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiTarget className="inline h-4 w-4 mr-2" />
                  Analysis Scope
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <FiBarChart className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">
                        {selectedController ? "Controller Specific" : "Institution Wide"}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {selectedController 
                        ? "Analyzing selected controller data" 
                        : "Analyzing all controllers"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Component */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiTrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Analytics Dashboard</h2>
                <p className="text-gray-600">
                  {selectedController 
                    ? `Showing data for selected controller` 
                    : "Showing data for all controllers"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 lg:p-10">
            <AttendanceAnalytics controllerCode={selectedController} />
          </div>
        </div>

        {/* Lateness Records Section (Admin Only) */}
        {session?.user?.role === "admin" && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiClock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Lateness Records</h2>
                  <p className="text-gray-600">Track and monitor attendance punctuality</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 lg:p-10">
              {latenessLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading lateness records...</p>
                </div>
              ) : latenessError ? (
                <div className="text-center py-12">
                  <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
                    <FiClock className="h-16 w-16 text-red-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-black mb-4">Error Loading Records</h3>
                  <p className="text-red-600 text-xl">{latenessError}</p>
                </div>
              ) : latenessRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                    <FiClock className="h-16 w-16 text-gray-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-black mb-4">No Lateness Records</h3>
                  <p className="text-gray-600 text-xl">All attendance records are on time!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-black">
                      Recent Lateness Records ({latenessRecords.length})
                    </h3>
                    <input
                      type="text"
                      placeholder="Filter by teacher..."
                      value={teacherFilter}
                      onChange={(e) => setTeacherFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {latenessRecords
                      .filter(record => 
                        !teacherFilter || 
                        record.teacherName?.toLowerCase().includes(teacherFilter.toLowerCase())
                      )
                      .slice(0, 12)
                      .map((record, index) => (
                        <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <FiClock className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-black">
                                {record.teacherName || "Unknown Teacher"}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {record.date || "No date"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Status:</span>
                              <span className="font-medium text-red-600">Late</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Time:</span>
                              <span className="font-medium text-black">
                                {record.time || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {latenessRecords.length > 12 && (
                    <div className="text-center mt-6">
                      <p className="text-gray-600">
                        Showing 12 of {latenessRecords.length} records
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}