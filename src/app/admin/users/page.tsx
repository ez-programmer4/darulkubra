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
  const roleColors: Record<UserRole, string> = {
    admin: "bg-indigo-100 text-indigo-800",
    controller: "bg-teal-100 text-teal-800",
    teacher: "bg-green-100 text-green-800",
    registral: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[role]}`}
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
      fetchUsers(); // Refresh users
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
      fetchUsers(); // Refresh users
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setNewUserRole("controller"); // Default role for new users
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

  // Group users by role
  const usersByRole: Record<UserRole, User[]> = {
    admin: [],
    controller: [],
    teacher: [],
    registral: [],
  };
  users.forEach((u) => usersByRole[u.role].push(u));

  const handleRefresh = () => fetchUsers();

  return (
    <div className="min-h-screen bg-indigo-50 py-10 px-2">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-indigo-100">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input
                type="text"
                placeholder="Search by name or username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="controller">Controller</option>
              <option value="teacher">Teacher</option>
              <option value="registral">Registral</option>
            </select>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm transition-all"
              title="Refresh"
            >
              <FiRefreshCw />
            </button>
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow font-semibold text-lg transition-all"
          >
            <FiUserPlus />
            Add User
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3 text-lg font-bold text-indigo-700">
          <FiUsers className="text-2xl" />
          User Management
        </div>

        <div className="mb-6 text-sm text-indigo-700 flex flex-wrap gap-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
          <span>
            Total users: <b>{users.length}</b>
          </span>
          {roleOrder.map((role) => (
            <span key={role} className="flex items-center gap-1">
              <FiFilter className="text-indigo-400" />
              {roleLabels[role]}: <b>{usersByRole[role].length}</b>
            </span>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl shadow border border-indigo-100">
          <table className="min-w-full rounded-xl overflow-hidden">
            <thead className="bg-indigo-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider">
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
                    className="text-center py-8 text-red-500 bg-indigo-50 rounded-b-xl"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FiAlertCircle className="text-3xl" />
                      <span>Error: {error}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : users.length === 0 ? (
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-indigo-400 bg-indigo-50 rounded-b-xl"
                  >
                    <span className="block text-5xl mb-2">😕</span>
                    No users found for the current filters.
                  </td>
                </tr>
              </tbody>
            ) : (
              roleOrder.map((role) => (
                <tbody key={role}>
                  <tr className="bg-indigo-50 sticky top-12 z-5">
                    <td
                      colSpan={4}
                      className="py-2 px-6 font-bold text-indigo-700 text-sm flex items-center gap-2 cursor-pointer select-none bg-indigo-50 border-b border-indigo-100"
                      onClick={() =>
                        setExpandedRoles((r) => ({ ...r, [role]: !r[role] }))
                      }
                    >
                      {expandedRoles[role] ? (
                        <FiChevronDown />
                      ) : (
                        <FiChevronRightIcon />
                      )}
                      {roleLabels[role]}{" "}
                      <span className="ml-2 text-xs text-indigo-400">
                        ({usersByRole[role].length})
                      </span>
                    </td>
                  </tr>
                  {expandedRoles[role] &&
                    usersByRole[role].map((user) => (
                      <tr
                        key={user.id}
                        className="even:bg-white hover:bg-indigo-100 transition-all"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-indigo-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                          {user.username || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-indigo-600 hover:text-white hover:bg-indigo-600 mr-4 bg-indigo-100 px-2 py-1 rounded-lg shadow-sm transition-all border border-indigo-200"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => openConfirmModal(user)}
                            className="text-red-600 hover:text-white hover:bg-red-600 bg-indigo-100 px-2 py-1 rounded-lg shadow-sm transition-all border border-indigo-200"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              ))
            )}
          </table>
        </div>

        <div className="flex justify-between items-center mt-8">
          <p className="text-sm text-indigo-700 font-semibold">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border-2 border-indigo-200 rounded-full bg-white text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border-2 border-indigo-200 rounded-full bg-white text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-4 md:p-8">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? "Edit User" : "Add New User"}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {!editingUser && (
                <div className="mb-4">
                  <label htmlFor="role" className="block text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="admin">Admin</option>
                    <option value="controller">Controller</option>
                    <option value="teacher">Teacher</option>
                    <option value="registral">Registral</option>
                  </select>
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser?.name}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              {(editingUser ? editingUser.role : newUserRole) !== "teacher" && (
                <div className="mb-4">
                  <label
                    htmlFor="username"
                    className="block text-gray-700 mb-2"
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingUser?.username}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              )}
              {(editingUser ? editingUser.role : newUserRole) === "teacher" && (
                <>
                  <div className="mb-4">
                    <label
                      htmlFor="controlId"
                      className="block text-gray-700 mb-2 font-semibold flex items-center gap-2"
                    >
                      <span className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-1 mr-1">
                        <FiChevronDown />
                      </span>
                      Controller
                    </label>
                    <select
                      name="controlId"
                      value={teacherControlId}
                      onChange={(e) => setTeacherControlId(e.target.value)}
                      className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all bg-indigo-50 text-indigo-900 font-medium shadow-sm hover:border-indigo-300"
                      required
                    >
                      <option value="">Select Controller</option>
                      {(controllers || []).map((ctrl) => (
                        <option key={ctrl.id} value={ctrl.id}>
                          {ctrl.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-indigo-500 mt-1 ml-1">
                      Assign a controller to this teacher. Only active
                      controllers are shown.
                    </p>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="schedule"
                      className="block text-gray-700 mb-2 font-semibold flex items-center gap-2"
                    >
                      <span className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-1 mr-1">
                        <FiCalendar />
                      </span>
                      Schedule
                    </label>
                    <input
                      type="text"
                      name="schedule"
                      value={teacherSchedule}
                      onChange={(e) => setTeacherSchedule(e.target.value)}
                      className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all bg-indigo-50 text-indigo-900 font-medium shadow-sm hover:border-indigo-300 placeholder:text-indigo-400"
                      required
                      placeholder="e.g. 4:00, 5:00, 6:00"
                    />
                    <p className="text-xs text-indigo-500 mt-1 ml-1">
                      Enter the teacher's schedule (e.g., 4:00, 5:00, 6:00).
                    </p>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="phone"
                      className="block text-gray-700 mb-2 font-semibold flex items-center gap-2"
                    >
                      <span className="inline-block bg-indigo-100 text-indigo-600 rounded-full p-1 mr-1">
                        <FiPhone />
                      </span>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all bg-indigo-50 text-indigo-900 font-medium shadow-sm hover:border-indigo-300 placeholder:text-indigo-400"
                      required
                      placeholder="e.g. +9665xxxxxxx"
                    />
                    <p className="text-xs text-indigo-500 mt-1 ml-1">
                      Enter the teacher's phone number (e.g., +251912345678).
                    </p>
                  </div>
                </>
              )}
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 mb-2">
                  Password (
                  {editingUser ? "Leave blank to keep current" : "Required"})
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full p-2 border rounded"
                  required={!editingUser}
                />
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 w-full md:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 w-full md:w-auto"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </Modal>

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
