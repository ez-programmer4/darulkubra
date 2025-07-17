"use client";

import { useState, useEffect } from "react";

// Define the ControllerEarning type
interface ControllerEarning {
  id: string;
  controllerUsername: string;
  studentId: string;
  amount: number;
  createdAt: string;
  paidOut: boolean;
}

function ControllerEarningsAdmin() {
  const [earnings, setEarnings] = useState<ControllerEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ controller: "", paidOut: "" });
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    let url = "/api/admin/controller-earnings";
    const params = [];
    if (filter.controller)
      params.push(`controllerUsername=${filter.controller}`);
    if (filter.paidOut) params.push(`paidOut=${filter.paidOut}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url)
      .then((res) => res.json())
      .then(setEarnings)
      .catch((e) => setError(e.message || "Failed to fetch earnings"))
      .finally(() => setLoading(false));
  }, [filter]);
  const markPaid = async () => {
    await fetch("/api/admin/controller-earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });
    setSelected([]);
    setLoading(true);
    // refetch
    let url = "/api/admin/controller-earnings";
    const params = [];
    if (filter.controller)
      params.push(`controllerUsername=${filter.controller}`);
    if (filter.paidOut) params.push(`paidOut=${filter.paidOut}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url)
      .then((res) => res.json())
      .then(setEarnings)
      .catch((e) => setError(e.message || "Failed to fetch earnings"))
      .finally(() => setLoading(false));
  };
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100">
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-indigo-800">
          Controller Earnings
        </h1>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder="Controller username"
            value={filter.controller}
            onChange={(e) =>
              setFilter((f) => ({ ...f, controller: e.target.value }))
            }
            className="pl-3 pr-4 py-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
          />
          <select
            value={filter.paidOut}
            onChange={(e) =>
              setFilter((f) => ({ ...f, paidOut: e.target.value }))
            }
            className="p-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
          >
            <option value="">All</option>
            <option value="true">Paid Out</option>
            <option value="false">Not Paid</option>
          </select>
          <button
            onClick={markPaid}
            disabled={!selected.length}
            className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 shadow disabled:opacity-50 transition-all"
          >
            Mark as Paid
          </button>
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto border border-indigo-100 rounded-xl">
          <table className="min-w-full divide-y divide-indigo-200">
            <thead className="bg-indigo-100">
              <tr>
                <th></th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Controller
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Paid Out
                </th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(e.id)}
                      onChange={(ev) =>
                        setSelected((sel) =>
                          ev.target.checked
                            ? [...sel, e.id]
                            : sel.filter((id) => id !== e.id)
                        )
                      }
                    />
                  </td>
                  <td className="px-6 py-2 text-indigo-900 font-medium">
                    {e.controllerUsername}
                  </td>
                  <td className="px-6 py-2">{e.studentId}</td>
                  <td className="px-6 py-2 font-semibold text-green-700">
                    ${Number(e.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-2">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-2 font-semibold">
                    {e.paidOut ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-yellow-600">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ControllerEarningsPage() {
  return (
    <div className="min-h-screen bg-indigo-50 py-10 px-2">
      <div className="max-w-5xl mx-auto">
        <ControllerEarningsAdmin />
      </div>
    </div>
  );
}
