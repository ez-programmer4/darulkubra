"use client";

import React, { useState, useEffect, FC } from "react";
import { DateRange } from "react-day-picker";
import { subDays, format, isValid } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DatePickerWithRange } from "./DateRangePicker";
import {
  FiStar,
  FiUserCheck,
  FiTrendingUp,
  FiTrendingDown,
  FiPercent,
} from "react-icons/fi";
import { motion } from "framer-motion";

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

const ChartContainer: FC<ChartContainerProps> = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-indigo-100"
  >
    <h3 className="font-semibold text-lg text-indigo-900 mb-4">{title}</h3>
    <div className="h-72">{children}</div>
  </motion.div>
);

const ChartSkeleton = () => (
  <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-indigo-100 h-[360px] flex flex-col">
    <div className="h-6 bg-indigo-100 rounded w-1/3 mb-4 animate-pulse"></div>
    <div className="flex-1 bg-indigo-50 rounded-md animate-pulse"></div>
  </div>
);

interface AnalyticsData {
  dailyTrend: {
    date: string;
    "Attendance Rate": number;
    Present: number;
    Absent: number;
    Total: number;
  }[];
  controllerData: {
    name: string;
    "Attendance Rate": number;
    Present: number;
    Absent: number;
    Total: number;
  }[];
  teacherData: {
    name: string;
    "Attendance Rate": number;
    Present: number;
    Absent: number;
    Total: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-lg shadow-md text-sm">
        <p className="font-bold text-indigo-900">{label || data.name}</p>
        <p className="font-semibold text-indigo-600">
          Attendance Rate: {data["Attendance Rate"]}%
        </p>
        <p className="text-indigo-700">Present: {data.Present}</p>
        <p className="text-indigo-500">Absent: {data.Absent}</p>
        <p className="text-gray-500">Total: {data.Total}</p>
      </div>
    );
  }
  return null;
};

