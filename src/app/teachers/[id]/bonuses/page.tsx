"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const canManage = (role: string) => role === "admin" || role === "controller";

export default function TeacherBonusesPage() {
  const params = useParams();
  const teacherId = params?.id as string;
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ period: "", amount: "", reason: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetchBonuses();
    fetchUserRole();
  }, [teacherId]);

  async function fetchBonuses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teachers/${teacherId}/bonuses`);
      if (!res.ok) throw new Error("Failed to fetch bonus records");
      setBonuses(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserRole() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      setUserRole(data.user?.role || "");
    } catch {}
  }

  function openModal() {
    setForm({ period: "", amount: "", reason: "" });
    setFormError(null);
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setFormError(null);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      if (!form.period || !form.amount || !form.reason) {
        setFormError("All fields are required");
        return;
      }
      const res = await fetch(`/api/teachers/${teacherId}/bonuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: form.period,
          amount: parseFloat(form.amount),
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Failed to add bonus");
        return;
      }
      closeModal();
      fetchBonuses();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Teacher Bonus Records
      </h1>
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">
          All bonus records for this teacher.
        </span>
        {canManage(userRole) && (
          <button
            onClick={openModal}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded shadow"
          >
            + Add Bonus
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-center py-8 text-blue-600">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full bg-white">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                  Period
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                  Reason
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {bonuses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-8">
                    No bonus records found.
                  </td>
                </tr>
              ) : (
                bonuses.map((bonus) => (
                  <tr
                    key={bonus.id}
                    className="border-b hover:bg-blue-50 transition"
                  >
                    <td className="px-4 py-2 text-blue-900 font-medium">
                      {bonus.period}
                    </td>
                    <td className="px-4 py-2">{bonus.amount}</td>
                    <td className="px-4 py-2">{bonus.reason}</td>
                    <td className="px-4 py-2">
                      {bonus.createdAt
                        ? new Date(bonus.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-2 p-6 relative animate-fade-in">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-blue-800 mb-4">Add Bonus</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Period
                </label>
                <input
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={form.period}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, period: e.target.value }))
                  }
                  placeholder="e.g. 2024-07"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  min={0}
                  step={0.01}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Reason
                </label>
                <input
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  required
                />
              </div>
              {formError && (
                <div className="text-red-600 text-sm">{formError}</div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={classNames(
                    "px-4 py-2 rounded font-semibold text-white",
                    submitting ? "bg-teal-300" : "bg-teal-600 hover:bg-teal-700"
                  )}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Add Bonus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease;
        }
      `}</style>
    </div>
  );
}
