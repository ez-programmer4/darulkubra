"use client";

import { useState, useEffect } from "react";

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  responseTimeMs: number;
  database: {
    connected: boolean;
    activeSessions: number;
    totalSessions: number;
    recentSessions24h: number;
    staleSessions: number;
  };
  warnings: string[];
  error?: string;
}

interface CronStatus {
  success: boolean;
  sessionsEnded: number;
  totalChecked: number;
  processingTimeMs: number;
  error?: string;
  timestamp: string;
}

export default function SystemStatusPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch("/api/health/session-tracking");
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error("Error fetching system health:", error);
      setHealth({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTimeMs: 0,
        database: {
          connected: false,
          activeSessions: 0,
          totalSessions: 0,
          recentSessions24h: 0,
          staleSessions: 0,
        },
        warnings: [],
        error: "Failed to fetch system health",
      });
    }
  };

  const fetchCronStatus = async () => {
    try {
      const response = await fetch("/api/cron/session-timeout");
      const data = await response.json();
      setCronStatus(data);
    } catch (error) {
      console.error("Error fetching cron status:", error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchSystemHealth(), fetchCronStatus()]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  const triggerAutoTimeout = async () => {
    try {
      const response = await fetch("/api/admin/auto-timeout", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        alert(
          `✅ Successfully ended ${data.sessionsEnded} inactive sessions in ${data.processingTimeMs}ms`
        );
        await refreshData();
      } else {
        alert(`❌ Auto-timeout failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error triggering auto-timeout:", error);
      alert("❌ Error triggering auto-timeout");
    }
  };

  useEffect(() => {
    refreshData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "degraded":
        return "text-yellow-600 bg-yellow-100";
      case "unhealthy":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return "✅";
      case "degraded":
        return "⚠️";
      case "unhealthy":
        return "❌";
      default:
        return "❓";
    }
  };

  if (loading && !health) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Status Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={triggerAutoTimeout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Trigger Auto-Timeout
          </button>
        </div>
      </div>

      {lastUpdate && (
        <p className="text-sm text-gray-500 mb-6">
          Last updated: {lastUpdate.toLocaleString()}
        </p>
      )}

      {/* System Health Status */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">System Health</h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  health.status
                )}`}
              >
                {getStatusIcon(health.status)} {health.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Response Time:{" "}
                <span className="font-medium">{health.responseTimeMs}ms</span>
              </p>
              <p className="text-sm text-gray-600">
                Database:{" "}
                <span
                  className={`font-medium ${
                    health.database.connected
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {health.database.connected ? "Connected" : "Disconnected"}
                </span>
              </p>
              {health.error && (
                <p className="text-sm text-red-600">Error: {health.error}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Session Statistics</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Active Sessions:{" "}
                <span className="font-medium text-blue-600">
                  {health.database.activeSessions}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Total Sessions:{" "}
                <span className="font-medium">
                  {health.database.totalSessions}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Last 24h:{" "}
                <span className="font-medium">
                  {health.database.recentSessions24h}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Stale Sessions:{" "}
                <span
                  className={`font-medium ${
                    health.database.staleSessions > 0
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {health.database.staleSessions}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Cron Job Status</h3>
            {cronStatus ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      cronStatus.success ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {cronStatus.success ? "Success" : "Failed"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Last Run:{" "}
                  <span className="font-medium">
                    {new Date(cronStatus.timestamp).toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Sessions Ended:{" "}
                  <span className="font-medium">
                    {cronStatus.sessionsEnded}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Processing Time:{" "}
                  <span className="font-medium">
                    {cronStatus.processingTimeMs}ms
                  </span>
                </p>
                {cronStatus.error && (
                  <p className="text-sm text-red-600">
                    Error: {cronStatus.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No cron data available</p>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {health && health.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Warnings
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {health.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/teacher-monitoring"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-center"
          >
            View Session Dashboard
          </a>
          <button
            onClick={() =>
              window.open("/api/health/session-tracking", "_blank")
            }
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Health Check API
          </button>
          <button
            onClick={() => window.open("/api/cron/session-timeout", "_blank")}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Cron Job API
          </button>
          <button
            onClick={() => window.open("/api/admin/teacher-sessions", "_blank")}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Sessions API
          </button>
        </div>
      </div>
    </div>
  );
}
