"use client";

import React, { useState, useEffect } from "react";
import {
  FiUser,
  FiPhone,
  FiClock,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiRefreshCw,
  FiKey,
  FiCalendar,
  FiCheck,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Teacher {
  ustazid: string;
  ustazname: string;
  phone: string;
  schedule: string;
  password: string;
  created_at: string;
}

interface OccupiedTime {
  id: number;
  time_slot: string;
  daypackage: string;
  student: {
    wdt_ID: number;
    name: string;
  };
}

export default function ControllerTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [occupiedTimes, setOccupiedTimes] = useState<OccupiedTime[]>([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "controller") {
      router.push("/dashboard");
      return;
    }
    fetchTeachers();
  }, [status, session, router]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/controller/teachers", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
   
      
      // Handle both array and object responses
      const teachersArray = Array.isArray(data) ? data : (data.teachers || []);
      setTeachers(Array.isArray(teachersArray) ? teachersArray : []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load teachers"
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (teacherId: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotification({
        message: `${label} copied to clipboard!`,
        type: "success",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification({
        message: "Failed to copy to clipboard",
        type: "error",
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const copyAllCredentials = async (teacher: Teacher) => {
    const credentials = `Teacher: ${teacher.ustazname}\nUsername: ${teacher.ustazid}\nPassword: ${teacher.password}\nPhone: ${teacher.phone || 'Not provided'}\nSchedule: ${teacher.schedule || 'No schedule set'}`;
    await copyToClipboard(credentials, "All credentials");
  };

  const fetchTimeSlots = async (teacherId: string) => {
    try {
      setTimeSlotsLoading(true);
      const response = await fetch(`/api/controller/teacher-timeslots?teacherId=${teacherId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOccupiedTimes(data.occupiedTimes || []);
      }
    } catch (error) {
      setNotification({
        message: "Failed to load time slots",
        type: "error",
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  const deleteTimeSlot = async (id: number) => {
    try {
      const response = await fetch(`/api/controller/teacher-timeslots?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        setOccupiedTimes(prev => prev.filter(slot => slot.id !== id));
        setNotification({
          message: "Time slot cleared successfully",
          type: "success",
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      setNotification({
        message: "Failed to clear time slot",
        type: "error",
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const toggleTimeSlots = (teacherId: string) => {
    if (selectedTeacher === teacherId) {
      setSelectedTeacher(null);
      setOccupiedTimes([]);
    } else {
      setSelectedTeacher(teacherId);
      fetchTimeSlots(teacherId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] ${
              notification.type === "success"
                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200 shadow-green-100"
                : "bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border border-red-200 shadow-red-100"
            }`}
          >
            <div className={`p-2 rounded-full ${
              notification.type === "success" ? "bg-green-100" : "bg-red-100"
            }`}>
              {notification.type === "success" ? (
                <FiCheck className="h-4 w-4 text-green-600" />
              ) : (
                <FiCopy className="h-4 w-4 text-red-600" />
              )}
            </div>
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-6 md:p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                My Teachers
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base">
                Manage credentials for {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} under your control
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold">{teachers.length}</div>
                <div className="text-xs text-blue-100">Teachers</div>
              </div>
              <button
                onClick={fetchTeachers}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-white/20"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg shadow-md mb-6">
            <p className="text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        {teachers.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FiUser className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              No Teachers Found
            </h3>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">
              You don't have any teachers assigned to your control yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map((teacher) => (
              <motion.div
                key={teacher.ustazid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: teachers.indexOf(teacher) * 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
              >
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <FiUser className="text-white" size={24} />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-bold text-gray-900">
                          {teacher.ustazname || "Unknown Teacher"}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">ID: {teacher.ustazid}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyAllCredentials(teacher)}
                      className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                      title="Copy all credentials"
                    >
                      <FiCopy size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-6">

                  <div className="space-y-4">
                    {/* Phone */}
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <FiPhone className="text-green-600" size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Phone</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-lg">
                            {teacher.phone || "Not provided"}
                          </span>
                          {teacher.phone && (
                            <button
                              onClick={() => copyToClipboard(teacher.phone, "Phone")}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                              title="Copy phone"
                            >
                              <FiCopy size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Username */}
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <FiUser className="text-blue-600" size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Username</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-lg font-mono">
                            {teacher.ustazid}
                          </span>
                          <button
                            onClick={() => copyToClipboard(teacher.ustazid, "Username")}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Copy username"
                          >
                            <FiCopy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-100 rounded-lg mr-3">
                            <FiKey className="text-purple-600" size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Password</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-lg font-mono min-w-[100px] text-center">
                            {visiblePasswords.has(teacher.ustazid)
                              ? teacher.password
                              : "••••••••"}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(teacher.ustazid)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                            title={visiblePasswords.has(teacher.ustazid) ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords.has(teacher.ustazid) ? (
                              <FiEyeOff size={14} />
                            ) : (
                              <FiEye size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(teacher.password, "Password")}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                            title="Copy password"
                          >
                            <FiCopy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-100">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-orange-100 rounded-lg mr-3">
                          <FiClock className="text-orange-600" size={16} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Schedule</span>
                      </div>
                      <div className="text-sm text-gray-900 bg-white p-3 rounded-lg shadow-sm border">
                        {teacher.schedule || "No schedule set"}
                      </div>
                    </div>

                    {/* Time Slots Management */}
                    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleTimeSlots(teacher.ustazid)}
                        className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                          selectedTeacher === teacher.ustazid 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                            : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-gray-700 hover:text-blue-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                            selectedTeacher === teacher.ustazid 
                              ? 'bg-white/20 backdrop-blur-sm' 
                              : 'bg-blue-100'
                          }`}>
                            <FiClock className={`${
                              selectedTeacher === teacher.ustazid ? 'text-white' : 'text-blue-600'
                            }`} size={18} />
                          </div>
                          <div className="text-left">
                            <div className={`text-sm font-semibold ${
                              selectedTeacher === teacher.ustazid ? 'text-white' : 'text-gray-900'
                            }`}>
                              Schedule Management
                            </div>
                            <div className={`text-xs ${
                              selectedTeacher === teacher.ustazid ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              View & manage time slots
                            </div>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: selectedTeacher === teacher.ustazid ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <FiUsers className={`${
                            selectedTeacher === teacher.ustazid ? 'text-white' : 'text-blue-600'
                          }`} size={18} />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {selectedTeacher === teacher.ustazid && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-gradient-to-br from-white to-slate-50 border-t border-slate-200">
                              {timeSlotsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="flex items-center gap-3">
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                      className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                                    />
                                    <span className="text-sm text-gray-600 font-medium">Loading time slots...</span>
                                  </div>
                                </div>
                              ) : occupiedTimes.length === 0 ? (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiClock className="text-gray-400" size={24} />
                                  </div>
                                  <p className="text-sm font-medium text-gray-600 mb-1">No Occupied Slots</p>
                                  <p className="text-xs text-gray-500">This teacher has no assigned time slots</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                      <FiUsers className="text-blue-600" size={16} />
                                      Occupied Time Slots ({occupiedTimes.length})
                                    </h4>
                                  </div>
                                  {occupiedTimes.map((slot, index) => (
                                    <motion.div
                                      key={slot.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                      className="group bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                              <FiClock className="text-blue-600" size={14} />
                                            </div>
                                            <div>
                                              <div className="text-sm font-semibold text-gray-900">
                                                {slot.time_slot}
                                              </div>
                                              <div className="text-xs text-blue-600 font-medium">
                                                {slot.daypackage}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 ml-11">
                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                            <span className="text-xs text-gray-600">
                                              <span className="font-medium">Student:</span> {slot.student.name}
                                            </span>
                                          </div>
                                        </div>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => deleteTimeSlot(slot.id)}
                                          className="opacity-0 group-hover:opacity-100 p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                                          title="Clear this time slot"
                                        >
                                          <FiTrash2 size={16} />
                                        </motion.button>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center justify-center bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-3 border border-gray-200">
                      <div className="p-2 bg-gray-100 rounded-lg mr-3">
                        <FiCalendar className="text-gray-600" size={14} />
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        Created: {new Date(teacher.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}