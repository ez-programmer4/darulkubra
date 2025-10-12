"use client";

import { useState } from "react";

export default function TestTrackingPage() {
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  const createTestSession = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test-session");
      const data = await response.json();
      setTestData(data);
      alert("Test session created! Check the URL below.");
    } catch (error) {
      console.error("Error:", error);
      alert("Error creating test session");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session-durations");
      const data = await response.json();
      setSessions(data.sessions || []);
      alert(`Found ${data.sessions?.length || 0} sessions`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error fetching sessions");
    } finally {
      setLoading(false);
    }
  };

  const testJoin = async () => {
    if (!testData?.token) {
      alert("Create a test session first!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/session/log-join/${testData.token}`, {
        method: "POST",
      });
      const data = await response.json();
      console.log("Join response:", data);
      alert("Join time logged! Check console.");
    } catch (error) {
      console.error("Error:", error);
      alert("Error logging join");
    } finally {
      setLoading(false);
    }
  };

  const testExit = async () => {
    if (!testData?.token) {
      alert("Create a test session first!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/session/log-exit/${testData.token}`, {
        method: "POST",
      });
      const data = await response.json();
      console.log("Exit response:", data);
      alert(`Exit time logged! Duration: ${data.duration} minutes`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error logging exit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Session Tracking Test</h1>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">
            Step 1: Create Test Session
          </h2>
          <button
            onClick={createTestSession}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? "Creating..." : "Create Test Session"}
          </button>

          {testData && (
            <div className="mt-4 p-4 bg-green-50 rounded">
              <p className="font-semibold text-green-800">
                ✅ Session Created!
              </p>
              <p className="text-sm mt-2">
                <strong>Session ID:</strong> {testData.sessionId}
              </p>
              <p className="text-sm mt-1">
                <strong>Token:</strong> {testData.token}
              </p>
              <p className="text-sm mt-1">
                <strong>Wrapper URL:</strong>
              </p>
              <a
                href={testData.wrapperURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm break-all"
              >
                {testData.wrapperURL}
              </a>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Step 2: Test Join Tracking</h2>
          <button
            onClick={testJoin}
            disabled={loading || !testData}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? "Logging..." : "Log Join Time"}
          </button>
        </div>

        {/* Step 3 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Step 3: Test Exit Tracking</h2>
          <p className="text-sm text-gray-600 mb-3">
            ⏰ Wait at least 1 minute after clicking "Log Join Time" to see a
            non-zero duration!
          </p>
          <button
            onClick={testExit}
            disabled={loading || !testData}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:bg-gray-400"
          >
            {loading ? "Logging..." : "Log Exit Time"}
          </button>
        </div>

        {/* Step 4 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Step 4: Check Sessions</h2>
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
          >
            {loading ? "Fetching..." : "Fetch All Sessions"}
          </button>

          {sessions.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border">ID</th>
                    <th className="px-4 py-2 border">Teacher</th>
                    <th className="px-4 py-2 border">Student</th>
                    <th className="px-4 py-2 border">Duration</th>
                    <th className="px-4 py-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 border">{s.id}</td>
                      <td className="px-4 py-2 border">{s.teacherName}</td>
                      <td className="px-4 py-2 border">{s.studentName}</td>
                      <td className="px-4 py-2 border">
                        {s.duration || "N/A"}
                      </td>
                      <td className="px-4 py-2 border">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
