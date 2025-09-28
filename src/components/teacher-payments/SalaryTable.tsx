"use client";

import { useState, useMemo } from "react";
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
  FiDownload,
  FiRefreshCw,
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
import { Tooltip } from "@/components/Tooltip";

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
  breakdown: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
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
}: SalaryTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
        !teacher.name.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (statusFilter && teacher.status !== statusFilter) {
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
  }, [data, search, statusFilter, salaryRangeFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSelectTeacher = (teacherId: string) => {
    const newSelected = new Set(selectedTeachers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedTeachers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTeachers.size === filteredData.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(filteredData.map((t) => t.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedTeachers.size === 0) return;
    onBulkAction(action, Array.from(selectedTeachers));
  };

  const getStatusBadge = (status: "Paid" | "Unpaid") => {
    return (
      <Badge
        variant={status === "Paid" ? "default" : "secondary"}
        className={`flex items-center gap-1 ${
          status === "Paid"
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
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
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <FiChevronUp className="w-4 h-4" />
    ) : (
      <FiChevronDown className="w-4 h-4" />
    );
  };

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
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
          >
            <FiFilter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <FiDownload className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
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
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedTeachers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedTeachers.size} teacher(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleBulkAction("mark-paid")}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("mark-unpaid")}
              >
                Mark as Unpaid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedTeachers(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedTeachers.size === filteredData.length &&
                      filteredData.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Teacher
                    {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("totalSalary")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Total Salary
                    {getSortIcon("totalSalary")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("baseSalary")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Base Salary
                    {getSortIcon("baseSalary")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("latenessDeduction")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Lateness
                    {getSortIcon("latenessDeduction")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("absenceDeduction")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Absence
                    {getSortIcon("absenceDeduction")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("bonuses")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Bonuses
                    {getSortIcon("bonuses")}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {getSortIcon("status")}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Actions</th>
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
                    className="hover:bg-gray-50 cursor-pointer"
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
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-700">
                            {teacher.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {teacher.name}
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
                        onClick={() => onTeacherSelect(teacher)}
                      >
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Teachers</div>
              <div className="font-medium">{filteredData.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Salary</div>
              <div className="font-medium">
                {currencyFormatter.format(
                  filteredData.reduce((sum, t) => sum + t.totalSalary, 0)
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Paid</div>
              <div className="font-medium text-green-600">
                {filteredData.filter((t) => t.status === "Paid").length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Unpaid</div>
              <div className="font-medium text-yellow-600">
                {filteredData.filter((t) => t.status === "Unpaid").length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

