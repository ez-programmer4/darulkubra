"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JoinSessionPage() {
  const params = useParams();
  const token = params.token as string;
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [duration, setDuration] = useState(0);

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

      // Set session as active
      setSessionActive(true);

      // Open Zoom in new tab
      window.open(sessionData.zoomLink, "_blank");

      // Keep this page open to track exit
      setupExitTracking();

      // Start duration timer
      startDurationTimer();
    } catch (error) {
      console.error("Error joining:", error);
    }
  };

  const startDurationTimer = () => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setDuration(elapsed);
    }, 1000); // Update every second

    // Clean up on unmount
    return () => clearInterval(interval);
  };

  const setupExitTracking = () => {
    let exitLogged = false;

    // Log exit when page closes or user leaves
    const logExit = async () => {
      if (exitLogged) return; // Prevent multiple calls
      exitLogged = true;

      try {
        await fetch(`/api/session/log-exit/${token}`, {
          method: "POST",
          keepalive: true, // Ensure request completes even if page is closing
        });
        console.log("✅ Exit logged successfully");
      } catch (error) {
        console.error("Error logging exit:", error);
      }
    };

    // Only track actual page close, NOT visibility changes
    // (visibility changes happen when opening Zoom in new tab)
    window.addEventListener("beforeunload", logExit);
    window.addEventListener("pagehide", logExit);
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
        {!sessionActive ? (
          <>
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
                <strong>Teacher:</strong>{" "}
                {sessionData.teacherName || "Loading..."}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Student:</strong>{" "}
                {sessionData.studentName || "Loading..."}
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
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Session Active
              </h1>
              <p className="text-gray-600">
                Your Zoom meeting has opened in a new tab
              </p>
            </div>

            <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-center">
                <p className="text-sm text-green-700 font-semibold mb-2">
                  Session Duration
                </p>
                <p className="text-4xl font-bold text-green-900">
                  {duration} min
                </p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Important:</strong> Keep this page open during your
                meeting. Close it when you finish to record the session
                duration.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
