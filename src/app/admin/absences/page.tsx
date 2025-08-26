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
} from "react-icons/fi";

interface AbsenceRecord {
  id: number;
  teacherId: string;
  classDate: string;
  permitted: boolean;
  deductionApplied: number;
  wpos_wpdatatable_24: { ustazname: string };
  permissionrequest?: { reasonCategory: string };
}

interface ConfigResponse {
  deductionAmount: string;
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
  const [effectiveMonths, setEffectiveMonths] = useState<string[]>([]);
  const [excludeSundays, setExcludeSundays] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/absence-config");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: ConfigResponse = await res.json();
      setDeductionAmount(data.deductionAmount || "50");
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
      if (parseFloat(deductionAmount) <= 0) {
        throw new Error("Deduction amount must be positive");
      }
      const res = await fetch("/api/admin/absence-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductionAmount, effectiveMonths, excludeSundays }),
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
      ["Teacher", "Date", "Status", "Deduction", "Reason"],
      ...absences.map((a) => [
        a.wpos_wpdatatable_24.ustazname,
        new Date(a.classDate).toLocaleDateString(),
        a.permitted ? "Permitted" : "Unpermitted",
        `${a.deductionApplied} ETB`,
        a.permissionrequest?.reasonCategory || "No permission",
      ]),
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

  const totalDeductions = absences.reduce((sum, a) => sum + a.deductionApplied, 0);
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentMonthEffective = effectiveMonths.length > 0 && effectiveMonths.includes(currentMonth.toString());

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
        <p className="text-black font-medium text-lg">Loading absence management...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
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
                  <span className="text-xs font-semibold text-gray-600">Records</span>
                </div>
                <div className="text-2xl font-bold text-black">{absences.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiDollarSign className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Deductions</span>
                </div>
                <div className="text-2xl font-bold text-black">{totalDeductions} ETB</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiClock className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Rate</span>
                </div>
                <div className="text-2xl font-bold text-black">{deductionAmount} ETB</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isCurrentMonthEffective ? (
                    <FiCheckCircle className="h-5 w-5 text-gray-600" />
                  ) : (
                    <FiXCircle className="h-5 w-5 text-gray-600" />
                  )}
                  <span className="text-xs font-semibold text-gray-600">Status</span>
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
                Current Month: {new Date().toLocaleDateString("en-US", { month: "long" })} - 
                <span className={`ml-2 font-semibold ${isCurrentMonthEffective ? "text-green-600" : "text-red-600"}`}>
                  {isCurrentMonthEffective ? "Deductions Active" : "Deductions Inactive"}
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

        {/* Configuration */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiSettings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Deduction Configuration</h2>
                <p className="text-gray-600">Configure absence deduction settings</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10 space-y-8">
            {/* Deduction Amount */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold text-black mb-3">
                  <FiDollarSign className="inline h-4 w-4 mr-2" />
                  Deduction Amount (ETB)
                </label>
                <input
                  type="number"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">Current Rate</p>
                  <div className="text-3xl font-bold text-black">{deductionAmount} ETB</div>
                  <p className="text-sm text-gray-500 mt-1">Per absence</p>
                </div>
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
                          setEffectiveMonths(effectiveMonths.filter((m) => m !== month.value));
                        }
                      }}
                      disabled={loading}
                    />
                    {month.label}
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Select months when deductions should be applied. No selection means deductions are inactive.
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
                      When enabled, no deductions will be applied for Sunday absences as there are no scheduled classes
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
                <div className={`p-3 rounded-xl ${isCurrentMonthEffective ? "bg-green-100" : "bg-red-100"}`}>
                  {isCurrentMonthEffective ? (
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <FiXCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Current Month</h3>
                  <p className="text-gray-600">
                    {new Date().toLocaleDateString("en-US", { month: "long" })}
                  </p>
                </div>
              </div>
              <div className={`text-sm font-semibold ${isCurrentMonthEffective ? "text-green-600" : "text-red-600"}`}>
                {isCurrentMonthEffective ? "Deductions Active" : "Deductions Inactive"}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiDollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Deduction Rate</h3>
                  <p className="text-gray-600">Per absence</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-black">{deductionAmount} ETB</div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FiClock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Effective Months</h3>
                  <p className="text-gray-600">Active periods</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-black">
                {effectiveMonths.length === 0 ? "Inactive" : `${effectiveMonths.length} Months`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}