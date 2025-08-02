"use client";

import { useEffect, useState } from "react";
import UstazRatingsSkeleton from "./components/UstazRatingsSkeleton";
import { CheckCircle2, XCircle } from "lucide-react";
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
import { FiSearch } from "react-icons/fi";

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
          const statsRes = await fetch(
            `/api/admin/ustaz/${ustaz.ustazid}/stats`
          );
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
  const barChartData = filteredStats.map((u) => ({
    name: u.name,
    Passed: u.passed,
    Failed: u.failed,
  }));
  const pieChartData = [
    { name: "Passed", value: totalPassed },
    { name: "Failed", value: totalFailed },
  ];
  const PIE_COLORS = ["#34d399", "#f87171"];

  if (loading) {
    return <UstazRatingsSkeleton />;
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
        role="alert"
      >
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-2 sm:p-6">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">
        Teacher Exam Ratings
      </h1>
      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-blue-500">Total Teachers</div>
          <div className="text-2xl font-bold text-blue-900">
            {totalTeachers}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-green-500">Total Passed</div>
          <div className="text-2xl font-bold text-green-900">{totalPassed}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-red-500">Total Failed</div>
          <div className="text-2xl font-bold text-red-900">{totalFailed}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-yellow-500">Average Pass Rate</div>
          <div className="text-2xl font-bold text-yellow-900">
            {averagePassRate}%
          </div>
        </div>
      </div>
      {/* Charts */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            Pass/Fail Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="Passed" fill="#34d399" />
              <Bar dataKey="Failed" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            Overall Pass/Fail
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
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
      {/* Search, Filter, Pagination */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center mb-6 gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-4">
          <div className="relative w-full sm:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
            <input
              type="text"
              placeholder="Search by teacher name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm w-full sm:w-64 text-xs sm:text-base"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 border-2 border-indigo-200 rounded-lg bg-white text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm w-full sm:w-40 text-xs sm:text-base"
          >
            <option value="">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto border border-indigo-100 rounded-lg">
        <table className="min-w-[600px] w-full text-xs sm:text-sm divide-y divide-indigo-200">
          <thead className="bg-indigo-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                Teacher Name
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-green-700 uppercase tracking-wider">
                Passed
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-red-700 uppercase tracking-wider">
                Failed
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-yellow-700 uppercase tracking-wider">
                Pass Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-indigo-200">
            {paginatedStats.map((ustaz) => {
              const passRate =
                ustaz.passed + ustaz.failed > 0
                  ? Math.round(
                      (ustaz.passed / (ustaz.passed + ustaz.failed)) * 100
                    )
                  : 0;
              return (
                <tr key={ustaz.id} className="hover:bg-indigo-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`#teacher-${ustaz.id}`}
                      className="text-sm font-medium text-indigo-700 hover:underline"
                    >
                      {ustaz.name}
                    </a>
                    <div className="text-xs text-indigo-400">{ustaz.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                      {ustaz.passed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                      {ustaz.failed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {passRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-2">
        <p className="text-sm text-indigo-700 font-semibold">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border-2 border-indigo-200 rounded-full bg-white text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all"
          >
            &lt;
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border-2 border-indigo-200 rounded-full bg-white text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
