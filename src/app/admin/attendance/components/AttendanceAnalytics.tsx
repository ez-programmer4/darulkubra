"use client";

import React, { useState, useEffect, FC } from "react";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
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

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

const ChartContainer: FC<ChartContainerProps> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
    <div className="h-72">{children}</div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-[360px] flex flex-col">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
    <div className="flex-1 bg-gray-200 rounded-md animate-pulse"></div>
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

// New, more detailed tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-white border rounded-md shadow-md text-sm">
        <p className="font-bold">{label || data.name}</p>
        <p className="font-semibold text-blue-600">
          Attendance Rate: {data["Attendance Rate"]}%
        </p>
        <p className="text-blue-700">Present: {data.Present}</p>
        <p className="text-blue-400">Absent: {data.Absent}</p>
        <p className="text-gray-500">Total: {data.Total}</p>
      </div>
    );
  }
  return null;
};

// New card to feature top performers
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
  <div
    className={`bg-white p-6 rounded-lg shadow-md flex items-start border-l-4 ${borderColor}`}
  >
    <div className="mr-4 text-3xl text-blue-400">{icon}</div>
    <div>
      <h4 className="font-semibold text-gray-500">{title}</h4>
      <p className="text-2xl font-bold text-gray-800">{name}</p>
      <p className={`text-lg font-semibold ${textColor}`}>{rate}% Attendance</p>
      <p className="text-sm text-gray-500 mt-1">
        {present} / {total} sessions present
      </p>
    </div>
  </div>
);

export function AttendanceAnalytics({
  controllerId,
}: {
  controllerId?: string;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!date?.from || !date?.to) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from: format(date.from, "yyyy-MM-dd"),
          to: format(date.to, "yyyy-MM-dd"),
        });
        if (controllerId) {
          params.append("controllerId", controllerId);
          // Debug controller selection
        }
        const response = await fetch(
          `/api/admin/attendance/analytics?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to fetch analytics data");
        const result: AnalyticsData = await response.json();
        // Validate and sanitize API data
        const sanitizedResult = {
          dailyTrend: Array.isArray(result.dailyTrend)
            ? result.dailyTrend.map((d) => ({
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
                  typeof d.Total === "number" && !isNaN(d.Total) ? d.Total : 0,
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
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date, controllerId]);

  // Filter out invalid data points for charts
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
      (d.date || d.name) // Ensure date or name exists for chart keys
    );
  }
  const filteredDailyTrend = (data?.dailyTrend || []).filter(isValidDataPoint);
  const filteredControllerData = (data?.controllerData || [])
    .filter(isValidDataPoint)
    .slice(0, 10); // Limit to top 10
  const filteredTeacherData = (data?.teacherData || [])
    .filter(isValidDataPoint)
    .slice(0, 10); // Limit to top 10

  // Debug filtered data
  // Debug filtered data
  // Debug filtered data

  const hasValidDailyTrend = filteredDailyTrend.length > 0;
  const hasValidControllerData = filteredControllerData.length > 0;
  const hasValidTeacherData = filteredTeacherData.length > 0;

  const topController = data?.controllerData?.[0];
  const topTeacher = data?.teacherData?.[0];

  // --- New: Calculate summary stats and moving average ---
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
  // 7-day moving average
  const movingAvg = filteredDailyTrend.map((d, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1);
    const avg =
      window.reduce((sum, w) => sum + w["Attendance Rate"], 0) / window.length;
    return { ...d, movingAvg: Math.round(avg * 10) / 10 };
  });
  // Pie chart data
  const pieData = [
    { name: "Present", value: presentTotal },
    { name: "Absent", value: absentTotal },
  ];
  // Update color constants for blue palette
  const PIE_COLORS = ["#3b82f6", "#60a5fa"];

  return (
    <>
      <div className="flex justify-end mb-6">
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex items-center gap-4">
          <FiPercent className="text-2xl text-blue-500" />
          <div>
            <div className="text-gray-500">Avg. Attendance Rate</div>
            <div className="text-2xl font-bold">{avgAttendanceRate}%</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400 flex items-center gap-4">
          <FiTrendingUp className="text-2xl text-blue-400" />
          <div>
            <div className="text-gray-500">Best Day</div>
            <div className="text-lg font-bold">
              {bestDay
                ? `${bestDay.date} (${bestDay["Attendance Rate"]}%)`
                : "-"}
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-300 flex items-center gap-4">
          <FiTrendingDown className="text-2xl text-blue-300" />
          <div>
            <div className="text-gray-500">Worst Day</div>
            <div className="text-lg font-bold">
              {worstDay
                ? `${worstDay.date} (${worstDay["Attendance Rate"]}%)`
                : "-"}
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-200 flex items-center gap-4">
          <FiUserCheck className="text-2xl text-blue-200" />
          <div>
            <div className="text-gray-500">Total Sessions</div>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </div>
        </div>
      </div>
      {/* New: Pie and Stacked Bar Charts */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Present vs Absent (Pie)">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#3b82f6"
                label
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Daily Present/Absent (Stacked Bar)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredDailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(str) => format(new Date(str), "MMM d")}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Absent" stackId="a" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 col-span-full">
          Error: {error}
        </div>
      ) : hasValidControllerData && hasValidTeacherData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <PerformerCard
            title="Top Performing Controller"
            name={topController?.name || "-"}
            rate={topController?.["Attendance Rate"] ?? 0}
            present={topController?.Present ?? 0}
            total={topController?.Total ?? 0}
            icon={<FiStar />}
            borderColor="border-blue-500"
            textColor="text-blue-600"
          />
          <PerformerCard
            title="Top Performing Teacher"
            name={topTeacher?.name || "-"}
            rate={topTeacher?.["Attendance Rate"] ?? 0}
            present={topTeacher?.Present ?? 0}
            total={topTeacher?.Total ?? 0}
            icon={<FiUserCheck />}
            borderColor="border-blue-400"
            textColor="text-blue-400"
          />
        </div>
      ) : (
        <div className="col-span-full text-center text-blue-500 py-8">
          No attendance data available for the selected controller and date
          range.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced: Line chart with moving average */}
        <ChartContainer title="Daily Attendance Rate Trend (with 7-day Moving Avg)">
          <ResponsiveContainer width="100%" height="100%">
            {hasValidDailyTrend ? (
              <LineChart data={movingAvg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(str) => format(new Date(str), "MMM d")}
                  type="category"
                />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Rate (%)",
                    angle: -90,
                    position: "insideLeft",
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
                  stroke="#3b82f6"
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
              <div className="flex items-center justify-center h-full text-blue-400">
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
                margin={{ left: 20, right: 20 }} // Removed layout="vertical" for simplicity
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="Attendance Rate"
                  fill="#3b82f6"
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-blue-400">
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
                margin={{ left: 20, right: 20 }} // Removed layout="vertical" for simplicity
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="Attendance Rate"
                  fill="#60a5fa"
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-blue-400">
                No data available.
              </div>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </>
  );
}
