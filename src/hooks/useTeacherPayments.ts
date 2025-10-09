import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";

export interface TeacherSalaryData {
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

export interface PaymentDetails {
  latenessRecords: any[];
  absenceRecords: any[];
  bonusRecords: any[];
  unmatchedZoomLinks?: any[];
  salaryData: TeacherSalaryData;
}

export interface PaymentStatistics {
  totalTeachers: number;
  paidTeachers: number;
  unpaidTeachers: number;
  totalSalary: number;
  totalDeductions: number;
  totalBonuses: number;
  averageSalary: number;
  paymentRate: number;
}

export interface UseTeacherPaymentsOptions {
  startDate: string;
  endDate: string;
  teacherId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useTeacherPayments({
  startDate,
  endDate,
  teacherId,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
}: UseTeacherPaymentsOptions) {
  const [data, setData] = useState<TeacherSalaryData[]>([]);
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(
    async (clearCache = false) => {
      if (!startDate || !endDate) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          _t: Date.now().toString(), // Cache busting parameter
        });

        if (teacherId) {
          params.append("teacherId", teacherId);
        }

        // Add clearCache parameter if requested
        if (clearCache) {
          params.append("clearCache", "true");
        }

        const response = await fetch(`/api/admin/teacher-payments?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch data");
        }

        const result = await response.json();
        setData(Array.isArray(result) ? result : [result]);
        setLastUpdated(new Date());
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, teacherId]
  );

  const fetchDetails = useCallback(
    async (teacherId: string, clearCache = false) => {
      if (!startDate || !endDate) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          teacherId,
          details: "true",
          _t: Date.now().toString(), // Cache busting parameter
        });

        // Add clearCache parameter if requested
        if (clearCache) {
          params.append("clearCache", "true");
        }

        const response = await fetch(`/api/admin/teacher-payments?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch details");
        }

        const result = await response.json();
        setDetails(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate]
  );

  const fetchStatistics = useCallback(async () => {
    if (!startDate || !endDate) return;

    try {
      const response = await fetch(
        `/api/admin/teacher-payments/statistics?startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch statistics");
      }

      const result = await response.json();
      setStatistics(result);
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    }
  }, [startDate, endDate]);

  const updatePaymentStatus = useCallback(
    async (
      teacherId: string,
      period: string,
      status: "Paid" | "Unpaid",
      totalSalary: number,
      latenessDeduction: number,
      absenceDeduction: number,
      bonuses: number,
      processPaymentNow: boolean = false
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/teacher-payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teacherId,
            period,
            status,
            totalSalary,
            latenessDeduction,
            absenceDeduction,
            bonuses,
            processPaymentNow,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to update payment status"
          );
        }

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Success",
            description: `Payment status updated to ${status}`,
          });

          // Refresh data
          await fetchData();
          await fetchStatistics();
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchData, fetchStatistics]
  );

  const bulkUpdatePaymentStatus = useCallback(
    async (teacherIds: string[], status: "Paid" | "Unpaid") => {
      setLoading(true);
      setError(null);

      try {
        const promises = teacherIds.map(async (teacherId) => {
          const teacher = data.find((t) => t.id === teacherId);
          if (!teacher) return;

          const period = `${new Date(startDate).getFullYear()}-${String(
            new Date(startDate).getMonth() + 1
          ).padStart(2, "0")}`;

          return updatePaymentStatus(
            teacherId,
            period,
            status,
            teacher.totalSalary,
            teacher.latenessDeduction,
            teacher.absenceDeduction,
            teacher.bonuses
          );
        });

        await Promise.all(promises);

        toast({
          title: "Success",
          description: `Updated ${teacherIds.length} payment(s) to ${status}`,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [data, startDate, updatePaymentStatus]
  );

  const exportData = useCallback(
    async (format: "csv" | "excel" = "csv") => {
      try {
        const response = await fetch(
          `/api/admin/teacher-payments/export?startDate=${startDate}&endDate=${endDate}&format=${format}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to export data");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `teacher-payments-${startDate}-to-${endDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Success",
          description: "Data exported successfully",
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [startDate, endDate]
  );

  const refresh = useCallback(
    async (clearCache = false) => {
      await fetchData(clearCache);
      await fetchStatistics();
    },
    [fetchData, fetchStatistics]
  );

  const refreshWithCacheClear = useCallback(async () => {
    await refresh(true);
  }, [refresh]);

  // Auto-refresh effect - reduced frequency to prevent excessive API calls
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      // Only refresh if the page is visible and user is active
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          fetchData();
        }
      };

      const interval = setInterval(() => {
        // Only refresh if page is visible and user hasn't been idle
        if (document.visibilityState === "visible") {
          fetchData();
        }
      }, Math.max(refreshInterval, 60000)); // Minimum 1 minute between refreshes

      // Listen for page visibility changes
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
    fetchStatistics();
  }, [fetchData, fetchStatistics]);

  return {
    data,
    details,
    statistics,
    loading,
    error,
    lastUpdated,
    fetchData,
    fetchDetails,
    fetchStatistics,
    updatePaymentStatus,
    bulkUpdatePaymentStatus,
    exportData,
    refresh,
    refreshWithCacheClear,
  };
}
