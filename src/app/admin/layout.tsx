"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Star,
  LogOut,
  X,
  Shield,
  UserCheck,
  Award,
  Coins,
  FileText,
  Clock,
  Timer,
} from "lucide-react";
import Header from "./components/Header";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/teacher-schedules", label: "Daily Attendance", icon: Clock },
  { href: "/admin/teacher-durations", label: "Teaching Durations", icon: Timer },

  { href: "/admin/lateness", label: "Lateness Analytics", icon: UserCheck },
  { href: "/admin/payments", label: "Payments", icon: DollarSign },
  { href: "/admin/permissions", label: "Permissions", icon: Shield },
  { href: "/admin/teacher-payments", label: "Teacher Payments", icon: Coins },

  {
    href: "/admin/controller-earnings",
    label: "Controller Earnings",
    icon: DollarSign,
  },
  {
    href: "/admin/registrar-earnings",
    label: "Registrar Earnings",
    icon: Award,
  },
  { href: "/admin/ustaz", label: "Teacher Ratings", icon: Star },
  { href: "/admin/quality", label: "Quality Review", icon: Award },

  { href: "/admin/settings", label: "Settings", icon: Settings },
  {
    href: "/admin/deduction-adjustments",
    label: "Deduction Adjustment",
    icon: Calendar,
  },
  {
    href: "/admin/package-deductions",
    label: "Package Deductions",
    icon: Settings,
  },
  {
    href: "/admin/package-salaries",
    label: "Package Salaries",
    icon: DollarSign,
  },
  {
    href: "/admin/on-progress",
    label: "On Progress Student",
    icon: Users,
  },
  {
    href: "/admin/student-config",
    label: "Student Configuration",
    icon: Settings,
  },
];

const SidebarContent = () => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-center h-20 border-b border-indigo-700 bg-indigo-900 flex-shrink-0">
        <Link href="/admin" className="flex items-center gap-3 text-white">
          <Shield className="h-8 w-8 text-indigo-300" />
          <span className="text-2xl font-semibold">Admin Panel</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-300 hover:bg-indigo-700 hover:text-white"
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-indigo-700 bg-indigo-900 flex-shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 hover:bg-indigo-700 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const currentNavItem = navItems
    .slice()
    .reverse()
    .find((item) => pathname.startsWith(item.href));
  const pageTitle = currentNavItem ? currentNavItem.label : "Dashboard";

  return (
    <div className="flex min-h-screen bg-slate-50 text-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-900 text-white shadow-xl overflow-y-auto">
            <div className="absolute top-0 right-0 -mr-12 pt-3">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent />
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
        </div>
      )}

      {/* Static sidebar for large screens */}
      <aside className="hidden lg:flex lg:flex-shrink-0 h-screen sticky top-0">
        <div className="w-72 bg-indigo-900 text-white h-screen sticky top-0 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          pageTitle={pageTitle}
          userName={session?.user?.name || "Admin"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
