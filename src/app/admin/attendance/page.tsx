"use client";

import React, { useState, useEffect } from "react";
import { AttendanceAnalytics } from "./components/AttendanceAnalytics";
import UstazAttendanceRating from "./components/UstazAttendanceRating";
import Header from "../components/Header";
import { useSession } from "next-auth/react";

interface Controller {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [selectedController, setSelectedController] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"attendance" | "ustaz-rating">(
    "attendance"
  );

  const { data: session, status } = useSession();

  useEffect(() => {
    // Fetch controllers
    const fetchControllers = async () => {
      try {
        const res = await fetch("/api/control-options", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch controllers");
        const controllerData = await res.json();
        setControllers(
          Array.isArray(controllerData.controllers)
            ? controllerData.controllers
            : []
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchControllers();
  }, []);

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50">
      <Header
        pageTitle="Attendance Management"
        userName={session?.user?.name || "Admin"}
        onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
      />
      <div className="mt-6 mb-8">
        <p className="text-gray-600">
          Analyze attendance trends and ustaz performance ratings across the
          entire institution or drill down to a specific controller.
        </p>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="controller-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Filter by Controller
            </label>
            <select
              id="controller-select"
              value={selectedController}
              onChange={(e) => setSelectedController(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Controllers</option>
              {Array.isArray(controllers) &&
                controllers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "attendance"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Attendance Analytics
            </button>
            <button
              onClick={() => setActiveTab("ustaz-rating")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "ustaz-rating"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Ustaz Rating
            </button>
          </div>
        </div>
      </div>

      {activeTab === "attendance" ? (
        <AttendanceAnalytics controllerId={selectedController} />
      ) : (
        <UstazAttendanceRating />
      )}
    </main>
  );
}
