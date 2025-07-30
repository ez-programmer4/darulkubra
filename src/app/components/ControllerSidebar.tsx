"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FiCalendar,
  FiBarChart,
  FiGift,
  FiAward,
  FiCheck,
  FiLogOut,
  FiUsers,
} from "react-icons/fi";

const navSections = [
  {
    heading: "Main",
    items: [
      { href: "/controller", label: "Dashboard", icon: FiBarChart },
      { href: "/attendance-list", label: "Attendance List", icon: FiCalendar },
      { href: "/analytics", label: "Analytics", icon: FiBarChart },
      { href: "/controller/ratings", label: "Ustaz Rating", icon: FiBarChart },
    ],
  },
  {
    heading: "Management",
    items: [
      { href: "/controller/earnings", label: "Earnings", icon: FiAward },
      { href: "/controller/quality", label: "Quality Review", icon: FiCheck },
    ],
  },
];

export default function ControllerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center h-20 border-b border-gray-700 bg-gray-900 flex-shrink-0">
        <Link href="/controller" className="flex items-center gap-3 text-white">
          <FiBarChart className="h-8 w-8 text-indigo-400" />
          <span className="text-xl md:text-2xl font-semibold">
            Controller Panel
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {navSections.map((section) => (
          <div key={section.heading}>
            <div className="text-xs font-bold uppercase text-gray-400 mb-2 pl-2 tracking-wider">
              {section.heading}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/controller"
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
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="my-4 border-t border-gray-700" />
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-700 bg-gray-900 flex-shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <FiLogOut className="h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
