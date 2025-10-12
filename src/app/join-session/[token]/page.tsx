"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JoinSessionPage() {
  const params = useParams();
  const token = params.token as string;
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch session data
    fetch(`/api/session/join/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSessionData(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load session");
        setLoading(false);
      });
  }, [token]);

  const handleJoinMeeting = async () => {
    try {
      // Log join time
      await fetch(`/api/session/log-join/${token}`, {
        method: "POST",
      });

      // Open Zoom in new tab
      window.open(sessionData.zoomLink, "_blank");

      // Keep this page open to track exit
      setupExitTracking();
    } catch (error) {
      console.error("Error joining:", error);
    }
  };

  const setupExitTracking = () => {
    // Log exit when page closes or user leaves
    const logExit = async () => {
      await fetch(`/api/session/log-exit/${token}`, {
        method: "POST",
      });
    };

    // Track page close/unload
    window.addEventListener("beforeunload", logExit);
    window.addEventListener("unload", logExit);
    window.addEventListener("pagehide", logExit);

    // Track visibility change (user switches tabs)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        logExit();
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Join Your Class
          </h1>
          <p className="text-gray-600">
            Click the button below to join your Zoom session
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Teacher:</strong> {sessionData.teacherName || "Loading..."}
          </p>
          <p className="text-sm text-gray-700 mt-2">
            <strong>Student:</strong> {sessionData.studentName || "Loading..."}
          </p>
        </div>

        <button
          onClick={handleJoinMeeting}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
        >
          🎥 Join Meeting
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Keep this page open during your session for attendance tracking
        </p>
      </div>
    </div>
  );
}
