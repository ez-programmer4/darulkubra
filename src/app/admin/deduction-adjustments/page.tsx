"use client";
import { useState, useEffect } from "react";
import {
  FiCalendar,
  FiUsers,
  FiAlertTriangle,
  FiCheck,
  FiSearch,
  FiClock,
  FiInfo,
  FiRefreshCw,
  FiSettings,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function DeductionAdjustmentsPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [adjustmentType, setAdjustmentType] = useState("waive_lateness");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewSummary, setPreviewSummary] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);

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

  const previewAdjustments = async () => {
    if (
      !dateRange.startDate ||
      !dateRange.endDate ||
      selectedTeachers.length === 0
    ) {
      toast({
        title: "❌ Missing Information",
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

        if (data.records?.length > 0) {
          toast({
            title: "📋 Preview Ready",
            description: `Found ${
              data.records.length
            } deduction records totaling ${data.summary?.totalAmount || 0} ETB`,
          });
        } else {
          toast({
            title: "ℹ️ No Records Found",
            description:
              "No deduction records match your criteria. This may be normal.",
          });
        }
      } else {
        throw new Error("Failed to fetch preview");
      }
    } catch (error: any) {
      toast({
        title: "❌ Preview Failed",
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
    if (
      !dateRange.startDate ||
      !dateRange.endDate ||
      selectedTeachers.length === 0 ||
      !reason
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (previewData.length === 0) {
      toast({
        title: "Error",
        description: "Please preview adjustments first",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to adjust ${previewData.length} deduction record(s)?\n\nReason: ${reason}\n\nThis action cannot be undone.`
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
          title: "✅ Adjustment Completed",
          description: `${data.recordsAffected} records waived. ${data.financialImpact?.totalAmountWaived || 0} ETB returned to salaries.`,
        });
        
        // Reset form
        setSelectedTeachers([]);
        setReason("");
        setDateRange({ startDate: "", endDate: "" });
        setPreviewData([]);
        setPreviewSummary({});
        setShowPreview(false);
        setSelectedTimeSlots([]);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to adjust deductions");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust deductions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-600 rounded-xl">
              <FiSettings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Deduction Adjustments
              </h1>
              <p className="text-gray-600">
                Waive deductions for system issues or special circumstances
              </p>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Filters */}
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <FiCalendar className="inline h-4 w-4 mr-2" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="waive_lateness">Waive Lateness Deductions</option>
                  <option value="waive_absence">Waive Absence Deductions</option>
                </select>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <FiClock className="inline h-4 w-4 mr-2" />
                  Time Slots (Optional)
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTimeSlots.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTimeSlots([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-blue-600">All Time Slots</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => (
                      <label key={slot} className="flex items-center gap-2">
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
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{slot}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty to include all time slots
                </p>
              </div>
            </div>

            {/* Right Column - Teachers */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <FiUsers className="inline h-4 w-4 mr-2" />
                Select Teachers ({selectedTeachers.length} selected)
              </label>

              {/* Search */}
              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Teacher Selection */}
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() =>
                      setSelectedTeachers(filteredTeachers.map((t) => t.id))
                    }
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedTeachers([])}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {filteredTeachers.map((teacher) => (
                      <label
                        key={teacher.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeachers((prev) => [...prev, teacher.id]);
                            } else {
                              setSelectedTeachers((prev) =>
                                prev.filter((id) => id !== teacher.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{teacher.name}</span>
                      </label>
                    ))}
                  </div>

                  {filteredTeachers.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No teachers found matching "{teacherSearch}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Reason for Adjustment *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Server downtime from 9:00 AM to 11:30 AM on [date] caused system issues preventing normal operations"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={previewAdjustments}
              disabled={
                loading ||
                !dateRange.startDate ||
                !dateRange.endDate ||
                selectedTeachers.length === 0
              }
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <FiRefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FiSearch className="h-4 w-4" />
              )}
              Preview Adjustments
            </button>

            <button
              onClick={handleAdjustment}
              disabled={loading || previewData.length === 0 || !reason.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <FiCheck className="h-4 w-4" />
              Apply Adjustments
            </button>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiSearch className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    📋 Preview Results: {previewData.length} records found
                  </h3>
                  <p className="text-gray-600">
                    These deductions will be set to 0 ETB (waived)
                  </p>
                </div>
              </div>

              {previewData.length > 0 ? (
                <>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <FiAlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-800 text-lg">
                          📊 Financial Impact Analysis
                        </h4>
                        <p className="text-red-600 text-sm">
                          Actual deduction amounts from database records
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center bg-white rounded-lg p-3 border border-red-100">
                        <div className="font-bold text-xl text-red-700">
                          {previewSummary.totalRecords || previewData.length}
                        </div>
                        <div className="text-red-600 font-medium">
                          Deduction Records
                        </div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 border border-red-100">
                        <div className="font-bold text-xl text-red-700">
                          {previewSummary.totalTeachers ||
                            [...new Set(previewData.map((r) => r.teacherName))]
                              .length}
                        </div>
                        <div className="text-red-600 font-medium">
                          Affected Teachers
                        </div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 border border-orange-100">
                        <div className="font-bold text-xl text-orange-700">
                          {previewSummary.totalLatenessAmount || 0} ETB
                        </div>
                        <div className="text-orange-600 font-medium">
                          Lateness Deductions
                        </div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 border border-red-100">
                        <div className="font-bold text-xl text-red-700">
                          {previewSummary.totalAbsenceAmount || 0} ETB
                        </div>
                        <div className="text-red-600 font-medium">
                          Absence Deductions
                        </div>
                      </div>
                      <div className="text-center bg-green-50 rounded-lg p-3 border-2 border-green-200">
                        <div className="font-bold text-2xl text-green-700">
                          +{previewSummary.totalAmount ||
                            previewData.reduce(
                              (sum, r) => sum + (r.deduction || 0),
                              0
                            )} ETB
                        </div>
                        <div className="text-green-600 font-bold">
                          💰 SALARY INCREASE
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-bold">Teacher</th>
                          <th className="text-left p-3 font-bold">Date</th>
                          <th className="text-left p-3 font-bold">Type</th>
                          <th className="text-right p-3 font-bold">
                            Deduction to Waive
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((record, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">
                              {record.teacherName}
                            </td>
                            <td className="p-3">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  record.type === "Lateness"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {record.type}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="font-mono font-bold">
                                <span className="text-red-600">
                                  -{record.deduction} ETB
                                </span>
                                <span className="text-gray-400 mx-2">→</span>
                                <span className="text-green-600">0 ETB</span>
                              </div>
                              <div className="text-xs text-green-600 font-medium">
                                +{record.deduction} ETB to salary
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FiCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    No Records Found
                  </h4>
                  <p className="text-gray-600">
                    No deduction records match your criteria.
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