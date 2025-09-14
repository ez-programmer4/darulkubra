"use client";
import { useState, useEffect } from "react";
import { FiCalendar, FiUsers, FiCheck, FiSearch, FiSettings, FiAlertTriangle, FiRefreshCw, FiClock } from "react-icons/fi";
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
    if (!dateRange.startDate || !dateRange.endDate || selectedTeachers.length === 0) {
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
        body: JSON.stringify({ adjustmentType, dateRange, teacherIds: selectedTeachers, timeSlots: selectedTimeSlots }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.records || []);
        setPreviewSummary(data.summary || {});
        setShowPreview(true);
        
        toast({
          title: "Preview Ready",
          description: `Found ${data.records?.length || 0} records totaling ${data.summary?.totalAmount || 0} ETB`,
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
      `🚨 CRITICAL ACTION\n\nYou are about to waive ${previewData.length} deduction records totaling ${previewSummary.totalAmount || 0} ETB.\n\nReason: ${reason}\n\nThis will:\n✅ Increase teacher salaries immediately\n✅ Update all payment calculations\n✅ Create permanent audit records\n\n⚠️ This action CANNOT be undone!\n\nProceed?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/deduction-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustmentType, dateRange, teacherIds: selectedTeachers, timeSlots: selectedTimeSlots, reason }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "✅ Adjustment Completed Successfully!",
          description: `${data.recordsAffected} records waived. ${data.financialImpact?.totalAmountWaived || 0} ETB returned to teacher salaries.`,
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
            description: "Teacher payment calculations have been updated. Changes are now live in the Teacher Payments page.",
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-600 rounded-xl">
              <FiSettings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deduction Adjustments</h1>
              <p className="text-gray-600">Waive deductions for system issues or special circumstances</p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <div className="flex items-center">
              <FiAlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Critical System Function</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This tool directly modifies teacher salary calculations. All changes are permanent and immediately reflected in payment systems.
                </p>
              </div>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <FiCalendar className="inline h-4 w-4 mr-2" />
                  Date Range *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Adjustment Type *</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="waive_absence">Waive Absence Deductions</option>
                  <option value="waive_lateness">Waive Lateness Deductions</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {adjustmentType === "waive_absence" 
                    ? "Removes deductions from recorded absence events" 
                    : "Removes deductions from late class starts"}
                </p>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <FiClock className="inline h-4 w-4 mr-2" />
                  Time Slots (Optional)
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{slot}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty to include all time slots. Only applies to lateness adjustments.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Reason for Adjustment *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Server downtime on [date] prevented normal operations, causing system-related absences/lateness that should not be penalized."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  This reason will be permanently recorded in audit logs and waiver records.
                </p>
              </div>
            </div>

            {/* Right Column - Teacher Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <FiUsers className="inline h-4 w-4 mr-2" />
                Select Teachers * ({selectedTeachers.length} selected)
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
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSelectedTeachers(filteredTeachers.map(t => t.id))}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Select All ({filteredTeachers.length})
                  </button>
                  <button
                    onClick={() => setSelectedTeachers([])}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto bg-white rounded border">
                  <div className="space-y-1 p-2">
                    {filteredTeachers.map((teacher) => (
                      <label key={teacher.id} className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeachers(prev => [...prev, teacher.id]);
                            } else {
                              setSelectedTeachers(prev => prev.filter(id => id !== teacher.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{teacher.name}</span>
                      </label>
                    ))}
                  </div>

                  {filteredTeachers.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No teachers found matching "{teacherSearch}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={previewAdjustments}
              disabled={loading || !dateRange.startDate || !dateRange.endDate || selectedTeachers.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? (
                <FiRefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FiSearch className="h-4 w-4" />
              )}
              1. Preview Adjustments
            </button>

            <button
              onClick={handleAdjustment}
              disabled={loading || previewData.length === 0 || !reason.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              title={`Loading: ${loading}, Records: ${previewData.length}, Reason: ${reason.trim() ? 'Yes' : 'No'}`}
            >
              <FiCheck className="h-4 w-4" />
              2. Apply Adjustments ({previewData.length} records)
            </button>

            {/* Emergency Save Button - Always available when conditions are met */}
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
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                <FiCheck className="h-4 w-4" />
                💾 Force Save
              </button>
            )}
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiSearch className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    📋 Preview Results: {previewData.length} records found
                  </h3>
                  <p className="text-gray-600">
                    Total amount to be waived: <span className="font-bold text-green-600">{previewSummary.totalAmount || 0} ETB</span>
                  </p>
                </div>
              </div>
              
              {previewData.length > 0 ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{previewSummary.totalRecords}</div>
                      <div className="text-sm text-gray-600">Total Records</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{previewSummary.totalTeachers}</div>
                      <div className="text-sm text-gray-600">Affected Teachers</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{previewSummary.totalLatenessAmount || 0}</div>
                      <div className="text-sm text-gray-600">Lateness ETB</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{previewSummary.totalAbsenceAmount || 0}</div>
                      <div className="text-sm text-gray-600">Absence ETB</div>
                    </div>
                  </div>

                  {/* Records Table */}
                  <div className="bg-white rounded-lg overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-bold">Teacher</th>
                            <th className="text-left p-3 font-bold">Date</th>
                            <th className="text-left p-3 font-bold">Type</th>
                            <th className="text-left p-3 font-bold">Details</th>
                            <th className="text-right p-3 font-bold">Amount (ETB)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((record, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-medium">{record.teacherName}</td>
                              <td className="p-3">{new Date(record.date).toLocaleDateString()}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  record.type === 'Lateness' 
                                    ? 'bg-orange-100 text-orange-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.type}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-gray-600">{record.details}</td>
                              <td className="p-3 text-right font-mono font-bold text-green-600">
                                +{record.deduction}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Teacher Breakdown */}
                  {previewSummary.teacherBreakdown && previewSummary.teacherBreakdown.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-3">👥 Per-Teacher Impact:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {previewSummary.teacherBreakdown.map((teacher: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium text-sm">{teacher.teacherName}</span>
                            <span className="font-bold text-green-600">+{teacher.totalDeduction} ETB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FiCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">No Records Found</h4>
                  <p className="text-gray-600">
                    No deduction records match your criteria. This could mean:
                  </p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• No deductions exist for the selected date range</li>
                    <li>• Selected teachers had no deductions</li>
                    <li>• Deductions were already waived previously</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}