"use client";

import { useState, useEffect } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiUserPlus,
  FiUserX,
  FiBookOpen,
  FiDollarSign,
  FiClipboard,
  FiCalendar,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DashboardSkeleton } from "./components/DashboardSkeleton";

interface Stats {
  admins: number;
  controllers: number;
  teachers: number;
  registrars: number;
  students: number;
  totalRevenue: number;
  paymentCount: number;
}

interface AnalyticsData {
  monthlyRevenue: Record<string, number>;
  monthlyRegistrations: Record<string, number>;
  paymentStatusBreakdown: { name: string; value: number }[];
}

const StatCard = ({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}) => (
  <div
    className={`bg-white p-6 rounded-lg shadow-md flex items-center border-l-4 ${color}`}
  >
    <div className="mr-4 text-3xl">{icon}</div>
    <div>
      <p className="text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (date?.from) params.append("startDate", date.from.toISOString());
      if (date?.to) params.append("endDate", date.to.toISOString());

      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch(`/api/admin/stats?${params.toString()}`),
          fetch(`/api/admin/analytics?${params.toString()}`),
        ]);
        if (!statsRes.ok || !analyticsRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const statsData = await statsRes.json();
        const analyticsData = await analyticsRes.json();
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  if (loading) return <DashboardSkeleton />;

  if (error)
    return <div className="text-center text-red-500">Error: {error}</div>;

  if (!stats || !analytics)
    return <div className="text-center">No data available.</div>;

  const totalUsers =
    stats.admins + stats.controllers + stats.teachers + stats.registrars;

  const revenueChartData = Object.entries(analytics.monthlyRevenue).map(
    ([month, revenue]) => ({ name: month, Revenue: revenue })
  );
  const registrationChartData = Object.entries(
    analytics.monthlyRegistrations
  ).map(([month, count]) => ({ name: month, Registrations: count }));
  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Analytics Overview
        </h2>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[300px] justify-start text-left font-normal"
              >
                <FiCalendar className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" onClick={() => setDate(undefined)}>
            Clear
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FiUsers />}
          title="Total Users"
          value={totalUsers}
          color="border-blue-500"
        />
        <StatCard
          icon={<FiBookOpen />}
          title="Students"
          value={stats.students}
          color="border-indigo-500"
        />
        <StatCard
          icon={<FiDollarSign />}
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="border-pink-500"
        />
        <StatCard
          icon={<FiClipboard />}
          title="Total Payments"
          value={stats.paymentCount}
          color="border-teal-500"
        />
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-700 mb-4">
              Revenue Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Revenue" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-gray-700 mb-4">Payment Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.paymentStatusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {analytics.paymentStatusBreakdown.map((entry, index) => (
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
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            New Registrations
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={registrationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Registrations" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
