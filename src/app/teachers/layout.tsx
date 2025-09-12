"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiUsers,
  FiAlertTriangle,
  FiBell,
  FiMenu,
  FiX,
  FiHome,
  FiClipboard,
  FiLogOut,
  FiUser,
  FiTrendingUp,
} from "react-icons/fi";
import Link from "next/link";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/teachers/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/teachers/students", label: "Students", icon: FiUsers },
  { href: "/teachers/permissions", label: "Permissions", icon: FiClipboard },
  { href: "/teachers/salary", label: "Salary", icon: FiTrendingUp },
];

export default function TeachersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Don't apply layout to login page
  if (pathname === "/teachers/login") {
    return <>{children}</>;
  }

  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications] = useState<any[]>([]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  if (authLoading) {
    return <PageLoading />;
  }

  // Skip user check - allow access even if user details not found
  // if (!user) {
  //   return error page
  // }

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 md:w-72 bg-black text-white flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-20 md:h-24 px-4 md:px-6 border-b border-gray-700 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-lg">
              <FiUser className="h-5 w-5 md:h-6 md:w-6 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-extrabold text-white">
                Teacher Portal
              </span>
              <span className="text-xs text-gray-300 hidden md:block">
                Dashboard & Analytics
              </span>
            </div>
          </div>
          <button
            className="md:hidden text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 hover:scale-110"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-6 py-8 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white text-black shadow-lg transform scale-105"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-105"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="px-6 py-6 border-t border-gray-700 bg-black">
          <button
            onClick={() => {
              signOut({ callbackUrl: "/teachers/login", redirect: true });
            }}
            className="w-full flex items-center gap-4 p-4 text-base font-medium text-gray-300 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 hover:transform hover:scale-105 hover:shadow-lg"
            aria-label="Logout"
          >
            <FiLogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white shadow-xl border-b border-gray-200">
          <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                className="md:hidden text-black hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FiMenu size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="p-2 bg-black rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                <FiUser className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-extrabold text-black truncate">
                  Welcome,{" "}
                  {user && user.name && typeof user.name === "string"
                    ? user.name.split(" ")[0]
                    : "Teacher"}
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm font-medium hidden sm:block">
                  Teacher Portal
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="relative group">
                <button
                  className="text-black hover:text-gray-700 relative p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
                  aria-label="Notifications"
                >
                  <FiBell size={18} className="sm:w-5 sm:h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold shadow-lg animate-pulse text-[10px] sm:text-xs">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 relative group flex-shrink-0">
                <button
                  className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg transition-all duration-200 md:cursor-default text-xs sm:text-sm lg:text-base"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      signOut({ callbackUrl: "/teachers/login", redirect: true });
                    }
                  }}
                >
                  {user && user.name && typeof user.name === "string"
                    ? user.name.charAt(0)
                    : "T"}
                </button>
                <span className="text-xs sm:text-sm font-semibold text-emerald-900 hidden lg:block max-w-20 xl:max-w-24 truncate">
                  {user && user.name && typeof user.name === "string"
                    ? user.name.split(" ")[0]
                    : "Teacher"}
                </span>
                <div className="md:hidden absolute -bottom-7 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Tap to logout
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-6 lg:pb-8">
          {children}
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl flex justify-around py-2 z-50 safe-area-inset-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 max-w-20 ${
                  isActive
                    ? "text-black bg-gray-100 transform scale-105"
                    : "text-gray-500 hover:text-black hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Styles */}
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
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}