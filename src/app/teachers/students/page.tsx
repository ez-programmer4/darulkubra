"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiBook,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";

type Student = {
  wdt_ID: number;
  name: string;
  package: string;
  daypackages: string;
  subject: string;
  status: string;
  zoom_links: any[];
  occupiedTimes: { time_slot: string }[];
};

export default function StudentsPage() {
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");

  useEffect(() => {
    if (user?.id) {
      fetchStudents();
    }
  }, [user?.id]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/teachers/students");
      
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      
      const data = await response.json();
      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesPackage = packageFilter === "all" || student.package === packageFilter;
    
    return matchesSearch && matchesStatus && matchesPackage;
  });

  const uniquePackages = [...new Set(students.map(s => s.package))].filter(Boolean);
  const uniqueStatuses = [...new Set(students.map(s => s.status))].filter(Boolean);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPackageColor = (packageName: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
    ];
    const hash = packageName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (authLoading || loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
              <FiUsers className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                My Students
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Manage and view your assigned students
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:ml-auto">
            <button
              onClick={fetchStudents}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
              <div className="text-xl sm:text-2xl font-bold text-blue-900">
                {filteredStudents.length}
              </div>
              <div className="text-xs text-blue-700 font-medium">
                Students
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="all">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Package Filter */}
          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="all">All Packages</option>
            {uniquePackages.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setPackageFilter("all");
            }}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 text-sm"
          >
            <FiFilter className="w-4 h-4" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <FiAlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Error loading students</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 text-center">
          <FiUsers className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            No Students Found
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">
            {searchTerm || statusFilter !== "all" || packageFilter !== "all"
              ? "No students match your current filters."
              : "You don't have any assigned students yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredStudents.map((student) => (
            <div
              key={student.wdt_ID}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            >
              {/* Student Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                      {student.name}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm">ID: {student.wdt_ID}</p>
                  </div>
                </div>
                
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(
                    student.status
                  )}`}
                >
                  {student.status}
                </span>
              </div>

              {/* Student Details */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <FiBook className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600">Subject:</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                    {student.subject || "Not specified"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600">Days:</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                    {student.daypackages || "Not specified"}
                  </span>
                </div>

                {student.occupiedTimes?.[0]?.time_slot && (
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-600">Time:</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      {student.occupiedTimes[0].time_slot}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600">Package:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPackageColor(
                      student.package
                    )}`}
                  >
                    {student.package || "Not specified"}
                  </span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Recent Activity:</span>
                  <div className="flex items-center gap-1">
                    {student.zoom_links?.length > 0 ? (
                      <>
                        <FiCheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          Active
                        </span>
                      </>
                    ) : (
                      <>
                        <FiXCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">
                          No recent activity
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}