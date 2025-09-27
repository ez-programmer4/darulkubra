"use client";

import { useEffect, useState } from "react";
import UstazRatingsSkeleton from "./components/UstazRatingsSkeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiTarget,
  FiBarChart,
  FiPieChart,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFilter,
} from "react-icons/fi";

type UstazStats = {
  id: string;
  name: string;
  passed: number;
  failed: number;
};

export default function UstazRatingsPage() {
  const [stats, setStats] = useState<UstazStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchUstazData() {
      try {
        const ustazRes = await fetch("/api/teachers");
        if (!ustazRes.ok) throw new Error("Failed to fetch teachers.");
        const ustazList = await ustazRes.json();

        if (!Array.isArray(ustazList)) {
          throw new Error("Invalid data format from teachers API.");
        }

        const statsPromises = ustazList.map(async (ustaz: any) => {
          const statsRes = await fetch(`/api/admin/ustaz/${ustaz.ustazid}/stats`);
          if (!statsRes.ok) {
            return {
              id: ustaz.ustazid,
              name: ustaz.ustazname,
              passed: 0,
              failed: 0,
              error: true,
            };
          }
          const { passed, failed } = await statsRes.json();
          return { id: ustaz.ustazid, name: ustaz.ustazname, passed, failed };
        });

        const allStats = await Promise.all(statsPromises);
        setStats(allStats);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUstazData();
  }, []);

  // Derived stats
  const filteredStats = stats.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "" ||
        (statusFilter === "passed" && u.passed > u.failed) ||
        (statusFilter === "failed" && u.failed >= u.passed))
  );
  const totalTeachers = filteredStats.length;
  const totalPassed = filteredStats.reduce((sum, u) => sum + u.passed, 0);
  const totalFailed = filteredStats.reduce((sum, u) => sum + u.failed, 0);
  const averagePassRate =
    totalTeachers > 0
      ? Math.round(
          (filteredStats.reduce(
            (sum, u) =>
              sum +
              (u.passed + u.failed > 0 ? u.passed / (u.passed + u.failed) : 0),
            0
          ) /
            totalTeachers) *
            100
        )
      : 0;

  // Pagination
  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const paginatedStats = filteredStats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Chart data
  const barChartData = filteredStats.slice(0, 10).map((u) => ({
    name: u.name.length > 10 ? u.name.substring(0, 10) + "..." : u.name,
    Passed: u.passed,
    Failed: u.failed,
  }));
  const pieChartData = [
    { name: "Passed", value: totalPassed },
    { name: "Failed", value: totalFailed },
  ];
  const PIE_COLORS = ["#10b981", "#ef4444"];

  const exportToCSV = () => {
    const headers = ["Teacher Name", "Teacher ID", "Passed", "Failed", "Pass Rate"];
    const rows = filteredStats.map((ustaz) => {
      const passRate = ustaz.passed + ustaz.failed > 0
        ? Math.round((ustaz.passed / (ustaz.passed + ustaz.failed)) * 100)
        : 0;
      return [ustaz.name, ustaz.id, ustaz.passed, ustaz.failed, `${passRate}%`];
    });
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-exam-ratings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
          <p className="text-black font-medium text-lg">Loading teacher ratings...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
            <FiXCircle className="h-16 w-16 text-red-500" />
          </div>
          <h3 className="text-3xl font-bold text-black mb-4">Error Loading Data</h3>
          <p className="text-red-600 text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiUsers className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Teacher Exam Ratings
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Performance analytics and exam pass/fail statistics
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto w-full">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Teachers</span>
                </div>
                <div className="text-2xl font-bold text-black">{totalTeachers}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiCheckCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Passed</span>
                </div>
                <div className="text-2xl font-bold text-black">{totalPassed}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiXCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Failed</span>
                </div>
                <div className="text-2xl font-bold text-black">{totalFailed}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiTarget className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Pass Rate</span>
                </div>
                <div className="text-2xl font-bold text-black">{averagePassRate}%</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Teachers
                </label>
                <input
                  type="text"
                  placeholder="Search by teacher name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="">All Teachers</option>
                  <option value="passed">Mostly Passed</option>
                  <option value="failed">Mostly Failed</option>
                </select>
              </div>
              <div className="lg:col-span-5">
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FiDownload className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-black rounded-xl">
                <FiBarChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Pass/Fail Distribution</h2>
                <p className="text-gray-600">Top 10 teachers by exam results</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Passed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-black rounded-xl">
                <FiPieChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Overall Pass/Fail</h2>
                <p className="text-gray-600">Total exam results distribution</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name} ${typeof percent === 'number' ? (percent * 100).toFixed(0) : 0}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Teacher Details</h2>
                <p className="text-gray-600">{filteredStats.length} teachers found</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {paginatedStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiUsers className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Teachers Found</h3>
                <p className="text-gray-600 text-xl">No teachers match your current filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Teacher Name
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">
                          Passed
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">
                          Failed
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-black uppercase tracking-wider">
                          Pass Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedStats.map((ustaz, index) => {
                        const passRate =
                          ustaz.passed + ustaz.failed > 0
                            ? Math.round((ustaz.passed / (ustaz.passed + ustaz.failed)) * 100)
                            : 0;
                        return (
                          <tr
                            key={ustaz.id}
                            className={`hover:bg-gray-50 transition-all duration-200 ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-semibold text-black">{ustaz.name}</div>
                                <div className="text-sm text-gray-500">{ustaz.id}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-xs">
                                {ustaz.passed}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold text-xs">
                                {ustaz.failed}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${
                                passRate >= 70 ? "bg-green-100 text-green-800" :
                                passRate >= 50 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {passRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                  <p className="text-lg font-semibold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}