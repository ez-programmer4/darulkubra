"use client";
import React, { useEffect, useState } from "react";
import {
  FiCheck,
  FiLoader,
  FiAlertTriangle,
  FiInfo,
  FiAward,
  FiChevronLeft,
  FiChevronRight,
  FiGift,
  FiX,
  FiClock,
  FiSearch,
  FiUsers,
  FiTarget,
} from "react-icons/fi";
import { startOfWeek, format, addWeeks } from "date-fns";
import { toast } from "@/components/ui/use-toast";

const apiUrl = "/api/admin/quality-review";
const qualityLevels = ["Bad", "Good", "Better", "Excellent", "Exceptional"];

export default function AdminQualityReviewPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [bonus, setBonus] = useState<{ [teacherId: string]: number }>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [managerOverrides, setManagerOverrides] = useState<{ [teacherId: string]: string }>({});
  const [managerNotes, setManagerNotes] = useState<{ [teacherId: string]: string }>({});
  const [bonusHistory, setBonusHistory] = useState<any[]>([]);
  const [showBonusHistory, setShowBonusHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const weekStartStr = weekStart.toISOString().split("T")[0] + "T00:00:00.000Z";
      const res = await fetch(`${apiUrl}?weekStart=${weekStartStr}`);
      if (!res.ok) throw new Error("Failed to fetch quality review data");
      const data = await res.json();
      setTeachers(data);
      const overrides: { [teacherId: string]: string } = {};
      const notes: { [teacherId: string]: string } = {};
      data.forEach((t: any) => {
        overrides[t.teacherId] = t.managerOverride ?? t.overallQuality;
        notes[t.teacherId] = t.overrideNotes || "";
      });
      setManagerOverrides(overrides);
      setManagerNotes(notes);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
      toast({
        title: "Error",
        description: e.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchBonusHistory(teacherId: string) {
    setBonusHistory([]);
    setShowBonusHistory(true);
    try {
      const res = await fetch(`/api/admin/bonus-history?teacherId=${teacherId}`);
      if (!res.ok) throw new Error("Failed to fetch bonus history");
      const data = await res.json();
      setBonusHistory(data.bonuses || []);
    } catch (e: any) {
      setBonusHistory([]);
      toast({
        title: "Error",
        description: e.message || "Failed to load bonus history",
        variant: "destructive",
      });
    }
  }

  async function handleApprove(teacherId: string) {
    setApproving(teacherId);
    setSuccess(null);
    setError(null);
    try {
      const weekStartStr = weekStart.toISOString().split("T")[0] + "T00:00:00.000Z";
      const requestBody = {
        override: managerOverrides[teacherId],
        notes: managerNotes[teacherId],
        bonus: managerOverrides[teacherId] === "Exceptional" ? (bonus[teacherId] || 0) : 0,
      };

      const res = await fetch(`${apiUrl}?teacherId=${teacherId}&weekStart=${weekStartStr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error("Failed to approve/override");
      setSuccess("Saved successfully!");
      toast({ title: "Success", description: "Saved and notified!" });
      await fetchData();
    } catch (e: any) {
      setError(e.message || "Failed to save");
      toast({
        title: "Error",
        description: e.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  }

  function changeWeek(offset: number) {
    setWeekStart((prev) => addWeeks(prev, offset));
  }

  const badTeachers = teachers.filter((t) => t.overallQuality === "Bad");
  const filteredTeachers = teachers
    .filter((t) => t.overallQuality !== "Bad")
    .filter((t) => 
      searchQuery === "" || 
      (t.teacherName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teacherId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
        <p className="text-black font-medium text-lg">Loading quality review data...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
          <FiAlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        <h3 className="text-3xl font-bold text-black mb-4">Error Loading Data</h3>
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col items-start gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiTarget className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Quality Review Dashboard
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Weekly performance review for {format(weekStart, "MMMM dd, yyyy")}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full mt-2">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Teachers</span>
                </div>
                <div className="text-2xl font-bold text-black">{teachers.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiAward className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Exceptional</span>
                </div>
                <div className="text-2xl font-bold text-black">{teachers.filter(t => t.overallQuality === 'Exceptional').length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiGift className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Bonuses</span>
                </div>
                <div className="text-2xl font-bold text-black">{teachers.filter(t => t.bonusAwarded > 0).length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiAlertTriangle className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Need Review</span>
                </div>
                <div className="text-2xl font-bold text-black">{badTeachers.length}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Teachers
                </label>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-5">
                <div className="flex gap-2">
                  <button
                    onClick={() => changeWeek(-1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                    Previous Week
                  </button>
                  <button
                    onClick={() => changeWeek(1)}
                    disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 1 })}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Next Week
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="text-sm text-gray-600 text-center">
                  Showing {paginatedTeachers.length} of {filteredTeachers.length} teachers
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <FiCheck className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
        )}

        {/* Teachers Requiring Review */}
        {badTeachers.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-xl">
                <FiAlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Teachers Requiring Review</h2>
                <p className="text-red-600">{badTeachers.length} teacher{badTeachers.length > 1 ? 's' : ''} need immediate attention</p>
              </div>
            </div>
            <div className="space-y-3">
              {badTeachers.map((t) => (
                <div key={t.teacherId} className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-red-800">
                      {t.teacherName ? t.teacherName.split(" ").map((n: string) => n[0]).join("") : "N/A"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-black">{t.teacherName || "Unknown Teacher"}</p>
                    <p className="text-sm text-gray-600">{t.teacherId}</p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                    Bad
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teachers Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Teacher Performance Review</h2>
                <p className="text-gray-600">Weekly quality assessment and bonus management</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {paginatedTeachers.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiUsers className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Teachers Found</h3>
                <p className="text-gray-600 text-xl">
                  {searchQuery ? `No teachers match "${searchQuery}"` : "No teacher data available for this week"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Teacher</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">Controller Feedback</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">Control Rate</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">Exam Pass Rate</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">Examiner Rating</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">Overall Quality</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <FiCheck className="h-4 w-4" />
                            Manager Approval
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-2">
                            <FiGift className="h-4 w-4" />
                            Bonus Management
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedTeachers.map((t, idx) => (
                        <tr key={t.teacherId} className={`hover:bg-gray-50 transition-all duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-bold text-blue-800 text-sm">
                                  {t.teacherName ? t.teacherName.split(" ").map((n: string) => n[0]).join("") : "N/A"}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-black">{t.teacherName || "Unknown Teacher"}</p>
                                <p className="text-sm text-gray-500">{t.teacherId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                  +{t.positiveSum} ({t.positiveCount})
                                </span>
                                <span className="text-xs text-gray-500">
                                  Avg: {t.positiveCount ? (t.positiveSum / t.positiveCount).toFixed(1) : "-"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                  -{t.negativeSum} ({t.negativeCount})
                                </span>
                                <span className="text-xs text-gray-500">
                                  Avg: {t.negativeCount ? (t.negativeSum / t.negativeCount).toFixed(1) : "-"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {typeof t.controlRate === "number" ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                t.controlRate <= 4 ? "bg-red-100 text-red-800" :
                                t.controlRate <= 6 ? "bg-yellow-100 text-yellow-800" :
                                t.controlRate <= 8 ? "bg-green-100 text-green-800" :
                                "bg-blue-100 text-blue-800"
                              }`}>
                                {t.controlRate.toFixed(1)}/10
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {t.examPassRate ?? "-"}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                t.examinerRating === null ? "bg-gray-100 text-gray-500" :
                                t.examinerRating >= 8 ? "bg-green-100 text-green-800" :
                                t.examinerRating >= 6 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {t.examinerRating ? `${t.examinerRating}/10` : "No Rating"}
                              </span>
                              <span className="text-xs text-gray-400 font-medium">
                                External System
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              t.overallQuality === "Exceptional" ? "bg-yellow-100 text-yellow-800" :
                              t.overallQuality === "Excellent" ? "bg-green-100 text-green-800" :
                              t.overallQuality === "Better" ? "bg-blue-100 text-blue-800" :
                              t.overallQuality === "Good" ? "bg-gray-100 text-gray-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {t.overallQuality}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                  Quality Override
                                </label>
                                <select
                                  value={managerOverrides[t.teacherId]}
                                  onChange={(e) => setManagerOverrides(prev => ({ ...prev, [t.teacherId]: e.target.value }))}
                                  disabled={approving === t.teacherId}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all"
                                >
                                  {qualityLevels.map((q) => (
                                    <option key={q} value={q}>{q}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                  Manager Notes
                                </label>
                                <textarea
                                  placeholder="Add notes for this override..."
                                  value={managerNotes[t.teacherId] || ""}
                                  onChange={(e) => setManagerNotes(prev => ({ ...prev, [t.teacherId]: e.target.value }))}
                                  disabled={approving === t.teacherId}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all resize-none"
                                />
                              </div>
                              <button
                                onClick={() => handleApprove(t.teacherId)}
                                disabled={approving === t.teacherId}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg ${
                                  approving === t.teacherId ? "opacity-75 cursor-not-allowed" : ""
                                }`}
                              >
                                {approving === t.teacherId ? (
                                  <>
                                    <FiLoader className="animate-spin h-4 w-4" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <FiCheck className="h-4 w-4" />
                                    Save & Approve
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="bg-yellow-50 rounded-xl p-4 space-y-4 border border-yellow-200">
                              {managerOverrides[t.teacherId] === "Exceptional" ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FiGift className="h-4 w-4 text-yellow-600" />
                                    <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">
                                      Exceptional Bonus
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={bonus[t.teacherId] !== undefined ? bonus[t.teacherId] : ""}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const value = e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                                        setBonus(prev => ({ ...prev, [t.teacherId]: value }));
                                      }}
                                      className="flex-1 px-3 py-2 border border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-gray-900 shadow-sm transition-all font-bold text-center"
                                    />
                                    <span className="text-sm font-bold text-yellow-800 bg-yellow-100 px-2 py-1 rounded-lg">
                                      ETB
                                    </span>
                                  </div>
                                  <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-lg text-center">
                                    Max: 100 ETB
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-500 rounded-xl">
                                    <FiX className="h-4 w-4" />
                                    <span className="text-sm font-semibold">No Bonus</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Only for Exceptional
                                  </div>
                                </div>
                              )}
                              
                              {t.bonusAwarded > 0 && (
                                <div className="bg-green-100 border border-green-200 rounded-xl p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FiCheck className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider">
                                      Awarded
                                    </span>
                                  </div>
                                  <div className="text-lg font-bold text-green-800">
                                    +{t.bonusAwarded} ETB
                                  </div>
                                </div>
                              )}
                              
                              <button
                                onClick={() => fetchBonusHistory(t.teacherId)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-all hover:scale-105 text-sm"
                              >
                                <FiGift className="h-4 w-4" />
                                View History
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                    <p className="text-lg font-semibold text-gray-700">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                      >
                        <FiChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                      >
                        <FiChevronRight className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bonus History Modal */}
        {showBonusHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 p-6 relative border border-gray-200 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowBonusHistory(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-all hover:scale-110"
              >
                <FiX className="h-6 w-6" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <FiGift className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Bonus History</h2>
                  <p className="text-gray-600">Complete bonus award records</p>
                </div>
              </div>
              
              {bonusHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-6 bg-gray-100 rounded-2xl inline-block mb-4">
                    <FiClock className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-lg font-medium">No bonus records found</p>
                  <p className="text-gray-500 text-sm mt-2">This teacher hasn't received any bonuses yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bonusHistory.map((b: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <FiGift className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-bold text-black">+{b.amount} ETB</p>
                          <p className="text-sm text-gray-600">{b.period}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                        {b.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}