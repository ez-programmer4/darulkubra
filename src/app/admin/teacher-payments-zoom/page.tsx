"use client";

import React, { useState } from "react";

export default function TeacherPaymentsZoom() {
  const [teacherId, setTeacherId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const q = new URLSearchParams({ teacherId, from, to }).toString();
      const res = await fetch(`/api/teacher-payments/zoom-based?${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setData(json);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Zoom-based Teacher Payments</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="Teacher ID (e.g., U271)"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="From (YYYY-MM-DD)"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="To (YYYY-MM-DD)"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button
          onClick={load}
          disabled={loading || !teacherId || !from || !to}
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Calculate"}
        </button>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {data && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white shadow">
            <h2 className="text-lg font-semibold mb-2">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded bg-gray-50">
                <div className="text-gray-500">Worked Days</div>
                <div className="font-bold">{data.summary.workedDays}</div>
              </div>
              <div className="p-3 rounded bg-gray-50">
                <div className="text-gray-500">Expected Days</div>
                <div className="font-bold">{data.summary.expectedDays}</div>
              </div>
              <div className="p-3 rounded bg-gray-50">
                <div className="text-gray-500">Avg Daily Rate</div>
                <div className="font-bold">ETB {data.summary.avgDailyRate}</div>
              </div>
              <div className="p-3 rounded bg-gray-50">
                <div className="text-gray-500">Base Salary</div>
                <div className="font-bold">ETB {data.summary.baseSalary}</div>
              </div>
              <div className="p-3 rounded bg-gray-50">
                <div className="text-gray-500">Deductions</div>
                <div className="font-bold">
                  ETB {data.summary.totalDeductions}
                </div>
              </div>
              <div className="p-3 rounded bg-gray-50">
                <div className="text-gray-500">Total Salary</div>
                <div className="font-bold">ETB {data.summary.totalSalary}</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white shadow">
            <h2 className="text-lg font-semibold mb-2">Worked Dates</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {data.breakdown.workedDates.map((d: string) => (
                <span
                  key={d}
                  className="px-2 py-1 rounded bg-green-100 text-green-700"
                >
                  {d}
                </span>
              ))}
              {data.breakdown.workedDates.length === 0 && (
                <div className="text-gray-500">No worked dates</div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white shadow">
            <h2 className="text-lg font-semibold mb-2">Absence Deductions</h2>
            <div className="space-y-2 text-sm">
              {data.breakdown.absences.length === 0 && (
                <div className="text-gray-500">No absences</div>
              )}
              {data.breakdown.absences.map((a: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded bg-gray-50"
                >
                  <span>{a.date}</span>
                  <span className="text-gray-500">{a.reason}</span>
                  <span className="font-bold">ETB {a.deduction}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white shadow">
            <h2 className="text-lg font-semibold mb-2">Lateness Deductions</h2>
            <div className="space-y-2 text-sm">
              {!data.breakdown.lateness ||
              data.breakdown.lateness.length === 0 ? (
                <div className="text-gray-500">No lateness</div>
              ) : (
                data.breakdown.lateness.map((l: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded bg-gray-50"
                  >
                    <span>{l.date}</span>
                    <span className="text-gray-500">{l.minutes} min</span>
                    <span className="font-bold">ETB {l.deduction}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white shadow">
            <h2 className="text-lg font-semibold mb-2">Student Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="p-2">Student ID</th>
                    <th className="p-2">Package</th>
                    <th className="p-2">Daypackage</th>
                    <th className="p-2">Worked</th>
                    <th className="p-2">Daily Rate</th>
                    <th className="p-2">Base</th>
                    <th className="p-2">Absence</th>
                    <th className="p-2">Lateness</th>
                    <th className="p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.students?.map((s: any) => (
                    <tr key={s.studentId} className="border-t">
                      <td className="p-2">{s.studentId}</td>
                      <td className="p-2">{s.package || "-"}</td>
                      <td className="p-2">{s.daypackage || "-"}</td>
                      <td className="p-2">{s.workedDays}</td>
                      <td className="p-2">ETB {s.dailyRate}</td>
                      <td className="p-2">ETB {s.baseSalary}</td>
                      <td className="p-2">ETB {s.absenceDeduction}</td>
                      <td className="p-2">ETB {s.latenessDeduction}</td>
                      <td className="p-2 font-semibold">ETB {s.totalSalary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
