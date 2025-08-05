"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FiSearch,
  FiPlus,
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
  FiEye,
  FiEyeOff,
  FiDownload,
  FiUpload,
  FiSettings,
  FiBarChart,
  FiTrendingUp,
  FiAward,
  FiZap,
} from "react-icons/fi";
import Modal from "@/app/components/Modal";
import ConfirmModal from "@/app/components/ConfirmModal";
import { useDebounce } from "use-debounce";
import UserTableSkeleton from "./UserTableSkeleton";
import { motion } from "framer-motion";

type UserRole = "admin" | "controller" | "teacher" | "registral";

interface User {
  id: string;
  name: string;
  username?: string;
  role: UserRole;
  schedule?: string;
  controlId?: string;
  phone?: string;
}

const RoleBadge = ({ role }: { role: UserRole }) => {
  const roleStyles: Record<UserRole, string> = {
    admin:
      "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-200",
    controller:
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200",
    teacher:
      "bg-gradient-to-r from-teal-500 to-teal-600 text-white border-teal-200",
    registral:
      "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-200",
  };
  return (
    <span
      className={`px-4 py-2 text-sm font-bold rounded-full ${roleStyles[role]} border shadow-lg`}
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
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    // Fetch all controllers without pagination limit
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
      data.controlId = teacherControlId;
      data.schedule = teacherSchedule;
      data.phone = teacherPhone;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap justify-between items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative group">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 border-2 border-blue-200 rounded-xl bg-white/95 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg hover:border-blue-300 w-full sm:w-72"
                aria-label="Search users"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 border-2 border-blue-200 rounded-xl bg-white/95 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-lg hover:border-blue-300"
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {roleOrder.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              className="p-3 rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shadow-lg hover:bg-blue-200 transition-all hover:scale-105"
              title="Refresh users"
              aria-label="Refresh users"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl flex items-center gap-3 hover:from-blue-700 hover:to-indigo-700 shadow-xl font-semibold text-lg transition-all hover:scale-105"
            aria-label="Add new user"
          >
            <FiUserPlus className="h-5 w-5" />
            Add User
          </button>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 flex items-center gap-4 text-3xl font-black text-gray-900"
        >
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
            <FiUsers className="h-8 w-8 text-white" />
          </div>
          User Management
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <div className="bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.length}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {roleOrder.map((role, index) => {
            const Icon = roleIcons[role];
            return (
              <div
                key={role}
                className="bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">
                      {roleLabels[role]}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {usersByRole[role].length}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="overflow-x-auto rounded-2xl shadow-2xl border border-white/20 bg-white/95 backdrop-blur-md"
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-8 py-6 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            {loading ? (
              <UserTableSkeleton rows={itemsPerPage} />
            ) : error ? (
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-16 text-red-600 bg-white rounded-b-2xl"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <FiAlertCircle className="h-12 w-12 text-red-500" />
                      <span className="text-xl font-semibold">
                        Error: {error}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : users.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-20 text-gray-500 bg-white rounded-b-2xl"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-6xl">😕</span>
                      <span className="text-xl font-semibold">
                        No users found for the current filters.
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              roleOrder.map((role, roleIdx) => (
                <tbody key={role} className="divide-y divide-gray-100">
                  <tr className="bg-gradient-to-r from-gray-50 to-blue-50 sticky top-12 z-5">
                    <td
                      colSpan={4}
                      className="py-4 px-8 font-bold text-gray-900 text-lg flex items-center gap-4 cursor-pointer select-none border-b border-gray-200"
                      onClick={() =>
                        setExpandedRoles((r) => ({ ...r, [role]: !r[role] }))
                      }
                      aria-label={`Toggle ${roleLabels[role]} section`}
                    >
                      {expandedRoles[role] ? (
                        <FiChevronDown className="h-6 w-6 text-blue-600" />
                      ) : (
                        <FiChevronRightIcon className="h-6 w-6 text-blue-600" />
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                          {React.createElement(roleIcons[role], {
                            className: "h-5 w-5 text-white",
                          })}
                        </div>
                        {roleLabels[role]}
                        <span className="ml-2 text-sm text-blue-500 font-semibold bg-blue-100 px-3 py-1 rounded-full">
                          {usersByRole[role].length}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedRoles[role] &&
                    usersByRole[role].map((user, userIdx) => (
                      <tr
                        key={user.id}
                        className="even:bg-white hover:bg-blue-50 transition-all duration-200"
                      >
                        <td className="px-8 py-6 whitespace-nowrap font-semibold text-gray-900 text-lg">
                          {user.name}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-gray-700 text-base">
                          {user.username || "N/A"}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-100 px-4 py-2 rounded-lg shadow-md transition-all border border-blue-200 hover:scale-105"
                            title="Edit user"
                            aria-label={`Edit ${user.name}`}
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openConfirmModal(user)}
                            className="text-red-600 hover:text-white hover:bg-red-600 bg-red-100 px-4 py-2 rounded-lg shadow-md transition-all border border-red-200 hover:scale-105"
                            title="Delete user"
                            aria-label={`Delete ${user.name}`}
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              ))
            )}
          </table>
        </motion.div>

        {/* Pagination */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-between items-center mt-8"
        >
          <p className="text-lg font-semibold text-gray-700">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-3 border-2 border-blue-200 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all hover:scale-105"
              aria-label="Previous page"
            >
              <FiChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-3 border-2 border-blue-200 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all hover:scale-105"
              aria-label="Next page"
            >
              <FiChevronRight className="h-6 w-6" />
            </button>
          </div>
        </motion.div>

        {/* Add/Edit User Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 max-h-[90vh] overflow-y-auto">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-3xl font-black text-gray-900 mb-6 sm:mb-8"
            >
              {editingUser ? "Edit User" : "Add New User"}
            </motion.h2>
            <form
              onSubmit={handleFormSubmit}
              className="space-y-6 sm:space-y-8"
            >
              {!editingUser && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <label
                    htmlFor="role"
                    className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                  >
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                      <FiUsers className="h-5 w-5 text-white" />
                    </div>
                    Role
                  </label>
                  <select
                    name="role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-white/95 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 text-base"
                    aria-label="Select user role"
                    required
                  >
                    {roleOrder.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <label
                  htmlFor="name"
                  className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                >
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                    <FiUsers className="h-5 w-5 text-white" />
                  </div>
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser?.name}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-white/95 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 text-base"
                  required
                  aria-label="User name"
                />
              </motion.div>

              {(editingUser ? editingUser.role : newUserRole) !== "teacher" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <label
                    htmlFor="username"
                    className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                  >
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                      <FiCopy className="h-5 w-5 text-white" />
                    </div>
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingUser?.username}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-white/95 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 text-base"
                    required
                    aria-label="Username"
                  />
                </motion.div>
              )}

              {(editingUser ? editingUser.role : newUserRole) === "teacher" && (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <label
                      htmlFor="controlId"
                      className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                    >
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                        <FiChevronDown className="h-5 w-5 text-white" />
                      </div>
                      Controller
                    </label>
                    <select
                      name="controlId"
                      value={teacherControlId}
                      onChange={(e) => setTeacherControlId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 text-base"
                      required
                      aria-label="Select controller"
                    >
                      <option value="">Select Controller</option>
                      {(controllers || []).map((ctrl) => (
                        <option key={ctrl.id} value={ctrl.id}>
                          {ctrl.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-blue-600 mt-2 ml-1">
                      Assign a controller to this teacher. All active
                      controllers are shown.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <label
                      htmlFor="schedule"
                      className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                    >
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                        <FiCalendar className="h-5 w-5 text-white" />
                      </div>
                      Schedule
                    </label>
                    <input
                      type="text"
                      name="schedule"
                      value={teacherSchedule}
                      onChange={(e) => setTeacherSchedule(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 placeholder:text-blue-400 text-base"
                      required
                      placeholder="e.g. 4:00, 5:00, 6:00"
                      aria-label="Teacher schedule"
                    />
                    <p className="text-sm text-blue-600 mt-2 ml-1">
                      Enter the teacher's schedule (e.g., 4:00, 5:00, 6:00).
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <label
                      htmlFor="phone"
                      className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                    >
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                        <FiPhone className="h-5 w-5 text-white" />
                      </div>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-blue-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 placeholder:text-blue-400 text-base"
                      required
                      placeholder="e.g. +251912345678"
                      aria-label="Teacher phone number"
                    />
                    <p className="text-sm text-blue-600 mt-2 ml-1">
                      Enter the teacher's phone number (e.g., +251912345678).
                    </p>
                  </motion.div>
                </>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label
                  htmlFor="password"
                  className="block text-base sm:text-lg text-gray-900 font-bold mb-3 flex items-center gap-3"
                >
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                    <FiCopy className="h-5 w-5 text-white" />
                  </div>
                  Password (
                  {editingUser ? "Leave blank to keep current" : "Required"})
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl bg-white/95 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-lg hover:border-blue-300 text-base"
                  required={!editingUser}
                  aria-label="Password"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex flex-col sm:flex-row justify-end gap-4 mt-8 sm:mt-10"
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold shadow-lg transition-all hover:scale-105 w-full sm:w-auto"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg transition-all hover:scale-105 w-full sm:w-auto"
                  aria-label="Save user"
                >
                  Save
                </button>
              </motion.div>
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

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="w-full text-center text-gray-500 text-sm py-8 border-t border-gray-200 bg-white/90 backdrop-blur-md mt-12"
      >
        © {new Date().getFullYear()} DarulKubra Admin Portal. All rights
        reserved.
      </motion.footer>
    </div>
  );
}
