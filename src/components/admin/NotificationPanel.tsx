"use client";

import { useState, useEffect } from "react";
import { FiBell, FiClock, FiAlertTriangle, FiCheckCircle, FiX } from "react-icons/fi";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  className?: string;
}

export function NotificationPanel({ className = "" }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const res = await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "permission_request":
        return <FiClock className="h-4 w-4 text-orange-500" />;
      case "system":
        return <FiAlertTriangle className="h-4 w-4 text-blue-500" />;
      case "success":
        return <FiCheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <FiBell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-3 text-gray-600 hover:text-black transition-all duration-200 hover:bg-gray-100 rounded-xl group"
        aria-label="Notifications"
      >
        <FiBell className="h-6 w-6 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-14 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-200 max-h-[32rem] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-xl">
                    <FiBell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">Notifications</h3>
                    <p className="text-sm text-gray-600">{unreadCount} unread messages</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 hover:bg-gray-200 rounded-xl transition-all hover:scale-110"
                >
                  <FiX className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="p-6 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                    <FiBell className="h-12 w-12 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-bold text-black mb-2">No notifications</h4>
                  <p className="text-gray-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-all cursor-pointer group ${
                        !notification.isRead ? "bg-blue-50/50 border-l-4 border-l-blue-500" : ""
                      }`}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification.id);
                        }
                        if (notification.type === "permission_request") {
                          window.location.href = "/admin/permissions";
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1 p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-all">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className={`text-sm font-bold leading-tight ${
                              !notification.isRead ? "text-black" : "text-gray-700"
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 ml-2 shadow-lg"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium">
                              {formatTime(notification.createdAt)}
                            </span>
                            {notification.type === "permission_request" && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  className="w-full bg-black hover:bg-gray-800 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  onClick={() => {
                    setShowPanel(false);
                    window.location.href = "/admin/notifications";
                  }}
                >
                  <FiBell className="h-4 w-4" />
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}