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
} from "react-icons/fi";
import Modal from "@/app/components/Modal";
import ConfirmModal from "@/app/components/ConfirmModal";
import { useDebounce } from "use-debounce";

// Schedule Generator Component
const ScheduleGenerator = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  useEffect(() => {
    if (value) {
      setSelectedTimes(value.split(',').map(t => t.trim()).filter(Boolean));
    }
  }, [value]);

  const generateTimeSlots = () => {
    const slots = [];
    
    // Fixed prayer times for Ethiopia
    const prayerTimes = {
      Fajr: { start: 5 * 60 + 30, end: 12 * 60 + 30 }, // 5:30 to 12:30
      Dhuhr: { start: 12 * 60 + 30, end: 15 * 60 + 30 }, // 12:30 to 15:30
      Asr: { start: 15 * 60 + 30, end: 18 * 60 + 30 }, // 15:30 to 18:30
      Maghrib: { start: 18 * 60 + 30, end: 20 * 60 }, // 18:30 to 20:00
      Isha: { start: 20 * 60, end: 5 * 60 + 30 + 24 * 60 } // 20:00 to 5:30 next day
    };
    
    // Generate all 30-minute intervals for full 24 hours
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const currentTime = hour * 60 + minute;
        
        // Determine prayer period
        let category = 'General';
        
        if (currentTime >= prayerTimes.Fajr.start && currentTime < prayerTimes.Fajr.end) {
          category = 'Fajr';
        } else if (currentTime >= prayerTimes.Dhuhr.start && currentTime < prayerTimes.Dhuhr.end) {
          category = 'Dhuhr';
        } else if (currentTime >= prayerTimes.Asr.start && currentTime < prayerTimes.Asr.end) {
          category = 'Asr';
        } else if (currentTime >= prayerTimes.Maghrib.start && currentTime < prayerTimes.Maghrib.end) {
          category = 'Maghrib';
        } else if (currentTime >= prayerTimes.Isha.start || currentTime < prayerTimes.Fajr.start) {
          category = 'Isha';
        }
        
        // Only add slots that belong to prayer periods (no General times)
        if (category !== 'General') {
          slots.push({
            time: timeStr,
            prayer: category,
            offset: ''
          });
        }
      }
    }
    
    return slots;
  };

  const toggleTime = (time: string) => {
    const newTimes = selectedTimes.includes(time)
      ? selectedTimes.filter(t => t !== time)
      : [...selectedTimes, time].sort();
    
    setSelectedTimes(newTimes);
    onChange(newTimes.join(', '));
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter manually: 4:00, 5:00, 6:00 or select from slots below"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      
      <div className="space-y-6">
        {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
          const prayerSlots = timeSlots.filter(slot => slot.prayer === prayer);
          const prayerColors = {
            Fajr: 'border-blue-200 bg-blue-50',
            Dhuhr: 'border-green-200 bg-green-50', 
            Asr: 'border-yellow-200 bg-yellow-50',
            Maghrib: 'border-orange-200 bg-orange-50',
            Isha: 'border-purple-200 bg-purple-50'
          };
          
          const prayerPeriods = {
            Fajr: 'Subhi to Dhuhr (5:30 - 12:30)',
            Dhuhr: 'Dhuhr to Asr (12:30 - 15:30)',
            Asr: 'Asr to Maghrib (15:30 - 18:30)',
            Maghrib: 'Maghrib to Isha (18:30 - 20:00)',
            Isha: 'Isha to Subhi (20:00 - 5:30)'
          };
          
          return (
            <div key={prayer} className={`p-4 rounded-xl border-2 ${prayerColors[prayer as keyof typeof prayerColors]}`}>
              <h4 className="font-bold text-lg mb-1 text-gray-800">{prayer} Period</h4>
              <p className="text-sm text-gray-600 mb-3">{prayerPeriods[prayer as keyof typeof prayerPeriods]}</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {prayerSlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleTime(slot.time)}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      selectedTimes.includes(slot.time)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{slot.time}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-sm text-gray-500">
        Select from prayer-based time slots (5:30-5:30 with 30min intervals)
      </p>
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
  return (
    <span
      className={`px-3 py-1 text-sm font-semibold rounded-full ${roleStyles[role]}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
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
  }, [fetchUsers]);

  useEffect(() => {
    fetch("/api/admin/users?role=controller&limit=1000")
      .then((res) => res.json())
      .then((data) => setControllers(data.users || []))
      .catch(() => setControllers([]));
  }, []);

  useEffect(() => {
    if (editingUser && editingUser.role === "teacher") {
      fetch(`/api/admin/users?role=teacher&search=${editingUser.name}`)
        .then((res) => res.json())
        .then((data) => {
          const teacher = data.users.find((u: any) => u.id === editingUser.id);
          if (teacher) {
            setTeacherSchedule(teacher.schedule || "");
            setTeacherControlId(
              teacher.controlId ? String(teacher.controlId) : ""
            );
            setTeacherPhone(teacher.phone || "");
          }
        });
    } else {
      setTeacherSchedule("");
      setTeacherControlId("");
      setTeacherPhone("");
    }
  }, [editingUser]);

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
      
      // Validate schedule format (supports both 24h and 12h with AM/PM)
      const timePattern = /^\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?(\s*,\s*\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?)*$/;
      if (!timePattern.test(teacherSchedule.trim())) {
        setError("Please enter schedule in correct format (e.g. 4:00, 5:00 PM, 2:00 AM)");
        return;
      }
      
      data.controlId = teacherControlId;
      data.schedule = teacherSchedule.trim();
      data.phone = teacherPhone.trim();
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

      setIsModalOpen(false);
      fetchUsers();
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

  const openAddModal = () => {
    setEditingUser(null);
    setNewUserRole("controller");
    setIsModalOpen(true);
    setTeacherPhone("");
    setTeacherSchedule("");
    setTeacherControlId("");
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const openConfirmModal = (user: User) => {
    setDeletingUser(user);
    setIsConfirmModalOpen(true);
  };

  const usersByRole: Record<UserRole, User[]> = {
    admin: [],
    controller: [],
    teacher: [],
    registral: [],
  };
  users.forEach((u) => usersByRole[u.role].push(u));

  const handleRefresh = () => fetchUsers();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="p-4 bg-black rounded-2xl shadow-lg">
              <FiUsers className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                Users Management
              </h1>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                Manage system users, roles, and permissions
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FiUsers className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-semibold text-gray-600">
                  Total
                </span>
              </div>
              <div className="text-2xl font-bold text-black">
                {users.length}
              </div>
            </div>
            {roleOrder.map((role) => {
              const Icon = roleIcons[role];
              return (
                <div
                  key={role}
                  className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-600">
                      {roleLabels[role]}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-black">
                    {usersByRole[role].length}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Users
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                  />
                </div>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Filter by Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
                >
                  <option value="">All Roles</option>
                  {roleOrder.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <button
                  onClick={handleRefresh}
                  className="w-full p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 transition-all hover:scale-105"
                  title="Refresh users"
                >
                  <FiRefreshCw className="h-5 w-5 mx-auto" />
                </button>
              </div>
              <div className="lg:col-span-3">
                <button
                  onClick={openAddModal}
                  className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-3 font-bold transition-all hover:scale-105"
                >
                  <FiUserPlus className="h-5 w-5" />
                  Add New User
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="animate-pulse grid grid-cols-1 gap-4">
              <div className="h-24 bg-gray-100 rounded-2xl" />
              <div className="h-24 bg-gray-100 rounded-2xl" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 bg-white border border-red-200 rounded-3xl shadow-2xl flex items-center gap-6">
            <div className="p-4 bg-red-100 rounded-2xl">
              <FiAlertCircle className="text-red-600 h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 text-xl mb-2">
                Error Loading Users
              </h3>
              <p className="text-red-600 text-lg">{error}</p>
            </div>
          </div>
        )}

        {/* No Users State */}
        {!loading && !error && users.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl shadow-2xl border border-gray-200">
            <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
              <FiUsers className="h-16 w-16 text-gray-500" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-4">
              No Users Found
            </h3>
            <p className="text-gray-600 text-xl mb-6">
              No users match your current filters.
            </p>
            <button
              onClick={handleRefresh}
              className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Users Table */}
        {!loading && !error && users.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                      User Information
                    </th>
                    <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                      Username
                    </th>
                    <th className="py-4 px-6 text-left font-bold text-black uppercase tracking-wider">
                      Role
                    </th>
                    <th className="py-4 px-6 text-right font-bold text-black uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roleOrder.map((role) => (
                    <React.Fragment key={role}>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td
                          colSpan={4}
                          className="py-4 px-6 font-bold text-gray-900 text-lg flex items-center gap-4 cursor-pointer select-none"
                          onClick={() =>
                            setExpandedRoles((r) => ({
                              ...r,
                              [role]: !r[role],
                            }))
                          }
                        >
                          {expandedRoles[role] ? (
                            <FiChevronDown className="h-6 w-6 text-blue-600" />
                          ) : (
                            <FiChevronRightIcon className="h-6 w-6 text-blue-600" />
                          )}
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-black rounded-lg">
                              {React.createElement(roleIcons[role], {
                                className: "h-5 w-5 text-white",
                              })}
                            </div>
                            {roleLabels[role]}
                            <span className="ml-2 text-sm text-blue-600 font-semibold bg-blue-100 px-3 py-1 rounded-full">
                              {usersByRole[role].length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {expandedRoles[role] &&
                        usersByRole[role].map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-100 rounded-xl">
                                  <FiUsers className="h-6 w-6 text-gray-600" />
                                </div>
                                <div>
                                  <div className="font-bold text-black text-lg">
                                    {user.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {user.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-700">
                              {user.username || "N/A"}
                            </td>
                            <td className="py-4 px-6">
                              <RoleBadge role={user.role} />
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                                >
                                  <FiEdit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openConfirmModal(user)}
                                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && users.length > 0 && totalPages > 1 && (
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold text-gray-700">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit User Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-8 max-h-[95vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-black mb-8">
              {editingUser ? "Edit User" : "Add New User"}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {!editingUser && (
                <div>
                  <label className="block text-lg text-black font-bold mb-3">
                    Role
                  </label>
                  <select
                    name="role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                    required
                  >
                    {roleOrder.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-lg text-black font-bold mb-3">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser?.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  required
                />
              </div>

              {(editingUser ? editingUser.role : newUserRole) !== "teacher" && (
                <div>
                  <label className="block text-lg text-black font-bold mb-3">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingUser?.username}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                    required
                  />
                </div>
              )}

              {(editingUser ? editingUser.role : newUserRole) === "teacher" && (
                <>
                  <div>
                    <label className="block text-lg text-black font-bold mb-3">
                      Controller
                    </label>
                    <select
                      name="controlId"
                      value={teacherControlId}
                      onChange={(e) => setTeacherControlId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                      required
                    >
                      <option value="">Select Controller</option>
                      {controllers.map((ctrl) => {
                        if (!ctrl.code || ctrl.code === "0") return null;
                        return (
                          <option key={ctrl.id} value={ctrl.code}>
                            {ctrl.name} ({ctrl.code})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg text-black font-bold mb-3">
                      Schedule
                    </label>
                    <ScheduleGenerator 
                      value={teacherSchedule}
                      onChange={setTeacherSchedule}
                    />
                  </div>

                  <div>
                    <label className="block text-lg text-black font-bold mb-3">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                      required
                      placeholder="e.g. +251912345678"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-lg text-black font-bold mb-3">
                  Password{" "}
                  {editingUser ? "(Leave blank to keep current)" : "(Required)"}
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
                  required={!editingUser}
                />
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold transition-all hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-black hover:bg-gray-800 text-white font-bold transition-all hover:scale-105"
                >
                  Save
                </button>
              </div>
            </form>
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
