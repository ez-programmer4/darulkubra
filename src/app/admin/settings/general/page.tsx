"use client";
import React, { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  FiSettings,
  FiUser,
  FiBell,
  FiShield,
  FiServer,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

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
  includeSundaysInSalary: false,
  allowTeachersSalary: false,
};

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          includeSundaysInSalary: get(
            "include_sundays_in_salary",
            DEFAULTS.includeSundaysInSalary
          ),
          allowTeachersSalary: get(
            "teacher_salary_visible",
            DEFAULTS.allowTeachersSalary
          ),
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
            : key === "includeSundaysInSalary"
            ? "include_sundays_in_salary"
            : key === "allowTeachersSalary"
            ? "teacher_salary_visible"
            : key;

        // Use dedicated endpoint for Sunday setting to trigger cache clearing
        if (key === "includeSundaysInSalary") {
          await fetch("/api/admin/settings/include-sundays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ includeSundays: value }),
          });
        } else {
          await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: apiKey, value: String(value) }),
          });
        }
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
        <p className="text-black font-medium text-lg">Loading settings...</p>
        <p className="text-gray-500 text-sm mt-2">
          Please wait while we fetch the data
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
          <FiXCircle className="h-16 w-16 text-red-500" />
        </div>
        <h3 className="text-3xl font-bold text-black mb-4">
          Error Loading Settings
        </h3>
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-black rounded-2xl shadow-lg">
              <FiSettings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                General Settings
              </h1>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                Configure system-wide settings and preferences
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <FiCheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-green-800 font-semibold">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <FiXCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          )}

          {/* Site Info Section */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiUser className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Site Information
                  </h2>
                  <p className="text-gray-600">
                    Basic site configuration and branding
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Site/Organization Name
                  </label>
                  <input
                    value={settings.siteName}
                    onChange={(e) => handleChange("siteName", e.target.value)}
                    placeholder="DarulKubra"
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Displayed in the admin panel and emails.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Support Email
                  </label>
                  <input
                    value={settings.supportEmail}
                    onChange={(e) =>
                      handleChange("supportEmail", e.target.value)
                    }
                    placeholder="support@darelkubra.com"
                    disabled={saving}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Contact email for support requests.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Default Language
                  </label>
                  <select
                    value={settings.defaultLanguage}
                    onChange={(e) =>
                      handleChange("defaultLanguage", e.target.value)
                    }
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  >
                    <option value="en">English</option>
                    <option value="am">Amharic</option>
                    <option value="ar">Arabic</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Default language for new users and notifications.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Timezone
                  </label>
                  <input
                    value={settings.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    placeholder="Africa/Addis_Ababa"
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Timezone for reports and scheduling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User & Security Section */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiShield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    User & Security
                  </h2>
                  <p className="text-gray-600">
                    User management and security settings
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Default User Role
                  </label>
                  <select
                    value={settings.defaultUserRole}
                    onChange={(e) =>
                      handleChange("defaultUserRole", e.target.value)
                    }
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="controller">Controller</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Role assigned to new users by default.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Max Login Attempts
                  </label>
                  <input
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Number of failed logins before lockout.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-3">
                    Session Timeout (minutes)
                  </label>
                  <input
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    User will be logged out after this period of inactivity.
                  </p>
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
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                  />
                  <label
                    htmlFor="registrationOpen"
                    className="text-sm font-bold text-black"
                  >
                    Registration Open
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiBell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Notifications
                  </h2>
                  <p className="text-gray-600">
                    Configure notification preferences
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!settings.smsNotifications}
                  onChange={(e) =>
                    handleChange("smsNotifications", e.target.checked)
                  }
                  disabled={saving}
                  id="smsNotifications"
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                />
                <label
                  htmlFor="smsNotifications"
                  className="text-sm font-bold text-black"
                >
                  Enable SMS Notifications
                </label>
              </div>
            </div>
          </div>

          {/* System Section */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiServer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">System</h2>
                  <p className="text-gray-600">
                    System-wide configuration options
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!settings.maintenanceMode}
                      onChange={(e) =>
                        handleChange("maintenanceMode", e.target.checked)
                      }
                      disabled={saving}
                      id="maintenanceMode"
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                    />
                    <label
                      htmlFor="maintenanceMode"
                      className="text-sm font-bold text-black"
                    >
                      Maintenance Mode
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    When enabled, only administrators can access the system.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!settings.includeSundaysInSalary}
                      onChange={(e) =>
                        handleChange("includeSundaysInSalary", e.target.checked)
                      }
                      disabled={saving}
                      id="includeSundaysInSalary"
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                    />
                    <label
                      htmlFor="includeSundaysInSalary"
                      className="text-sm font-bold text-black"
                    >
                      Include Sundays in salary calculation
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    When enabled, Sundays will be counted as working days for
                    salary calculations.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!settings.allowTeachersSalary}
                      onChange={(e) =>
                        handleChange("allowTeachersSalary", e.target.checked)
                      }
                      disabled={saving}
                      id="allowTeachersSalary"
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black"
                    />
                    <label
                      htmlFor="allowTeachersSalary"
                      className="text-sm font-bold text-black"
                    >
                      Allow teachers to see their salary
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    When enabled, teachers can view their salary information in
                    their dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-6 pb-4 border-t border-gray-200">
            <button
              type="submit"
              className={`w-full bg-black hover:bg-gray-800 text-white px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 text-lg ${
                saving ? "opacity-75" : ""
              }`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <FiLoader className="animate-spin h-5 w-5" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <FiCheckCircle className="h-5 w-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
