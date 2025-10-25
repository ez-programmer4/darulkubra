"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiUsers,
  FiCalendar,
  FiAlertTriangle,
  FiAward,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiEye,
  FiDownload,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/teacher-payment-utils";
import { toast } from "@/components/ui/use-toast";

interface TeacherSalaryData {
  id: string;
  name: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  status: "Paid" | "Unpaid";
  numStudents: number;
  teachingDays: number;
  hasTeacherChanges: boolean;
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
      periods?: Array<{
        period: string;
        daysWorked: number;
        dailyRate: number;
        periodEarnings: number;
        teachingDates: string[];
        teacherRole: "old_teacher" | "new_teacher";
        changeDate?: string;
      }>;
      teacherChanges: boolean;
      debugInfo?: any;
      studentInfo?: {
        studentId: number;
        studentStatus: string;
        package: string;
        daypackage: string;
        zoomLinksTotal: number;
        zoomLinkDates: string[];
        isNotSucceed: boolean;
        isCompleted: boolean;
        isLeave: boolean;
        isActive: boolean;
        isNotYet: boolean;
        statusReason: string;
      };
    }>;
    latenessBreakdown: Array<{
      date: string;
      studentName: string;
      scheduledTime: string;
      actualTime: string;
      latenessMinutes: number;
      tier: string;
      deduction: number;
    }>;
    absenceBreakdown: Array<{
      date: string;
      studentId: number;
      studentName: string;
      studentPackage: string;
      reason: string;
      deduction: number;
      permitted: boolean;
      waived: boolean;
    }>;
    summary: {
      workingDaysInMonth: number;
      actualTeachingDays: number;
      averageDailyEarning: number;
      totalDeductions: number;
      netSalary: number;
    };
  };
}

interface SalaryTableProps {
  data: TeacherSalaryData[];
  loading: boolean;
  onRefresh: () => void;
  onTeacherSelect: (teacher: TeacherSalaryData) => void;
  onBulkAction: (action: string, teacherIds: string[]) => void;
  startDate?: string;
  endDate?: string;
}

