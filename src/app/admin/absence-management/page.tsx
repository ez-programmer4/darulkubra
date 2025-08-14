"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiDownload,
  FiDollarSign,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiXCircle,
} from "react-icons/fi";

interface AbsenceRecord {
  id: number;
  teacherId: string;
  classDate: string;
  permitted: boolean;
  deductionApplied: number;
  wpos_wpdatatable_24: { ustazname: string };
  permissionrequest?: { reasonCategory: string | null } | null;
}

export default function AbsenceManagement() {
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<string>("30");
  const [deductionAmount, setDeductionAmount] = useState<string>("50");
  const [effectiveMonths, setEffectiveMonths] = useState<string[]>([]);

  // UI filters
  const [statusFilter, setStatusFilter] = useState<"all" | "permitted" | "unpermitted">("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    fetchAbsences();
  }, [days]);

  useEffect(() => {
    loadConfig();
  }, []);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/live-absences?days=${days}`);
      if (!res.ok) throw new Error("Failed to load absences");
      const data = await res.json();
      setAbsences(data.absences || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load absences", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/admin/absence-config");
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();
      setDeductionAmount(String(data.deductionAmount || "50"));
      setEffectiveMonths(Array.isArray(data.effectiveMonths) ? data.effectiveMonths : []);
    } catch (error) {
      // silent
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch("/api/admin/absence-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductionAmount, effectiveMonths }),
      });
      if (!res.ok) throw new Error("Failed to save configuration");
      toast({ title: "Success", description: "Configuration saved successfully" });
      fetchAbsences();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save configuration", variant: "destructive" });
    }
  };

  const filteredAbsences = useMemo(() => {
    return absences.filter((a) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "permitted" && a.permitted) ||
        (statusFilter === "unpermitted" && !a.permitted);
      const matchesSearch = a.wpos_wpdatatable_24?.ustazname
        ?.toLowerCase()
        .includes(search.toLowerCase().trim());
      return matchesStatus && (search.trim() === "" ? true : !!matchesSearch);
    });
  }, [absences, statusFilter, search]);

  const exportCSV = () => {
    const source = filteredAbsences.length ? filteredAbsences : absences;
    if (!source.length) return;
    const csv = [
      ["Teacher", "Date", "Status", "Deduction", "Reason"],
      ...source.map((a) => [
        a.wpos_wpdatatable_24?.ustazname ?? "Unknown",
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
  };

  const totalDeductions = (filteredAbsences.length ? filteredAbsences : absences).reduce(
    (sum, a) => sum + (Number(a.deductionApplied) || 0),
    0
  );
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentMonthEffective =
    effectiveMonths.length === 0 || effectiveMonths.includes(currentMonth.toString());

  const monthAbbr: Record<string, string> = {
    "1": "Jan",
    "2": "Feb",
    "3": "Mar",
    "4": "Apr",
    "5": "May",
    "6": "Jun",
    "7": "Jul",
    "8": "Aug",
    "9": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl shadow-lg">
                <FiAlertTriangle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-900 to-orange-900 bg-clip-text text-transparent">
                  Teacher Absence Deductions
                </h1>
                <p className="text-gray-600 mt-1 md:mt-2">
                  Live absence detection and salary deduction management
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={exportCSV} variant="outline" disabled={!absences.length} className="shadow-lg w-full md:w-auto">
                <FiDownload className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button onClick={fetchAbsences} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg w-full md:w-auto">
                <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{filteredAbsences.length || absences.length}</div>
              <div className="text-gray-600 font-semibold">Total Absences</div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{(filteredAbsences.length ? filteredAbsences : absences).filter((a) => a.permitted).length}</div>
              <div className="text-gray-600 font-semibold">Permitted</div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-red-600 mb-2">{(filteredAbsences.length ? filteredAbsences : absences).filter((a) => !a.permitted).length}</div>
              <div className="text-gray-600 font-semibold">Unpermitted</div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{totalDeductions} ETB</div>
              <div className="text-gray-600 font-semibold">Total Deductions</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Days</Label>
              <Select value={days} onValueChange={(v) => setDays(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  {["7", "14", "30", "60", "90"].map((d) => (
                    <SelectItem key={d} value={d}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Status</Label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="permitted">Permitted</SelectItem>
                  <SelectItem value="unpermitted">Unpermitted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-semibold text-gray-700">Search Teacher</Label>
              <div className="relative mt-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type teacher name..." className="pl-9" />
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiSettings className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${isCurrentMonthEffective ? "bg-green-50 border-2 border-green-200" : "bg-red-50 border-2 border-red-200"}`}>
              <div className="text-sm font-medium text-gray-600">Current Month</div>
              <div className="text-2xl font-bold text-gray-900">{new Date().toLocaleDateString("en-US", { month: "long" })}</div>
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
                {effectiveMonths.length > 0 ? effectiveMonths.map((m) => monthAbbr[m] || m).join(", ") : "Jan-Dec"}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-white/20">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FiSettings className="h-6 w-6 text-blue-600" /> Deduction Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <FiDollarSign className="h-5 w-5 text-orange-600" /> Deduction Amount (ETB)
                </Label>
                <Input type="number" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} placeholder="50" className="text-lg p-4 border-2 focus:border-orange-500" />
              </div>
            </div>
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Effective Months (when deductions apply)</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
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
                ].map((month) => (
                  <label
                    key={month.value}
                    className={`p-3 text-center rounded-xl border-2 cursor-pointer transition-all duration-200 font-semibold ${
                      effectiveMonths.includes(month.value)
                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 text-white shadow-lg transform scale-105"
                        : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={effectiveMonths.includes(month.value)}
                      onChange={(e) => {
                        if (e.target.checked) setEffectiveMonths([...effectiveMonths, month.value]);
                        else setEffectiveMonths(effectiveMonths.filter((m) => m !== month.value));
                      }}
                    />
                    {month.label}
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                💡 Select months where absence deductions should be applied. Leave empty to apply to all months.
              </p>
            </div>
            <div className="flex gap-4 pt-4 border-t">
              <Button onClick={saveConfig} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-lg shadow-lg">
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Absence Records Table */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FiCalendar className="text-indigo-600" /> Absence Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 animate-pulse space-y-3">
                <div className="h-5 bg-gray-100 rounded" />
                <div className="h-5 bg-gray-100 rounded" />
                <div className="h-5 bg-gray-100 rounded" />
              </div>
            ) : (filteredAbsences.length ? filteredAbsences : absences).length === 0 ? (
              <div className="p-6 text-center text-gray-500">No absences found for the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Deduction</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(filteredAbsences.length ? filteredAbsences : absences).map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{a.wpos_wpdatatable_24?.ustazname ?? "Unknown"}</td>
                        <td className="px-6 py-3 text-gray-700 flex items-center gap-2"><FiCalendar className="text-indigo-500" /> {new Date(a.classDate).toLocaleDateString()}</td>
                        <td className="px-6 py-3">
                          {a.permitted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <FiCheckCircle /> Permitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              <FiXCircle /> Unpermitted
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-red-600 font-semibold">-{a.deductionApplied} ETB</td>
                        <td className="px-6 py-3 text-gray-700">{a.permissionrequest?.reasonCategory || "No permission"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}