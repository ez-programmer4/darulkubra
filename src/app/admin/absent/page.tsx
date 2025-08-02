"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "@/components/ui/use-toast";
import { format, subDays } from "date-fns";

export default function AdminAbsentConfigPage() {
  const [deductionAmount, setDeductionAmount] = useState("");
  const [effectiveMonths, setEffectiveMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentConfig, setCurrentConfig] = useState<{
    deductionAmount: string;
    effectiveMonths: string[];
  } | null>(null);
  const [recentAbsences, setRecentAbsences] = useState<any[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/absence-settings");
        if (!res.ok) throw new Error("Failed to fetch absence config");
        const data = await res.json();
        setDeductionAmount(data.deductionAmount || "");
        setEffectiveMonths(data.effectiveMonths || []);
        setCurrentConfig({
          deductionAmount: data.deductionAmount || "",
          effectiveMonths: data.effectiveMonths || [],
        });
      } catch (e: any) {
        setError(e.message || "Failed to load config");
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
    fetchRecentAbsences();
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30); // Last 30 days
      const to = new Date();

      const res = await fetch(
        `/api/admin/attendance-stats?from=${
          from.toISOString().split("T")[0]
        }&to=${to.toISOString().split("T")[0]}`
      );
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      } finally {
      setLoadingStats(false);
    }
  }

  async function fetchRecentAbsences() {
    setLoadingAbsences(true);
    try {
      const res = await fetch("/api/admin/recent-absences");
      if (res.ok) {
        const data = await res.json();
        setRecentAbsences(data.absences || []);
      }
    } catch (error) {
      } finally {
      setLoadingAbsences(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (
        !deductionAmount ||
        isNaN(Number(deductionAmount)) ||
        Number(deductionAmount) <= 0
      ) {
        setError("Please enter a valid deduction amount.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/admin/absence-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductionAmount,
          effectiveMonths,
        }),
      });
      if (!res.ok) throw new Error("Failed to save absence config");
      setSuccess("Absence deduction config saved!");
      setCurrentConfig({
        deductionAmount,
        effectiveMonths,
      });
      toast({
        title: "Saved!",
        description: "Absence deduction config updated.",
      });
    } catch (e: any) {
      setError(e.message || "Failed to save config");
      toast({
        title: "Error",
        description: e.message || "Failed to save config",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      {/* Current Configuration Display */}
      {currentConfig && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-green-700">
              Current Configuration
            </CardTitle>
            <CardDescription className="text-green-600">
              Active absence deduction settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-semibold text-green-800">
                  Deduction Amount
                </div>
                <div className="text-lg font-bold text-green-900">
                  {currentConfig.deductionAmount
                    ? `${currentConfig.deductionAmount} ETB per day`
                    : "Not set"}
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-semibold text-green-800">
                  Effective Months
                </div>
                <div className="text-lg font-bold text-green-900">
                  {currentConfig.effectiveMonths.length > 0
                    ? currentConfig.effectiveMonths
                        .map((month) => {
                          const monthNames = [
                            "January",
                            "February",
                            "March",
                            "April",
                            "May",
                            "June",
                            "July",
                            "August",
                            "September",
                            "October",
                            "November",
                            "December",
                          ];
                          return monthNames[parseInt(month) - 1];
                        })
                        .join(", ")
                    : "All months"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">
            Unpermitted Absence Deduction Config
          </CardTitle>
          <CardDescription className="text-blue-600">
            Set the deduction amount (ETB) for each unpermitted teacher absence
            and select the months it applies to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-blue-800">
              Deduction Amount (ETB)
            </label>
            <Input
              type="number"
              min={1}
              value={deductionAmount}
              onChange={(e) => setDeductionAmount(e.target.value)}
              placeholder="e.g., 50"
              className="max-w-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-blue-800">
              Effective Months
            </label>
            <MultiSelect
              options={months}
              onValueChange={setEffectiveMonths}
              defaultValue={effectiveMonths}
              placeholder="Select applicable months..."
              className="max-w-md"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? "Saving..." : "Save Config"}
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Recent Absence Records */}

      {/* Enhanced Attendance Statistics */}
      {stats && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-blue-900">
                  📊 Attendance Analytics Dashboard
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Comprehensive overview of teacher attendance patterns and
                  financial impact
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStats}
                  disabled={loadingStats}
                >
                  {loadingStats ? "🔄" : "🔄"} Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const from = new Date();
                    from.setDate(from.getDate() - 7);
                    const to = new Date();
                    fetchStats();
                  }}
                >
                  📅 Last 7 Days
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Absences */}
              <div className="relative p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">
                      Total Absences
                    </p>
                    <p className="text-3xl font-bold text-red-700">
                      {stats.totalAbsences}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Last 30 days</p>
                  </div>
                  <div className="text-4xl text-red-300">📉</div>
                </div>
              </div>

              {/* Total Deductions */}
              <div className="relative p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">
                      Total Deductions
                    </p>
                    <p className="text-3xl font-bold text-orange-700">
                      {stats.totalDeductions} ETB
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Financial impact
                    </p>
                  </div>
                  <div className="text-4xl text-orange-300">💰</div>
                </div>
              </div>

              {/* Teachers Affected */}
              <div className="relative p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">
                      Teachers Affected
                    </p>
                    <p className="text-3xl font-bold text-yellow-700">
                      {stats.teachersWithAbsences}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Unique teachers
                    </p>
                  </div>
                  <div className="text-4xl text-yellow-300">👥</div>
                </div>
              </div>

              {/* Average Absences */}
              <div className="relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Avg. Per Teacher
                    </p>
                    <p className="text-3xl font-bold text-blue-700">
                      {stats.teachersWithAbsences > 0
                        ? (
                            stats.totalAbsences / stats.teachersWithAbsences
                          ).toFixed(1)
                        : 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Absences per teacher
                    </p>
                  </div>
                  <div className="text-4xl text-blue-300">📊</div>
                </div>
              </div>
            </div>

            {/* Most Absent Teacher */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                🏆 Most Absent Teacher
              </h4>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-600">
                        {stats.mostAbsentTeacher.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900">
                        {stats.mostAbsentTeacher.name}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {stats.mostAbsentTeacher.absences} absences •{" "}
                        {stats.mostAbsentTeacher.deductions} ETB deducted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.mostAbsentTeacher.absences}
                    </div>
                    <div className="text-sm text-gray-500">absences</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Absences by Day */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                📅 Absences by Day of Week
              </h4>
              <div className="grid grid-cols-7 gap-3">
                {[
                  { day: "Monday", emoji: "1️⃣" },
                  { day: "Tuesday", emoji: "2️⃣" },
                  { day: "Wednesday", emoji: "3️⃣" },
                  { day: "Thursday", emoji: "4️⃣" },
                  { day: "Friday", emoji: "5️⃣" },
                  { day: "Saturday", emoji: "6️⃣" },
                  { day: "Sunday", emoji: "7️⃣" },
                ].map(({ day, emoji }) => (
                  <div
                    key={day}
                    className="text-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="text-2xl mb-2">{emoji}</div>
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      {day.slice(0, 3)}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.absencesByDay[day] || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">absences</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                ⏰ Recent Activity
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Last updated: {new Date().toLocaleString()}</span>
                  <span>Data covers: Last 30 days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
