"use client";

import React, { useState, useEffect } from "react";
import { AttendanceAnalytics } from "./components/AttendanceAnalytics";
import Header from "../components/Header";

interface Controller {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [selectedController, setSelectedController] = useState<string>("");
  const [user, setUser] = useState<{ name?: string }>({});

  useEffect(() => {
    // Fetch user info
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user || {});
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };

    // Fetch controllers
    const fetchControllers = async () => {
      try {
        const res = await fetch("/api/control-options", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch controllers");
        const controllerData = await res.json();
        setControllers(controllerData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
    fetchControllers();
  }, []);

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50">
      <Header
        pageTitle="Attendance Analytics"
        userName={user.name || "Admin"}
        onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
      />
      <div className="mt-6 mb-8">
        <p className="text-gray-600">
          Analyze attendance trends across the entire institution or drill down
          to a specific controller.
        </p>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
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
          {controllers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <AttendanceAnalytics controllerId={selectedController} />
    </main>
  );
}
