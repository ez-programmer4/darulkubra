"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  FiArrowLeft,
  FiInfo,
  FiCheckCircle,
  FiCalendar,
  FiDownload,
  FiMenu,
  FiLogOut,
  FiHome,
  FiUsers,
  FiClipboard,
  FiTrendingUp,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiPlus,
} from "react-icons/fi";
import { signOut } from "next-auth/react";
import Link from "next/link";
import dayjs from "dayjs";

type Permission = {
  date?: string;
  dates?: string[];
  reason: string;
  details?: string;
  status?: string;
};

export default function TeacherPermissions() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    dayjs().startOf("month")
  );
  const [showForm, setShowForm] = useState(true);
  const [date, setDate] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [permissionReasons, setPermissionReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayRequestCount, setTodayRequestCount] = useState(0);

  // Fetch permissions for the selected month
  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const month = selectedMonth.format("YYYY-MM");
        const response = await fetch(
          `/api/teachers/permissions?month=${month}`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch permissions: ${errorText}`);
        }
        const data = await response.json();

        const mappedPermissions = Array.isArray(data)
          ? data.map((perm) => ({
              date: perm.requestedDate,
              dates: [perm.requestedDate],
              reason: perm.reasonCategory,
              details: perm.reasonDetails,
              status: perm.status,
              createdAt: perm.createdAt,
              timeSlots: perm.timeSlots ? JSON.parse(perm.timeSlots) : [],
            }))
          : [];
        setPermissions(mappedPermissions);

        // Count today's requests
        const today = new Date().toISOString().split("T")[0];
        const todayCount = mappedPermissions.filter((perm) => {
          if (perm.createdAt) {
            const requestDate = new Date(perm.createdAt)
              .toISOString()
              .split("T")[0];
            return requestDate === today;
          }
          return false;
        }).length;
        setTodayRequestCount(todayCount);
      } catch (err: any) {
        setError(err.message || "Could not fetch permissions.");
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchPermissions();
  }, [selectedMonth, authLoading]);

  // Fetch available time slots for selected date
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!date || date.trim() === '' || !user?.id) {
        // Clear time slots if no date selected
        setAvailableTimeSlots([]);
        return;
      }
      try {
        console.log('Fetching time slots for:', { date, userId: user.id });
        const res = await fetch(
          `/api/teachers/time-slots?date=${date}&teacherId=${user.id}`
        );
        if (res.ok) {
          const data = await res.json();
          console.log('Time slots response:', data);
          setAvailableTimeSlots(data.timeSlots || []);
        } else {
          console.log('Time slots API error:', res.status, res.statusText);
          setAvailableTimeSlots([]);
        }
      } catch (error) {
        console.error("Error fetching time slots:", error);
        setAvailableTimeSlots([]);
      }
    };
    fetchTimeSlots();
  }, [date, user?.id]);

  // Fetch permission reasons
  useEffect(() => {
    const loadReasons = async () => {
      try {
        const res = await fetch("/api/permission-reasons", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          console.log('Permission reasons response:', data);
          if (data.reasons && Array.isArray(data.reasons) && data.reasons.length > 0) {
            setPermissionReasons(data.reasons);
          } else {
            console.log('No reasons found in database, seeding default reasons');
            // Try to seed default reasons
            try {
              await fetch('/api/seed-permission-reasons', { method: 'POST' });
              // Retry fetching reasons
              const retryRes = await fetch("/api/permission-reasons", {
                credentials: "include",
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (retryData.reasons && Array.isArray(retryData.reasons) && retryData.reasons.length > 0) {
                  setPermissionReasons(retryData.reasons);
                  return;
                }
              }
            } catch (error) {
              console.log('Failed to seed reasons, using fallback');
            }
            setPermissionReasons([
              "Sick Leave",
              "Personal Emergency",
              "Family Matter",
              "Medical Appointment",
              "Other",
            ]);
          }
        } else {
          console.log('API error, using fallback reasons');
          setPermissionReasons([
            "Sick Leave",
            "Personal Emergency",
            "Family Matter",
            "Medical Appointment",
            "Other",
          ]);
        }
      } catch (error) {
        console.error("Error loading permission reasons:", error);
        setPermissionReasons([
          "Sick Leave",
          "Personal Emergency",
          "Family Matter",
          "Medical Appointment",
          "Other",
        ]);
      }
    };
    if (!authLoading) loadReasons();
  }, [authLoading]);

  const reloadPermissions = async () => {
    try {
      const month = selectedMonth.format("YYYY-MM");
      const response = await fetch(`/api/teachers/permissions?month=${month}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Map API response to frontend format
        const mappedPermissions = Array.isArray(data)
          ? data.map((perm) => ({
              date: perm.requestedDate,
              dates: [perm.requestedDate],
              reason: perm.reasonCategory,
              details: perm.reasonDetails,
              status: perm.status,
              timeSlots: perm.timeSlots ? JSON.parse(perm.timeSlots) : [],
            }))
          : [];
        setPermissions(mappedPermissions);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !reason || selectedTimeSlots.length === 0) {
      toast({
        title: "Error",
        description: "Date, reason, and at least one time slot are required.",
        variant: "destructive",
      });
      return;
    }

    if (!details || details.trim() === "") {
      toast({
        title: "Error",
        description: "Details are required for the permission request.",
        variant: "destructive",
      });
      return;
    }

    const duplicateCheck = permissions.some((req) => {
      const reqDate = req.date;
      const reqDates = req.dates;
      const matches =
        reqDate === date ||
        (Array.isArray(reqDates) && reqDates.includes(date));

      return matches;
    });

    if (duplicateCheck) {
      toast({
        title: "Error",
        description:
          "You have already submitted a permission request for this date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/teachers/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          timeSlots: selectedTimeSlots,
          reason,
          details,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        let msg = "Failed to submit request";
        try {
          const j = await res.json();

          if (j?.error) {
            msg = j.error;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          // Handle different HTTP status codes
          if (res.status === 400) {
            msg = "Invalid request. Please check your input and try again.";
          } else if (res.status === 403) {
            msg = "You don't have permission to perform this action.";
          } else if (res.status === 500) {
            msg = "Server error. Please try again later.";
          }
        }
        throw new Error(msg);
      }

      const responseData = await res.json();

      setSubmitted(true);
      toast({
        title: "Success",
        description:
          responseData.message || "Permission request submitted successfully.",
      });
      setDate("");
      setSelectedTimeSlots([]);
      setReason("");
      setDetails("");
      setShowForm(false);
      reloadPermissions();
      setTimeout(() => {
        setSubmitted(false);
      }, 1800);
    } catch (err: any) {
      console.error("Permission request error:", err);
      toast({
        title: "Request Failed",
        description:
          err.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeSlotToggle = (timeSlot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(timeSlot)
        ? prev.filter((slot) => slot !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  // Summary
  const summary = permissions.reduce(
    (acc, perm) => {
      acc.total++;
      if (perm.status === "Approved") acc.approved++;
      else if (perm.status === "Rejected") acc.rejected++;
      else acc.pending++;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  );

  // Export to CSV
  const exportToCSV = () => {
    if (!permissions.length) return;
    const headers = ["Date(s)", "Reason", "Details", "Status"];
    const rows = permissions.map((perm) => [
      Array.isArray(perm.dates)
        ? perm.dates
            .map((d: string) => dayjs(d).format("MMM D, YYYY"))
            .join(", ")
        : dayjs(perm.date).format("MMM D, YYYY"),
      perm.reason,
      perm.details || "-",
      perm.status || "Pending",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permissions_${selectedMonth.format("YYYY_MM")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Month navigation
  const goToPreviousMonth = () =>
    setSelectedMonth((m) => m.subtract(1, "month"));
  const goToNextMonth = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToCurrentMonth = () => setSelectedMonth(dayjs().startOf("month"));

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-2xl w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 space-y-4 shadow-lg border border-gray-200"
                >
                  <div className="h-6 bg-gray-200 rounded-xl w-1/3"></div>
                  <div className="h-12 bg-gray-200 rounded-xl"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-12 flex flex-col items-center max-w-md mx-auto">
          <div className="bg-black rounded-full p-4 mb-6">
            <FiCheckCircle className="text-white text-4xl animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold text-black mb-4">
            Request Submitted!
          </h2>
          <p className="text-gray-700 mb-8 text-center leading-relaxed">
            Your permission request has been sent to the admin team. You will be
            notified once it is reviewed.
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transition-all duration-300"
          >
            <FiArrowLeft className="mr-2" /> Back to Permissions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 md:w-72 bg-black text-white flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-20 md:h-24 px-4 md:px-6 border-b border-gray-700 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-lg">
              <FiUsers className="h-5 w-5 md:h-6 md:w-6 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-extrabold text-white">
                Teacher Portal
              </span>
              <span className="text-xs text-gray-300 hidden md:block">
                Permission Management
              </span>
            </div>
          </div>
          <button
            className="md:hidden text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 hover:scale-110"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        </div>
        <nav className="flex-1 px-6 py-8 space-y-3 overflow-y-auto">
          <Link
            href="/teachers/dashboard"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname === "/teachers/dashboard"
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiHome className="h-5 w-5" /> Dashboard
          </Link>
          <Link
            href="/teachers/dashboard?tab=students"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname.includes("tab=students")
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiUsers className="h-5 w-5" /> Students
          </Link>
          <Link
            href="/teachers/permissions"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname === "/teachers/permissions"
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiClipboard className="h-5 w-5" /> Permissions
          </Link>
          <Link
            href="/teachers/salary"
            className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
              pathname === "/teachers/salary"
                ? "bg-white text-black shadow-lg transform scale-105"
                : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
            }`}
          >
            <FiTrendingUp className="h-5 w-5" /> Salary
          </Link>
        </nav>
        <div className="px-6 py-6 border-t border-gray-700 bg-black">
          <button
            onClick={() => signOut({ callbackUrl: "/teachers/login" })}
            className="w-full flex items-center gap-4 p-4 text-base font-medium text-gray-300 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 hover:transform hover:scale-105 hover:shadow-lg"
            aria-label="Logout"
          >
            <FiLogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white shadow-xl border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 max-w-7xl mx-auto gap-4">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                className="md:hidden text-black hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-110 shadow-md"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FiMenu size={24} />
              </button>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-black rounded-xl shadow-lg">
                  <FiClipboard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-black">
                    My Permissions
                  </h1>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium hidden sm:block">
                    Manage your absence requests
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                onClick={exportToCSV}
                className="bg-black hover:bg-gray-800 text-white flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base flex-1 sm:flex-none justify-center"
                disabled={!permissions.length}
              >
                <FiDownload className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24 md:pb-8">
          {/* Request Form */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8 lg:p-10 animate-slide-in hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl shadow-lg">
                  <FiClipboard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-black">
                    Permission Request
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base mt-1">
                    Submit and manage your absence requests professionally
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      Current Month:{" "}
                    </span>
                    <span className="font-bold text-black">
                      {selectedMonth.format("MMMM YYYY")}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
                  onClick={() => setShowForm((v) => !v)}
                >
                  {showForm ? (
                    <>
                      <FiX className="h-4 w-4 mr-2" /> Hide Request Form
                    </>
                  ) : (
                    <>
                      <FiPlus className="h-4 w-4 mr-2" /> New Permission Request
                    </>
                  )}
                </Button>
              </div>
            </div>
            {showForm && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                {/* Daily Limit Warning */}
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    todayRequestCount >= 1
                      ? "bg-red-50 border-red-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {todayRequestCount >= 1 ? (
                      <FiX className="h-5 w-5 text-red-600" />
                    ) : (
                      <FiInfo className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <h4
                        className={`font-semibold ${
                          todayRequestCount >= 1
                            ? "text-red-900"
                            : "text-blue-900"
                        }`}
                      >
                        {todayRequestCount >= 1
                          ? "Daily Limit Reached"
                          : "Permission Request Guidelines"}
                      </h4>
                      {todayRequestCount >= 1 ? (
                        <p className="text-sm text-red-800 mt-2">
                          You have already submitted{" "}
                          <strong>
                            {todayRequestCount} request
                            {todayRequestCount > 1 ? "s" : ""}
                          </strong>{" "}
                          today. Please wait until tomorrow to submit another
                          permission request.
                        </p>
                      ) : (
                        <ul className="text-sm text-blue-800 mt-2 space-y-1">
                          <li>
                            • You can submit only{" "}
                            <strong>one permission request per day</strong>
                          </li>
                          <li>
                            • Requests can be made up to{" "}
                            <strong>30 days in advance</strong>
                          </li>
                          <li>• Cannot request permission for past dates</li>
                          <li>• Admin team will be automatically notified</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label
                        htmlFor="date"
                        className="text-sm font-semibold text-black flex items-center gap-2"
                      >
                        <FiCalendar className="h-4 w-4" />
                        Date of Absence
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="border-gray-300 focus:ring-2 focus:ring-black focus:border-black bg-white shadow-sm transition-all duration-200 py-3"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label
                        htmlFor="reason"
                        className="text-sm font-semibold text-black flex items-center gap-2"
                      >
                        <FiInfo className="h-4 w-4" />
                        Reason for Absence
                      </Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="border-gray-300 focus:ring-2 focus:ring-black focus:border-black bg-white shadow-sm py-3">
                          <SelectValue placeholder="Select absence reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {permissionReasons.length === 0 ? (
                            <SelectItem value="General">General</SelectItem>
                          ) : (
                            permissionReasons.map((r) => (
                              <SelectItem
                                key={r}
                                value={r}
                                className="hover:bg-gray-100"
                              >
                                {r}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  {date && availableTimeSlots.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-black flex items-center gap-2">
                        <FiCalendar className="h-4 w-4" />
                        Select Time Slots for {date}
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {availableTimeSlots.map((timeSlot) => (
                          <button
                            key={timeSlot}
                            type="button"
                            onClick={() => handleTimeSlotToggle(timeSlot)}
                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                              selectedTimeSlots.includes(timeSlot)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {timeSlot}
                          </button>
                        ))}
                      </div>
                      {selectedTimeSlots.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            Selected: {selectedTimeSlots.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label
                      htmlFor="details"
                      className="text-sm font-semibold text-black flex items-center gap-2"
                    >
                      <FiInfo className="h-4 w-4" />
                      Additional Details *
                    </Label>
                    <Textarea
                      id="details"
                      required
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Please provide details about your absence request (required)..."
                      className="min-h-[120px] border-gray-300 focus:ring-2 focus:ring-black focus:border-black bg-white shadow-sm transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 px-6 py-3 rounded-xl font-medium shadow-sm transition-all duration-200"
                      onClick={() => {
                        setDate("");
                        setReason("");
                        setDetails("");
                      }}
                    >
                      Clear Form
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || todayRequestCount >= 1}
                      onClick={(e) => {
                        // Let the form handle submission naturally
                      }}
                      className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Submitting Request...
                        </div>
                      ) : todayRequestCount >= 1 ? (
                        "Daily Limit Reached"
                      ) : (
                        "Submit Permission Request"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Permissions History */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 animate-slide-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={goToPreviousMonth}
                  variant="outline"
                  size="icon"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  aria-label="Previous month"
                >
                  <FiChevronLeft />
                </Button>
                <span className="font-bold text-black text-lg px-4">
                  {selectedMonth.format("MMMM YYYY")}
                </span>
                <Button
                  onClick={goToNextMonth}
                  variant="outline"
                  size="icon"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  aria-label="Next month"
                >
                  <FiChevronRight />
                </Button>
                <Button
                  onClick={goToCurrentMonth}
                  variant="outline"
                  className="text-gray-700 font-medium px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Current Month
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-black font-bold text-sm">
                  Total: {summary.total}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-yellow-800 font-bold text-sm">
                  Pending: {summary.pending}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-800 font-bold text-sm">
                  Approved: {summary.approved}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 font-bold text-sm">
                  Rejected: {summary.rejected}
                </div>
              </div>
            </div>
            {error ? (
              <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-lg flex items-center gap-3">
                <FiInfo className="text-red-600 h-6 w-6 animate-pulse" />
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            ) : permissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-emerald-600">
                <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="#ECFDF5" />
                  <path
                    d="M8 12h8M8 16h5"
                    stroke="#059669"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="8" r="1.5" fill="#059669" />
                </svg>
                <div className="mt-4 text-lg">
                  No permissions for this month.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-black uppercase tracking-wider whitespace-nowrap">
                        Date(s)
                      </th>
                      <th className="px-6 py-4 text-left font-bold text-black uppercase tracking-wider whitespace-nowrap">
                        Reason
                      </th>
                      <th className="px-6 py-4 text-left font-bold text-black uppercase tracking-wider whitespace-nowrap">
                        Details
                      </th>
                      <th className="px-6 py-4 text-left font-bold text-black uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm, idx) => (
                      <tr
                        key={idx}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          {Array.isArray(perm.dates)
                            ? perm.dates
                                .map((d: string) =>
                                  dayjs(d).format("MMM D, YYYY")
                                )
                                .join(", ")
                            : dayjs(perm.date).format("MMM D, YYYY")}
                        </td>
                        <td className="px-6 py-4">{perm.reason}</td>
                        <td
                          className="px-6 py-4 max-w-xs truncate"
                          title={perm.details}
                        >
                          {perm.details || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {perm.status === "Approved" ? (
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                              Approved
                            </span>
                          ) : perm.status === "Rejected" ? (
                            <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-2xl flex justify-around py-3 z-50">
          <Link
            href="/teachers/dashboard"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
              pathname === "/teachers/dashboard"
                ? "text-black bg-gray-100 transform scale-105"
                : "text-gray-500 hover:text-black hover:bg-gray-100"
            }`}
          >
            <FiHome className="w-5 h-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
          <Link
            href="/teachers/dashboard?tab=students"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
              pathname.includes("tab=students")
                ? "text-black bg-gray-100 transform scale-105"
                : "text-gray-500 hover:text-black hover:bg-gray-100"
            }`}
          >
            <FiUsers className="w-5 h-5" />
            <span className="text-xs font-medium">Students</span>
          </Link>
          <Link
            href="/teachers/permissions"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
              pathname === "/teachers/permissions"
                ? "text-black bg-gray-100 transform scale-105"
                : "text-gray-500 hover:text-black hover:bg-gray-100"
            }`}
          >
            <FiClipboard className="w-5 h-5" />
            <span className="text-xs font-medium">Permissions</span>
          </Link>
          <Link
            href="/teachers/salary"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
              pathname === "/teachers/salary"
                ? "text-black bg-gray-100 transform scale-105"
                : "text-gray-500 hover:text-black hover:bg-gray-100"
            }`}
          >
            <FiTrendingUp className="w-5 h-5" />
            <span className="text-xs font-medium">Salary</span>
          </Link>
        </nav>
      </div>

      {/* Enhanced Animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-15px) scale(1.05);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-fade-in {
          animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-bounce {
          animation: bounce 2s ease-in-out infinite;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #4f46e5, #7c3aed);
        }

        /* Mobile touch improvements */
        @media (max-width: 768px) {
          .touch-target {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
}
