"use client";

import { useState, useEffect } from "react";
import { FiLogOut, FiUser, FiMenu, FiBell } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRef } from "react";

interface User {
  name: string;
}

interface HeaderProps {
  pageTitle: string;
  userName: string;
  onMenuClick: () => void;
}

export default function Header({
  pageTitle,
  userName,
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Temporarily disable notifications due to database schema mismatch
    // async function fetchUnread() {
    //   const res = await fetch("/api/admin/notifications?unread=1");
    //   if (res.ok) {
    //     const data = await res.json();
    //     setUnreadCount(Array.isArray(data) ? data.length : 0);
    //   }
    // }
    // fetchUnread();
    // const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    // return () => clearInterval(interval);
    setUnreadCount(0); // Set to 0 temporarily
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!notifOpen) return;
    // Temporarily disable notifications due to database schema mismatch
    // setNotifLoading(true);
    // fetch("/api/admin/notifications?limit=10")
    //   .then((res) => (res.ok ? res.json() : []))
    //   .then((data) => setNotifications(Array.isArray(data) ? data : []))
    //   .finally(() => setNotifLoading(false));
    setNotifications([]); // Set to empty array temporarily
    setNotifLoading(false);
  }, [notifOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  async function markAsRead(id: string) {
    await fetch(`/api/admin/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllAsRead() {
    await fetch(`/api/admin/notifications`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      }
  };

  return (
    <header className="flex-shrink-0 bg-white/90 backdrop-blur border-b border-indigo-100 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden mr-4 text-indigo-700 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-indigo-900">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-700">
            Welcome, {session?.user?.name || userName}
          </span>
          <div className="relative" ref={notifRef}>
            <button
              className="relative text-indigo-700 hover:text-indigo-900 focus:outline-none"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notifications"
            >
              <FiBell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold border border-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-indigo-100 rounded-xl shadow-lg z-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-100">
                  <span className="font-semibold text-indigo-900">
                    Notifications
                  </span>
                  <button
                    className="text-xs text-indigo-700 hover:text-indigo-900 hover:underline disabled:opacity-50"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all as read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-indigo-50">
                  {notifLoading ? (
                    <div className="p-4 text-center text-indigo-700">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition flex flex-col gap-1 ${
                          n.read ? "" : "bg-indigo-50"
                        }`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <span
                          className={`font-medium ${
                            n.read ? "text-gray-700" : "text-indigo-900"
                          }`}
                        >
                          {n.title || n.message || "Notification"}
                        </span>
                        {n.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
