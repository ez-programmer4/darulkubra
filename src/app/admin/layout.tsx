"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiUsers,
  FiDollarSign,
  FiCreditCard,
  FiBarChart2,
  FiCheckSquare,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";
import Header from "./components/Header"; // Assuming the Header is in a components sub-directory
import { useAuth } from "@/app/context/AuthContext";
import { IconType } from "react-icons";

const NavLink = ({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center px-6 py-3 text-base font-medium transition-colors duration-150
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-600 border-r-4 border-blue-500"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
      >
        <span className="mr-4">{icon}</span>
        {children}
      </Link>
    </li>
  );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  let pageTitle = "Dashboard";
  if (pathname.includes("/users")) {
    pageTitle = "User Management";
  } else if (pathname.includes("/payments")) {
    pageTitle = "Payment Management";
  }

  const navItems: { href: string; icon: React.ReactNode; label: string }[] = [
    { href: "/admin", icon: <FiHome />, label: "Dashboard" },
    { href: "/admin/users", icon: <FiUsers />, label: "Users" },
    { href: "/admin/payments", icon: <FiDollarSign />, label: "Payments" },
    { href: "/admin/attendance", icon: <FiCheckSquare />, label: "Attendance" },
    { href: "/admin/settings", icon: <FiSettings />, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex items-center justify-center h-16 bg-white border-b">
            <span className="text-xl font-bold">Admin Panel</span>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto bg-white">
            <nav className="flex-1 px-2 py-4">
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="px-2 py-4 border-t">
              <button
                onClick={logout}
                className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900"
              >
                <FiLogOut className="mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          pageTitle={pageTitle}
          userName={user?.name || "Admin"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
