"use client";
import { useState, useEffect } from "react";
import {
  FiCalendar,
  FiUsers,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiSearch,
  FiClock,
  FiInfo,
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

    // Confirmation dialog
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
          title: "Success",
          description: `${data.message}. Please refresh teacher payments to see changes.`,
        });
        // Reset form
        setSelectedTeachers([]);
        setReason("");
        setDateRange({ startDate: "", endDate: "" });
        setPreviewData([]);
        setPreviewSummary({});
        setShowPreview(false);
        setSelectedTimeSlots([]);

        // Show detailed success message
        setTimeout(() => {
          toast({
            title: "✅ Salary Adjustment Completed Successfully!",
            description: `📊 ${
              data.recordsAffected
            } deduction records waived | 💰 ${
              data.financialImpact?.totalAmountWaived || 0
            } ETB returned to teacher salaries | 🔄 Teacher Payment page will show updated amounts immediately`,
          });
        }, 1000);

        // Show integration instructions
        setTimeout(() => {
          toast({
            title: "🔄 Next Steps",
            description:
              "1. Close this window 2. Refresh Teacher Payments page 3. Verify salary increases 4. Check reports for updated amounts",
          });
        }, 3000);
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-600 rounded-xl">
              <FiAlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Deduction Adjustments
              </h1>
              <p className="text-gray-600">
                Adjust deductions for system-related issues
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FiCalendar className="inline h-4 w-4 mr-2" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Adjustment Type
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="waive_lateness">
                  Waive Lateness Deductions
                </option>
                <option value="waive_absence">Waive Absence Deductions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FiClock className="inline h-4 w-4 mr-2" />
                Time Slots (Optional)
              </label>
              <select
                multiple
                value={selectedTimeSlots}
                onChange={(e) =>
                  setSelectedTimeSlots(
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    )
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 h-20"
              >
                <option value="">All Time Slots</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Reason for Adjustment
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Server downtime from 9:00 AM to 11:30 AM"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              rows={3}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <FiUsers className="inline h-4 w-4 mr-2" />
              Select Teachers ({selectedTeachers.length} selected)
            </label>

            <div className="mb-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4">
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() =>
                    setSelectedTeachers(filteredTeachers.map((t) => t.id))
                  }
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Select All Visible
                </button>
                <button
                  onClick={() => setSelectedTeachers([])}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredTeachers.map((teacher) => (
                  <label
                    key={teacher.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
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

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiAlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-yellow-800 text-lg">
                  ⚠️ CRITICAL: Salary Deduction Adjustment
                </h3>
                <p className="text-yellow-600 text-sm">
                  System Issue Compensation Process
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4 border border-yellow-200">
              <h4 className="font-bold text-gray-800 mb-3">
                📝 How This Works:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2">
                    🔍 Detection Process:
                  </h5>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Scans zoom link send times for lateness</li>
                    <li>• Detects absence patterns automatically</li>
                    <li>• Calculates actual deduction amounts</li>
                    <li>• Shows real financial impact</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2">
                    🔄 Integration Process:
                  </h5>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Creates waiver records in database</li>
                    <li>• Teacher payment system reads waivers</li>
                    <li>• Deductions automatically set to 0 ETB</li>
                    <li>• Salaries increase immediately</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-2">
                ❗ Important Notes:
              </h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>
                  • This permanently modifies salary calculations for the
                  selected period
                </li>
                <li>• Changes appear immediately in Teacher Payments page</li>
                <li>• All reports will reflect the adjusted amounts</li>
                <li>• Complete audit trail is maintained for compliance</li>
                <li>• Action cannot be undone - use with caution</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={previewAdjustments}
                disabled={
                  loading ||
                  !dateRange.startDate ||
                  !dateRange.endDate ||
                  selectedTeachers.length === 0
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSearch className="h-4 w-4" />
                1. Preview Records
              </button>

              <button
                onClick={handleAdjustment}
                disabled={loading || previewData.length === 0 || !reason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <FiCheck className="h-4 w-4" />
                )}
                2. Apply Changes
              </button>

              <button
                onClick={() => {
                  // Show final confirmation
                  const confirmed = window.confirm(
                    "Adjustment completed! This will:\n\n" +
                      "✅ Refresh the Teacher Payments page\n" +
                      "✅ Show updated salary amounts\n" +
                      "✅ Reflect changes in all reports\n\n" +
                      "Click OK to close and refresh."
                  );

                  if (confirmed) {
                    if (window.opener) {
                      window.opener.location.reload();
                    }
                    window.close();
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
              >
                <FiCheck className="h-4 w-4" />
                3. Complete & Refresh Teacher Payments
              </button>
            </div>

            {previewData.length === 0 && showPreview && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiInfo className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-blue-800">
                    No Deductions Found
                  </span>
                </div>
                <p className="text-blue-700 text-sm mb-3">
                  No deduction records were found for the selected criteria.
                  This could mean:
                </p>
                <ul className="text-blue-600 text-sm space-y-1 ml-4">
                  <li>• No teachers were late or absent during this period</li>
                  <li>
                    • Selected teachers had no deductions in the date range
                  </li>
                  <li>• Deductions may have been waived previously</li>
                  <li>
                    • System may not have detected any issues during this time
                  </li>
                </ul>
                <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Try different date ranges or check
                  the Teacher Payments page to verify if deductions exist.
                </div>
              </div>
            )}
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
                          +
                          {previewSummary.totalAmount ||
                            previewData.reduce(
                              (sum, r) => sum + (r.deduction || 0),
                              0
                            )}{" "}
                          ETB
                        </div>
                        <div className="text-green-600 font-bold">
                          💰 SALARY INCREASE
                        </div>
                      </div>
                    </div>

                    {previewSummary.teacherBreakdown &&
                      previewSummary.teacherBreakdown.length > 0 && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                          <h5 className="font-bold text-gray-800 mb-3">
                            👥 Per-Teacher Impact:
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-32 overflow-y-auto">
                            {previewSummary.teacherBreakdown.map(
                              (teacher: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                                >
                                  <span className="font-medium truncate">
                                    {teacher.teacherName}
                                  </span>
                                  <span className="font-bold text-green-600">
                                    +{teacher.totalDeduction} ETB
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
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

                  {previewData.length > 10 && (
                    <p className="text-center text-gray-500 mt-3 font-medium">
                      Showing all {previewData.length} records
                    </p>
                  )}
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
                    No deduction records match your criteria. This could mean:
                  </p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• No deductions exist for the selected date range</li>
                    <li>• Selected teachers had no deductions</li>
                    <li>• Deductions were already adjusted previously</li>
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
