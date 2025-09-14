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
  FiDollarSign,
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
    isUnlimited: false,
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
      isUnlimited: false,
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
        isUnlimited: false,
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
    <>
      {/* Package Base Deductions Section */}
      <PackageDeductionManager type="lateness" />

      <section className="mb-10">
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
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border-2 border-gray-200 p-8 mb-10">
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`p-4 rounded-2xl shadow-lg ${
                editingId
                  ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                  : "bg-gradient-to-br from-green-500 to-emerald-500"
              }`}
            >
              {editingId ? (
                <FiEdit className="h-8 w-8 text-white" />
              ) : (
                <FiPlus className="h-8 w-8 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {editingId
                  ? "✏️ Edit Deduction Tier"
                  : "➕ Add New Deduction Tier"}
              </h3>
              <p className="text-gray-600 text-lg">
                {editingId
                  ? "Modify existing tier configuration"
                  : "Create a new deduction tier with custom rules"}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Basic Configuration
                </h4>

                <label className="block text-sm font-bold text-blue-800 mb-3">
                  Grace Period (minutes)
                  <input
                    type="number"
                    name="excusedThreshold"
                    min={0}
                    max={60}
                    value={form.excusedThreshold}
                    onChange={handleInputChange}
                    className="mt-1 w-full border-2 border-blue-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  />
                  <span className="text-xs text-blue-600 mt-1 block">
                    Lateness under this threshold is excused
                  </span>
                </label>

                <label className="block text-sm font-bold text-blue-800">
                  Tier Number
                  <input
                    type="number"
                    name="tier"
                    min={1}
                    value={form.tier}
                    onChange={handleInputChange}
                    className="mt-1 w-full border-2 border-blue-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  />
                  <span className="text-xs text-blue-600 mt-1 block">
                    Tier ordering (1, 2, 3, etc.)
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">
                  Time Range
                </h4>

                <label className="block text-sm font-bold text-green-800 mb-3">
                  Start Minute (inclusive)
                  <input
                    type="number"
                    name="startMinute"
                    min={0}
                    value={form.startMinute}
                    onChange={handleInputChange}
                    className="mt-1 w-full border-2 border-green-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    required
                  />
                  <span className="text-xs text-green-600 mt-1 block">
                    Minimum lateness for this tier
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-bold text-green-800 mb-2">
                    End Minute (inclusive)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="number"
                      name="endMinute"
                      min={0}
                      value={form.isUnlimited ? "" : form.endMinute}
                      onChange={handleInputChange}
                      disabled={form.isUnlimited}
                      className={`w-full border-2 border-green-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white ${
                        form.isUnlimited ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      placeholder={
                        form.isUnlimited ? "Unlimited" : "Enter end minute"
                      }
                    />
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isUnlimited"
                          checked={form.isUnlimited}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setForm((prev: any) => ({
                              ...prev,
                              isUnlimited: isChecked,
                              endMinute: isChecked ? 999 : prev.endMinute,
                            }));
                          }}
                          className="h-4 w-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                        />
                        <div>
                          <span className="text-sm font-semibold text-green-800">
                            🚀 Unlimited Tier
                          </span>
                          <p className="text-xs text-green-700">
                            Covers all lateness above start minute (e.g., "30+
                            minutes")
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 mt-1 block">
                    💡 For "30+ minutes" tier: set start=31 and check "Unlimited
                    Tier"
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">
                  Deduction & Scope
                </h4>

                <label className="block text-sm font-bold text-purple-800 mb-3">
                  Deduction Percentage (%)
                  <input
                    type="number"
                    name="deductionPercent"
                    min={0}
                    max={200}
                    step="0.1"
                    value={form.deductionPercent}
                    onChange={handleInputChange}
                    className="mt-1 w-full border-2 border-purple-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    required
                  />
                  <span className="text-xs text-purple-600 mt-1 block">
                    Percentage of base deduction amount (can exceed 100%)
                  </span>
                </label>

                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isGlobal"
                      checked={form.isGlobal}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-purple-800">
                        Global Rule
                      </span>
                      <p className="text-xs text-purple-600">
                        Apply to all teachers (uncheck for specific teacher)
                      </p>
                    </div>
                  </label>
                </div>

                {!form.isGlobal && (
                  <label className="block text-sm font-bold text-purple-800 mt-3">
                    Teacher ID
                    <input
                      type="text"
                      name="teacherId"
                      value={form.teacherId}
                      onChange={handleInputChange}
                      className="mt-1 w-full border-2 border-purple-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                      placeholder="Enter specific teacher ID"
                    />
                    <span className="text-xs text-purple-600 mt-1 block">
                      Leave empty for global rule
                    </span>
                  </label>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? (
                    <FiLoader className="animate-spin h-5 w-5" />
                  ) : editingId ? (
                    <FiEdit className="h-5 w-5" />
                  ) : (
                    <FiPlus className="h-5 w-5" />
                  )}
                  {editingId ? "Update Tier" : "Add Tier"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold shadow hover:bg-gray-300 transition-all hover:scale-105"
                  >
                    <FiX className="h-5 w-5" /> Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
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
                  <td className="px-4 py-2">
                    {c.endMinute >= 999 ? `${c.startMinute}+` : c.endMinute}
                  </td>
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
    </>
  );
}

// Package Deduction Manager Component
function PackageDeductionManager({ type }: { type: "lateness" | "absence" }) {
  const [packageDeductions, setPackageDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    fetchPackageDeductions();
  }, []);

  const fetchPackageDeductions = async () => {
    try {
      const response = await fetch("/api/admin/package-deductions");
      if (response.ok) {
        const data = await response.json();
        setPackageDeductions(data);
      }
    } catch (error) {
      console.error("Failed to fetch package deductions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (packageName: string, amount: number) => {
    setSaving(packageName);
    try {
      const existing = packageDeductions.find(
        (p) => p.packageName === packageName
      );
      const payload = {
        packageName,
        latenessBaseAmount:
          type === "lateness" ? amount : existing?.latenessBaseAmount || 30,
        absenceBaseAmount:
          type === "absence" ? amount : existing?.absenceBaseAmount || 25,
      };

      const response = await fetch("/api/admin/package-deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setNotification({
          message: `${packageName} ${type} deduction updated`,
          type: "success",
        });
        fetchPackageDeductions();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      setNotification({
        message: "Failed to save package deduction",
        type: "error",
      });
    } finally {
      setSaving(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const updateAmount = (packageName: string, amount: number) => {
    setPackageDeductions((prev) => {
      const existing = prev.find((p) => p.packageName === packageName);
      if (existing) {
        return prev.map((p) =>
          p.packageName === packageName
            ? {
                ...p,
                [type === "lateness"
                  ? "latenessBaseAmount"
                  : "absenceBaseAmount"]: amount,
              }
            : p
        );
      } else {
        return [
          ...prev,
          {
            id: 0,
            packageName,
            latenessBaseAmount: type === "lateness" ? amount : 30,
            absenceBaseAmount: type === "absence" ? amount : 25,
          },
        ];
      }
    });
  };

  const commonPackages = ["0 Fee", "3 days", "5 days", "Europe"];

  if (loading)
    return (
      <div className="animate-pulse bg-gray-200 h-32 rounded-lg mb-6"></div>
    );

  return (
    <section className="mb-10">
      {notification && (
        <div
          className={`mb-4 p-3 rounded flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-700"
          }`}
        >
          <FiCheck /> {notification.message}
        </div>
      )}
    </section>
  );
}
