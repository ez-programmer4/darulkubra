"use client";

import { useState, useEffect } from "react";

interface Session {
  id: number;
  teacherName: string;
  studentName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "active" | "ended" | "timeout";
  lastActivity?: string;
}

interface Statistics {
  totalSessions: number;
  averageDuration: number;
  totalDuration: number;
  statusBreakdown: Record<string, number>;
}

// Helper to format duration in HH:MM format
function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Helper to calculate live duration for active sessions
function calculateLiveDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  return formatDuration(diffMins);
}

export default function TeacherMonitoringPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        status: selectedStatus,
      });

      console.log("🔍 Fetching sessions with params:", {
        date: selectedDate,
        status: selectedStatus,
      });

      const response = await fetch(`/api/admin/teacher-sessions?${params}`);
      const data = await response.json();

      console.log("📊 Received data:", {
        sessionsCount: data.sessions?.length || 0,
        sessions: data.sessions,
        statistics: data.statistics,
      });

      setSessions(data.sessions || []);
      setStatistics(data.statistics || null);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sessions by search term
  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.teacherName.toLowerCase().includes(searchLower) ||
      session.studentName.toLowerCase().includes(searchLower)
    );
  });

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
      } else {
        alert(`❌ Auto-timeout failed: ${data.error || "Unknown error"}`);
      }
      fetchSessions(); // Refresh data
    } catch (error) {
      console.error("Error triggering auto-timeout:", error);
      alert("❌ Error triggering auto-timeout");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Teacher",
      "Student",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Status",
    ];
    const csvData = sessions.map((session) => [
      session.teacherName,
      session.studentName,
      new Date(session.startTime).toLocaleString(),
      session.endTime ? new Date(session.endTime).toLocaleString() : "N/A",
      session.duration !== null && session.duration !== undefined
        ? session.duration
        : "N/A",
      session.status,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-sessions-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchSessions();
  }, [selectedDate, selectedStatus]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSessions();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDate, selectedStatus]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-full mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            📊 Teacher Session Monitoring
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage teacher-student session durations
            {autoRefresh &&
              ` • Auto-refreshing every 30s • Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSessions()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            🔄 Refresh Now
          </button>
          <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium">Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-blue-100">Total Sessions</h3>
              <span className="text-3xl">📚</span>
            </div>
            <p className="text-4xl font-bold">{statistics.totalSessions}</p>
            <p className="text-sm text-blue-100 mt-1">All recorded sessions</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-green-100">Active Now</h3>
              <span className="text-3xl">🟢</span>
            </div>
            <p className="text-4xl font-bold">
              {statistics.statusBreakdown.active || 0}
            </p>
            <p className="text-sm text-green-100 mt-1">Ongoing sessions</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-yellow-100">Avg Duration</h3>
              <span className="text-3xl">⏱️</span>
            </div>
            <p className="text-4xl font-bold">
              {formatDuration(statistics.averageDuration)}
            </p>
            <p className="text-sm text-yellow-100 mt-1">Per session</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-purple-100">Total Time</h3>
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-4xl font-bold">
              {formatDuration(statistics.totalDuration)}
            </p>
            <p className="text-sm text-purple-100 mt-1">
              All sessions combined
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📊 Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="active">🟢 Active</option>
              <option value="ended">🔵 Ended</option>
              <option value="timeout">🔴 Timeout</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Search
            </label>
            <input
              type="text"
              placeholder="Search teacher or student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={triggerAutoTimeout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2.5 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center gap-2 font-medium"
            >
              ⏰ Auto-Timeout
            </button>
            <button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center gap-2 font-medium"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
          Showing{" "}
          <span className="font-bold text-gray-900">
            {filteredSessions.length}
          </span>{" "}
          of <span className="font-bold text-gray-900">{sessions.length}</span>{" "}
          sessions
          {searchTerm && ` (filtered by "${searchTerm}")`}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  👨‍🏫 Teacher
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  👨‍🎓 Student
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  🕐 Start Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ⏱️ Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  📊 Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  🔄 Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {session.teacherName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {session.studentName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(session.startTime).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.startTime).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold">
                      {session.status === "active" ? (
                        <span className="text-green-600">
                          🔴 {calculateLiveDuration(session.startTime)}
                        </span>
                      ) : session.duration !== null &&
                        session.duration !== undefined ? (
                        <span className="text-gray-900">
                          {formatDuration(session.duration)}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                        session.status === "active"
                          ? "bg-green-100 text-green-800 ring-2 ring-green-300"
                          : session.status === "ended"
                          ? "bg-blue-100 text-blue-800 ring-2 ring-blue-300"
                          : "bg-red-100 text-red-800 ring-2 ring-red-300"
                      }`}
                    >
                      {session.status === "active" && "🟢"}
                      {session.status === "ended" && "🔵"}
                      {session.status === "timeout" && "🔴"}
                      {session.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-600">
                      {session.lastActivity ? (
                        <>
                          <div>
                            {new Date(
                              session.lastActivity
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-gray-500">
                            {new Date(
                              session.lastActivity
                            ).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No sessions found
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm
                ? `No sessions match "${searchTerm}"`
                : "No sessions found for the selected criteria"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
