"use client";
import { useState, useEffect } from "react";
import {
  FiCalendar,
  FiUsers,
  FiCheck,
  FiSearch,
  FiSettings,
  FiAlertTriangle,
  FiRefreshCw,
  FiClock,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function DeductionAdjustmentsPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [adjustmentType, setAdjustmentType] = useState("waive_absence");
  const [reason, setReason] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewSummary, setPreviewSummary] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);
  const [waiverHistory, setWaiverHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchTeachers();
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    const filtered = teachers.filter((teacher) =>
      teacher.name.toLowerCase().includes(teacherSearch.toLowerCase())
    );
    setFilteredTeachers(filtered);
  }, [teachers, teacherSearch]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
        setFilteredTeachers(data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers");
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const res = await fetch("/api/admin/time-slots");
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data);
      }
    } catch (error) {
      console.error("Failed to fetch time slots");
    }
  };

  const fetchWaiverHistory = async () => {
    try {
      const res = await fetch(
        "/api/admin/deduction-adjustments/history?limit=50"
      );
      if (res.ok) {
        const data = await res.json();
        setWaiverHistory(data.waivers || []);
        setShowHistory(true);
      }
    } catch (error) {
      console.error("Failed to fetch waiver history");
    }
  };

  const previewAdjustments = async () => {
    if (
      !dateRange.startDate ||
      !dateRange.endDate ||
      selectedTeachers.length === 0
    ) {
      toast({
        title: "Missing Information",
        description: "Please select date range and at least one teacher",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/deduction-adjustments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentType,
          dateRange,
          teacherIds: selectedTeachers,
          timeSlots: selectedTimeSlots,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.records || []);
        setPreviewSummary(data.summary || {});
        setShowPreview(true);

        toast({
          title: "Preview Ready",
          description: `Found ${data.records?.length || 0} records totaling ${
            data.summary?.totalAmount || 0
          } ETB`,
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch preview");
      }
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to preview adjustments",
        variant: "destructive",
      });
      setPreviewData([]);
      setShowPreview(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async () => {
    if (!reason.trim()) {
      toast({
        title: "Missing Reason",
        description: "Please provide a reason for the adjustment",
        variant: "destructive",
      });
      return;
    }

    if (previewData.length === 0) {
      toast({
        title: "No Records",
        description: "Please preview adjustments first",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `🚨 CRITICAL ACTION\n\nYou are about to waive ${
        previewData.length
      } deduction records totaling ${
        previewSummary.totalAmount || 0
      } ETB.\n\nReason: ${reason}\n\nThis will:\n✅ Increase teacher salaries immediately\n✅ Update all payment calculations\n✅ Create permanent audit records\n\n⚠️ This action CANNOT be undone!\n\nProceed?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/deduction-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentType,
          dateRange,
          teacherIds: selectedTeachers,
          timeSlots: selectedTimeSlots,
          reason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "✅ Adjustment Completed Successfully!",
          description: `${data.recordsAffected} records waived. ${
            data.financialImpact?.totalAmountWaived || 0
          } ETB returned to teacher salaries.`,
        });

        // Reset form
        setSelectedTeachers([]);
        setReason("");
        setDateRange({ startDate: "", endDate: "" });
        setSelectedTimeSlots([]);
        setPreviewData([]);
        setPreviewSummary({});
        setShowPreview(false);

        // Show integration message
        setTimeout(() => {
          toast({
            title: "🔄 System Integration Complete",
            description:
              "Teacher payment calculations have been updated. Changes are now live in the Teacher Payments page.",
          });
        }, 2000);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to adjust deductions");
      }
    } catch (error: any) {
      toast({
        title: "❌ Adjustment Failed",
        description: error.message || "Failed to adjust deductions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <FiSettings className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Deduction Adjustments
                </h1>
                <p className="text-red-100 text-lg">
                  Waive deductions for system issues or special circumstances
                </p>
              </div>
            </div>

            {/* View History Button - Top Right */}
            <button
              onClick={fetchWaiverHistory}
              disabled={loading}
              className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-300 disabled:opacity-50 font-medium border border-white/20 hover:border-white/30"
            >
              <FiSearch className="h-5 w-5" />
              📋 View History
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-0 p-8">
          {/* Enhanced Warning Banner */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-0 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <FiAlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-800 mb-1">
                  ⚠️ Critical System Function
                </h3>
                <p className="text-base text-yellow-700 font-medium">
                  This tool directly modifies teacher salary calculations. All
                  changes are permanent and immediately reflected in payment
                  systems.
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Configuration */}
            <div className="space-y-8">
              {/* Date Range */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-0 shadow-lg">
                <label className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiCalendar className="h-5 w-5 text-blue-600" />
                  </div>
                  Date Range *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md"
                    required
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md"
                    required
                  />
                </div>
              </div>

              {/* Adjustment Type */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-0 shadow-lg">
                <label className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiSettings className="h-5 w-5 text-purple-600" />
                  </div>
                  Adjustment Type *
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md"
                >
                  <option value="waive_absence">
                    Waive Absence Deductions
                  </option>
                  <option value="waive_lateness">
                    Waive Lateness Deductions
                  </option>
                </select>
                <p className="text-sm text-gray-600 mt-3 font-medium">
                  {adjustmentType === "waive_absence"
                    ? "Removes deductions from recorded absence events"
                    : "Removes deductions from late class starts"}
                </p>
              </div>

              {/* Time Slots */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border-0 shadow-lg">
                <label className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiClock className="h-5 w-5 text-orange-600" />
                  </div>
                  Time Slots (Optional)
                </label>
                <div className="border-2 border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto bg-white shadow-sm">
                  <div className="mb-4">
                    <label className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTimeSlots.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTimeSlots([]);
                          }
                        }}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-base font-semibold text-blue-600">
                        All Time Slots
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot) => (
                      <label
                        key={slot}
                        className="flex items-center gap-3 p-2 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTimeSlots.includes(slot)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTimeSlots((prev) => [...prev, slot]);
                            } else {
                              setSelectedTimeSlots((prev) =>
                                prev.filter((s) => s !== slot)
                              );
                            }
                          }}
                          className="w-5 h-5 rounded border-2 border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium">{slot}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 font-medium">
                  Leave empty to include all time slots. Only applies to
                  lateness adjustments.
                </p>
              </div>

              {/* Reason */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-0 shadow-lg">
                <label className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiAlertTriangle className="h-5 w-5 text-green-600" />
                  </div>
                  Reason for Adjustment *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Server downtime on [date] prevented normal operations, causing system-related absences/lateness that should not be penalized."
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md resize-none"
                  rows={4}
                  required
                />
                <p className="text-sm text-gray-600 mt-3 font-medium">
                  This reason will be permanently recorded in audit logs and
                  waiver records.
                </p>
              </div>
            </div>

            {/* Right Column - Teacher Selection */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-0 shadow-lg">
              <label className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FiUsers className="h-5 w-5 text-indigo-600" />
                </div>
                Select Teachers * ({selectedTeachers.length} selected)
              </label>

              {/* Search */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md"
                />
              </div>

              {/* Teacher Selection */}
              <div className="border-2 border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() =>
                      setSelectedTeachers(filteredTeachers.map((t) => t.id))
                    }
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Select All ({filteredTeachers.length})
                  </button>
                  <button
                    onClick={() => setSelectedTeachers([])}
                    className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl text-sm font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto bg-gradient-to-b from-white to-gray-50 rounded-xl border-2 border-gray-100">
                  <div className="space-y-2 p-3">
                    {filteredTeachers.map((teacher) => (
                      <label
                        key={teacher.id}
                        className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl cursor-pointer transition-all duration-300 border border-transparent hover:border-blue-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeachers((prev) => [
                                ...prev,
                                teacher.id,
                              ]);
                            } else {
                              setSelectedTeachers((prev) =>
                                prev.filter((id) => id !== teacher.id)
                              );
                            }
                          }}
                          className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-base font-semibold">
                          {teacher.name}
                        </span>
                      </label>
                    ))}
                  </div>

                  {filteredTeachers.length === 0 && (
                    <div className="text-center text-gray-600 py-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                      <div className="text-4xl mb-3">🔍</div>
                      <div className="font-semibold">
                        No teachers found matching "{teacherSearch}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border-0 shadow-lg mb-8">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={previewAdjustments}
                disabled={
                  loading ||
                  !dateRange.startDate ||
                  !dateRange.endDate ||
                  selectedTeachers.length === 0
                }
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                {loading ? (
                  <FiRefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <FiSearch className="h-6 w-6" />
                )}
                🔍 Preview Adjustments
              </button>

              <button
                onClick={handleAdjustment}
                disabled={loading || previewData.length === 0 || !reason.trim()}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                title={`Loading: ${loading}, Records: ${
                  previewData.length
                }, Reason: ${reason.trim() ? "Yes" : "No"}`}
              >
                <FiCheck className="h-6 w-6" />
                ⚙️ Apply Adjustments ({previewData.length} records)
              </button>

              {/* Emergency Save Button */}
              {previewData.length > 0 && reason.trim() && (
                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `🚨 EMERGENCY SAVE\n\nForce apply ${previewData.length} adjustments?\n\nThis bypasses loading checks.`
                    );
                    if (confirmed) {
                      await handleAdjustment();
                    }
                  }}
                  className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <FiCheck className="h-5 w-5" />
                  💾 Force Save
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Preview Section */}
          {showPreview && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 border-0 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiSearch className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    📋 Preview Results: {previewData.length} records found
                  </h3>
                  <p className="text-lg text-gray-700 font-medium">
                    Total amount to be waived:{" "}
                    <span className="font-bold text-green-600 text-xl">
                      {previewSummary.totalAmount || 0} ETB
                    </span>
                  </p>
                </div>
              </div>

              {previewData.length > 0 ? (
                <>
                  {/* Enhanced Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {previewSummary.totalRecords}
                      </div>
                      <div className="text-base font-semibold text-gray-700">
                        Total Records
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {previewSummary.totalTeachers}
                      </div>
                      <div className="text-base font-semibold text-gray-700">
                        Affected Teachers
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {previewSummary.totalLatenessAmount || 0}
                      </div>
                      <div className="text-base font-semibold text-gray-700">
                        Lateness ETB
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                      <div className="text-3xl font-bold text-red-600 mb-2">
                        {previewSummary.totalAbsenceAmount || 0}
                      </div>
                      <div className="text-base font-semibold text-gray-700">
                        Absence ETB
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Records Table */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-0">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-base">
                        <thead className="bg-gradient-to-r from-gray-100 to-blue-100 sticky top-0">
                          <tr>
                            <th className="text-left p-4 font-bold text-gray-800">
                              Teacher
                            </th>
                            <th className="text-left p-4 font-bold text-gray-800">
                              Date
                            </th>
                            <th className="text-left p-4 font-bold text-gray-800">
                              Type
                            </th>
                            <th className="text-left p-4 font-bold text-gray-800">
                              Student/Info
                            </th>
                            <th className="text-left p-4 font-bold text-gray-800">
                              Time Details
                            </th>
                            <th className="text-left p-4 font-bold text-gray-800">
                              Package/Tier
                            </th>
                            <th className="text-right p-4 font-bold text-gray-800">
                              Amount (ETB)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((record, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300"
                            >
                              <td className="p-4 font-semibold text-gray-900">
                                {record.teacherName}
                              </td>
                              <td className="p-4 text-gray-700">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-3 py-2 rounded-xl text-sm font-bold ${
                                    record.type === "Lateness"
                                      ? "bg-orange-100 text-orange-800 border border-orange-200"
                                      : "bg-red-100 text-red-800 border border-red-200"
                                  }`}
                                >
                                  {record.type}
                                </span>
                              </td>
                              <td className="p-4 text-sm">
                                {record.type === "Lateness" ? (
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {record.studentName}
                                    </div>
                                    <div className="text-gray-600">
                                      Student ID: {record.studentId || "N/A"}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {record.source === "computed"
                                        ? "Auto-detected"
                                        : "Database Record"}
                                    </div>
                                    <div className="text-gray-600">
                                      {record.affectedStudents?.length || 0}{" "}
                                      students affected
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-sm">
                                {record.type === "Lateness" ? (
                                  <div>
                                    <div className="font-semibold text-red-600">
                                      {record.latenessMinutes} min late
                                    </div>
                                    <div className="text-gray-600">
                                      Scheduled: {record.timeSlot}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-red-600">
                                      Full Day
                                    </div>
                                    <div className="text-gray-600">
                                      {record.permitted
                                        ? "Permitted"
                                        : "Unpermitted"}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-sm">
                                {record.type === "Lateness" ? (
                                  <div>
                                    <div className="font-semibold text-blue-600">
                                      {record.studentPackage || "Unknown"}
                                    </div>
                                    <div className="text-gray-600">
                                      {record.tier?.split(" - ")[0] ||
                                        "No Tier"}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-blue-600">
                                      {record.source === "computed"
                                        ? "Mixed Packages"
                                        : "Various"}
                                    </div>
                                    <div className="text-gray-600">
                                      {record.affectedStudents &&
                                      Array.isArray(record.affectedStudents)
                                        ? record.affectedStudents
                                            .map((s: any) => s.package)
                                            .join(", ")
                                        : record.details || "N/A"}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-green-600 text-lg">
                                +{record.deduction}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Enhanced Teacher Breakdown */}
                  {previewSummary.teacherBreakdown &&
                    previewSummary.teacherBreakdown.length > 0 && (
                      <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border-0">
                        <h4 className="font-bold text-gray-800 mb-6 text-xl flex items-center gap-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FiUsers className="h-5 w-5 text-green-600" />
                          </div>
                          👥 Per-Teacher Impact:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {previewSummary.teacherBreakdown.map(
                            (teacher: any, index: number) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
                              >
                                <span className="font-semibold text-base text-gray-900">
                                  {teacher.teacherName}
                                </span>
                                <span className="font-bold text-green-600 text-lg">
                                  +{teacher.totalDeduction} ETB
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </>
              ) : (
                <div className="text-center py-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-dashed border-green-300">
                  <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FiCheck className="h-10 w-10 text-green-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-3">
                    No Records Found
                  </h4>
                  <p className="text-lg text-gray-700 font-medium mb-4">
                    No deduction records match your criteria. This could mean:
                  </p>
                  <ul className="text-base text-gray-600 space-y-2 max-w-md mx-auto">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      No deductions exist for the selected date range
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Selected teachers had no deductions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Deductions were already waived previously
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Waiver History Section */}
          {showHistory && (
            <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl p-8 border-0 shadow-xl mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiSearch className="h-6 w-6 text-purple-600" />
                  </div>
                  📋 Waiver History ({waiverHistory.length} records)
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all duration-300"
                >
                  ✕ Close
                </button>
              </div>

              {waiverHistory.length > 0 ? (
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-0">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-base">
                      <thead className="bg-gradient-to-r from-gray-100 to-purple-100 sticky top-0">
                        <tr>
                          <th className="text-left p-4 font-bold text-gray-800">
                            Applied
                          </th>
                          <th className="text-left p-4 font-bold text-gray-800">
                            Teacher
                          </th>
                          <th className="text-left p-4 font-bold text-gray-800">
                            Type
                          </th>
                          <th className="text-left p-4 font-bold text-gray-800">
                            Deduction Date
                          </th>
                          <th className="text-right p-4 font-bold text-gray-800">
                            Amount
                          </th>
                          <th className="text-left p-4 font-bold text-gray-800">
                            Admin
                          </th>
                          <th className="text-left p-4 font-bold text-gray-800">
                            Reason & Details
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {waiverHistory.map((waiver, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-300"
                          >
                            <td className="p-4">
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">
                                  {new Date(
                                    waiver.createdAt
                                  ).toLocaleDateString()}
                                </div>
                                <div className="text-gray-600">
                                  {new Date(
                                    waiver.createdAt
                                  ).toLocaleTimeString()}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">
                                  {waiver.teacherName}
                                </div>
                                <div className="text-gray-600">
                                  ID: {waiver.teacherId}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-3 py-2 rounded-xl text-sm font-bold ${
                                  waiver.deductionType === "lateness"
                                    ? "bg-orange-100 text-orange-800 border border-orange-200"
                                    : "bg-red-100 text-red-800 border border-red-200"
                                }`}
                              >
                                {waiver.deductionType === "lateness"
                                  ? "⏰ Lateness"
                                  : "❌ Absence"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">
                                  {new Date(
                                    waiver.deductionDate
                                  ).toLocaleDateString()}
                                </div>
                                <div className="text-gray-600">
                                  {new Date(
                                    waiver.deductionDate
                                  ).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-sm">
                                <div className="font-mono font-bold text-green-600 text-lg">
                                  +{waiver.originalAmount}
                                </div>
                                <div className="text-gray-600">ETB</div>
                              </div>
                            </td>
                            <td className="p-4 text-sm">
                              <div className="font-semibold text-blue-600">
                                {waiver.adminId}
                              </div>
                              <div className="text-gray-600">Admin</div>
                            </td>
                            <td className="p-4 text-sm max-w-sm">
                              <div className="space-y-2">
                                <div className="font-semibold text-gray-900 line-clamp-2">
                                  {waiver.reason.split("|")[0]?.trim() ||
                                    waiver.reason}
                                </div>
                                {waiver.reason.includes("|") && (
                                  <div className="text-gray-600 text-xs bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    {waiver.reason.split("|")[1]?.trim()}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-dashed border-blue-300">
                  <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FiSearch className="h-10 w-10 text-blue-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-3">
                    No Waiver History
                  </h4>
                  <p className="text-lg text-gray-700 font-medium">
                    No deduction waivers have been applied yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
