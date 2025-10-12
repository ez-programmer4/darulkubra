"use client";

import { useState, useEffect } from "react";

interface Session {
  id: number;
  teacherName: string;
  studentName: string;
  startTime: string;
  duration?: number;
  status: "active" | "ended";
}

export default function TeacherMonitoringPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">(
    "all"
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchSessions = async () => {
    try {
      const response = await fetch(
        "/api/admin/teacher-sessions?t=" + Date.now()
      );
      const data = await response.json();
      console.log("✅ Fetched", data.sessions?.length, "sessions");
      setSessions(data.sessions || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("❌ Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSessions = async () => {
    const btn = document.activeElement as HTMLButtonElement;
    if (btn) btn.disabled = true;

    try {
      const response = await fetch("/api/admin/auto-timeout", {
        method: "POST",
      });
      const data = await response.json();
      alert(
        `✅ Checked ${data.sessionsChecked} sessions\n Ended ${data.sessionsEnded} sessions`
      );
      // Force refresh after check
      await fetchSessions();
    } catch (error) {
      console.error("❌ Error:", error);
      alert("❌ Error checking sessions");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Filter sessions by search and status
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      searchTerm === "" ||
      session.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.studentName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Teacher Session Durations
          </h1>
          <p className="text-gray-600 mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={checkSessions}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold transition-colors"
        >
          Check & Update Sessions
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Teacher or Student
          </label>
          <input
            type="text"
            placeholder="Type to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "ended")
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Sessions</option>
            <option value="active">Active Only</option>
            <option value="ended">Ended Only</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <strong>{filteredSessions.length}</strong> of{" "}
        <strong>{sessions.length}</strong> sessions
        {searchTerm && ` (filtered by "${searchTerm}")`}
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Student
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Duration (minutes)
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {session.teacherName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {session.studentName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(session.startTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-semibold">
                  {session.status === "active" ? (
                    <span className="text-green-600">
                      {Math.floor(
                        (Date.now() - new Date(session.startTime).getTime()) /
                          60000
                      )}{" "}
                      (ongoing)
                    </span>
                  ) : session.duration ? (
                    <span className="text-gray-900">{session.duration}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "No sessions match your filters"
              : "No sessions found"}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-semibold">
            Total Sessions
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {sessions.length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-semibold">Active Now</div>
          <div className="text-2xl font-bold text-green-900">
            {sessions.filter((s) => s.status === "active").length}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-semibold">
            Total Duration
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {sessions
              .filter((s) => s.duration)
              .reduce((acc, s) => acc + (s.duration || 0), 0)}{" "}
            min
          </div>
        </div>
      </div>
    </div>
  );
}
