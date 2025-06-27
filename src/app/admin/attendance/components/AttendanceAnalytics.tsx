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
} from "recharts";
import { DatePickerWithRange } from "./DateRangePicker";
import { FiStar, FiUserCheck } from "react-icons/fi";

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
        <p className="font-semibold text-indigo-600">
          Attendance Rate: {data["Attendance Rate"]}%
        </p>
        <p className="text-green-600">Present: {data.Present}</p>
        <p className="text-red-600">Absent: {data.Absent}</p>
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
    <div className="mr-4 text-3xl text-gray-600">{icon}</div>
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
        }
        const response = await fetch(
          `/api/admin/attendance/analytics?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to fetch analytics data");
        const result: AnalyticsData = await response.json();
        setData(result);
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

  const topController = data?.controllerData?.[0];
  const topTeacher = data?.teacherData?.[0];

  return (
    <>
      <div className="flex justify-end mb-6">
        <DatePickerWithRange date={date} setDate={setDate} />
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
      ) : (
        topController &&
        topTeacher && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <PerformerCard
              title="Top Performing Controller"
              name={topController.name}
              rate={topController["Attendance Rate"]}
              present={topController.Present}
              total={topController.Total}
              icon={<FiStar />}
              borderColor="border-green-500"
              textColor="text-green-600"
            />
            <PerformerCard
              title="Top Performing Teacher"
              name={topTeacher.name}
              rate={topTeacher["Attendance Rate"]}
              present={topTeacher.Present}
              total={topTeacher.Total}
              icon={<FiUserCheck />}
              borderColor="border-blue-500"
              textColor="text-blue-600"
            />
          </div>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          data && (
            <>
              <ChartContainer title="Daily Attendance Rate Trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => format(new Date(str), "MMM d")}
                    />
                    <YAxis
                      yAxisId="left"
                      label={{
                        value: "Rate (%)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="Attendance Rate"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Controller Performance (Top 10)">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.controllerData.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Attendance Rate" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Teacher Performance (Top 10)">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.teacherData.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Attendance Rate" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )
        )}
      </div>
    </>
  );
}
