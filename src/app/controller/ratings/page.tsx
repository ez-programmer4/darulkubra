"use client";

import { useEffect, useState } from "react";
import UstazRatingsSkeleton from "@/app/admin/ustaz/components/UstazRatingsSkeleton";
import { CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type UstazStats = {
  id: string;
  name: string;
  passed: number;
  failed: number;
};

export default function ControllerUstazRatingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UstazStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(stats.length / pageSize);
  const paginatedStats = stats.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role !== "controller") {
        setError("You are not authorized to view this page.");
        setLoading(false);
        return;
      }

      async function fetchUstazData() {
        try {
          const ustazRes = await fetch("/api/controller/teachers");
          if (!ustazRes.ok)
            throw new Error("Failed to fetch your assigned teachers.");
          const ustazList = await ustazRes.json();

          if (!Array.isArray(ustazList)) {
            throw new Error("Invalid data format from teachers API.");
          }

          if (ustazList.length === 0) {
            setStats([]);
            setLoading(false);
            return;
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
    }
  }, [session, status, router]);

  if (loading || status === "loading") {
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
      <button
        onClick={() => router.push("/controller")}
        className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg"
      >
        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform duration-300" />
        <span>Back to Dashboard</span>
      </button>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Your Teacher's Exam Ratings
      </h1>

      {/* Summary Section */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">
            {stats.length}
          </div>
          <div className="text-sm text-green-800">Total Teachers</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {stats.reduce((sum, s) => sum + s.passed + s.failed, 0)}
          </div>
          <div className="text-sm text-blue-800">Total Tests</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {stats.length > 0
              ? Math.round(
                  (stats.reduce((sum, s) => sum + s.passed, 0) /
                    Math.max(
                      1,
                      stats.reduce((sum, s) => sum + s.passed + s.failed, 0)
                    )) *
                    10000
                ) / 100
              : 0}
            %
          </div>
          <div className="text-sm text-purple-800">Avg. Pass Rate</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">
            {
              stats.filter(
                (s) =>
                  s.passed + s.failed > 0 &&
                  s.passed / (s.passed + s.failed) < 0.6
              ).length
            }
          </div>
          <div className="text-sm text-red-800">At-Risk Teachers</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {/* Bar Chart: Passed/Failed per Teacher */}
        <div className="bg-gray-50 rounded-lg p-2 sm:p-4 shadow">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Passed vs. Failed Tests per Teacher
          </h2>
          <div className="h-56 sm:h-72 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" fill="#22c55e" name="Passed" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Pie Chart: Overall Pass/Fail */}
        <div className="bg-gray-50 rounded-lg p-2 sm:p-4 shadow flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Overall Pass/Fail Distribution
          </h2>
          <div className="h-56 sm:h-72 w-full flex items-center justify-center border-2 border-dashed border-blue-300">
            {stats.reduce((sum, s) => sum + s.passed + s.failed, 0) === 0 ? (
              <div className="text-gray-400 text-center w-full">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Passed",
                        value: stats.reduce((sum, s) => sum + s.passed, 0),
                      },
                      {
                        name: "Failed",
                        value: stats.reduce((sum, s) => sum + s.failed, 0),
                      },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    <Cell key="passed" fill="#22c55e" />
                    <Cell key="failed" fill="#ef4444" />
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      {stats.length === 0 ? (
        <p className="text-gray-500">
          You do not have any teachers assigned, or there is no data to display.
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-[600px] w-full divide-y divide-gray-200 text-xs sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Teacher Name
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Passed Tests
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Failed Tests
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStats.map((ustaz) => (
                <tr key={ustaz.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {ustaz.name}
                    </div>
                    <div className="text-sm text-gray-500">{ustaz.id}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      {ustaz.passed}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                      <XCircle className="h-4 w-4" />
                      {ustaz.failed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-green-100"
                }`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                      currentPage === page
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-green-100"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  currentPage === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-green-100"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
