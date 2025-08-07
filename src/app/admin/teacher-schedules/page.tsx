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
  FiTrendingUp,
  FiShield,
  FiStar,
  FiCheckCircle,
  FiLoader,
  FiAlertTriangle,
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
      const response = await fetch("/api/admin/users");

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
  console.log("teachers", teachers);

  const fetchControllers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setControllers(data.controllers || []);
      }
    } catch (error) {}
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch("/api/time-slots");
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.timeSlots || []);
      }
    } catch (error) {}
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
      Fajr: "bg-blue-100 text-blue-800 border-blue-200",
      Dhuhr: "bg-green-100 text-green-800 border-green-200",
      Asr: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Maghrib: "bg-orange-100 text-orange-800 border-orange-200",
      Isha: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mb-6"></div>
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <p className="text-indigo-700 font-medium text-lg">
            Loading teacher schedules...
          </p>
          <p className="text-indigo-500 text-sm mt-2">
            Please wait while we fetch the data
          </p>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 p-4 md:p-8">
      {/* Enhanced Header Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-indigo-100 p-8 mb-8 animate-slide-in"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 bg-clip-text text-transparent mb-4"
            >
              Teacher Schedule Management
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-indigo-700 leading-relaxed"
            >
              Manage teacher schedules to create available time slots for
              registral users. Optimize scheduling efficiency and ensure
              seamless coordination.
            </motion.p>
          </div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <FiUser className="h-6 w-6" />
                <div>
                  <p className="text-sm opacity-90">Total Teachers</p>
                  <p className="text-2xl font-bold">{teachers.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <FiClock className="h-6 w-6" />
                <div>
                  <p className="text-sm opacity-90">Time Slots</p>
                  <p className="text-2xl font-bold">{timeSlots.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg lg:col-span-1">
              <div className="flex items-center gap-3">
                <FiCheckCircle className="h-6 w-6" />
                <div>
                  <p className="text-sm opacity-90">Scheduled</p>
                  <p className="text-2xl font-bold">
                    {teachers.filter((t) => t.schedule).length}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Date Range Picker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <FiCalendar className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-indigo-900">
              Date Range Filter
            </h3>
          </div>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateChange={(startDate, endDate) =>
              setDateRange({ startDate, endDate })
            }
          />
        </motion.div>
      </motion.section>

      {/* Analytics Dashboard */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="mb-8"
      >
        <AnalyticsDashboard />
      </motion.section>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Enhanced Teachers List */}

          {/* Enhanced Available Time Slots */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <Card className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white">
                <CardTitle className="flex items-center gap-3">
                  <FiClock className="h-6 w-6" />
                  <span className="text-xl">
                    Available Time Slots ({timeSlots.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {timeSlots.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 text-teal-500"
                  >
                    <FiClock className="mx-auto h-16 w-16 mb-4 opacity-50" />
                    <p className="text-xl font-semibold mb-2">
                      No time slots available
                    </p>
                    <p className="text-sm opacity-75">
                      Add teacher schedules to generate time slots
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(
                      timeSlots.reduce((acc, slot) => {
                        acc[slot.category] = acc[slot.category] || [];
                        acc[slot.category].push(slot);
                        return acc;
                      }, {} as { [key: string]: TimeSlot[] })
                    ).map(([category, slots], categoryIndex) => (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: categoryIndex * 0.1,
                        }}
                        className="space-y-3"
                      >
                        <h4 className="font-bold text-lg text-indigo-900 flex items-center">
                          <span
                            className={`w-4 h-4 rounded-full mr-3 ${
                              getCategoryColor(category).split(" ")[0]
                            }`}
                          ></span>
                          {category}
                          <Badge className="ml-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            {slots.length} slots
                          </Badge>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {slots.map((slot, slotIndex) => (
                            <motion.div
                              key={slot.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: slotIndex * 0.05 }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <Badge
                                className={`${getCategoryColor(
                                  category
                                )} text-sm font-medium border-2 shadow-md hover:shadow-lg transition-all duration-200`}
                              >
                                {slot.time}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Edit Teacher Schedule Modal */}
        {editingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-indigo-200"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-indigo-900">
                    Edit Schedule: {editingTeacher.ustazname}
                  </h3>
                  <p className="text-indigo-600 mt-1">
                    Configure available time slots for this teacher
                  </p>
                </div>
                <Button
                  onClick={() => setEditingTeacher(null)}
                  variant="ghost"
                  size="sm"
                  className="p-2 rounded-full hover:bg-indigo-100"
                >
                  <FiX className="h-6 w-6" />
                </Button>
              </div>

              {/* Enhanced Instructions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <FiInfo className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-3 text-lg">
                      How to add time slots:
                    </h4>
                    <ul className="text-blue-800 space-y-2">
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Use 12-hour format with AM/PM (e.g., "4:00 AM", "2:30
                        PM")
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Separate multiple times with commas
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Example: "4:00 AM, 5:00 AM, 2:00 PM, 3:00 PM"
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Times will be automatically categorized by prayer
                        periods
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-indigo-900 mb-3">
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
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-lg transition-all duration-200 resize-none"
                    placeholder="Example: 4:00 AM, 5:00 AM, 2:00 PM, 3:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-indigo-900 mb-4">
                    Quick Add Time Slots
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
                        className="text-xs bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all duration-200"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 pt-6">
                  <Button
                    onClick={() => handleUpdateSchedule(editingTeacher)}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <FiSave className="mr-2 h-5 w-5" />
                    Save Schedule
                  </Button>
                  <Button
                    onClick={() => setEditingTeacher(null)}
                    variant="outline"
                    className="flex-1 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold py-3 rounded-2xl transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