type SortKey = keyof TeacherSalaryData | "status";
type SortDirection = "asc" | "desc";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ETB",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function SalaryTable({
  data,
  loading,
  onRefresh,
  onTeacherSelect,
  onBulkAction,
  startDate,
  endDate,
}: SalaryTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teacherChangeFilter, setTeacherChangeFilter] = useState("all");
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherSalaryData | null>(null);
  const [salaryRangeFilter, setSalaryRangeFilter] = useState({
    min: "",
    max: "",
  });
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(
    new Set()
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = data.filter((teacher) => {
      // Search filter
      if (
        search &&
        !teacher.name?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (
        statusFilter &&
        statusFilter !== "all" &&
        teacher.status !== statusFilter
      ) {
        return false;
      }

      // Teacher change filter
      if (
        teacherChangeFilter &&
        teacherChangeFilter !== "all" &&
        ((teacherChangeFilter === "changed" && !teacher.hasTeacherChanges) ||
          (teacherChangeFilter === "no_change" && teacher.hasTeacherChanges))
      ) {
        return false;
      }

      // Salary range filter
      if (
        salaryRangeFilter.min &&
        teacher.totalSalary < Number(salaryRangeFilter.min)
      ) {
        return false;
      }
      if (
        salaryRangeFilter.max &&
        teacher.totalSalary > Number(salaryRangeFilter.max)
      ) {
        return false;
      }

      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any =
        sortKey === "status" ? a.status : a[sortKey as keyof TeacherSalaryData];
      let bValue: any =
        sortKey === "status" ? b.status : b[sortKey as keyof TeacherSalaryData];

      if (sortKey === "name" || sortKey === "status") {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      } else {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      if (sortDir === "asc") return aValue < bValue ? -1 : 1;
      return aValue > bValue ? -1 : 1;
    });

    return filtered;
  }, [
    data,
    search,
    statusFilter,
    teacherChangeFilter,
    salaryRangeFilter,
    sortKey,
    sortDir,
  ]);

  // Export functionality
  const handleExport = useCallback(async () => {
    try {
      const exportData = filteredData.map((teacher) => ({
        Teacher: teacher.name,
        "Base Salary": teacher.baseSalary,
        "Lateness Deduction": teacher.latenessDeduction,
        "Absence Deduction": teacher.absenceDeduction,
        Bonuses: teacher.bonuses,
        "Total Salary": teacher.totalSalary,
        Status: teacher.status,
        "Number of Students": teacher.numStudents,
        "Teaching Days": teacher.teachingDays,
        "Has Teacher Changes": teacher.hasTeacherChanges ? "Yes" : "No",
      }));

      const csvContent = [
        Object.keys(exportData[0]).join(","),
        ...exportData.map((row) => Object.values(row).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teacher-payments-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Teacher payments exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export teacher payments",
        variant: "destructive",
      });
    }
  }, [filteredData, startDate, endDate]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir]
  );

  const handleSelectTeacher = useCallback(
    (teacherId: string) => {
      const newSelected = new Set(selectedTeachers);
      if (newSelected.has(teacherId)) {
        newSelected.delete(teacherId);
      } else {
        newSelected.add(teacherId);
      }
      setSelectedTeachers(newSelected);
    },
    [selectedTeachers]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedTeachers.size === filteredData.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(filteredData.map((t) => t.id)));
    }
  }, [selectedTeachers.size, filteredData]);

  const handleBulkAction = useCallback(
    (action: string) => {
      if (selectedTeachers.size === 0) return;
      onBulkAction(action, Array.from(selectedTeachers));
      setSelectedTeachers(new Set()); // Clear selection after action
    },
    [selectedTeachers, onBulkAction]
  );

  const getStatusBadge = useCallback((status: "Paid" | "Unpaid") => {
    return (
      <Badge
        variant={status === "Paid" ? "default" : "secondary"}
        className={`flex items-center gap-1 ${
          status === "Paid"
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-orange-100 text-orange-800 border-orange-200"
        }`}
      >
        {status === "Paid" ? (
          <FiCheckCircle className="w-3 h-3" />
        ) : (
          <FiXCircle className="w-3 h-3" />
        )}
        {status}
      </Badge>
    );
  }, []);

  const getSortIcon = useCallback(
    (key: SortKey) => {
      if (sortKey !== key) return null;
      return sortDir === "asc" ? (
        <FiChevronUp className="w-4 h-4" />
      ) : (
        <FiChevronDown className="w-4 h-4" />
      );
    },
    [sortKey, sortDir]
  );

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search teachers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={teacherChangeFilter}
            onValueChange={setTeacherChangeFilter}
          >
            <SelectTrigger
              className="w-full sm:w-48"
              data-teacher-change-filter
            >
              <SelectValue placeholder="Teacher Changes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              <SelectItem value="changed">With Teacher Changes</SelectItem>
              <SelectItem value="no_change">No Teacher Changes</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <FiFilter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading || filteredData.length === 0}
            className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <FiDownload className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Min Salary
              </label>
              <Input
                type="number"
                placeholder="0"
                value={salaryRangeFilter.min}
                onChange={(e) =>
                  setSalaryRangeFilter({
                    ...salaryRangeFilter,
                    min: e.target.value,
                  })
                }
                className="border-gray-300 focus:border-black focus:ring-black"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Max Salary
              </label>
              <Input
                type="number"
                placeholder="100000"
                value={salaryRangeFilter.max}
                onChange={(e) =>
                  setSalaryRangeFilter({
                    ...salaryRangeFilter,
                    max: e.target.value,
                  })
                }
                className="border-gray-300 focus:border-black focus:ring-black"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTeachers.size > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-800">
              {selectedTeachers.size} teacher(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleBulkAction("mark-paid")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Mark as Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("mark-unpaid")}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Mark as Unpaid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedTeachers(new Set())}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedTeachers.size === filteredData.length &&
                      filteredData.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Teacher
                    {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("totalSalary")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Total Salary
                    {getSortIcon("totalSalary")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("baseSalary")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Base Salary
                    {getSortIcon("baseSalary")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("latenessDeduction")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Lateness
                    {getSortIcon("latenessDeduction")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("absenceDeduction")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Absence
                    {getSortIcon("absenceDeduction")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("bonuses")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Bonuses
                    {getSortIcon("bonuses")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 text-gray-900 font-medium"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {getSortIcon("status")}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-gray-900 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      Loading salaries...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No teachers found
                  </td>
                </tr>
              ) : (
                filteredData.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onTeacherSelect(teacher)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeachers.has(teacher.id)}
                        onChange={() => handleSelectTeacher(teacher.id)}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {teacher.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {teacher.name || "Unknown Teacher"}
                            {teacher.hasTeacherChanges && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                              >
                                Teacher Changed
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <FiUsers className="w-3 h-3" />
                            {teacher.numStudents} students
                            <FiCalendar className="w-3 h-3" />
                            {teacher.teachingDays} days
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">
                        {currencyFormatter.format(teacher.totalSalary)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-gray-900">
                        {currencyFormatter.format(teacher.baseSalary)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-red-600 flex items-center justify-end gap-1">
                        <FiAlertTriangle className="w-3 h-3" />-
                        {currencyFormatter.format(teacher.latenessDeduction)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-red-600 flex items-center justify-end gap-1">
                        <FiAlertTriangle className="w-3 h-3" />-
                        {currencyFormatter.format(teacher.absenceDeduction)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-green-600 flex items-center justify-end gap-1">
                        <FiAward className="w-3 h-3" />+
                        {currencyFormatter.format(teacher.bonuses)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(teacher.status)}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTeacher(teacher)}
                        className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <FiEye className="w-4 h-4" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {filteredData.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Teachers</div>
              <div className="font-semibold text-gray-900">
                {filteredData.length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Total Salary</div>
              <div className="font-semibold text-gray-900">
                {currencyFormatter.format(
                  filteredData.reduce((sum, t) => sum + t.totalSalary, 0)
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Paid</div>
              <div className="font-semibold text-green-600">
                {filteredData.filter((t) => t.status === "Paid").length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Unpaid</div>
              <div className="font-semibold text-orange-600">
                {filteredData.filter((t) => t.status === "Unpaid").length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Salary Details - {selectedTeacher.name}
                </h2>
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">
                    Base Salary
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedTeacher.baseSalary)}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">
                    Lateness Deduction
                  </div>
                  <div className="text-2xl font-bold text-red-900">
                    -{formatCurrency(selectedTeacher.latenessDeduction)}
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">
                    Absence Deduction
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    -{formatCurrency(selectedTeacher.absenceDeduction)}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">
                    Bonuses
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    +{formatCurrency(selectedTeacher.bonuses)}
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">
                    Total Students
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {selectedTeacher.numStudents}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">
                    Teaching Days
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {selectedTeacher.teachingDays}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">
                    Net Salary
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(selectedTeacher.totalSalary)}
                  </div>
                </div>
              </div>

              {/* Breakdown Sections */}
              <div className="space-y-6">
                {/* Student Breakdown */}
                {selectedTeacher.breakdown?.studentBreakdown && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        Student Breakdown
                        {selectedTeacher.hasTeacherChanges && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full text-xs font-medium text-orange-700">
                            <FiAlertTriangle className="w-3 h-3" />
                            Teacher Changes
                          </div>
                        )}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {selectedTeacher.breakdown.studentBreakdown.length}{" "}
                        student(s)
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Student
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Package
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Monthly Rate
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Daily Rate
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Days Worked
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Total Earned
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Teacher Changes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(
                            selectedTeacher.breakdown.studentBreakdown || []
                          ).map((student, index) => (
                            <React.Fragment key={index}>
                              <tr>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {student.studentName}
                                    {student.studentInfo && (
                                      <div className="flex items-center gap-1">
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded-full ${
                                            student.studentInfo
                                              .studentStatus === "Not succeed"
                                              ? "bg-red-100 text-red-700"
                                              : student.studentInfo
                                                  .studentStatus === "Completed"
                                              ? "bg-green-100 text-green-700"
                                              : student.studentInfo
                                                  .studentStatus === "Leave"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : student.studentInfo
                                                  .studentStatus === "Active"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {student.studentInfo.studentStatus}
                                        </span>
                                        {(student.studentInfo.isNotSucceed ||
                                          student.studentInfo.isCompleted ||
                                          student.studentInfo.isLeave) && (
                                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                            Special Status
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {student.package}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {formatCurrency(student.monthlyRate)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {formatCurrency(student.dailyRate)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {student.daysWorked}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {formatCurrency(student.totalEarned)}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {student.teacherChanges ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                    >
                                      Yes
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-500">No</span>
                                  )}
                                </td>
                              </tr>

                              {/* Enhanced Student Info Row */}
                              {student.studentInfo && (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="px-4 py-4 bg-gray-50 border-b border-gray-200"
                                  >
                                    <div className="space-y-3">
                                      <div className="font-semibold text-sm text-gray-900 mb-2">
                                        📊 Student Information for{" "}
                                        {student.studentName}
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Student ID:
                                          </span>
                                          <div className="text-gray-900">
                                            {student.studentInfo.studentId}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Status:
                                          </span>
                                          <div className="text-gray-900">
                                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                              {student.studentInfo
                                                .studentStatus || "Unknown"}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Package:
                                          </span>
                                          <div className="text-gray-900">
                                            {student.studentInfo.package ||
                                              "None"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Daypackage:
                                          </span>
                                          <div className="text-gray-900">
                                            {student.studentInfo.daypackage ||
                                              "None"}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-3">
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Total Zoom Links:
                                          </span>
                                          <div className="text-gray-900">
                                            {student.studentInfo.zoomLinksTotal}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Status Reason:
                                          </span>
                                          <div className="text-gray-900 text-xs">
                                            {student.studentInfo.statusReason}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Monthly Rate:
                                          </span>
                                          <div className="text-gray-900">
                                            {formatCurrency(
                                              student.monthlyRate
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="font-medium text-gray-700">
                                            Daily Rate:
                                          </span>
                                          <div className="text-gray-900">
                                            {formatCurrency(student.dailyRate)}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-2">
                                        <span className="font-medium text-gray-700 text-xs">
                                          Zoom Link Dates:
                                        </span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(
                                            student.studentInfo.zoomLinkDates ||
                                            []
                                          ).map((date: string, idx: number) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs"
                                            >
                                              {date}
                                            </span>
                                          ))}
                                        </div>
                                      </div>

                                      {student.studentInfo &&
                                        student.studentInfo.zoomLinkDates &&
                                        student.studentInfo.zoomLinkDates
                                          .length > 0 && (
                                          <div className="mt-3 space-y-2">
                                            <span className="font-medium text-gray-700 text-xs">
                                              Zoom Link Dates:
                                            </span>
                                            {(
                                              student.studentInfo
                                                .zoomLinkDates || []
                                            ).map(
                                              (date: string, pIdx: number) => (
                                                <div
                                                  key={pIdx}
                                                  className="bg-white border border-gray-200 rounded p-2 text-xs"
                                                >
                                                  <div className="font-medium text-gray-900 mb-1">
                                                    Zoom Link Date: {date}
                                                  </div>
                                                  <div className="text-xs text-gray-600">
                                                    This zoom link was sent on{" "}
                                                    {date}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Show period breakdown for students with teacher changes */}
                    {selectedTeacher.breakdown.studentBreakdown.some(
                      (s) =>
                        s.teacherChanges &&
                        s.studentInfo &&
                        s.studentInfo.zoomLinkDates &&
                        s.studentInfo.zoomLinkDates.length > 0
                    ) && (
                      <div className="mt-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FiAlertTriangle className="w-4 h-4 text-orange-600" />
                          Teacher Change Periods
                        </h4>
                        <div className="space-y-4">
                          {(selectedTeacher.breakdown.studentBreakdown || [])
                            .filter(
                              (s) =>
                                s.teacherChanges &&
                                s.studentInfo &&
                                s.studentInfo.zoomLinkDates &&
                                s.studentInfo.zoomLinkDates.length > 0
                            )
                            .map((student, studentIndex) => (
                              <div
                                key={studentIndex}
                                className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-orange-900">
                                    {student.studentName}
                                  </h5>
                                  <div className="text-sm text-orange-700">
                                    Total: {formatCurrency(student.totalEarned)}
                                  </div>
                                </div>
                                <div className="text-xs text-orange-700 mb-3">
                                  This student had a teacher change during this
                                  period
                                </div>
                                <div className="space-y-2">
                                  {(
                                    student.studentInfo?.zoomLinkDates || []
                                  ).map((date, periodIndex) => (
                                    <div
                                      key={periodIndex}
                                      className="p-3 bg-white rounded-lg border border-orange-200"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                            Zoom Link Date
                                          </div>
                                          <span className="text-sm font-medium text-gray-700">
                                            {date}
                                          </span>
                                        </div>
                                        <div className="text-sm font-bold text-gray-900">
                                          Teaching Day
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span>Zoom link sent on {date}</span>
                                        <span>Teacher taught this student</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                                  <strong>Note:</strong> Teacher was paid for
                                  both periods as the student had a teacher
                                  change during this assignment.
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lateness Breakdown */}
                {selectedTeacher.breakdown?.latenessBreakdown &&
                  selectedTeacher.breakdown.latenessBreakdown.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Lateness Deductions
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Student
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Lateness
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Tier
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Deduction
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(
                              selectedTeacher.breakdown.latenessBreakdown || []
                            ).map((record, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {new Date(record.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {record.studentName}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {record.latenessMinutes} min
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {record.tier}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-red-600">
                                  -{formatCurrency(record.deduction)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Absence Breakdown */}
                {selectedTeacher.breakdown?.absenceBreakdown &&
                  selectedTeacher.breakdown.absenceBreakdown.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Absence Deductions
                        </h3>
                        <div className="text-sm text-gray-600">
                          {selectedTeacher.breakdown.absenceBreakdown.length}{" "}
                          absence(s) • Total: -
                          {formatCurrency(
                            selectedTeacher.breakdown.absenceBreakdown.reduce(
                              (sum, record) => sum + record.deduction,
                              0
                            )
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Student
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Package
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Reason
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Status
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Deduction
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(
                              selectedTeacher.breakdown.absenceBreakdown || []
                            ).map((record, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {new Date(record.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {record.studentName}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {record.studentPackage}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {record.reason}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {record.permitted ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      ✓ Permitted
                                    </Badge>
                                  ) : record.waived ? (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                      ✓ Waived
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800 border-red-200">
                                      ✗ Unauthorized
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-red-600">
                                  -{formatCurrency(record.deduction)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Summary */}
                {selectedTeacher.breakdown?.summary && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Summary
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">
                          Working Days
                        </div>
                        <div className="font-semibold text-gray-900">
                          {selectedTeacher.breakdown.summary.workingDaysInMonth}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Teaching Days
                        </div>
                        <div className="font-semibold text-gray-900">
                          {selectedTeacher.breakdown.summary.actualTeachingDays}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Avg Daily Earning
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(
                            selectedTeacher.breakdown.summary
                              .averageDailyEarning
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Net Salary</div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(
                            selectedTeacher.breakdown.summary.netSalary
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
