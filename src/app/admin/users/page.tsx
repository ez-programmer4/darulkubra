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
}

const RoleBadge = ({ role }: { role: UserRole }) => {
  const roleColors: Record<UserRole, string> = {
    admin: "bg-red-100 text-red-800",
    controller: "bg-blue-100 text-blue-800",
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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

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

  const handleCopy = (username: string | undefined) => {
    if (!username) return;
    navigator.clipboard.writeText(username);
  };

  const handleRefresh = () => fetchUsers();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 border rounded-lg"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="controller">Controller</option>
            <option value="teacher">Teacher</option>
            <option value="registral">Registral</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            title="Refresh"
          >
            <FiRefreshCw />
          </button>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
        >
          <FiPlus />
          Add User
        </button>
      </div>

      <div className="mb-4 text-sm text-gray-600 flex flex-wrap gap-4">
        <span>
          Total users: <b>{users.length}</b>
        </span>
        {roleOrder.map((role) => (
          <span key={role}>
            {roleLabels[role]}: <b>{usersByRole[role].length}</b>
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          {loading ? (
            <UserTableSkeleton rows={itemsPerPage} />
          ) : error ? (
            <tbody>
              <tr>
                <td colSpan={4} className="text-center py-4 text-red-500">
                  Error: {error}
                </td>
              </tr>
            </tbody>
          ) : users.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  <span className="block text-4xl mb-2">😕</span>
                  No users found for the current filters.
                </td>
              </tr>
            </tbody>
          ) : (
            roleOrder.map((role) => (
              <tbody key={role}>
                <tr className="bg-gray-100 sticky top-12 z-5">
                  <td
                    colSpan={4}
                    className="py-2 px-6 font-bold text-gray-700 text-sm flex items-center gap-2 cursor-pointer select-none"
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
                    <span className="ml-2 text-xs text-gray-500">
                      ({usersByRole[role].length})
                    </span>
                  </td>
                </tr>
                {expandedRoles[role] &&
                  usersByRole[role].map((user) => (
                    <tr key={user.id} className="even:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                        {user.username || "N/A"}
                        {user.username && (
                          <button
                            onClick={() => handleCopy(user.username)}
                            title="Copy username"
                            className="p-1 rounded hover:bg-gray-200"
                          >
                            <FiCopy size={14} />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => openConfirmModal(user)}
                          className="text-red-600 hover:text-red-900"
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

      <div className="flex justify-between items-center mt-6">
        <p className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded disabled:opacity-50"
          >
            <FiChevronLeft />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border rounded disabled:opacity-50"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-4">
          {editingUser ? "Edit User" : "Add New User"}
        </h2>
        <form onSubmit={handleFormSubmit}>
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
              <label htmlFor="username" className="block text-gray-700 mb-2">
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
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={isConfirmModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${deletingUser?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
}
