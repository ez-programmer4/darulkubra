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

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/admin/teacher-sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSessions = async () => {
    try {
      const response = await fetch("/api/admin/auto-timeout", {
        method: "POST",
      });
      const data = await response.json();
      alert(
        `✅ Checked ${data.sessionsChecked} sessions, ended ${data.sessionsEnded}`
      );
      fetchSessions();
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error checking sessions");
    }
  };

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every minute
    const interval = setInterval(fetchSessions, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl">Loading...</div>
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
            Automatic tracking - updates every minute
          </p>
        </div>
        <button
          onClick={checkSessions}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold"
        >
          Check & Update Sessions
        </button>
      </div>

      {/* Simple Table */}
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
            {sessions.map((session) => (
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

        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sessions found
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
