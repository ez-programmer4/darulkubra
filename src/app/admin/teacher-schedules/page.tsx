"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FiEdit,
  FiSave,
  FiX,
  FiClock,
  FiUser,
  FiCalendar,
  FiPlus,
  FiInfo,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnalyticsDashboard from "@/components/ui/AnalyticsDashboard";
import DateRangePicker from "@/components/ui/DateRangePicker";

interface Teacher {
  ustazid: string;
  ustazname: string;
  schedule: string;
  controlId?: number;
  controller?: {
    name: string;
    username: string;
  };
}

interface TimeSlot {
  id: number;
  time: string;
  category: string;
}

export default function AdminTeacherSchedules() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [controllers, setControllers] = useState<
    { wdt_ID: number; name: string; username: string }[]
  >([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Check authentication and role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Fetch teachers and controllers
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchTeachers();
      fetchControllers();
      fetchTimeSlots();
    }
  }, [status, session]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/admin/users?role=teacher");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      } else {
        toast.error("Failed to fetch teachers");
      }
    } catch (error) {
      toast.error("Error fetching teachers");
    } finally {
      setLoading(false);
    }
  };

  const fetchControllers = async () => {
    try {
      const response = await fetch("/api/admin/users?role=controller");
      if (response.ok) {
        const data = await response.json();
        setControllers(data.controllers || []);
      }
    } catch (error) {
      console.error("Error fetching controllers:", error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch("/api/time-slots");
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.timeSlots || []);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
    }
  };

  const handleUpdateSchedule = async (teacher: Teacher) => {
    try {
      const response = await fetch(
        `/api/admin/teachers/${teacher.ustazid}/schedule`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: teacher.schedule }),
        }
      );

      if (response.ok) {
        toast.success("Teacher schedule updated successfully");
        setEditingTeacher(null);
        fetchTeachers();
        fetchTimeSlots(); // Refresh time slots
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update schedule");
      }
    } catch (error) {
      toast.error("Error updating schedule");
    }
  };

  const parseSchedule = (schedule: string) => {
    if (!schedule) return [];
    return schedule.split(",").map((time) => time.trim());
  };

  const formatSchedule = (times: string[]) => {
    return times.join(",");
  };

  const addTimeToSchedule = (teacher: Teacher, newTime: string) => {
    const currentTimes = parseSchedule(teacher.schedule);
    if (!currentTimes.includes(newTime)) {
      const updatedTimes = [...currentTimes, newTime].sort();
      return { ...teacher, schedule: formatSchedule(updatedTimes) };
    }
    return teacher;
  };

  const removeTimeFromSchedule = (teacher: Teacher, timeToRemove: string) => {
    const currentTimes = parseSchedule(teacher.schedule);
    const updatedTimes = currentTimes.filter((time) => time !== timeToRemove);
    return { ...teacher, schedule: formatSchedule(updatedTimes) };
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Fajr: "bg-blue-100 text-blue-800",
      Dhuhr: "bg-green-100 text-green-800",
      Asr: "bg-yellow-100 text-yellow-800",
      Maghrib: "bg-orange-100 text-orange-800",
      Isha: "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-500 mb-4"></div>
          <p className="text-gray-600">Loading teacher schedules...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 p-4 md:p-8">
      <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 p-8 animate-slide-in">
        <div className="mb-6">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateChange={(startDate, endDate) =>
              setDateRange({ startDate, endDate })
            }
          />
        </div>
        <AnalyticsDashboard />
      </section>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Schedule Management
          </h1>
          <p className="text-gray-600">
            Manage teacher schedules to create available time slots for
            registral users.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teachers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Teachers ({teachers.length})</span>
                <Badge variant="secondary">
                  {teachers.filter((t) => t.schedule).length} with schedules
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiUser className="mx-auto h-12 w-12 mb-4" />
                  <p>No teachers found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teachers.map((teacher) => (
                    <motion.div
                      key={teacher.ustazid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border rounded-lg ${
                        teacher.schedule
                          ? "bg-white border-gray-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {teacher.ustazname}
                          </h3>
                          <p className="text-sm text-gray-600">
                            ID: {teacher.ustazid}
                          </p>
                          {teacher.controller && (
                            <p className="text-sm text-gray-500">
                              Controller: {teacher.controller.name}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => setEditingTeacher(teacher)}
                          variant="outline"
                          size="sm"
                        >
                          <FiEdit className="h-4 w-4" />
                        </Button>
                      </div>

                      {teacher.schedule && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <FiClock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Schedule:
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {parseSchedule(teacher.schedule).map(
                              (time, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {time}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiClock className="mr-2" />
                Available Time Slots ({timeSlots.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiClock className="mx-auto h-12 w-12 mb-4" />
                  <p>No time slots available.</p>
                  <p className="text-sm">
                    Add teacher schedules to generate time slots.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    timeSlots.reduce((acc, slot) => {
                      acc[slot.category] = acc[slot.category] || [];
                      acc[slot.category].push(slot);
                      return acc;
                    }, {} as { [key: string]: TimeSlot[] })
                  ).map(([category, slots]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-semibold text-gray-800 flex items-center">
                        <span
                          className={`w-3 h-3 rounded-full mr-2 ${
                            getCategoryColor(category).split(" ")[0]
                          }`}
                        ></span>
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map((slot) => (
                          <Badge
                            key={slot.id}
                            className={`${getCategoryColor(category)} text-xs`}
                          >
                            {slot.time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Teacher Schedule Modal */}
        {editingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Edit Schedule: {editingTeacher.ustazname}
                </h3>
                <Button
                  onClick={() => setEditingTeacher(null)}
                  variant="ghost"
                  size="sm"
                >
                  <FiX className="h-4 w-4" />
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <FiInfo className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">
                      How to add time slots:
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>
                        • Use 12-hour format with AM/PM (e.g., "4:00 AM", "2:30
                        PM")
                      </li>
                      <li>• Separate multiple times with commas</li>
                      <li>• Example: "4:00 AM, 5:00 AM, 2:00 PM, 3:00 PM"</li>
                      <li>
                        • Times will be automatically categorized by prayer
                        periods
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Schedule (comma-separated)
                  </label>
                  <textarea
                    value={editingTeacher.schedule}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        schedule: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Example: 4:00 AM, 5:00 AM, 2:00 PM, 3:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Add Time Slots
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "4:00 AM",
                      "5:00 AM",
                      "6:00 AM",
                      "7:00 AM",
                      "8:00 AM",
                      "9:00 AM",
                      "10:00 AM",
                      "11:00 AM",
                      "12:00 PM",
                      "1:00 PM",
                      "2:00 PM",
                      "3:00 PM",
                      "4:00 PM",
                      "5:00 PM",
                      "6:00 PM",
                      "7:00 PM",
                      "8:00 PM",
                      "9:00 PM",
                      "10:00 PM",
                      "11:00 PM",
                      "12:00 AM",
                      "1:00 AM",
                      "2:00 AM",
                      "3:00 AM",
                    ].map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentTimes = parseSchedule(
                            editingTeacher.schedule
                          );
                          if (!currentTimes.includes(time)) {
                            const updatedTimes = [...currentTimes, time].sort();
                            setEditingTeacher({
                              ...editingTeacher,
                              schedule: formatSchedule(updatedTimes),
                            });
                          }
                        }}
                        className="text-xs"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={() => handleUpdateSchedule(editingTeacher)}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    <FiSave className="mr-2" />
                    Save Schedule
                  </Button>
                  <Button
                    onClick={() => setEditingTeacher(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
