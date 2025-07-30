"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "react-icons/fi";
import Modal from "@/app/components/Modal";
import ConfirmModal from "@/app/components/ConfirmModal";
import { useDebounce } from "use-debounce";
import UserTableSkeleton from "./UserTableSkeleton";

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
    admin: "bg-indigo-100 text-indigo-800 border-indigo-200",
    controller: "bg-blue-100 text-blue-800 border-blue-200",
    teacher: "bg-teal-100 text-teal-800 border-teal-200",
    registral: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
  return (
    <span
      className={`px-3 py-1 text-sm font-semibold rounded-full ${roleStyles[role]} border shadow-sm`}
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
    fetch("/api/admin/users?role=controller")
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4 animate-slide-in">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative group">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-md hover:border-indigo-300 w-full sm:w-64"
                aria-label="Search users"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-md hover:border-indigo-300"
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
              className="p-2.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-md hover:bg-indigo-200 transition-all hover:scale-105"
              title="Refresh users"
              aria-label="Refresh users"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg font-semibold text-lg transition-all hover:scale-105"
            aria-label="Add new user"
          >
            <FiUserPlus className="h-5 w-5" />
            Add User
          </button>
        </div>

        {/* Title */}
        <div className="mb-6 flex items-center gap-3 text-2xl font-extrabold text-indigo-900 animate-slide-in">
          <FiUsers className="h-8 w-8 text-indigo-600" />
          User Management
        </div>

        {/* Stats */}
        <div className="mb-6 flex flex-wrap gap-4 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-2xl p-4 shadow-lg animate-slide-in">
          <span className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
            <FiUsers className="h-5 w-5 text-indigo-500" />
            Total users: <b>{users.length}</b>
          </span>
          {roleOrder.map((role) => (
            <span
              key={role}
              className="text-sm font-semibold text-indigo-700 flex items-center gap-2"
            >
              <FiFilter className="h-5 w-5 text-indigo-500" />
              {roleLabels[role]}: <b>{usersByRole[role].length}</b>
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl shadow-lg border border-indigo-100 bg-white/95 backdrop-blur-md animate-slide-in">
          <table className="min-w-full divide-y divide-indigo-100">
            <thead className="bg-indigo-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-indigo-900 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-indigo-900 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-indigo-900 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-indigo-900 uppercase tracking-wider">
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
                    className="text-center py-12 text-red-600 bg-white rounded-b-2xl"
                  >
                    <div className="flex flex-col items-center gap-3 animate-pulse">
                      <FiAlertCircle className="h-8 w-8" />
                      <span className="text-lg font-semibold">
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
                    className="text-center py-16 text-indigo-500 bg-white rounded-b-2xl"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-5xl">😕</span>
                      <span className="text-lg font-semibold">
                        No users found for the current filters.
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              roleOrder.map((role, roleIdx) => (
                <tbody key={role} className="divide-y divide-indigo-100">
                  <tr className="bg-indigo-50 sticky top-12 z-5">
                    <td
                      colSpan={4}
                      className="py-3 px-6 font-bold text-indigo-900 text-base flex items-center gap-3 cursor-pointer select-none border-b border-indigo-100 animate-slide-in"
                      onClick={() =>
                        setExpandedRoles((r) => ({ ...r, [role]: !r[role] }))
                      }
                      aria-label={`Toggle ${roleLabels[role]} section`}
                      style={{ animationDelay: `${roleIdx * 50}ms` }}
                    >
                      {expandedRoles[role] ? (
                        <FiChevronDown className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <FiChevronRightIcon className="h-5 w-5 text-indigo-600" />
                      )}
                      {roleLabels[role]}
                      <span className="ml-2 text-sm text-indigo-500 font-semibold">
                        ({usersByRole[role].length})
                      </span>
                    </td>
                  </tr>
                  {expandedRoles[role] &&
                    usersByRole[role].map((user, userIdx) => (
                      <tr
                        key={user.id}
                        className="even:bg-white hover:bg-indigo-50 transition-all animate-slide-in"
                        style={{
                          animationDelay: `${(roleIdx + userIdx) * 50}ms`,
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-indigo-900 text-base">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-indigo-700 text-sm">
                          {user.username || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-lg shadow-md transition-all border border-indigo-200 hover:scale-105"
                            title="Edit user"
                            aria-label={`Edit ${user.name}`}
                          >
                            <FiEdit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openConfirmModal(user)}
                            className="text-red-600 hover:text-white hover:bg-red-600 bg-red-100 px-3 py-1.5 rounded-lg shadow-md transition-all border border-red-200 hover:scale-105"
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
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-8 animate-slide-in">
          <p className="text-sm font-semibold text-indigo-700">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 border-2 border-indigo-200 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all hover:scale-105"
              aria-label="Previous page"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 border-2 border-indigo-200 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all hover:scale-105"
              aria-label="Next page"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Add/Edit User Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto animate-fade-in">
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-900 mb-4 sm:mb-6">
              {editingUser ? "Edit User" : "Add New User"}
            </h2>
            <form
              onSubmit={handleFormSubmit}
              className="space-y-4 sm:space-y-6"
            >
              {!editingUser && (
                <div
                  className="animate-slide-in"
                  style={{ animationDelay: "50ms" }}
                >
                  <label
                    htmlFor="role"
                    className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                  >
                    <FiUsers className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                    Role
                  </label>
                  <select
                    name="role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
                    aria-label="Select user role"
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
              <div
                className="animate-slide-in"
                style={{ animationDelay: "100ms" }}
              >
                <label
                  htmlFor="name"
                  className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                >
                  <FiUsers className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser?.name}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
                  required
                  aria-label="User name"
                />
              </div>
              {(editingUser ? editingUser.role : newUserRole) !== "teacher" && (
                <div
                  className="animate-slide-in"
                  style={{ animationDelay: "150ms" }}
                >
                  <label
                    htmlFor="username"
                    className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                  >
                    <FiCopy className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingUser?.username}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
                    required
                    aria-label="Username"
                  />
                </div>
              )}
              {(editingUser ? editingUser.role : newUserRole) === "teacher" && (
                <>
                  <div
                    className="animate-slide-in"
                    style={{ animationDelay: "200ms" }}
                  >
                    <label
                      htmlFor="controlId"
                      className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                    >
                      <span className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-1">
                        <FiChevronDown className="h-3 sm:h-4 w-3 sm:w-4" />
                      </span>
                      Controller
                    </label>
                    <select
                      name="controlId"
                      value={teacherControlId}
                      onChange={(e) => setTeacherControlId(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-indigo-50 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
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
                    <p className="text-xs text-indigo-500 mt-1.5 ml-1">
                      Assign a controller to this teacher. Only active
                      controllers are shown.
                    </p>
                  </div>
                  <div
                    className="animate-slide-in"
                    style={{ animationDelay: "250ms" }}
                  >
                    <label
                      htmlFor="schedule"
                      className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                    >
                      <span className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-1">
                        <FiCalendar className="h-3 sm:h-4 w-3 sm:w-4" />
                      </span>
                      Schedule
                    </label>
                    <input
                      type="text"
                      name="schedule"
                      value={teacherSchedule}
                      onChange={(e) => setTeacherSchedule(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-indigo-50 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 placeholder:text-indigo-400 text-sm sm:text-base"
                      required
                      placeholder="e.g. 4:00, 5:00, 6:00"
                      aria-label="Teacher schedule"
                    />
                    <p className="text-xs text-indigo-500 mt-1.5 ml-1">
                      Enter the teacher's schedule (e.g., 4:00, 5:00, 6:00).
                    </p>
                  </div>
                  <div
                    className="animate-slide-in"
                    style={{ animationDelay: "300ms" }}
                  >
                    <label
                      htmlFor="phone"
                      className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                    >
                      <span className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-1">
                        <FiPhone className="h-3 sm:h-4 w-3 sm:w-4" />
                      </span>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-indigo-50 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 placeholder:text-indigo-400 text-sm sm:text-base"
                      required
                      placeholder="e.g. +251912345678"
                      aria-label="Teacher phone number"
                    />
                    <p className="text-xs text-indigo-500 mt-1.5 ml-1">
                      Enter the teacher's phone number (e.g., +251912345678).
                    </p>
                  </div>
                </>
              )}
              <div
                className="animate-slide-in"
                style={{ animationDelay: "350ms" }}
              >
                <label
                  htmlFor="password"
                  className="block text-sm sm:text-base text-indigo-900 font-semibold mb-2 flex items-center gap-2"
                >
                  <FiCopy className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600" />
                  Password (
                  {editingUser ? "Leave blank to keep current" : "Required"})
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[2.5rem] border-2 border-indigo-200 rounded-lg bg-white/95 text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-md hover:border-indigo-300 text-sm sm:text-base"
                  required={!editingUser}
                  aria-label="Password"
                />
              </div>
              <div
                className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6 sm:mt-8 animate-slide-in"
                style={{ animationDelay: "400ms" }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-indigo-900 font-semibold shadow-md transition-all hover:scale-105 w-full sm:w-auto"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-md transition-all hover:scale-105 w-full sm:w-auto"
                  aria-label="Save user"
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

      {/* Footer */}
      <footer className="w-full text-center text-indigo-500 text-sm py-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md mt-12 animate-slide-in">
        © {new Date().getFullYear()} DarulKubra Admin Portal. All rights
        reserved.
      </footer>

      {/* Animations */}
      <style jsx>{`
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
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
