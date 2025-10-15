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
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiPlus,
  FiLoader,
  FiClock,
} from "react-icons/fi";
import dayjs from "dayjs";

type Permission = {
  date?: string;
  dates?: string[];
  reason: string;
  details?: string;
  status?: string;
};

export default function TeacherPermissions() {
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
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [isWholeDaySelected, setIsWholeDaySelected] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [permissionReasons, setPermissionReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
      if (!date || date.trim() === "" || !user?.id) {
        setAvailableTimeSlots([]);
        return;
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        setAvailableTimeSlots([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/teachers/time-slots?date=${encodeURIComponent(
            date
          )}&teacherId=${user.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableTimeSlots(data.timeSlots || []);
        } else {
          setAvailableTimeSlots([]);
        }
      } catch (error) {
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
          if (
            data.reasons &&
            Array.isArray(data.reasons) &&
            data.reasons.length > 0
          ) {
            setPermissionReasons(data.reasons);
          } else {
            try {
              await fetch("/api/seed-permission-reasons", { method: "POST" });
              const retryRes = await fetch("/api/permission-reasons", {
                credentials: "include",
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (
                  retryData.reasons &&
                  Array.isArray(retryData.reasons) &&
                  retryData.reasons.length > 0
                ) {
                  setPermissionReasons(retryData.reasons);
                  return;
                }
              }
            } catch (retryError) {
              // Ignore retry errors and fall back to default reasons
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
          setPermissionReasons([
            "Sick Leave",
            "Personal Emergency",
            "Family Matter",
            "Medical Appointment",
            "Other",
          ]);
        }
      } catch (error) {
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

      // Build notification message with debug info
      let description = "";
      if (responseData.notifications?.sms_sent > 0) {
        description = `📱 Admin team notified via SMS (${responseData.notifications.sms_sent}/${responseData.notifications.total_admins} messages sent)`;
      } else if (responseData.debug?.warning) {
        description = responseData.debug.warning;
      } else if (responseData.notifications?.total_admins === 0) {
        description =
          "⚠️ No admin phone numbers configured. Request saved but not sent via SMS.";
      } else {
        description =
          "📧 Request submitted successfully. Admin team will be notified.";
      }

      toast({
        title: "✅ Request Submitted!",
        description: description,
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
    if (timeSlot === "Whole Day") {
      if (isWholeDaySelected) {
        setIsWholeDaySelected(false);
        setSelectedTimeSlots([]);
      } else {
        setIsWholeDaySelected(true);
        setSelectedTimeSlots(["Whole Day"]);
      }
    } else {
      setIsWholeDaySelected(false);
      setSelectedTimeSlots((prev) =>
        prev.includes(timeSlot)
          ? prev.filter((slot) => slot !== timeSlot && slot !== "Whole Day")
          : [...prev.filter((slot) => slot !== "Whole Day"), timeSlot]
      );
    }
  };

  // Summary
  const summary = permissions.reduce(
    (acc, perm) => {
      acc.total++;
      if (perm.status === "Approved") acc.approved++;
      else if (perm.status === "Rejected" || perm.status === "Declined")
        acc.rejected++;
      else acc.pending++;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  );

  // Month navigation
  const goToPreviousMonth = () =>
    setSelectedMonth((m) => m.subtract(1, "month"));
  const goToNextMonth = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToCurrentMonth = () => setSelectedMonth(dayjs().startOf("month"));

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 border">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-2xl shadow-lg border p-8 text-center max-w-sm mx-auto">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <FiCheckCircle className="text-green-600 text-2xl mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">
            Request Submitted!
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Your permission request has been sent via SMS to the admin team. You
            will be notified once reviewed.
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-medium"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" /> Back to Permissions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="space-y-4">
        {/* Request Permission Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FiPlus className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-black">
                  Permission Request
                </h1>
                <p className="text-gray-600 text-sm">Request time off</p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
            >
              {showForm ? (
                <FiX className="h-4 w-4" />
              ) : (
                <FiPlus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showForm && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Daily Limit Warning */}
              {todayRequestCount >= 1 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FiX className="h-4 w-4 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-900 text-sm">
                        Daily Limit Reached
                      </h4>
                      <p className="text-xs text-red-800 mt-1">
                        You can only submit one request per day.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    📅 Which day do you need permission? *
                  </Label>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select the date you need to be absent from work
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    🤔 Why do you need permission? *
                  </Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose your reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionReasons.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the main reason for your absence
                  </p>
                </div>

                {/* Time Slots with Instructions */}
                {date && availableTimeSlots.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-black mb-2 block">
                      Choose Your Absence Time *
                    </Label>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <FiInfo className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium mb-1">How to choose:</p>
                          <p>
                            • <strong>Full Day Off:</strong> Click "Whole Day"
                            if you won't come to work at all
                          </p>
                          <p>
                            • <strong>Partial Day:</strong> Select specific
                            class times if you only need some hours off
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Whole Day Option */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleTimeSlotToggle("Whole Day")}
                          className={`w-full p-4 rounded-lg border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            isWholeDaySelected
                              ? "border-red-500 bg-red-50 text-red-800"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-red-50 hover:border-red-300"
                          }`}
                        >
                          <FiCalendar className="h-4 w-4" />
                          <span>🏠 Whole Day Off</span>
                          {isWholeDaySelected && (
                            <span className="text-xs">(Selected)</span>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-1 px-2">
                          I won't come to work at all on this day
                        </p>
                      </div>

                      {/* Individual Time Slots */}
                      {availableTimeSlots.filter((slot) => slot !== "Whole Day")
                        .length > 0 && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <FiClock className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">
                              ⏰ Select Specific Class Times
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            Choose only the class times you need to miss
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {availableTimeSlots
                              .filter((slot) => slot !== "Whole Day")
                              .map((timeSlot) => (
                                <button
                                  key={timeSlot}
                                  type="button"
                                  onClick={() => handleTimeSlotToggle(timeSlot)}
                                  disabled={isWholeDaySelected}
                                  className={`p-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                                    selectedTimeSlots.includes(timeSlot)
                                      ? "border-green-500 bg-green-50 text-green-800"
                                      : isWholeDaySelected
                                      ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                                  }`}
                                >
                                  {timeSlot}
                                  {selectedTimeSlots.includes(timeSlot) && (
                                    <div className="text-xs mt-1">
                                      ✓ Selected
                                    </div>
                                  )}
                                </button>
                              ))}
                          </div>
                          {isWholeDaySelected && (
                            <p className="text-xs text-gray-400 text-center mt-2">
                              Individual times disabled when "Whole Day" is
                              selected
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selection Summary */}
                    {selectedTimeSlots.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FiCheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Your Selection:
                          </span>
                        </div>
                        <p className="text-sm text-green-700">
                          {isWholeDaySelected
                            ? "🏠 You will be absent for the entire day"
                            : `⏰ You will miss these class times: ${selectedTimeSlots.join(
                                ", "
                              )}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    📝 Tell us more details *
                  </Label>
                  <Textarea
                    required
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Example: I have a doctor appointment at 2 PM, or I am feeling sick and need to rest..."
                    className="min-h-[80px] resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Explain your situation so admin can understand and approve
                    quickly
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || todayRequestCount >= 1}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <FiLoader className="animate-spin mr-2 h-4 w-4" />
                      Submitting...
                    </>
                  ) : todayRequestCount >= 1 ? (
                    "Daily Limit Reached"
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Permissions History */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-black">History</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={goToPreviousMonth}
                variant="outline"
                size="sm"
                className="p-2"
              >
                <FiChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                {selectedMonth.format("MMM YY")}
              </span>
              <Button
                onClick={goToNextMonth}
                variant="outline"
                size="sm"
                className="p-2"
              >
                <FiChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-100 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-black">
                {summary.total}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-yellow-800">
                {summary.pending}
              </div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-green-800">
                {summary.approved}
              </div>
              <div className="text-xs text-green-600">Approved</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-red-700">
                {summary.rejected}
              </div>
              <div className="text-xs text-red-600">Rejected</div>
            </div>
          </div>

          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FiInfo className="text-red-600 h-4 w-4" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiCalendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No permissions for this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-black text-sm">
                        {Array.isArray(perm.dates)
                          ? perm.dates
                              .map((d: string) => dayjs(d).format("MMM D"))
                              .join(", ")
                          : dayjs(perm.date).format("MMM D, YYYY")}
                      </div>
                      <div className="text-gray-600 text-sm mt-1">
                        {perm.reason}
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {perm.status === "Approved" ? (
                        <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                          Approved
                        </span>
                      ) : perm.status === "Rejected" ||
                        perm.status === "Declined" ? (
                        <span className="inline-block px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                          {perm.status === "Declined" ? "Declined" : "Rejected"}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  {perm.details && (
                    <div
                      className="text-gray-500 text-sm truncate"
                      title={perm.details}
                    >
                      {perm.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
