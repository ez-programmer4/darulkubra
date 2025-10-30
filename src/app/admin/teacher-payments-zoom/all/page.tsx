"use client";

import React, { useState } from "react";

export default function TeacherPaymentsZoomAll() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    setData([]);
    try {
      const q = new URLSearchParams({ from, to }).toString();
      const res = await fetch(`/api/teacher-payments/zoom-based/all?${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setData(json.data || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Zoom-based Payments — All Teachers
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
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
          disabled={loading || !from || !to}
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="p-2">Teacher</th>
              <th className="p-2">Name</th>
              <th className="p-2">Worked</th>
              <th className="p-2">Expected</th>
              <th className="p-2">Avg Daily</th>
              <th className="p-2">Base</th>
              <th className="p-2">Deductions</th>
              <th className="p-2">Total</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.teacherId} className="border-t">
                <td className="p-2 font-medium">{row.teacherId}</td>
                <td className="p-2">{row.teacherName || "-"}</td>
                <td className="p-2">{row.summary?.workedDays ?? "-"}</td>
                <td className="p-2">{row.summary?.expectedDays ?? "-"}</td>
                <td className="p-2">ETB {row.summary?.avgDailyRate ?? 0}</td>
                <td className="p-2">ETB {row.summary?.baseSalary ?? 0}</td>
                <td className="p-2">ETB {row.summary?.totalDeductions ?? 0}</td>
                <td className="p-2 font-semibold">
                  ETB {row.summary?.totalSalary ?? 0}
                </td>
                <td className="p-2">
                  <a
                    className="text-blue-600 underline"
                    href={`/admin/teacher-payments-zoom?teacherId=${encodeURIComponent(
                      row.teacherId
                    )}&from=${from}&to=${to}`}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={8}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
