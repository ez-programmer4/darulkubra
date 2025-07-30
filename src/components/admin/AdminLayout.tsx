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
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Header from "../../app/admin/components/Header";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: Calendar },
  { href: "/admin/lateness", label: "Lateness Analytics", icon: UserCheck },
  { href: "/admin/payments", label: "Payments", icon: DollarSign },
  { href: "/admin/permissions", label: "Permissions", icon: Shield },
  { href: "/admin/teacher-payments", label: "Teacher Payments", icon: Coins },
  {
    href: "/admin/deductions-bonuses",
    label: "Deductions/Bonuses",
    icon: Star,
  },
  {
    href: "/admin/controller-earnings",
    label: "Controller Earnings",
    icon: DollarSign,
  },
  { href: "/admin/ustaz", label: "Teacher Ratings", icon: Star },
  { href: "/admin/quality", label: "Quality Review", icon: Award },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  {
    href: "/admin/absent",
    label: "Absence Deduction Config",
    icon: FileText,
  },
];

const SidebarContent = () => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center h-20 border-b border-blue-700 bg-blue-900">
        <Link href="/admin" className="flex items-center gap-3 text-white">
          <Shield className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-semibold">Admin Panel</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-800">
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
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-300 hover:bg-blue-700 hover:text-white"
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-blue-700 bg-blue-900">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
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
  pageTitle,
  userName,
}: {
  children: React.ReactNode;
  pageTitle?: string;
  userName?: string;
}) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const currentNavItem = navItems
    .slice()
    .reverse()
    .find((item) => pathname.startsWith(item.href));
  const resolvedTitle =
    pageTitle || (currentNavItem ? currentNavItem.label : "Dashboard");

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-50 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-blue-800 bg-opacity-75"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-blue-900 text-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-3">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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

      {/* Static sidebar for desktop */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="w-72 bg-blue-900 text-white">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          pageTitle={resolvedTitle}
          userName={session?.user?.name || userName || "Admin"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
