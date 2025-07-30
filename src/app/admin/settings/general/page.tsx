"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FiSettings, FiUser, FiBell, FiShield, FiServer } from "react-icons/fi";

const DEFAULTS = {
  siteName: "DarulKubra",
  defaultLanguage: "en",
  timezone: "Africa/Addis_Ababa",
  registrationOpen: true,
  defaultUserRole: "teacher",
  supportEmail: "support@darelkubra.com",
  smsNotifications: true,
  maxLoginAttempts: 5,
  sessionTimeout: 30,
  maintenanceMode: false,
};

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch settings");
        return res.json();
      })
      .then((data) => {
        const s = data.settings || [];
        const get = (key: string, fallback: any) => {
          const found = s.find((x: any) => x.key === key);
          if (found === undefined) return fallback;
          if (found.value === "true") return true;
          if (found.value === "false") return false;
          if (!isNaN(Number(found.value))) return Number(found.value);
          return found.value;
        };
        setSettings({
          siteName: get("site_name", DEFAULTS.siteName),
          defaultLanguage: get("default_language", DEFAULTS.defaultLanguage),
          timezone: get("timezone", DEFAULTS.timezone),
          registrationOpen: get("registration_open", DEFAULTS.registrationOpen),
          defaultUserRole: get("default_user_role", DEFAULTS.defaultUserRole),
          supportEmail: get("support_email", DEFAULTS.supportEmail),
          smsNotifications: get("sms_notifications", DEFAULTS.smsNotifications),
          maxLoginAttempts: get(
            "max_login_attempts",
            DEFAULTS.maxLoginAttempts
          ),
          sessionTimeout: get("session_timeout", DEFAULTS.sessionTimeout),
          maintenanceMode: get("maintenance_mode", DEFAULTS.maintenanceMode),
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entries = Object.entries(settings);
      for (const [key, value] of entries) {
        const apiKey =
          key === "siteName"
            ? "site_name"
            : key === "defaultLanguage"
            ? "default_language"
            : key === "defaultUserRole"
            ? "default_user_role"
            : key === "supportEmail"
            ? "support_email"
            : key === "smsNotifications"
            ? "sms_notifications"
            : key === "maxLoginAttempts"
            ? "max_login_attempts"
            : key === "sessionTimeout"
            ? "session_timeout"
            : key === "registrationOpen"
            ? "registration_open"
            : key === "maintenanceMode"
            ? "maintenance_mode"
            : key;
        await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: apiKey, value: String(value) }),
        });
      }
      setSuccess("Settings saved successfully!");
      toast({ title: "Settings saved!" });
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <h1 className="text-3xl font-extrabold text-blue-900 mb-8 flex items-center gap-3">
        <FiSettings className="text-blue-600 h-8 w-8" /> General Settings
      </h1>
      <form onSubmit={handleSave} className="space-y-8">
        {/* Site Info Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 mb-4">
          <div className="flex items-center gap-3 mb-6 border-b border-blue-50 pb-4">
            <FiUser className="text-blue-500 h-6 w-6" />
            <span className="text-xl font-bold text-blue-800">Site Info</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Site/Organization Name
              </label>
              <Input
                value={settings.siteName}
                onChange={(e) => handleChange("siteName", e.target.value)}
                placeholder="DarulKubra"
                disabled={saving}
              />
              <div className="text-xs text-gray-500 mt-1">
                Displayed in the admin panel and emails.
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Support Email
              </label>
              <Input
                value={settings.supportEmail}
                onChange={(e) => handleChange("supportEmail", e.target.value)}
                placeholder="support@darelkubra.com"
                disabled={saving}
                type="email"
              />
              <div className="text-xs text-gray-500 mt-1">
                Contact email for support requests.
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Default Language
              </label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(val: string) =>
                  handleChange("defaultLanguage", val)
                }
                disabled={saving}
              >
                <option value="en">English</option>
                <option value="am">Amharic</option>
                <option value="ar">Arabic</option>
              </Select>
              <div className="text-xs text-gray-500 mt-1">
                Default language for new users and notifications.
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Timezone
              </label>
              <Input
                value={settings.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                placeholder="Africa/Addis_Ababa"
                disabled={saving}
              />
              <div className="text-xs text-gray-500 mt-1">
                Timezone for reports and scheduling.
              </div>
            </div>
          </div>
        </div>
        {/* User & Security Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 mb-4">
          <div className="flex items-center gap-3 mb-6 border-b border-blue-50 pb-4">
            <FiShield className="text-blue-500 h-6 w-6" />
            <span className="text-xl font-bold text-blue-800">
              User & Security
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Default User Role
              </label>
              <Select
                value={settings.defaultUserRole}
                onValueChange={(val: string) =>
                  handleChange("defaultUserRole", val)
                }
                disabled={saving}
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="controller">Controller</option>
                <option value="admin">Admin</option>
              </Select>
              <div className="text-xs text-gray-500 mt-1">
                Role assigned to new users by default.
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Max Login Attempts
              </label>
              <Input
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  handleChange(
                    "maxLoginAttempts",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="5"
                disabled={saving}
                type="number"
                min={1}
              />
              <div className="text-xs text-gray-500 mt-1">
                Number of failed logins before lockout.
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">
                Session Timeout (minutes)
              </label>
              <Input
                value={settings.sessionTimeout}
                onChange={(e) =>
                  handleChange(
                    "sessionTimeout",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="30"
                disabled={saving}
                type="number"
                min={5}
              />
              <div className="text-xs text-gray-500 mt-1">
                User will be logged out after this period of inactivity.
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <input
                type="checkbox"
                checked={!!settings.registrationOpen}
                onChange={(e) =>
                  handleChange("registrationOpen", e.target.checked)
                }
                disabled={saving}
                id="registrationOpen"
                className="w-5 h-5 accent-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label
                htmlFor="registrationOpen"
                className="text-sm font-semibold text-blue-800"
              >
                Registration Open
              </label>
            </div>
          </div>
        </div>
        {/* Notifications Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 mb-4">
          <div className="flex items-center gap-3 mb-6 border-b border-blue-50 pb-4">
            <FiBell className="text-blue-500 h-6 w-6" />
            <span className="text-xl font-bold text-blue-800">
              Notifications
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!settings.smsNotifications}
              onChange={(e) =>
                handleChange("smsNotifications", e.target.checked)
              }
              disabled={saving}
              id="smsNotifications"
              className="w-5 h-5 accent-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label
              htmlFor="smsNotifications"
              className="text-sm font-semibold text-blue-800"
            >
              Enable SMS Notifications
            </label>
          </div>
        </div>
        {/* System Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 mb-4">
          <div className="flex items-center gap-3 mb-6 border-b border-blue-50 pb-4">
            <FiServer className="text-blue-500 h-6 w-6" />
            <span className="text-xl font-bold text-blue-800">System</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!settings.maintenanceMode}
              onChange={(e) =>
                handleChange("maintenanceMode", e.target.checked)
              }
              disabled={saving}
              id="maintenanceMode"
              className="w-5 h-5 accent-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label
              htmlFor="maintenanceMode"
              className="text-sm font-semibold text-blue-800"
            >
              Maintenance Mode
            </label>
          </div>
        </div>
        {/* Feedback */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-600 rounded text-green-800 font-semibold flex items-center gap-2">
            <span>✔</span> {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 rounded text-red-800 font-semibold flex items-center gap-2">
            <span>✖</span> {error}
          </div>
        )}
        {/* Save Button */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/80 to-transparent pt-4 pb-2 z-10 flex justify-end">
          <Button
            type="submit"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all text-lg"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
