"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiTrash2,
  FiChevronDown,
  FiChevronRight as FiChevronRightIcon,
  FiCopy,
  FiRefreshCw,
  FiUsers,
  FiFilter,
  FiUserPlus,
  FiAlertCircle,
  FiCalendar,
  FiPhone,
  FiShield,
  FiSettings,
  FiAward,
  FiX,
  FiUser,
  FiCheck,
  FiInfo,
} from "react-icons/fi";
import Modal from "@/app/components/Modal";
import ConfirmModal from "@/app/components/ConfirmModal";
import { useDebounce } from "use-debounce";

// Schedule Generator Component
const ScheduleGenerator = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  useEffect(() => {
    if (value) {
      const times = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => {
          // If it's already in 12-hour format, keep it
          if (t.includes("AM") || t.includes("PM")) {
            return t;
          }
          // If it's in 24-hour format, convert to 12-hour
          return formatTo12Hour(t);
        });
      setSelectedTimes(times);
    }
  }, [value]);

  const formatTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} ${period}`;
  };

  const generateTimeSlots = () => {
    const slots = [];

    // New prayer time ranges
    const prayerTimes = {
      Midnight: { start: 0, end: 5 * 60 + 30 }, // 12:00 AM to 5:30 AM
      Fajr: { start: 6 * 60, end: 12 * 60 + 30 }, // 6:00 AM to 12:30 PM
      Zuhur: { start: 13 * 60, end: 15 * 60 + 30 }, // 1:00 PM to 3:30 PM
      Asr: { start: 16 * 60, end: 18 * 60 + 30 }, // 4:00 PM to 6:30 PM
      Maghrib: { start: 19 * 60, end: 20 * 60 }, // 7:00 PM to 8:00 PM
      Isha: { start: 20 * 60 + 30, end: 23 * 60 + 30 }, // 8:30 PM to 11:30 PM
    };

    // Generate all 30-minute intervals for full 24 hours
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const time12 = formatTo12Hour(timeStr);
        const currentTime = hour * 60 + minute;

        // Determine prayer period
        let category = "General";

        if (
          currentTime >= prayerTimes.Midnight.start &&
          currentTime <= prayerTimes.Midnight.end
        ) {
          category = "Midnight";
        } else if (
          currentTime >= prayerTimes.Fajr.start &&
          currentTime <= prayerTimes.Fajr.end
        ) {
          category = "Fajr";
        } else if (
          currentTime >= prayerTimes.Zuhur.start &&
          currentTime <= prayerTimes.Zuhur.end
        ) {
          category = "Zuhur";
        } else if (
          currentTime >= prayerTimes.Asr.start &&
          currentTime <= prayerTimes.Asr.end
        ) {
          category = "Asr";
        } else if (
          currentTime >= prayerTimes.Maghrib.start &&
          currentTime <= prayerTimes.Maghrib.end
        ) {
          category = "Maghrib";
        } else if (
          currentTime >= prayerTimes.Isha.start &&
          currentTime <= prayerTimes.Isha.end
        ) {
          category = "Isha";
        }

        // Only add slots that belong to prayer periods
        if (category !== "General") {
          slots.push({
            time: timeStr,
            time12: time12,
            prayer: category,
          });
        }
      }
    }

    return slots;
  };

  const toggleTime = (time: string) => {
    // Convert 24-hour format to 12-hour format with AM/PM
    const time12Hour = formatTo12Hour(time);

    const newTimes = selectedTimes.includes(time12Hour)
      ? selectedTimes.filter((t) => t !== time12Hour)
      : [...selectedTimes, time12Hour].sort((a, b) => {
          // Sort by converting back to 24-hour for proper ordering
          const convertTo24 = (time12: string) => {
            const [time, period] = time12.split(" ");
            const [hours, minutes] = time.split(":").map(Number);
            let hour24 = hours;
            if (period === "AM" && hours === 12) hour24 = 0;
            if (period === "PM" && hours !== 12) hour24 = hours + 12;
            return hour24 * 60 + minutes;
          };
          return convertTo24(a) - convertTo24(b);
        });

    setSelectedTimes(newTimes);
    onChange(newTimes.join(", "));
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-gray-300">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter manually with AM/PM: 6:00 AM, 2:30 PM, 8:00 PM or select from slots below"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-gray-900"
        />
      </div>

      <div className="space-y-4">
        {["Midnight", "Fajr", "Zuhur", "Asr", "Maghrib", "Isha"].map(
          (prayer) => {
            const prayerSlots = timeSlots.filter(
              (slot) => slot.prayer === prayer
            );
            const prayerColors = {
              Midnight: "border-gray-200 bg-gray-50",
              Subhi: "border-gray-200 bg-gray-50",
              Dhuhr: "border-gray-200 bg-gray-50",
              Asr: "border-gray-200 bg-gray-50",
              Maghrib: "border-gray-200 bg-gray-50",
              Isha: "border-gray-200 bg-gray-50",
            };

            const prayerPeriods = {
              Midnight: "Midnight (12:00 AM - 5:30 AM)",
              Fajr: "Fajr (6:00 AM - 12:30 PM)",
              Zuhur: "Zuhur (1:00 PM - 3:30 PM)",
              Asr: "Asr (4:00 PM - 6:30 PM)",
              Maghrib: "Maghrib (7:00 PM - 8:00 PM)",
              Isha: "Isha (8:30 PM - 11:30 PM)",
            };

            return (
              <div
                key={prayer}
                className={`p-4 rounded-xl border-2 ${
                  prayerColors[prayer as keyof typeof prayerColors]
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <h4 className="font-bold text-lg text-gray-800">
                    {prayer} Period
                  </h4>
                </div>
                <p className="text-sm text-gray-600 mb-3 font-medium">
                  {prayerPeriods[prayer as keyof typeof prayerPeriods]}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {prayerSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleTime(slot.time)}
                      className={`p-2 text-sm rounded-lg border transition-all duration-200 hover:scale-105 ${
                        selectedTimes.includes(slot.time12)
                          ? "bg-black text-white border-black shadow-lg"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      <div className="font-bold">{slot.time12}</div>
                      <div className="text-xs opacity-75">{slot.time}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700 font-medium">
          💡 Select from prayer-based time slots with 30-minute intervals. Times
          shown in both 12-hour and 24-hour formats.
        </p>
      </div>
    </div>
  );
};

type UserRole = "admin" | "controller" | "teacher" | "registral";

interface User {
  id: string;
  name: string;
  username?: string;
  role: UserRole;
  schedule?: string;
  controlId?: string;
  phone?: string;
  code?: string;
}

const RoleBadge = ({ role }: { role: UserRole }) => {
  const roleStyles: Record<UserRole, string> = {
    admin: "bg-purple-100 text-purple-800",
    controller: "bg-blue-100 text-blue-800",
    teacher: "bg-green-100 text-green-800",
    registral: "bg-orange-100 text-orange-800",
  };

  if (!role) return null;

  return (
    <span
      className={`px-3 py-1 text-sm font-semibold rounded-full ${roleStyles[role]}`}
    >
      {role?.charAt(0)?.toUpperCase() + role?.slice(1) || "Unknown"}
    </span>
  );
};

const roleOrder: UserRole[] = ["admin", "controller", "teacher", "registral"];
const roleLabels: Record<UserRole, string> = {
  admin: "Admins",
  controller: "Controllers",
  teacher: "Teachers",
  registral: "Registrals",
};

const roleIcons: Record<UserRole, any> = {
  admin: FiShield,
  controller: FiUsers,
  teacher: FiAward,
  registral: FiSettings,
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [newUserRole, setNewUserRole] = useState<UserRole>("controller");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRoles, setExpandedRoles] = useState<Record<UserRole, boolean>>(
    {
      admin: true,
      controller: true,
      teacher: true,
      registral: true,
    }
  );
  const [controllers, setControllers] = useState<User[]>([]);
  const [teacherSchedule, setTeacherSchedule] = useState("");
  const [teacherControlId, setTeacherControlId] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [totalCounts, setTotalCounts] = useState<Record<UserRole, number>>({
    admin: 0,
    controller: 0,
    teacher: 0,
    registral: 0,
  });
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: debouncedSearchQuery,
        role: roleFilter,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers();
    fetchTotalCounts();
  }, [fetchUsers]);

  const fetchTotalCounts = async () => {
    try {
      const res = await fetch("/api/admin/users/counts");
      if (!res.ok) throw new Error("Failed to fetch counts");
      const data = await res.json();
      setTotalCounts(data.counts);
      setTotalUsers(data.total);
    } catch (err: any) {
      console.error("Error fetching counts:", err);
    }
  };

  const fetchControllers = async () => {
    try {
      const res = await fetch("/api/admin/users?role=controller&limit=100");
      if (!res.ok) throw new Error("Failed to fetch controllers");
      const data = await res.json();
      setControllers(data.users);
    } catch (err: any) {
      console.error("Error fetching controllers:", err);
    }
  };

  useEffect(() => {
    fetchControllers();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if ((editingUser ? editingUser.role : newUserRole) === "teacher") {
      if (
        !teacherControlId ||
        teacherControlId === "" ||
        teacherControlId === "0"
      ) {
        setError("Please select a valid controller for the teacher");
        return;
      }

      if (!teacherSchedule.trim()) {
        setError("Please enter a schedule for the teacher");
        return;
      }

      if (!teacherPhone.trim()) {
        setError("Please enter a phone number for the teacher");
        return;
      }

      // Use the already generated password from state
      data.controlId = teacherControlId;
      data.schedule = teacherSchedule.trim();
      data.phone = teacherPhone.trim();
      data.password = generatedPassword;
      data.plainPassword = generatedPassword;
    }

    const payload = {
      ...data,
      id: editingUser?.id,
      role: editingUser ? editingUser.role : newUserRole,
    };

    const method = editingUser ? "PUT" : "POST";

    try {
      const res = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      const result = await res.json();

      // Show generated credentials for new teachers
      if (
        !editingUser &&
        newUserRole === "teacher" &&
        result.generatedUsername &&
        result.generatedPassword
      ) {
        setGeneratedUsername(result.generatedUsername);
        setGeneratedPassword(result.generatedPassword);
        setShowCredentials(true);
      } else {
        setIsModalOpen(false);
        fetchUsers();
        resetForm();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingUser.id, role: deletingUser.role }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      setIsConfirmModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setNewUserRole("controller");
    setTeacherSchedule("");
    setTeacherControlId("");
    setTeacherPhone("");
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setNewUserRole(user.role);
    setTeacherSchedule(user.schedule || "");
    setTeacherControlId(user.controlId || "");
    setTeacherPhone(user.phone || "");
    setIsModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setDeletingUser(user);
    setIsConfirmModalOpen(true);
  };

  const toggleRoleExpansion = (role: UserRole) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const groupedUsers = roleOrder.reduce((acc, role) => {
    acc[role] = users.filter((user) => user.role === role);
    return acc;
  }, {} as Record<UserRole, User[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mb-6"></div>
          <p className="text-black font-medium text-lg">Loading users...</p>
          <p className="text-gray-500 text-sm mt-2">
            Please wait while we fetch the data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiUsers className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  User Management
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Manage system users, roles, and permissions
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Users
                </label>
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Filter by Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="controller">Controller</option>
                  <option value="teacher">Teacher</option>
                  <option value="registral">Registral</option>
                </select>
              </div>
              <div className="lg:col-span-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-4 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    onClick={openCreateModal}
                    className="flex-1 bg-black hover:bg-gray-800 text-white px-4 py-4 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiUserPlus className="h-4 w-4" />
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-6">
          {roleOrder.map((role) => {
            const roleUsers = groupedUsers[role] || [];
            const RoleIcon = roleIcons[role];

            return (
              <div
                key={role}
                className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden"
              >
                <div
                  className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRoleExpansion(role)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-black rounded-xl">
                        <RoleIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-black">
                          {roleLabels[role]}
                        </h2>
                        <p className="text-gray-600">
                          {roleUsers.length} users
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RoleBadge role={role} />
                      {expandedRoles[role] ? (
                        <FiChevronDown className="h-6 w-6 text-gray-400" />
                      ) : (
                        <FiChevronRightIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedRoles[role] && (
                  <div className="p-6">
                    {roleUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                          <RoleIcon className="h-16 w-16 text-gray-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-black mb-4">
                          No {roleLabels[role]}
                        </h3>
                        <p className="text-gray-600 text-xl">
                          No users found with this role.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                                User
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                                Details
                              </th>
                              {role === "teacher" && (
                                <>
                                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                                    Controller
                                  </th>
                                  <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                                    Schedule
                                  </th>
                                </>
                              )}
                              <th className="px-6 py-4 text-right text-sm font-bold text-black uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {roleUsers.map((user, index) => (
                              <tr
                                key={user.id}
                                className={`hover:bg-gray-50 transition-all duration-200 ${
                                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                                      <span className="text-white font-bold">
                                        {user.name
                                          ? user.name.charAt(0).toUpperCase()
                                          : "?"}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-black">
                                        {user.name || "Unknown User"}
                                      </div>
                                      {user.username && (
                                        <div className="text-sm text-gray-500">
                                          @{user.username}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    {user.phone && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <FiPhone className="h-4 w-4" />
                                        <span>{user.phone}</span>
                                        <button
                                          onClick={() =>
                                            copyToClipboard(user.phone!)
                                          }
                                          className="p-1 hover:bg-gray-200 rounded"
                                          title="Copy phone"
                                        >
                                          <FiCopy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                    {user.code && (
                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                          #{user.code}
                                        </span>
                                        <button
                                          onClick={() =>
                                            copyToClipboard(user.code!)
                                          }
                                          className="p-1 hover:bg-gray-200 rounded"
                                          title="Copy code"
                                        >
                                          <FiCopy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {role === "teacher" && (
                                  <>
                                    <td className="px-6 py-4">
                                      <div className="text-gray-700">
                                        {user.controlId
                                          ? controllers.find(
                                              (c) =>
                                                c && c.id === user.controlId
                                            )?.name || "Unknown"
                                          : "Not assigned"}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div
                                        className="text-gray-700 max-w-xs truncate"
                                        title={user.schedule}
                                      >
                                        {user.schedule || "No schedule"}
                                      </div>
                                    </td>
                                  </>
                                )}
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openEditModal(user)}
                                      className="p-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all hover:scale-105"
                                      title="Edit user"
                                    >
                                      <FiEdit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(user)}
                                      className="p-2 border border-gray-300 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all hover:scale-105"
                                      title="Delete user"
                                    >
                                      <FiTrash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <p className="text-lg font-semibold text-gray-700">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                >
                  <FiChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                >
                  <FiChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Modal Layout */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="flex h-full max-h-[95vh] bg-white rounded-3xl overflow-hidden w-full max-w-[98vw]">
            {/* Left Sidebar */}
            <div className="w-80 bg-gradient-to-b from-slate-900 to-gray-900 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <FiUserPlus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {editingUser ? "Edit User" : "New User"}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FiX className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Role Selection Sidebar */}
              {!editingUser && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <FiShield className="h-4 w-4" />
                    Select Role
                  </h3>
                  <div className="space-y-2">
                    {roleOrder.map((role) => {
                      const RoleIcon = roleIcons[role];
                      return (
                        <label
                          key={role}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            newUserRole === role
                              ? "bg-white text-gray-900"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role}
                            checked={newUserRole === role}
                            onChange={(e) =>
                              setNewUserRole(e.target.value as UserRole)
                            }
                            className="sr-only"
                          />
                          <RoleIcon className="h-4 w-4" />
                          <span className="font-medium">
                            {roleLabels[role]}
                          </span>
                          {newUserRole === role && (
                            <FiCheck className="h-4 w-4 ml-auto" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingUser
                    ? "Update User Information"
                    : "Create New User Account"}
                </h1>
                <p className="text-gray-600 mt-1">
                  {editingUser
                    ? "Modify user details and permissions"
                    : "Fill in the details to create a new user"}
                </p>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form
                  id="user-form"
                  onSubmit={handleFormSubmit}
                  className="space-y-6"
                >
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FiUser className="h-5 w-5" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={editingUser?.name}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username *
                        </label>
                        {(editingUser ? editingUser.role : newUserRole) ===
                        "teacher" ? (
                          <div className="bg-gray-100 px-4 py-3 rounded-lg border border-gray-300">
                            <span className="text-gray-600 text-sm">
                              Auto-generated after creation
                            </span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            name="username"
                            defaultValue={editingUser?.username}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter username"
                            required
                          />
                        )}
                      </div>

                      {(editingUser ? editingUser.role : newUserRole) !==
                        "teacher" && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password {editingUser ? "(Optional)" : "*"}
                          </label>
                          <input
                            type="password"
                            name="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={
                              editingUser
                                ? "Leave blank to keep current"
                                : "Enter password"
                            }
                            required={!editingUser}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teacher Specific Fields */}
                  {(editingUser ? editingUser.role : newUserRole) ===
                    "teacher" && (
                    <>
                      {/* Controller Assignment */}
                      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <FiUsers className="h-5 w-5 text-gray-600" />
                          <h3 className="text-xl font-bold text-gray-900">
                            Controller Assignment
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Assigned Controller *
                            </label>
                            <select
                              name="controlId"
                              value={teacherControlId}
                              onChange={(e) =>
                                setTeacherControlId(e.target.value)
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 transition-all"
                              required
                            >
                              <option value="">Select Controller</option>
                              {controllers
                                .filter(
                                  (ctrl) =>
                                    ctrl && ctrl.code && ctrl.code !== "0"
                                )
                                .map((ctrl) => (
                                  <option key={ctrl.id} value={ctrl.code}>
                                    {ctrl.name} ({ctrl.code})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={teacherPhone}
                              onChange={(e) => setTeacherPhone(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 transition-all"
                              placeholder="e.g. +251912345678"
                              required
                            />
                          </div>
                        </div>

                        {/* Auto-Generated Credentials Info */}
                        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                              <FiSettings className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-blue-900">
                                Auto-Generated Credentials
                              </h4>
                              <p className="text-blue-700 text-sm">
                                Username and password will be generated
                                automatically
                              </p>
                            </div>
                          </div>
                          <div className="bg-blue-100 rounded-lg p-4 border border-blue-200">
                            <p className="text-sm text-blue-800 flex items-center gap-2">
                              <FiInfo className="h-4 w-4" />
                              <strong>Format:</strong> Username: U1, U2, U3,
                              etc. (auto-incremented) | Password:
                              [Username][Name]
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Teaching Schedule */}
                      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <FiCalendar className="h-5 w-5 text-gray-600" />
                          <h3 className="text-xl font-bold text-gray-900">
                            Teaching Schedule
                          </h3>
                          <span className="text-sm text-gray-500">
                            Configure available time slots
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <ScheduleGenerator
                            value={teacherSchedule}
                            onChange={setTeacherSchedule}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </form>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">* Required fields</div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="user-form"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FiUserPlus className="h-4 w-4" />
                      {editingUser ? "Update" : "Create"} User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Generated Credentials Modal */}
        <Modal
          isOpen={showCredentials}
          onClose={() => {
            setShowCredentials(false);
            setIsModalOpen(false);
            fetchUsers();
            resetForm();
          }}
        >
          <div className="bg-white rounded-3xl p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                <FiCheck className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Teacher Created Successfully!
              </h2>
              <p className="text-gray-600">
                Here are the auto-generated credentials:
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Username
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={generatedUsername}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-bold"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedUsername)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Password
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={generatedPassword}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-bold"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please copy and share these
                credentials with the teacher. They cannot be retrieved later.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCredentials(false);
                setIsModalOpen(false);
                fetchUsers();
                resetForm();
              }}
              className="w-full mt-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
            >
              Done
            </button>
          </div>
        </Modal>

        {/* Confirm Delete Modal */}
        <ConfirmModal
          open={isConfirmModalOpen}
          title="Confirm Deletion"
          message={`Are you sure you want to delete ${deletingUser?.name}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      </div>
    </div>
  );
}
