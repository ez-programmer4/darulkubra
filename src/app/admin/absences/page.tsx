"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  FiCalendar,
  FiDollarSign,
  FiRefreshCw,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiSettings,
  FiAlertTriangle,
  FiTrendingUp,
  FiUsers,
  FiClock,
  FiLoader,
  FiInfo,
  FiCheck,
} from "react-icons/fi";

interface AbsenceRecord {
  id: number;
  teacherId: string;
  classDate: string;
  timeSlots?: string; // JSON string of affected time slots
  permitted: boolean;
  deductionApplied: number;
  reviewedByManager: boolean;
  reviewNotes?: string;
  createdAt: string;
  wpos_wpdatatable_24: { ustazname: string };
  permissionrequest?: { reasonCategory: string; timeSlots?: string };
}

interface ConfigResponse {
  deductionAmount: string;
  deductionPerTimeSlot: string;
  effectiveMonths: string[];
  excludeSundays?: boolean;
}

const MONTHS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

export default function AbsenceManagement() {
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deductionAmount, setDeductionAmount] = useState("50");
  const [deductionPerTimeSlot, setDeductionPerTimeSlot] = useState("25");
  const [effectiveMonths, setEffectiveMonths] = useState<string[]>([]);
  const [excludeSundays, setExcludeSundays] = useState(true);

  const loadAbsences = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/absences");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      setAbsences(data || []);
    } catch (error) {
      console.error("Failed to load absences:", error);
      toast({
        title: "Error",
        description: "Failed to load absence records",
        variant: "destructive",
      });
    }
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/absence-config");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: ConfigResponse = await res.json();
      setDeductionAmount(data.deductionAmount || "50");
      setDeductionPerTimeSlot(data.deductionPerTimeSlot || "25");
      setEffectiveMonths(data.effectiveMonths || []);
      setExcludeSundays(data.excludeSundays ?? true);
      toast({
        title: "Success",
        description: "Configuration loaded successfully",
      });
    } catch (error) {
      console.error("Failed to load config:", error);
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    setLoading(true);
    try {
      if (
        parseFloat(deductionAmount) <= 0 ||
        parseFloat(deductionPerTimeSlot) <= 0
      ) {
        throw new Error("Deduction amounts must be positive");
      }
      const res = await fetch("/api/admin/absence-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductionAmount,
          deductionPerTimeSlot,
          effectiveMonths,
          excludeSundays,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save configuration");
      }

      toast({
        title: "Success",
        description: "Configuration saved successfully",
      });
      await loadConfig();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!absences.length) {
      toast({
        title: "No Data",
        description: "No absence records to export",
        variant: "destructive",
      });
      return;
    }

    const csv = [
      ["Teacher", "Date", "Time Slots", "Status", "Deduction", "Reason"],
      ...absences.map((a) => {
        let timeSlotsInfo = "Full Day";
        if (a.timeSlots) {
          try {
            const slots = JSON.parse(a.timeSlots);
            timeSlotsInfo = slots.includes("Whole Day")
              ? "Whole Day"
              : `${slots.length} slots`;
          } catch {}
        }
        return [
          a.wpos_wpdatatable_24.ustazname,
          new Date(a.classDate).toLocaleDateString(),
          timeSlotsInfo,
          a.permitted ? "Permitted" : "Unpermitted",
          `${a.deductionApplied} ETB`,
          a.permissionrequest?.reasonCategory || "No permission",
        ];
      }),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absences_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Success",
      description: "Absence records exported successfully",
    });
  };

  const totalDeductions = absences.reduce(
    (sum, a) => sum + a.deductionApplied,
    0
  );
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentMonthEffective =
    effectiveMonths.length > 0 &&
    effectiveMonths.includes(currentMonth.toString());

  useEffect(() => {
    loadConfig();
    loadAbsences();
  }, [loadConfig, loadAbsences]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
        <p className="text-black font-medium text-lg">
          Loading absence management...
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Please wait while we fetch the data
        </p>
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
                <FiAlertTriangle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Absence Management
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Manage teacher absences and salary deductions
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">
                    Records
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {absences.length}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiDollarSign className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">
                    Deductions
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {totalDeductions} ETB
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiClock className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">
                    Rate
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {deductionPerTimeSlot} ETB
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isCurrentMonthEffective ? (
                    <FiCheckCircle className="h-5 w-5 text-gray-600" />
                  ) : (
                    <FiXCircle className="h-5 w-5 text-gray-600" />
                  )}
                  <span className="text-xs font-semibold text-gray-600">
                    Status
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {isCurrentMonthEffective ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-sm text-gray-600">
                Current Month:{" "}
                {new Date().toLocaleDateString("en-US", { month: "long" })} -
                <span
                  className={`ml-2 font-semibold ${
                    isCurrentMonthEffective ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isCurrentMonthEffective
                    ? "Deductions Active"
                    : "Deductions Inactive"}
                </span>
              </div>
              <button
                onClick={exportCSV}
                disabled={!absences.length || loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
              >
                <FiDownload className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Package Deductions */}
        <PackageDeductionManager type="absence" />

        {/* Configuration */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiSettings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">
                  Global Deduction Configuration
                </h2>
                <p className="text-gray-600">
                  Configure fallback absence deduction settings
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10 space-y-8">
            {/* Note about package-specific deductions */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
              <h3 className="text-lg font-bold text-blue-900 mb-3">📦 Package-Based Deduction System</h3>
              <p className="text-blue-800 mb-3">
                Deductions are now calculated using package-specific base amounts configured above. 
                The settings below are only used for system configuration and months when deductions are active.
              </p>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">How it works:</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Each student package (0 Fee, 3 days, 5 days, Europe) has its own deduction rate</li>
                  <li>• When a teacher is absent, deductions are calculated per student's package</li>
                  <li>• Mixed classes get fair deductions based on each student's package value</li>
                  <li>• Default fallback rate of 25 ETB is used for unspecified packages</li>
                </ul>
              </div>
            </div>

            {/* Effective Months */}
            <div>
              <label className="block text-sm font-bold text-black mb-4">
                <FiCalendar className="inline h-4 w-4 mr-2" />
                Effective Months
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MONTHS.map((month) => (
                  <label
                    key={month.value}
                    className={`p-3 text-center rounded-xl border cursor-pointer transition-all duration-200 font-semibold ${
                      effectiveMonths.includes(month.value)
                        ? "bg-black text-white border-black"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={effectiveMonths.includes(month.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEffectiveMonths([...effectiveMonths, month.value]);
                        } else {
                          setEffectiveMonths(
                            effectiveMonths.filter((m) => m !== month.value)
                          );
                        }
                      }}
                      disabled={loading}
                    />
                    {month.label}
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Select months when deductions should be applied. No selection
                means deductions are inactive.
              </p>
            </div>

            {/* Sunday Exclusion */}
            <div>
              <label className="block text-sm font-bold text-black mb-4">
                <FiClock className="inline h-4 w-4 mr-2" />
                Sunday Exclusion
              </label>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeSundays}
                    onChange={(e) => setExcludeSundays(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
                  />
                  <div>
                    <span className="text-sm font-semibold text-black">
                      Exclude Sundays from absence deductions
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, no deductions will be applied for Sunday
                      absences as there are no scheduled classes
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <button
                onClick={saveConfig}
                disabled={loading}
                className={`flex-1 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                  loading ? "opacity-75" : ""
                }`}
              >
                {loading ? (
                  <FiLoader className="animate-spin h-4 w-4" />
                ) : (
                  <FiCheckCircle className="h-4 w-4" />
                )}
                Save Configuration
              </button>
              <button
                onClick={loadConfig}
                disabled={loading}
                className={`flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                  loading ? "opacity-75" : ""
                }`}
              >
                {loading ? (
                  <FiLoader className="animate-spin h-4 w-4" />
                ) : (
                  <FiRefreshCw className="h-4 w-4" />
                )}
                Reload Settings
              </button>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-black rounded-xl">
              <FiTrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">System Overview</h2>
              <p className="text-gray-600">Current absence management status</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`p-3 rounded-xl ${
                    isCurrentMonthEffective ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {isCurrentMonthEffective ? (
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <FiXCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">
                    Current Month
                  </h3>
                  <p className="text-gray-600">
                    {new Date().toLocaleDateString("en-US", { month: "long" })}
                  </p>
                </div>
              </div>
              <div
                className={`text-sm font-semibold ${
                  isCurrentMonthEffective ? "text-green-600" : "text-red-600"
                }`}
              >
                {isCurrentMonthEffective
                  ? "Deductions Active"
                  : "Deductions Inactive"}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiDollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">
                    Deduction Rate
                  </h3>
                  <p className="text-gray-600">Per absence</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-black">
                {deductionAmount} ETB
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FiClock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">
                    Effective Months
                  </h3>
                  <p className="text-gray-600">Active periods</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-black">
                {effectiveMonths.length === 0
                  ? "Inactive"
                  : `${effectiveMonths.length} Months`}
              </div>
            </div>
          </div>
        </div>

        {/* Deduction Rules Explanation */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <FiInfo className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">
                Absence Deduction Rules
              </h2>
              <p className="text-gray-600">
                How and when absence deductions are calculated
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deduction Logic */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <FiDollarSign className="h-5 w-5" />
                Calculation Method
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    🚫 Whole Day Absence
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    When teacher is absent for entire day or requests "Whole
                    Day" permission
                  </p>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <code className="text-blue-900 font-mono text-sm">
                      Deduction = {deductionAmount} ETB (Fixed Rate)
                    </code>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    ⏰ Time Slot Absence
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    When teacher misses specific time slots (30-min periods)
                  </p>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <code className="text-blue-900 font-mono text-sm">
                      Deduction = {deductionPerTimeSlot} ETB × Number of Missed
                      Slots
                    </code>
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    <strong>Example:</strong> 3 missed slots ={" "}
                    {deductionPerTimeSlot} × 3 ={" "}
                    {parseInt(deductionPerTimeSlot) * 3} ETB
                  </div>
                </div>
              </div>
            </div>

            {/* When Deductions Apply */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200">
              <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                <FiClock className="h-5 w-5" />
                When Deductions Apply
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-semibold text-red-800 text-sm">
                      No Attendance Submitted
                    </span>
                  </div>
                  <p className="text-xs text-red-700 ml-4">
                    Teacher didn't submit attendance for scheduled classes
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-semibold text-red-800 text-sm">
                      No Approved Permission
                    </span>
                  </div>
                  <p className="text-xs text-red-700 ml-4">
                    No permission request or request was declined
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-semibold text-red-800 text-sm">
                      Partial Permission Coverage
                    </span>
                  </div>
                  <p className="text-xs text-red-700 ml-4">
                    Permission covers some but not all missed time slots
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-3 border border-green-200 mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-800 text-sm">
                      No Deduction When
                    </span>
                  </div>
                  <p className="text-xs text-green-700 ml-4">
                    Approved permission covers all missed time slots
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Schedule */}
          <div className="mt-6 bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiRefreshCw className="h-5 w-5" />
              Automatic Processing Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">
                  📅 Daily Processing
                </h4>
                <p className="text-sm text-gray-600">
                  System checks for missing attendance every day at midnight
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">
                  🔍 Detection Method
                </h4>
                <p className="text-sm text-gray-600">
                  Compares teacher schedule with submitted attendance and
                  permissions
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">
                  💰 Salary Impact
                </h4>
                <p className="text-sm text-gray-600">
                  Deductions automatically applied to monthly salary
                  calculations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Absence Records */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">
                  Detailed Absence Records
                </h2>
                <p className="text-gray-600">
                  Complete absence history with deduction breakdowns
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {absences.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiUsers className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">
                  No Absence Records
                </h3>
                <p className="text-gray-600 text-xl">
                  No absence records found for the current period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Time Slots
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Deduction Calculation
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                        Detection Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {absences.slice(0, 20).map((absence, index) => {
                      let timeSlotsDisplay = "Full Day";
                      let slotsCount = 0;
                      let calculationDisplay = "";
                      let isWholeDay = false;

                      if (absence.timeSlots) {
                        try {
                          const slots = JSON.parse(absence.timeSlots);
                          if (slots.includes("Whole Day")) {
                            timeSlotsDisplay = "🚫 Whole Day";
                            calculationDisplay = `${deductionAmount} ETB (Fixed Rate)`;
                            isWholeDay = true;
                          } else {
                            slotsCount = slots.length;
                            timeSlotsDisplay = `⏰ ${slotsCount} Time Slot${
                              slotsCount > 1 ? "s" : ""
                            }`;
                            calculationDisplay = `${deductionPerTimeSlot} ETB × ${slotsCount} = ${absence.deductionApplied} ETB`;
                          }
                        } catch {
                          calculationDisplay = `${absence.deductionApplied} ETB (Legacy)`;
                        }
                      } else {
                        calculationDisplay = `${absence.deductionApplied} ETB (Legacy)`;
                      }

                      return (
                        <tr
                          key={absence.id}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                                {absence.wpos_wpdatatable_24.ustazname
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <div className="font-semibold text-black">
                                  {absence.wpos_wpdatatable_24.ustazname}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Detected:{" "}
                                  {new Date(
                                    absence.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-700 font-medium">
                              {new Date(absence.classDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(absence.classDate).toLocaleDateString(
                                "en-US",
                                { weekday: "long" }
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  isWholeDay
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {timeSlotsDisplay}
                              </span>
                              {absence.timeSlots &&
                                !isWholeDay &&
                                (() => {
                                  try {
                                    const slots = JSON.parse(absence.timeSlots);
                                    return (
                                      <div className="text-xs text-gray-500">
                                        {slots.slice(0, 2).join(", ")}
                                        {slots.length > 2 &&
                                          ` +${slots.length - 2} more`}
                                      </div>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">
                                {absence.deductionApplied} ETB
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {calculationDisplay}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  absence.permitted
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {absence.permitted
                                  ? "✅ Permitted"
                                  : "❌ Unpermitted"}
                              </span>
                              {absence.permissionrequest?.reasonCategory && (
                                <div className="text-xs text-gray-500">
                                  {absence.permissionrequest.reasonCategory}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  absence.reviewedByManager
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {absence.reviewedByManager
                                  ? "🤖 Auto-Detected"
                                  : "👁️ Manual Review"}
                              </span>
                              {absence.reviewNotes && (
                                <div
                                  className="text-xs text-gray-500 max-w-xs truncate"
                                  title={absence.reviewNotes}
                                >
                                  {absence.reviewNotes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

// Package Deduction Manager Component
function PackageDeductionManager({ type }: { type: 'lateness' | 'absence' }) {
  const [packageDeductions, setPackageDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPackageDeductions();
  }, []);

  const fetchPackageDeductions = async () => {
    try {
      const response = await fetch('/api/admin/package-deductions');
      if (response.ok) {
        const data = await response.json();
        setPackageDeductions(data);
      }
    } catch (error) {
      console.error('Failed to fetch package deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (packageName: string, amount: number) => {
    setSaving(packageName);
    try {
      const existing = packageDeductions.find(p => p.packageName === packageName);
      const payload = {
        packageName,
        latenessBaseAmount: type === 'lateness' ? amount : (existing?.latenessBaseAmount || 30),
        absenceBaseAmount: type === 'absence' ? amount : (existing?.absenceBaseAmount || 25)
      };

      const response = await fetch('/api/admin/package-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setNotification({ message: `${packageName} ${type} deduction updated`, type: 'success' });
        fetchPackageDeductions();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setNotification({ message: 'Failed to save package deduction', type: 'error' });
    } finally {
      setSaving(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const updateAmount = (packageName: string, amount: number) => {
    setPackageDeductions(prev => {
      const existing = prev.find(p => p.packageName === packageName);
      if (existing) {
        return prev.map(p => 
          p.packageName === packageName 
            ? { ...p, [type === 'lateness' ? 'latenessBaseAmount' : 'absenceBaseAmount']: amount }
            : p
        );
      } else {
        return [...prev, {
          id: 0,
          packageName,
          latenessBaseAmount: type === 'lateness' ? amount : 30,
          absenceBaseAmount: type === 'absence' ? amount : 25
        }];
      }
    });
  };

  const commonPackages = ['0 Fee', '3 days', '5 days', 'Europe'];

  if (loading) return <div className="animate-pulse bg-gray-200 h-32 rounded-lg mb-6"></div>;

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden mb-8">
      {notification && (
        <div className={`mb-4 p-3 rounded flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
        }`}>
          <FiCheck /> {notification.message}
        </div>
      )}
      
      <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-xl">
            <FiDollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">
              Package-Specific Absence Base Deductions
            </h2>
            <p className="text-gray-600">
              Set different base deduction amounts for each package type
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {commonPackages.map((packageName) => {
            const existing = packageDeductions.find(p => p.packageName === packageName);
            const currentAmount = existing?.[type === 'lateness' ? 'latenessBaseAmount' : 'absenceBaseAmount'] || (type === 'lateness' ? 30 : 25);

            return (
              <div key={packageName} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-black mb-2">{packageName}</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => updateAmount(packageName, Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => handleSave(packageName, currentAmount)}
                    disabled={saving === packageName}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-1"
                  >
                    {saving === packageName ? (
                      <FiLoader className="animate-spin h-4 w-4" />
                    ) : (
                      <FiCheck className="h-4 w-4" />
                    )}
                    {saving === packageName ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">How Package-Specific Deductions Work</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Each package type has its own base deduction amount</li>
            <li>• When calculating absence deductions, the system uses the student's package rate</li>
            <li>• For mixed classes, deductions are calculated per student's package</li>
            <li>• Global settings below are used as fallback for unspecified packages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
