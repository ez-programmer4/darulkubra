"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiDownload,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiAward,
  FiBarChart,
  FiTarget,
  FiRefreshCw,
  FiGift,
  FiMinus,
  FiX,
  FiUsers,
  FiEye,
  FiPieChart,
} from "react-icons/fi";

type SalaryData = {
  id: string;
  name: string;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  numStudents: number;
  teachingDays: number;
  status: "Paid" | "Unpaid";
  breakdown?: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
    }>;
    summary: {
      workingDaysInMonth: number;
      actualTeachingDays: number;
      averageDailyEarning: number;
      totalDeductions: number;
      netSalary: number;
    };
  };
};

const HeaderSection = ({
  selectedMonth,
  setSelectedMonth,
  downloadSalaryReport,
  salaryData,
  user,
}: {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  downloadSalaryReport: () => void;
  salaryData: SalaryData | null;
  user: any;
}) => (
  <div className="bg-white rounded-xl shadow-lg border p-4">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-3 bg-blue-600 rounded-xl">
        <FiDollarSign className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-black">My Salary</h1>
        <p className="text-gray-600 text-sm">View salary details</p>
      </div>
    </div>
    <div className="flex gap-2 mb-4">
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 flex-1">
        <FiCalendar className="h-4 w-4 text-gray-600" />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-transparent border-none focus:outline-none text-gray-700 font-medium text-sm w-full"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const value = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
            const label = date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
      <Button
        onClick={downloadSalaryReport}
        disabled={!salaryData}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
      >
        <FiDownload className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

const SummaryCards = ({ salaryData }: { salaryData: SalaryData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <FiDollarSign className="h-5 w-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-blue-700 mb-1">Base Salary</p>
          <p className="text-xl font-bold text-blue-900">
            {salaryData.baseSalary} ETB
          </p>
        </div>
      </div>
      {salaryData.teachingDays && (
        <div className="text-xs text-blue-600">
          {salaryData.teachingDays} teaching days
        </div>
      )}
    </div>
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg border border-green-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-green-600 rounded-lg">
          <FiAward className="h-5 w-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-green-700 mb-1">
            Quality Bonuses
          </p>
          <p className="text-xl font-bold text-green-900">
            +{salaryData.bonuses || 0} ETB
          </p>
        </div>
      </div>
      <div className="text-xs text-green-600">Performance rewards</div>
    </div>
    <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl shadow-lg border border-red-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-red-600 rounded-lg">
          <FiMinus className="h-5 w-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-red-700 mb-1">
            Total Deductions
          </p>
          <p className="text-xl font-bold text-red-900">
            -{salaryData.latenessDeduction + salaryData.absenceDeduction} ETB
          </p>
        </div>
      </div>
      <div className="flex justify-between text-xs text-red-600">
        <span>Lateness: {salaryData.latenessDeduction}</span>
        <span>Absence: {salaryData.absenceDeduction}</span>
      </div>
    </div>
    <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl shadow-lg border border-purple-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-purple-600 rounded-lg">
          <FiTarget className="h-5 w-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-purple-700 mb-1">Net Salary</p>
          <p className="text-xl font-bold text-purple-900">
            {salaryData.totalSalary} ETB
          </p>
        </div>
      </div>
      <div
        className={`text-xs px-2 py-1 rounded-full text-center ${
          salaryData.status === "Paid"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {salaryData.status === "Paid" ? "✓ Paid" : "⏳ Pending"}
      </div>
    </div>
  </div>
);

const BreakdownModal = ({
  showBreakdown,
  setShowBreakdown,
  breakdownLoading,
  breakdown,
}: {
  showBreakdown: boolean;
  setShowBreakdown: (show: boolean) => void;
  breakdownLoading: boolean;
  breakdown: {
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
  };
}) =>
  showBreakdown && (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-x-4 top-4 bottom-4 bg-white rounded-2xl shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FiBarChart className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-black">
              Detailed Salary Breakdown
            </h2>
          </div>
          <button
            onClick={() => setShowBreakdown(false)}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {breakdownLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-black mb-2">
                Loading detailed breakdown...
              </p>
              <p className="text-gray-600">
                Please wait while we fetch your salary details.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enhanced Lateness Records */}
              <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-600 rounded-lg">
                      <FiClock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-900">
                        Lateness Records & Deductions
                      </h3>
                      <p className="text-sm text-red-700">
                        Detailed breakdown of late arrivals and penalties
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                      {breakdown.latenessRecords?.length || 0} incidents
                    </span>
                    <div className="text-xs text-red-600 mt-1">
                      Total: -{breakdown.latenessRecords?.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0) || 0} ETB
                    </div>
                  </div>
                </div>
                
                {/* Lateness Summary Stats */}
                {breakdown.latenessRecords?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Total Incidents</div>
                      <div className="text-lg font-bold text-red-900">{breakdown.latenessRecords.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Avg Minutes Late</div>
                      <div className="text-lg font-bold text-red-900">
                        {Math.round(breakdown.latenessRecords.reduce((sum: number, r: any) => sum + (r.latenessMinutes || 0), 0) / breakdown.latenessRecords.length)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Worst Lateness</div>
                      <div className="text-lg font-bold text-red-900">
                        {Math.max(...breakdown.latenessRecords.map((r: any) => r.latenessMinutes || 0))} min
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-red-600 mb-1">Total Deduction</div>
                      <div className="text-lg font-bold text-red-900">
                        -{breakdown.latenessRecords.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0)} ETB
                      </div>
                    </div>
                  </div>
                )}
                
                {breakdown.latenessRecords?.length === 0 ? (
                  <div className="text-center py-8">
                    <FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-medium text-lg">
                      Perfect Punctuality! 🎉
                    </p>
                    <p className="text-green-600 text-sm">
                      No lateness incidents recorded this month. Excellent work!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {breakdown.latenessRecords?.map(
                      (record: any, index: number) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg p-4 border border-red-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-mono text-sm font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                                  {format(new Date(record.classDate), "EEE, MMM dd, yyyy")}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(record.classDate), "h:mm a")}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Student:</span>
                                  <span className="ml-2 font-medium text-gray-800">{record.studentName}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Package:</span>
                                  <span className="ml-2 font-medium text-blue-600">{record.studentPackage || 'Standard'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Scheduled:</span>
                                  <span className="ml-2 font-medium text-gray-800">
                                    {record.scheduledTime ? format(new Date(record.scheduledTime), "h:mm a") : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Actual Start:</span>
                                  <span className="ml-2 font-medium text-red-600">
                                    {record.actualStartTime ? format(new Date(record.actualStartTime), "h:mm a") : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.latenessMinutes <= 5 ? 'bg-yellow-100 text-yellow-700' :
                                  record.latenessMinutes <= 15 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {record.latenessMinutes} minutes late
                                </span>
                                {record.isWaived && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    Waived
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right border-l border-red-200 pl-4">
                              <div className="mb-2">
                                <span className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-lg font-bold">
                                  -{record.deductionApplied} ETB
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-1">
                                Penalty Tier: {record.deductionTier || 'Standard'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Rate: {record.baseDeductionAmount || 'N/A'} ETB base
                              </div>
                              {record.deductionPercentage && (
                                <div className="text-xs text-red-600 font-medium">
                                  Applied: {record.deductionPercentage}%
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {record.notes && (
                            <div className="mt-3 pt-3 border-t border-red-100">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Notes:</span> {record.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
                
                {/* Lateness Summary */}
                <div className="mt-6 pt-4 border-t border-red-200 bg-white rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {breakdown.latenessRecords?.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-red-700 font-medium">Total Deduction (ETB)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {breakdown.latenessRecords?.reduce((sum: number, r: any) => sum + (r.latenessMinutes || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-orange-700 font-medium">Total Minutes Lost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {breakdown.latenessRecords?.filter((r: any) => r.isWaived).length || 0}
                      </div>
                      <div className="text-sm text-gray-700 font-medium">Waived Incidents</div>
                    </div>
                  </div>
                  
                  {breakdown.latenessRecords?.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <div className="text-sm text-red-800">
                        <strong>Impact Analysis:</strong> Your lateness incidents resulted in a total deduction of{' '}
                        <span className="font-bold">
                          {breakdown.latenessRecords.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0)} ETB
                        </span>
                        {' '}from your base salary. Consider setting earlier alarms or adjusting your schedule to improve punctuality.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Absence Records */}
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-600 rounded-lg">
                      <FiAlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-900">
                        Absence Records & Deductions
                      </h3>
                      <p className="text-sm text-yellow-700">
                        Complete absence tracking with permission status
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                      {breakdown.absenceRecords?.length || 0} days absent
                    </span>
                    <div className="text-xs text-yellow-600 mt-1">
                      Total: -{breakdown.absenceRecords?.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0) || 0} ETB
                    </div>
                  </div>
                </div>
                
                {/* Absence Summary Stats */}
                {breakdown.absenceRecords?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-yellow-600 mb-1">Total Days</div>
                      <div className="text-lg font-bold text-yellow-900">{breakdown.absenceRecords.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-green-600 mb-1">Permitted</div>
                      <div className="text-lg font-bold text-green-700">
                        {breakdown.absenceRecords.filter((r: any) => r.permitted).length}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-red-600 mb-1">Unpermitted</div>
                      <div className="text-lg font-bold text-red-700">
                        {breakdown.absenceRecords.filter((r: any) => !r.permitted).length}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-yellow-600 mb-1">Total Deduction</div>
                      <div className="text-lg font-bold text-yellow-900">
                        -{breakdown.absenceRecords.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0)} ETB
                      </div>
                    </div>
                  </div>
                )}

                {breakdown.absenceRecords?.length === 0 ? (
                  <div className="text-center py-8">
                    <FiCheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-medium text-lg">
                      Perfect Attendance! 🎆
                    </p>
                    <p className="text-green-600 text-sm">
                      No absence records for this period. Outstanding commitment!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {breakdown.absenceRecords?.map(
                      (record: any, index: number) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="font-mono text-sm font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                                  {format(new Date(record.classDate), "EEEE, MMM dd, yyyy")}
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    record.permitted
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : "bg-red-100 text-red-700 border border-red-300"
                                  }`}
                                >
                                  {record.permitted ? "✓ Permitted" : "⚠ Unpermitted"}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                  <span className="text-gray-600">Absence Type:</span>
                                  <span className="ml-2 font-medium text-gray-800">
                                    {record.timeSlots && record.timeSlots.length > 0 
                                      ? record.timeSlots.join(', ') 
                                      : 'Full Day'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Students Affected:</span>
                                  <span className="ml-2 font-medium text-blue-600">
                                    {record.packageBreakdown?.length || 'All'} students
                                  </span>
                                </div>
                                {record.permissionrequest && (
                                  <div>
                                    <span className="text-gray-600">Reason Category:</span>
                                    <span className="ml-2 font-medium text-purple-600">
                                      {record.permissionrequest.reasonCategory || 'Not specified'}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-600">Review Status:</span>
                                  <span className={`ml-2 font-medium ${
                                    record.reviewedByManager ? 'text-green-600' : 'text-orange-600'
                                  }`}>
                                    {record.reviewedByManager ? 'Manager Reviewed' : 'Pending Review'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Package Breakdown */}
                              {record.packageBreakdown && record.packageBreakdown.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-gray-700 mb-2">Affected Students by Package:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {record.packageBreakdown.map((pkg: any, pkgIndex: number) => (
                                      <div key={pkgIndex} className="bg-gray-50 rounded p-2 text-xs">
                                        <div className="font-medium text-gray-800">{pkg.package}</div>
                                        <div className="text-gray-600">
                                          Rate: {pkg.ratePerSlot} ETB × {pkg.timeSlots} slot(s) = {pkg.total} ETB
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {record.reviewNotes && (
                                <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-300">
                                  <div className="text-xs text-blue-800">
                                    <span className="font-medium">Manager Notes:</span> {record.reviewNotes}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right border-l border-yellow-200 pl-4">
                              <div className="mb-2">
                                <span className={`px-3 py-2 rounded-lg text-lg font-bold ${
                                  record.deductionApplied > 0 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {record.deductionApplied > 0 ? `-${record.deductionApplied}` : '0'} ETB
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Time Slots: {record.uniqueTimeSlots?.length || 1}</div>
                                <div>Base Rate: {record.baseRate || 'Variable'} ETB</div>
                                {record.waiverApplied && (
                                  <div className="text-green-600 font-medium">Waiver Applied</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
                
                {/* Absence Summary */}
                <div className="mt-6 pt-4 border-t border-yellow-200 bg-white rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {breakdown.absenceRecords?.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0) || 0}
                      </div>
                      <div className="text-sm text-yellow-700 font-medium">Total Deduction (ETB)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {breakdown.absenceRecords?.filter((r: any) => r.permitted).length || 0}
                      </div>
                      <div className="text-sm text-green-700 font-medium">Permitted Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {breakdown.absenceRecords?.filter((r: any) => !r.permitted).length || 0}
                      </div>
                      <div className="text-sm text-red-700 font-medium">Unpermitted Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {breakdown.absenceRecords?.reduce((sum: number, r: any) => sum + (r.uniqueTimeSlots?.length || 1), 0) || 0}
                      </div>
                      <div className="text-sm text-purple-700 font-medium">Total Time Slots</div>
                    </div>
                  </div>
                  
                  {breakdown.absenceRecords?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          <strong>Attendance Impact:</strong> You had{' '}
                          <span className="font-bold">{breakdown.absenceRecords.length} absence days</span>
                          {' '}this month, resulting in{' '}
                          <span className="font-bold">
                            {breakdown.absenceRecords.reduce((sum: number, r: any) => sum + (r.deductionApplied || 0), 0)} ETB
                          </span>
                          {' '}in deductions.
                        </div>
                      </div>
                      
                      {breakdown.absenceRecords.filter((r: any) => !r.permitted).length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-800">
                            <strong>Improvement Opportunity:</strong> You have{' '}
                            <span className="font-bold">
                              {breakdown.absenceRecords.filter((r: any) => !r.permitted).length} unpermitted absence(s)
                            </span>
                            . Consider requesting permission in advance to avoid deductions.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bonus Records */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <FiAward className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-green-900">
                    Quality Bonuses
                  </h3>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    {breakdown.bonusRecords?.length || 0} bonuses
                  </span>
                </div>
                {breakdown.bonusRecords?.length === 0 ? (
                  <div className="text-center py-8">
                    <FiGift className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">
                      No bonuses this period
                    </p>
                    <p className="text-gray-500 text-sm">
                      Keep up the great work to earn quality bonuses!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {breakdown.bonusRecords?.map(
                      (record: any, index: number) => (
                        <div
                          key={index}
                          className="bg-white rounded-lg p-4 border border-green-200 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono text-sm text-gray-600 mb-1">
                                {format(
                                  new Date(record.createdAt),
                                  "MMM dd, yyyy"
                                )}
                              </div>
                              <div className="text-sm text-gray-700 font-medium">
                                {record.reason}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                +{record.amount} ETB
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-900">
                      Total Bonuses:
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      +
                      {breakdown.bonusRecords?.reduce(
                        (sum: number, r: any) => sum + (r.amount || 0),
                        0
                      ) || 0}{" "}
                      ETB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => setShowBreakdown(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Close Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

export default function TeacherSalaryPage() {
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const router = useRouter();
  const pathname = usePathname();
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [error, setError] = useState<string | null>(null);
  const [salaryVisible, setSalaryVisible] = useState(true);
  const [checkingVisibility, setCheckingVisibility] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
  }>({ latenessRecords: [], absenceRecords: [], bonusRecords: [] });
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkSalaryVisibility();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && salaryVisible) {
      fetchSalaryData();
    }
  }, [user?.id, selectedMonth, salaryVisible]);

  async function checkSalaryVisibility() {
    try {
      setCheckingVisibility(true);
      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month);
      const from = new Date(selectedYear, monthNumber - 1, 1);
      const to = new Date(selectedYear, monthNumber, 0);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }`
      );

      if (res.status === 403) {
        setSalaryVisible(false);
      } else if (res.ok) {
        setSalaryVisible(true);
        const data = await res.json();
        setSalaryData(data);
      } else {
        setSalaryVisible(true);
        setError("Failed to load salary information. Please try again.");
      }
    } catch (error) {
      setSalaryVisible(true);
      setError("Failed to load salary information. Please try again.");
    } finally {
      setCheckingVisibility(false);
    }
  }

  async function fetchSalaryData() {
    if (!salaryVisible) return;

    try {
      setLoading(true);
      setError(null);
      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month);
      const from = new Date(selectedYear, monthNumber - 1, 1);
      const to = new Date(selectedYear, monthNumber, 0);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }`
      );

      if (res.status === 403) {
        setSalaryVisible(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch salary data");
      const data = await res.json();
      setSalaryData(data);

      toast({
        title: "Salary Data Loaded",
        description: `Salary information for ${new Date(
          selectedMonth + "-01"
        ).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })} has been loaded.`,
      });
    } catch (error) {
      setError("Failed to load salary information. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load salary information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchBreakdown() {
    if (!user?.id) return;

    setBreakdownLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const selectedYear = parseInt(year);
      const monthNumber = parseInt(month);
      const from = new Date(selectedYear, monthNumber - 1, 1);
      const to = new Date(selectedYear, monthNumber, 0);

      const res = await fetch(
        `/api/teachers/salary?from=${from.toISOString().split("T")[0]}&to=${
          to.toISOString().split("T")[0]
        }&details=true`
      );

      if (!res.ok) throw new Error("Failed to fetch breakdown");
      const data = await res.json();

      if (data.breakdown) {
        setBreakdown({
          latenessRecords: data.breakdown.latenessRecords || [],
          absenceRecords: data.breakdown.absenceRecords || [],
          bonusRecords: data.breakdown.bonusRecords || [],
        });
      }

      setShowBreakdown(true);

      toast({
        title: "Breakdown Loaded",
        description: "Detailed salary breakdown has been loaded successfully.",
      });
    } catch (error) {
      setError("Failed to load detailed breakdown.");
      toast({
        title: "Error",
        description: "Failed to load detailed breakdown. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBreakdownLoading(false);
    }
  }

  const downloadSalaryReport = () => {
    if (!salaryData) return;

    const reportContent = `
Teacher Salary Report
Month: ${new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })}
Teacher: ${user?.name} (ID: ${user?.id})

SALARY BREAKDOWN:
================
Base Salary: ${salaryData.baseSalary} ETB
Quality Bonuses: +${salaryData.bonuses} ETB
Lateness Deductions: -${salaryData.latenessDeduction} ETB
Absence Deductions: -${salaryData.absenceDeduction} ETB

FINAL SALARY: ${salaryData.totalSalary} ETB
Status: ${salaryData.status}

Additional Information:
- Number of Students: ${salaryData.numStudents}
- Payment Status: ${salaryData.status}
- Generated on: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salary_Report_${selectedMonth}_${user?.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || checkingVisibility) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        <FiAlertTriangle className="inline-block mr-2 h-6 w-6" />
        User not found or not authorized. Please contact support.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="container mx-auto p-4 space-y-4">
        <HeaderSection
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          downloadSalaryReport={downloadSalaryReport}
          salaryData={salaryData}
          user={user}
        />
        {!salaryVisible ? (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="p-4 bg-yellow-50 rounded-full w-fit mx-auto mb-4">
              <FiAlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Salary Access Restricted
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Access to salary information has been temporarily disabled.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">
                Please contact your administrator for access.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <h3 className="text-base font-bold text-black mb-2">
              Loading Salary Data
            </h3>
            <p className="text-gray-600 text-sm">Please wait...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="p-3 bg-red-50 rounded-full w-fit mx-auto mb-4">
              <FiAlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-black mb-3">
              Error Loading Data
            </h3>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <Button
              onClick={fetchSalaryData}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium"
            >
              <FiRefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : salaryData ? (
          <div className="space-y-6">
            <SummaryCards salaryData={salaryData} />
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-600 rounded-lg">
                    <FiBarChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-black">
                    Salary Breakdown
                  </h2>
                </div>
                <Button
                  onClick={() => fetchBreakdown()}
                  disabled={breakdownLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  {breakdownLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                  View Details
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiUsers className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Students
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {salaryData.numStudents}
                  </p>
                  <p className="text-xs text-gray-500">Active students</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiCalendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Teaching Days
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {salaryData.teachingDays || 0}
                  </p>
                  <p className="text-xs text-gray-500">Days with classes</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Daily Average
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {salaryData.teachingDays > 0
                      ? Math.round(
                          salaryData.baseSalary / salaryData.teachingDays
                        )
                      : 0}
                  </p>
                  <p className="text-xs text-gray-500">ETB per day</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <FiPieChart className="h-4 w-4" />
                  Salary Calculation
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800">
                      Base Salary (Daily earnings)
                    </span>
                    <span className="font-mono text-blue-900">
                      +{salaryData.baseSalary} ETB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-800">Quality Bonuses</span>
                    <span className="font-mono text-green-900">
                      +{salaryData.bonuses} ETB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-800">Lateness Deductions</span>
                    <span className="font-mono text-red-900">
                      -{salaryData.latenessDeduction} ETB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-800">Absence Deductions</span>
                    <span className="font-mono text-red-900">
                      -{salaryData.absenceDeduction} ETB
                    </span>
                  </div>
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-blue-900">Final Salary</span>
                      <span className="font-mono text-lg text-blue-900">
                        {salaryData.totalSalary} ETB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-indigo-600 rounded-xl">
                    <FiCalendar className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-black">
                    {new Date(selectedMonth + "-01").toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" }
                    )}
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {salaryData.numStudents}
                    </p>
                    <p className="text-sm text-gray-600">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {salaryData.teachingDays}
                    </p>
                    <p className="text-sm text-gray-600">Teaching Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {salaryData.latenessDeduction +
                        salaryData.absenceDeduction >
                      0
                        ? salaryData.latenessDeduction +
                          salaryData.absenceDeduction
                        : 0}
                    </p>
                    <p className="text-sm text-gray-600">Deductions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {salaryData.bonuses}
                    </p>
                    <p className="text-sm text-gray-600">Bonuses</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                  <p className="text-3xl font-bold text-indigo-900 mb-2">
                    {salaryData.totalSalary} ETB
                  </p>
                  <div className="flex items-center justify-center gap-2 text-gray-700 mb-4">
                    <FiTrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Monthly Net Salary
                    </span>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${
                      salaryData.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {salaryData.status === "Paid" ? (
                      <>
                        <FiCheckCircle className="inline h-4 w-4 mr-1" />
                        Payment Completed
                      </>
                    ) : (
                      <>
                        <FiClock className="inline h-4 w-4 mr-1" />
                        Payment Pending
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No Salary Data Available
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Salary information for{" "}
              {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}{" "}
              is not available yet.
            </p>
            <p className="text-xs text-gray-500">
              Data is available after month ends.
            </p>
          </div>
        )}
        <BreakdownModal
          showBreakdown={showBreakdown}
          setShowBreakdown={setShowBreakdown}
          breakdownLoading={breakdownLoading}
          breakdown={breakdown}
        />
      </div>
    </div>
  );
}