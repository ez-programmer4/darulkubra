"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiCalendar, FiDollarSign, FiRefreshCw, FiDownload, FiCheckCircle, FiXCircle, FiSettings, FiAlertTriangle } from "react-icons/fi";

interface AbsenceRecord {
  id: number;
  teacherId: string;
  classDate: string;
  permitted: boolean;
  deductionApplied: number;
  wpos_wpdatatable_24: { ustazname: string };
  permissionrequest?: { reasonCategory: string };
}

export default function AbsenceManagement() {
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [deductionAmount, setDeductionAmount] = useState("50");
  const [effectiveMonths, setEffectiveMonths] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAbsences();
    loadConfig();
  }, [days]);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teachers/absences?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAbsences(data.absences || []);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load absences", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/teachers/absence-config");
      if (res.ok) {
        const data = await res.json();
        setDeductionAmount(String(data.deductionAmount ?? "50"));
        setEffectiveMonths(data.effectiveMonths || []);
      }
    } catch (error) {
      // ignore
    }
  };

  const exportCSV = () => {
    if (!absences.length) return;
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
    a.download = `my_absences_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalDeductions = absences.reduce((sum, a) => sum + (a.deductionApplied || 0), 0);
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentMonthEffective = effectiveMonths.length === 0 || effectiveMonths.includes(currentMonth.toString());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl shadow-lg">
                <FiAlertTriangle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-900 to-orange-900 bg-clip-text text-transparent">
                  My Absence Deductions
                </h1>
                <p className="text-gray-600 mt-2">Review your recorded absences and deductions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchAbsences} variant="outline" disabled={loading} className="shadow-lg">
                <FiRefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={exportCSV} variant="outline" disabled={!absences.length} className="shadow-lg">
                <FiDownload className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiSettings className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${isCurrentMonthEffective ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"}`}>
              <div className="text-sm font-medium text-gray-600">Current Month</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Date().toLocaleDateString("en-US", { month: "long" })}
              </div>
              <div className={`text-sm mt-1 ${isCurrentMonthEffective ? "text-green-600" : "text-red-600"}`}>
                {isCurrentMonthEffective ? "✓ Deductions Active" : "✗ Deductions Inactive"}
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="text-sm font-medium text-gray-600">Deduction Amount</div>
              <div className="text-2xl font-bold text-blue-900">{deductionAmount} ETB</div>
              <div className="text-sm text-blue-600 mt-1">Per absence</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="text-sm font-medium text-gray-600">Effective Months</div>
              <div className="text-lg font-bold text-purple-900">
                {effectiveMonths.length === 0 ? "All Months" : `${effectiveMonths.length} Months`}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                {effectiveMonths.length > 0 ? effectiveMonths.join(", ") : "Jan-Dec"}
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-white/20">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FiCalendar className="h-6 w-6 text-green-600" />
              View Period
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-w-sm">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-blue-900 mb-2">{absences.length}</div>
              <div className="text-blue-700 font-semibold">Total Absences</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-green-900 mb-2">{absences.filter((a) => a.permitted).length}</div>
              <div className="text-green-700 font-semibold">Permitted</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-red-900 mb-2">{absences.filter((a) => !a.permitted).length}</div>
              <div className="text-red-700 font-semibold">Unpermitted</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-orange-900 mb-2">{totalDeductions}</div>
              <div className="text-orange-700 font-semibold">Total Deductions (ETB)</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-white/20">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-t-xl">
            <CardTitle className="text-2xl">Absence Records ({absences.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600">Loading absence records...</p>
              </div>
            ) : absences.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Absences Found</h3>
                <p>No absence records found for the selected period.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="space-y-4">
                  {absences.map((absence) => (
                    <div key={absence.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Teacher</div>
                          <div className="font-semibold">{absence.wpos_wpdatatable_24?.ustazname || "Unknown"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Date</div>
                          <div>{new Date(absence.classDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Status</div>
                          <div>
                            {absence.permitted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                <FiCheckCircle className="h-3 w-3" />
                                Permitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                                <FiXCircle className="h-3 w-3" />
                                Unpermitted
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Deduction</div>
                          <div className="font-bold text-orange-600">{absence.deductionApplied} ETB</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Reason</div>
                          <div className="text-sm">{absence.permissionrequest?.reasonCategory || "No permission"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}