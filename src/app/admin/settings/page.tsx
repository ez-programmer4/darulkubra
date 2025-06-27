"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Setting {
  key: string;
  value: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => {
        if (!res.ok)
          throw new Error("Unauthorized or failed to fetch settings");
        return res.json();
      })
      .then((data) => {
        setSettings(data.settings || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (idx: number, value: string) => {
    setSettings((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], value };
      return copy;
    });
  };

  const handleSave = async (idx: number) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { key, value } = settings[idx];
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Failed to save setting");
      setSuccess(`Saved setting: ${key}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    if (!newKey.trim()) {
      setAddError("Key is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, value: newValue }),
      });
      if (!res.ok) throw new Error("Failed to add setting");
      setSettings((prev) => [...prev, { key: newKey, value: newValue }]);
      setAddSuccess(`Added setting: ${newKey}`);
      setNewKey("");
      setNewValue("");
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      {/* Add Setting Form */}
      <form
        onSubmit={handleAddSetting}
        className="flex items-end gap-4 mb-8 bg-gray-50 p-4 rounded border"
      >
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Key</label>
          <input
            className="border px-2 py-1 rounded w-full"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            disabled={saving}
            placeholder="e.g. registration_open"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Value</label>
          <input
            className="border px-2 py-1 rounded w-full"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={saving}
            placeholder="e.g. true"
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={saving}
        >
          Add
        </button>
      </form>
      {addSuccess && <div className="mb-4 text-green-600">{addSuccess}</div>}
      {addError && <div className="mb-4 text-red-600">{addError}</div>}
      {/* Settings List */}
      {settings.length === 0 && <div>No settings found.</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-6"
      >
        {settings.map((setting, idx) => (
          <div key={setting.key} className="flex items-center gap-4">
            <label className="w-40 font-medium">{setting.key}</label>
            <input
              className="border px-2 py-1 rounded flex-1"
              value={setting.value || ""}
              onChange={(e) => handleChange(idx, e.target.value)}
              disabled={saving}
            />
            <button
              type="button"
              className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
              onClick={() => handleSave(idx)}
              disabled={saving}
            >
              Save
            </button>
          </div>
        ))}
      </form>
      {success && <div className="mt-4 text-green-600">{success}</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