const PerformerCard: FC<any> = ({
  title,
  name,
  rate,
  total,
  present,
  icon,
  borderColor,
  textColor,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className={`bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg flex items-start border-l-4 ${borderColor}`}
  >
    <div className="mr-4 text-3xl text-indigo-500">{icon}</div>
    <div>
      <h4 className="font-semibold text-indigo-700">{title}</h4>
      <p className="text-xl font-bold text-indigo-900">{name}</p>
      <p className={`text-lg font-semibold ${textColor}`}>{rate}% Attendance</p>
      <p className="text-sm text-indigo-500 mt-1">
        {present} / {total} sessions present
      </p>
    </div>
  </motion.div>
);

export function AttendanceAnalytics({
  controllerCode,
}: {
  controllerCode?: string;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (
        !date?.from ||
        !date?.to ||
        !isValid(date.from) ||
        !isValid(date.to)
      ) {
        setError("Invalid date range selected");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from: format(date.from, "yyyy-MM-dd"),
          to: format(date.to, "yyyy-MM-dd"),
        });
        if (controllerCode) {
          params.append("controllerId", controllerCode); // API expects controllerId as param name
        }
        const response = await fetch(
          `/api/admin/attendance/analytics?${params.toString()}`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.details || `HTTP error! status: ${response.status}`
          );
        }
        const result: AnalyticsData = await response.json();
        const sanitizedResult = {
          dailyTrend: Array.isArray(result.dailyTrend)
            ? result.dailyTrend
                .filter((d) => d.date && isValid(new Date(d.date)))
                .map((d) => ({
                  date: d.date || "",
                  "Attendance Rate":
                    typeof d["Attendance Rate"] === "number" &&
                    !isNaN(d["Attendance Rate"])
                      ? d["Attendance Rate"]
                      : 0,
                  Present:
                    typeof d.Present === "number" && !isNaN(d.Present)
                      ? d.Present
                      : 0,
                  Absent:
                    typeof d.Absent === "number" && !isNaN(d.Absent)
                      ? d.Absent
                      : 0,
                  Total:
                    typeof d.Total === "number" && !isNaN(d.Total)
                      ? d.Total
                      : 0,
                }))
            : [],
          controllerData: Array.isArray(result.controllerData)
            ? result.controllerData.map((d) => ({
                name: d.name || "Unknown",
                "Attendance Rate":
                  typeof d["Attendance Rate"] === "number" &&
                  !isNaN(d["Attendance Rate"])
                    ? d["Attendance Rate"]
                    : 0,
                Present:
                  typeof d.Present === "number" && !isNaN(d.Present)
                    ? d.Present
                    : 0,
                Absent:
                  typeof d.Absent === "number" && !isNaN(d.Absent)
                    ? d.Absent
                    : 0,
                Total:
                  typeof d.Total === "number" && !isNaN(d.Total) ? d.Total : 0,
              }))
            : [],
          teacherData: Array.isArray(result.teacherData)
            ? result.teacherData.map((d) => ({
                name: d.name || "Unknown",
                "Attendance Rate":
                  typeof d["Attendance Rate"] === "number" &&
                  !isNaN(d["Attendance Rate"])
                    ? d["Attendance Rate"]
                    : 0,
                Present:
                  typeof d.Present === "number" && !isNaN(d.Present)
                    ? d.Present
                    : 0,
                Absent:
                  typeof d.Absent === "number" && !isNaN(d.Absent)
                    ? d.Absent
                    : 0,
                Total:
                  typeof d.Total === "number" && !isNaN(d.Total) ? d.Total : 0,
              }))
            : [],
        };
        setData(sanitizedResult);
        setError(null);
      } catch (err: unknown) {
        console.error("Fetch error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date, controllerCode]);

  function isValidDataPoint(d: any) {
    return (
      d &&
      typeof d["Attendance Rate"] === "number" &&
      !isNaN(d["Attendance Rate"]) &&
      typeof d.Present === "number" &&
      !isNaN(d.Present) &&
      typeof d.Absent === "number" &&
      !isNaN(d.Absent) &&
      typeof d.Total === "number" &&
      !isNaN(d.Total) &&
      (d.date || d.name)
    );
  }

  const filteredDailyTrend = (data?.dailyTrend || []).filter(isValidDataPoint);
  const filteredControllerData = (data?.controllerData || [])
    .filter(isValidDataPoint)
    .slice(0, 10);
  const filteredTeacherData = (data?.teacherData || [])
    .filter(isValidDataPoint)
    .slice(0, 10);

  const hasValidDailyTrend = filteredDailyTrend.length > 0;
  const hasValidControllerData = filteredControllerData.length > 0;
  const hasValidTeacherData = filteredTeacherData.length > 0;

  const topController = filteredControllerData[0];
  const topTeacher = filteredTeacherData[0];

  const presentTotal = filteredDailyTrend.reduce(
    (sum, d) => sum + d.Present,
    0
  );
  const absentTotal = filteredDailyTrend.reduce((sum, d) => sum + d.Absent, 0);
  const totalSessions = filteredDailyTrend.reduce((sum, d) => sum + d.Total, 0);
  const avgAttendanceRate =
    filteredDailyTrend.length > 0
      ? Math.round(
          (filteredDailyTrend.reduce(
            (sum, d) => sum + d["Attendance Rate"],
            0
          ) /
            filteredDailyTrend.length) *
            10
        ) / 10
      : 0;
  const bestDay = filteredDailyTrend.reduce(
    (best, d) =>
      d["Attendance Rate"] > (best?.["Attendance Rate"] ?? -1) ? d : best,
    null as null | (typeof filteredDailyTrend)[0]
  );
  const worstDay = filteredDailyTrend.reduce(
    (worst, d) =>
      d["Attendance Rate"] < (worst?.["Attendance Rate"] ?? 101) ? d : worst,
    null as null | (typeof filteredDailyTrend)[0]
  );
  const movingAvg = filteredDailyTrend.map((d, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1);
    const avg =
      window.reduce((sum, w) => sum + w["Attendance Rate"], 0) / window.length;
    return { ...d, movingAvg: Math.round(avg * 10) / 10 };
  });

  const pieData = [
    { name: "Present", value: presentTotal },
    { name: "Absent", value: absentTotal },
  ];
  const PIE_COLORS = ["#4f46e5", "#60a5fa"]; // Indigo-600 and blue-400

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6 animate-slide-in"
      >
        <div className="flex justify-end mb-6">
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-indigo-100 rounded-2xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-500 col-span-full p-6">
            Error: {error}
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border-l-4 border-indigo-500 flex items-center gap-4">
                <FiPercent className="text-2xl text-indigo-500" />
                <div>
                  <div className="text-indigo-700">Avg. Attendance Rate</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {avgAttendanceRate}%
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border-l-4 border-indigo-400 flex items-center gap-4">
                <FiTrendingUp className="text-2xl text-indigo-400" />
                <div>
                  <div className="text-indigo-700">Best Day</div>
                  <div className="text-lg font-bold text-indigo-900">
                    {bestDay
                      ? `${format(new Date(bestDay.date), "MMM d")} (${
                          bestDay["Attendance Rate"]
                        }%)`
                      : "-"}
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border-l-4 border-indigo-300 flex items-center gap-4">
                <FiTrendingDown className="text-2xl text-indigo-300" />
                <div>
                  <div className="text-indigo-700">Worst Day</div>
                  <div className="text-lg font-bold text-indigo-900">
                    {worstDay
                      ? `${format(new Date(worstDay.date), "MMM d")} (${
                          worstDay["Attendance Rate"]
                        }%)`
                      : "-"}
                  </div>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border-l-4 border-indigo-200 flex items-center gap-4">
                <FiUserCheck className="text-2xl text-indigo-200" />
                <div>
                  <div className="text-indigo-700">Total Sessions</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {totalSessions}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <ChartContainer title="Present vs Absent (Pie)">
                <ResponsiveContainer width="100%" height="100%">
                  {totalSessions > 0 ? (
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#4f46e5"
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-indigo-500">
                      No data available for pie chart.
                    </div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>
              <ChartContainer title="Daily Present/Absent (Stacked Bar)">
                <ResponsiveContainer width="100%" height="100%">
                  {hasValidDailyTrend ? (
                    <BarChart data={filteredDailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(str) => {
                          try {
                            const date = new Date(str);
                            return isValid(date)
                              ? format(date, "MMM d")
                              : "Invalid";
                          } catch {
                            return "Invalid";
                          }
                        }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="Present" stackId="a" fill="#4f46e5" />
                      <Bar dataKey="Absent" stackId="a" fill="#60a5fa" />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-indigo-500">
                      No data available.
                    </div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>
            </motion.div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[...Array(2)].map((_, i) => (
                  <ChartSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center text-red-500 col-span-full p-6">
                Error: {error}
              </div>
            ) : hasValidControllerData && hasValidTeacherData ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
              >
                <PerformerCard
                  title="Top Performing Controller"
                  name={topController?.name || "-"}
                  rate={topController?.["Attendance Rate"] ?? 0}
                  present={topController?.Present ?? 0}
                  total={topController?.Total ?? 0}
                  icon={<FiStar />}
                  borderColor="border-indigo-500"
                  textColor="text-indigo-600"
                />
                <PerformerCard
                  title="Top Performing Teacher"
                  name={topTeacher?.name || "-"}
                  rate={topTeacher?.["Attendance Rate"] ?? 0}
                  present={topTeacher?.Present ?? 0}
                  total={topTeacher?.Total ?? 0}
                  icon={<FiUserCheck />}
                  borderColor="border-indigo-400"
                  textColor="text-indigo-400"
                />
              </motion.div>
            ) : (
              <div className="col-span-full text-center text-indigo-500 py-8">
                No attendance data available for the selected controller and
                date range.
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <ChartContainer title="Daily Attendance Rate Trend (with 7-day Moving Avg)">
                <ResponsiveContainer width="100%" height="100%">
                  {hasValidDailyTrend ? (
                    <LineChart data={movingAvg}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(str) => {
                          try {
                            const date = new Date(str);
                            return isValid(date)
                              ? format(date, "MMM d")
                              : "Invalid";
                          } catch {
                            return "Invalid";
                          }
                        }}
                        type="category"
                      />
                      <YAxis
                        yAxisId="left"
                        label={{
                          value: "Rate (%)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#4b5e7b",
                        }}
                        domain={[0, 100]}
                        type="number"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Attendance Rate"
                        stroke="#4f46e5"
                        activeDot={{ r: 8 }}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="movingAvg"
                        stroke="#60a5fa"
                        strokeDasharray="5 5"
                        dot={false}
                        name="7-day Moving Avg"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-indigo-500">
                      No data available.
                    </div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Controller Performance (Top 10)">
                <ResponsiveContainer width="100%" height="100%">
                  {hasValidControllerData ? (
                    <BarChart
                      data={filteredControllerData}
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={80}
                        fill="#4b5e7b"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="Attendance Rate"
                        fill="#4f46e5"
                        isAnimationActive={false}
                      />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-indigo-500">
                      No data available.
                    </div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Teacher Performance (Top 10)">
                <ResponsiveContainer width="100%" height="100%">
                  {hasValidTeacherData ? (
                    <BarChart
                      data={filteredTeacherData}
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={80}
                        fill="#4b5e7b"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="Attendance Rate"
                        fill="#60a5fa"
                        isAnimationActive={false}
                      />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-indigo-500">
                      No data available.
                    </div>
                  )}
                </ResponsiveContainer>
              </ChartContainer>
            </motion.div>
          </>
        )}
      </motion.div>

      <style jsx global>{`
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
