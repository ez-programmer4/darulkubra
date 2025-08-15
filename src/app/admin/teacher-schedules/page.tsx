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
  FiUsers,
  FiTarget,
  FiActivity,
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
      const response = await fetch("/api/admin/teachers");
      console.log('Teachers API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Teachers API data:', data);
        
        // Map the response to match the Teacher interface
        const teachersData = data.teachers?.map((t: any) => ({
          ustazid: t.id,
          ustazname: t.name,
          schedule: '', // Default empty schedule
        })) || [];
        
        setTeachers(teachersData);
        console.log('Mapped teachers:', teachersData);
      } else {
        console.error('Failed to fetch teachers:', response.status);
        toast.error("Failed to fetch teachers");
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error("Error fetching teachers");
    } finally {
      setLoading(false);
    }
  };

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
      console.log('Time slots API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Time slots API data:', data);
        setTimeSlots(data.timeSlots || []);
      } else {
        console.error('Failed to fetch time slots:', response.status);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mb-6"></div>
          <p className="text-black font-medium text-lg">Loading teacher schedules...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiClock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Teacher Schedules
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Manage teacher schedules and available time slots
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Teachers</span>
                </div>
                <div className="text-2xl font-bold text-black">{teachers.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiClock className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Time Slots</span>
                </div>
                <div className="text-2xl font-bold text-black">{timeSlots.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiCheckCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Scheduled</span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {teachers.filter((t) => t.schedule).length}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiActivity className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">Active</span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {teachers.filter((t) => t.schedule && t.schedule.length > 0).length}
                </div>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-black rounded-xl">
                <FiCalendar className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black">Date Range Filter</h3>
            </div>
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onDateChange={(startDate, endDate) =>
                setDateRange({ startDate, endDate })
              }
            />
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <AnalyticsDashboard 
            timeSlots={timeSlots.map(slot => ({ ...slot, id: slot.id.toString() }))}
          />
        </div>

        {/* Teachers List */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUser className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Teachers</h2>
                <p className="text-gray-600">Manage individual teacher schedules</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 lg:p-10">
            {teachers.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiUser className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Teachers Found</h3>
                <p className="text-gray-600 text-xl">No teachers are available in the system.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.ustazid}
                    className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gray-100 rounded-xl">
                        <FiUser className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-black text-lg">{teacher.ustazname}</h3>
                        <p className="text-sm text-gray-500">ID: {teacher.ustazid}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Current Schedule:</p>
                      {teacher.schedule ? (
                        <div className="flex flex-wrap gap-2">
                          {parseSchedule(teacher.schedule).map((time, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No schedule set</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setEditingTeacher(teacher)}
                      className="w-full bg-black hover:bg-gray-800 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FiEdit className="h-4 w-4" />
                      Edit Schedule
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Time Slots */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiClock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Available Time Slots</h2>
                <p className="text-gray-600">{timeSlots.length} slots available</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 lg:p-10">
            {timeSlots.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiClock className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Time Slots Available</h3>
                <p className="text-gray-600 text-xl">Add teacher schedules to generate time slots</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  timeSlots.reduce((acc, slot) => {
                    acc[slot.category] = acc[slot.category] || [];
                    acc[slot.category].push(slot);
                    return acc;
                  }, {} as { [key: string]: TimeSlot[] })
                ).map(([category, slots]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-lg text-black">{category}</h4>
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                        {slots.length} slots
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`px-3 py-2 rounded-xl text-sm font-medium text-center ${getCategoryColor(category)}`}
                        >
                          {slot.time}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Teacher Schedule Modal */}
        {editingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-black">
                    Edit Schedule: {editingTeacher.ustazname}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Configure available time slots for this teacher
                  </p>
                </div>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-600 rounded-xl">
                    <FiInfo className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-3 text-lg">
                      How to add time slots:
                    </h4>
                    <ul className="text-blue-800 space-y-2">
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Use 12-hour format with AM/PM (e.g., "4:00 AM", "2:30 PM")
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Separate multiple times with commas
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-blue-600" />
                        Example: "4:00 AM, 5:00 AM, 2:00 PM, 3:00 PM"
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-black mb-3">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-lg resize-none"
                    placeholder="Example: 4:00 AM, 5:00 AM, 2:00 PM, 3:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-black mb-4">
                    Quick Add Time Slots
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {[
                      "4:00 AM", "5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
                      "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
                      "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM", "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM",
                    ].map((time) => (
                      <button
                        key={time}
                        onClick={() => {
                          const currentTimes = parseSchedule(editingTeacher.schedule);
                          if (!currentTimes.includes(time)) {
                            const updatedTimes = [...currentTimes, time].sort();
                            setEditingTeacher({
                              ...editingTeacher,
                              schedule: formatSchedule(updatedTimes),
                            });
                          }
                        }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg border border-gray-300 transition-all duration-200"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4 pt-6">
                  <button
                    onClick={() => handleUpdateSchedule(editingTeacher)}
                    className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FiSave className="h-5 w-5" />
                    Save Schedule
                  </button>
                  <button
                    onClick={() => setEditingTeacher(null)}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}