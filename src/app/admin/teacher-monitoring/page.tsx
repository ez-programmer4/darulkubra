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

export default function TeacherMonitoringPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStatus, setSelectedStatus] = useState("all");

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        status: selectedStatus,
      });

      const response = await fetch(`/api/admin/teacher-sessions?${params}`);
      const data = await response.json();

      setSessions(data.sessions || []);
      setStatistics(data.statistics || null);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Teacher Session Monitoring</h1>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Sessions</h3>
            <p className="text-2xl font-bold text-blue-900">
              {statistics.totalSessions}
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Active Sessions</h3>
            <p className="text-2xl font-bold text-green-900">
              {statistics.statusBreakdown.active || 0}
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Avg Duration</h3>
            <p className="text-2xl font-bold text-yellow-900">
              {statistics.averageDuration} min
            </p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Total Duration</h3>
            <p className="text-2xl font-bold text-purple-900">
              {statistics.totalDuration} min
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="timeout">Timeout</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={triggerAutoTimeout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Trigger Auto-Timeout
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {session.teacherName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.studentName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(session.startTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.duration !== null && session.duration !== undefined
                    ? `${session.duration} min`
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === "active"
                        ? "bg-green-100 text-green-800"
                        : session.status === "ended"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {session.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.lastActivity
                    ? new Date(session.lastActivity).toLocaleString()
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No sessions found for the selected criteria.
          </div>
        )}
      </div>
    </div>
  );
}
