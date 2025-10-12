"use client";

import { useState, useEffect } from "react";

interface Session {
  id: number;
  teacherName: string;
  studentName: string;
  joinTime: string;
  exitTime?: string;
  duration?: number;
  status: string;
}

export default function SessionDurationsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/admin/session-durations");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredSessions = sessions.filter(
    (s) =>
      searchTerm === "" ||
      s.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-xl">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Session Durations</h1>
        <p className="text-gray-600 mt-2">
          View teacher-student session durations
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search teacher or student..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
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
                Join Time
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Exit Time
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Duration (min)
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
                  {new Date(session.joinTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {session.exitTime
                    ? new Date(session.exitTime).toLocaleString()
                    : "-"}
                </td>
                <td className="px-6 py-4 text-sm font-semibold">
                  {session.status === "active" ? (
                    <span className="text-green-600">
                      {Math.floor(
                        (Date.now() - new Date(session.joinTime).getTime()) /
                          60000
                      )}{" "}
                      (ongoing)
                    </span>
                  ) : session.duration !== null &&
                    session.duration !== undefined ? (
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
