"use client";
import React, { useEffect, useState } from "react";
import {
  FiEdit,
  FiTrash2,
  FiPlus,
  FiCheck,
  FiX,
  FiLoader,
  FiGlobe,
  FiUser,
  FiClock,
} from "react-icons/fi";

const API_URL = "/api/admin/lateness-deduction-config";

export default function LatenessDeductionConfigManager() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({
    excusedThreshold: 3,
    tier: 1,
    startMinute: 4,
    endMinute: 7,
    deductionPercent: 10,
    isGlobal: true,
    teacherId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch lateness config");
      setConfigs(await res.json());
    } catch (e: any) {
      setError(e.message || "Failed to load config");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev: any) => ({
      ...prev,
      [name]:
        type === "checkbox" && e.target instanceof HTMLInputElement
          ? e.target.checked
          : value,
    }));
  }

  function startEdit(config: any) {
    setEditingId(config.id);
    setForm({ ...config });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      excusedThreshold: 3,
      tier: 1,
      startMinute: 4,
      endMinute: 7,
      deductionPercent: 10,
      isGlobal: true,
      teacherId: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = {
        ...form,
        tier: Number(form.tier),
        startMinute: Number(form.startMinute),
        endMinute: Number(form.endMinute),
        deductionPercent: Number(form.deductionPercent),
        excusedThreshold: Number(form.excusedThreshold),
        teacherId: form.isGlobal ? null : form.teacherId || null,
      };
      const res = await fetch(API_URL, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...body, id: editingId } : body),
      });
      if (!res.ok) throw new Error("Failed to save config");
      setSuccess(editingId ? "Rule updated!" : "Rule added!");
      setEditingId(null);
      setForm({
        excusedThreshold: 3,
        tier: 1,
        startMinute: 4,
        endMinute: 7,
        deductionPercent: 10,
        isGlobal: true,
        teacherId: "",
      });
      fetchConfigs();
    } catch (e: any) {
      setError(e.message || "Failed to save config");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this lateness rule?")) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete config");
      setSuccess("Rule deleted!");
      fetchConfigs();
    } catch (e: any) {
      setError(e.message || "Failed to delete config");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-10 bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
        <FiClock /> Lateness Deduction Rules
      </h2>
      <p className="mb-6 text-gray-600 text-sm">
        Configure lateness deduction tiers and excused thresholds. These rules
        determine how much is deducted from the daily rate based on lateness.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
          <FiX /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded flex items-center gap-2">
          <FiCheck /> {success}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Excused Lateness Threshold (min)
            <input
              type="number"
              name="excusedThreshold"
              min={0}
              value={form.excusedThreshold}
              onChange={handleInputChange}
              className="mt-1 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Tier
            <input
              type="number"
              name="tier"
              min={1}
              value={form.tier}
              onChange={handleInputChange}
              className="mt-1 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Start Minute (inclusive)
            <input
              type="number"
              name="startMinute"
              min={0}
              value={form.startMinute}
              onChange={handleInputChange}
              className="mt-1 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            End Minute (inclusive)
            <input
              type="number"
              name="endMinute"
              min={0}
              value={form.endMinute}
              onChange={handleInputChange}
              className="mt-1 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </label>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Deduction Percentage (%)
            <input
              type="number"
              name="deductionPercent"
              min={0}
              max={100}
              value={form.deductionPercent}
              onChange={handleInputChange}
              className="mt-1 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
            Global Rule
            <input
              type="checkbox"
              name="isGlobal"
              checked={form.isGlobal}
              onChange={handleInputChange}
              className="ml-2 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">
              (If unchecked, applies to a specific teacher)
            </span>
          </label>
          {!form.isGlobal && (
            <label className="block text-sm font-semibold text-gray-700">
              Teacher ID
              <input
                type="text"
                name="teacherId"
                value={form.teacherId}
                onChange={handleInputChange}
                className="mt-1 w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </label>
          )}
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (
                <FiLoader className="animate-spin" />
              ) : editingId ? (
                <FiEdit />
              ) : (
                <FiPlus />
              )}{" "}
              {editingId ? "Update Rule" : "Add Rule"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold shadow hover:bg-gray-300 transition-colors"
              >
                <FiX /> Cancel
              </button>
            )}
          </div>
        </div>
      </form>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                Tier
              </th>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                Excused Threshold
              </th>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                Start
              </th>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                End
              </th>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                Deduction (%)
              </th>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                Scope
              </th>
              <th className="px-4 py-2 text-left font-bold text-blue-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {configs.map((c) => (
              <tr key={c.id} className="hover:bg-blue-50 transition">
                <td className="px-4 py-2 font-semibold text-blue-900">
                  {c.tier}
                </td>
                <td className="px-4 py-2">{c.excusedThreshold}</td>
                <td className="px-4 py-2">{c.startMinute}</td>
                <td className="px-4 py-2">{c.endMinute}</td>
                <td className="px-4 py-2 font-bold text-blue-700">
                  {c.deductionPercent}%
                </td>
                <td className="px-4 py-2">
                  {c.isGlobal ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                      <FiGlobe /> Global
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">
                      <FiUser /> {c.teacherId}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => startEdit(c)}
                    className="p-2 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition"
                    title="Edit"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
            {configs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">
                  No lateness deduction rules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
