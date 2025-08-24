"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { prisma } from "@/lib/prisma";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  format,
  differenceInMonths,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  addDays,
  isFirstDayOfMonth,
  parseISO,
  addMonths,
  isValid,
  getDaysInMonth,
} from "date-fns";
import {
  FiDollarSign,
  FiCalendar,
  FiAlertCircle,
  FiCheckCircle,
  FiPlus,
  FiCreditCard,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiClock,
  FiUser,
  FiInfo,
  FiGift,
  FiAward,
  FiLoader,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface Payment {
  id: number;
  studentid: number;
  studentname: string;
  amount: number;
  paidamount: number | string;
  reason: string;
  transactionid: string;
  sendername: string;
  paymentdate: string;
  status: string;
  month?: string;
  payment_type?: "full" | "partial" | "free";
  payment_status?: "pending" | "Paid" | "rejected";
}

interface MonthlyPayment {
  id: number;
  studentid: number;
  month: string;
  paid_amount: number | string;
  payment_status: string;
  payment_type: string;
  start_date: string | null;
  end_date: string | null;
  paymentdate?: string;
  is_free_month?: boolean;
  free_month_reason?: string;
}

interface Student {
  id: number;
  name: string;
  startdate: string;
  classfee: number;
  registrationdate: string;
  wdt_ID?: number;
}

interface User {
  username: string;
  name: string;
  role: string;
}

interface PaymentManagementProps {
  studentId: number;
  user: { name: string; username: string; role: string } | null;
}

interface MonthlyPaymentForm {
  months: string[];
  amount: number;
  calculatedAmount: number;
  paymentType: "full" | "partial";
}

interface MonthPaymentData {
  month: string;
  total: number;
  status: string;
  type: string;
  hasPrize: boolean;
  prizeAmount: number;
  expectedAmount: number;
  shortfall: number;
  isPaid: boolean;
}

interface MonthTotal {
  total: number;
  hasPrize: boolean;
}

// Add Skeleton component
const PaymentSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-4 mb-6">
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        {/* Payment Cards Skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-3 w-48 bg-gray-200 rounded"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PaymentManagement({
  studentId,
  user,
}: PaymentManagementProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"deposits" | "monthly">(
    "deposits"
  );
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDeposit, setNewDeposit] = useState({
    amount: "",
    reason: "",
    transactionId: "",
    senderName: "",
  });
  const [depositErrors, setDepositErrors] = useState<{
    [key: string]: string | undefined;
  }>({});
  const [newMonthlyPayment, setNewMonthlyPayment] =
    useState<MonthlyPaymentForm>({
      months: [format(new Date(), "yyyy-MM")],
      amount: 0,
      calculatedAmount: 0,
      paymentType: "full" as "full" | "partial",
    });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<
    Payment | MonthlyPayment | null
  >(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [newPrize, setNewPrize] = useState({
    month: "",
    percentage: 0,
    reason: "",
  });
  const [prizeErrors, setPrizeErrors] = useState<{
    [key: string]: string | undefined;
  }>({});

  // Single source of truth for data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch student data
        const studentResponse = await fetch(`/api/students/${studentId}`, {
          credentials: "include",
        });
        if (!studentResponse.ok) {
          throw new Error("Failed to fetch student data");
        }
        const studentData = await studentResponse.json();
        setStudent(studentData);

        // Fetch deposits
        const depositsResponse = await fetch(
          `/api/payments/deposit?studentId=${studentId}`,
          {
            credentials: "include",
          }
        );
        if (!depositsResponse.ok) {
          throw new Error("Failed to fetch deposits");
        }
        const depositsData = await depositsResponse.json();
        setDeposits(depositsData);

        // Fetch monthly payments
        const monthlyResponse = await fetch(
          `/api/payments/monthly?studentId=${studentId}`,
          {
            credentials: "include",
          }
        );
        if (!monthlyResponse.ok) {
          throw new Error("Failed to fetch monthly payments");
        }
        const monthlyData = await monthlyResponse.json();
        setMonthlyPayments(monthlyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        if (
          err instanceof Error &&
          err.message.includes("Failed to fetch student data")
        ) {
          router.push("/students"); // Redirect to students list if student not found
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchData();
    }
  }, [studentId, router]);

  // Debug logging for user role
  useEffect(() => {}, [user]);

  // Generate available months (current and next 11 months)
  useEffect(() => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + i,
        1
      );
      months.push(format(monthDate, "yyyy-MM"));
    }
    setAvailableMonths(months);
  }, []);

  // Calculate total amount when months change
  useEffect(() => {
    if (
      student &&
      newMonthlyPayment.months &&
      newMonthlyPayment.months.length > 0
    ) {
      const totalAmount = newMonthlyPayment.months.reduce((sum, month) => {
        return (
          sum +
          calculateMonthlyAmount(month, student.startdate, student.classfee)
        );
      }, 0);
      setNewMonthlyPayment((prev) => ({
        ...prev,
        calculatedAmount: totalAmount,
      }));
    }
  }, [student, newMonthlyPayment.months]);

  // Calculate prorated amount based on start date and selected month
  const calculateMonthlyAmount = (
    selectedMonth: string,
    studentStartDate: string,
    classFee: number
  ): number => {
    if (!selectedMonth || !studentStartDate || !classFee) return 0;

    const selectedDate = new Date(selectedMonth + "-01");
    const startDate = new Date(studentStartDate);

    // Set both dates to start of day for accurate comparison
    selectedDate.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    // If selected month is before student's start date, return 0
    if (
      selectedDate.getFullYear() < startDate.getFullYear() ||
      (selectedDate.getFullYear() === startDate.getFullYear() &&
        selectedDate.getMonth() < startDate.getMonth())
    ) {
      return 0;
    }

    // Check if month is already marked as free
    const isFreeMonth = monthlyPayments.some(
      (payment) =>
        payment.month === selectedMonth &&
        payment.payment_type === "free" &&
        payment.payment_status === "Paid"
    );

    if (isFreeMonth) {
      return 0;
    }

    // If student started on the first day of the month, it's a full payment
    if (
      startDate.getDate() === 1 &&
      startDate.getMonth() === selectedDate.getMonth() &&
      startDate.getFullYear() === selectedDate.getFullYear()
    ) {
      return classFee;
    }

    // Calculate prorated amount for the selected month only
    const daysInMonth = getDaysInMonth(selectedDate);
    const daysFromStart = Math.min(
      differenceInDays(endOfMonth(selectedDate), startDate) + 1,
      daysInMonth
    );
    const proratedAmount = (classFee * daysFromStart) / daysInMonth;
    const finalAmount = Number(proratedAmount.toFixed(2));

    return finalAmount;
  };

  // Enhanced function to check if a month is fully covered by prizes or payments
  const isMonthFullyCoveredByPrizes = (month: string): boolean => {
    if (!student) return false;

    const monthPayment = monthlyPayments.find(
      (payment) =>
        payment.month === month &&
        payment.is_free_month &&
        payment.payment_status === "Paid"
    );

    return !!monthPayment;
  };

  // Enhanced function to check month payment status
  const getMonthPaymentStatus = (month: string): {
    isPaid: boolean;
    isFree: boolean;
    hasPartialPrize: boolean;
    totalPaid: number;
    expectedAmount: number;
    shortfall: number;
    paymentType: string;
  } => {
    if (!student) {
      return {
        isPaid: false,
        isFree: false,
        hasPartialPrize: false,
        totalPaid: 0,
        expectedAmount: 0,
        shortfall: 0,
        paymentType: 'none'
      };
    }

    const monthPayments = monthlyPayments.filter(p => p.month === month);
    const expectedAmount = calculateMonthlyAmount(month, student.startdate, student.classfee);
    const totalPaid = monthPayments.reduce((sum, p) => sum + (typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(p.paid_amount?.toString() || '0')), 0);
    
    const isFree = monthPayments.some(p => p.payment_type === 'free' && p.payment_status === 'Paid');
    const hasPartialPrize = monthPayments.some(p => p.payment_type === 'prizepartial');
    const hasFullPayment = monthPayments.some(p => p.payment_type === 'full' && p.payment_status === 'Paid');
    const hasPartialPayment = monthPayments.some(p => p.payment_type === 'partial' && p.payment_status === 'Paid');
    
    const isPaid = isFree || hasFullPayment || (hasPartialPrize && hasPartialPayment) || (totalPaid >= expectedAmount - 0.01);
    const shortfall = Math.max(0, expectedAmount - totalPaid);
    
    let paymentType = 'none';
    if (isFree) paymentType = 'free';
    else if (hasFullPayment) paymentType = 'full';
    else if (hasPartialPrize && hasPartialPayment) paymentType = 'partial_with_prize';
    else if (hasPartialPayment) paymentType = 'partial';
    else if (hasPartialPrize) paymentType = 'prize_only';
    
    return {
      isPaid,
      isFree,
      hasPartialPrize,
      totalPaid,
      expectedAmount,
      shortfall,
      paymentType
    };
  };

  // Function to get unpaid months before a target month
  const getUnpaidMonthsBefore = (targetMonth: string): string[] => {
    if (!student) return [];
    
    const unpaidMonths = [];
    const startDate = new Date(student.startdate);
    const targetDate = new Date(targetMonth + '-01');
    
    let checkDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (checkDate < targetDate) {
      const monthStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
      const status = getMonthPaymentStatus(monthStr);
      
      if (status.expectedAmount > 0 && !status.isPaid) {
        unpaidMonths.push(monthStr);
      }
      
      checkDate.setMonth(checkDate.getMonth() + 1);
    }
    
    return unpaidMonths;
  };

  // Set current month as default when component mounts
  useEffect(() => {
    if (student && student.classfee) {
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, "0")}`;
      const calculatedAmount = calculateMonthlyAmount(
        currentMonth,
        student.startdate,
        student.classfee
      );
      setNewMonthlyPayment({
        months: [currentMonth],
        amount: 0,
        calculatedAmount,
        paymentType: calculatedAmount === student.classfee ? "full" : "partial",
      });
    }
  }, [student?.id, student?.classfee, student?.startdate]); // More specific dependencies

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    if (!newDeposit.amount || !newDeposit.transactionId) {
      setDepositErrors({
        amount: !newDeposit.amount ? "Amount is required" : undefined,
        transactionId: !newDeposit.transactionId
          ? "Transaction ID is required"
          : undefined,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: studentId,
          amount: parseFloat(newDeposit.amount),
          reason: "deposit",
          transactionId: newDeposit.transactionId,
          status: "pending",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit deposit");
      }

      // Fetch updated deposits after successful submission
      const updatedDepositsResponse = await fetch(
        `/api/payments/deposit?studentId=${studentId}`
      );

      if (!updatedDepositsResponse.ok) {
        throw new Error("Failed to fetch updated deposits");
      }

      const updatedDeposits = await updatedDepositsResponse.json();
      setDeposits(updatedDeposits);

      // Reset form and close modal
      setNewDeposit({
        amount: "",
        reason: "",
        transactionId: "",
        senderName: "",
      });
      setShowDepositModal(false);
      setDepositErrors({});

      // Show success message
      toast.success("Deposit added successfully!");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to submit deposit"
      );
      toast.error("Failed to add deposit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMonthlySubmit = async () => {
    if (!newMonthlyPayment.months?.length || !student) {
      toast.error("Please select at least one month");
      return;
    }

    if (!student || (!student.id && !student.wdt_ID)) {
      toast.error("Student not loaded. Please try again.");
      return;
    }

    const currentBalance = calculateRemainingBalance();
    const totalAmount = newMonthlyPayment.calculatedAmount;

    if (currentBalance < totalAmount) {
      toast.error(
        `Insufficient balance. Total payment ($${totalAmount.toFixed(
          2
        )}) exceeds available balance of $${currentBalance.toFixed(
          2
        )}. Please add a deposit first.`
      );
      return;
    }

    setIsSubmitting(true);
    setMonthlyError(null);

    try {
      const studentId = student.wdt_ID || student.id;
      const processedMonths = [];
      const failedMonths = [];

      // Process each selected month with enhanced error handling
      for (const month of newMonthlyPayment.months) {
        const monthAmount = calculateMonthlyAmount(
          month,
          student.startdate,
          student.classfee
        );

        if (monthAmount > 0) {
          const payload = {
            studentId,
            month,
            paidAmount: monthAmount.toFixed(2),
            paymentStatus: "Paid",
            payment_type: monthAmount === student.classfee ? "full" : "partial",
          };

          try {
            const response = await fetch("/api/payments/monthly", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const error = await response.json();
              
              // Enhanced error handling with specific messages
              if (error.unpaidMonths) {
                const unpaidList = error.unpaidMonths
                  .map((m: any) => `${m.month} (shortfall: $${m.shortfall})`)
                  .join(", ");
                throw new Error(
                  `${error.error}\n\nUnpaid months: ${unpaidList}\n\nTip: Add prizes or partial payments for previous months first.`
                );
              }
              
              throw new Error(
                error.error || `Failed to submit payment for ${month}`
              );
            }
            
            processedMonths.push(month);
          } catch (monthError) {
            failedMonths.push({ month, error: monthError });
            console.error(`Failed to process month ${month}:`, monthError);
          }
        }
      }

      // Show results
      if (processedMonths.length > 0) {
        toast.success(
          `Successfully processed ${processedMonths.length} month(s): ${processedMonths.join(", ")}`
        );
      }
      
      if (failedMonths.length > 0) {
        const firstError = failedMonths[0].error;
        setMonthlyError(
          firstError instanceof Error 
            ? firstError.message 
            : `Failed to process ${failedMonths.length} month(s)`
        );
        
        // Don't close modal if there were failures
        if (processedMonths.length === 0) {
          return;
        }
      }

      // Close modal and reset form only if at least some payments succeeded
      if (processedMonths.length > 0) {
        setShowMonthlyModal(false);
        setNewMonthlyPayment({
          months: [format(new Date(), "yyyy-MM")],
          amount: 0,
          calculatedAmount: 0,
          paymentType: "full",
        });
        fetchPayments();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit monthly payments";
      setMonthlyError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a helper to check if a month is already paid (full or partial)
  const isMonthPaid = (month: string): boolean => {
    return monthlyPayments.some(
      (payment) =>
        payment.month === month &&
        ["full", "partial"].includes(payment.payment_type) &&
        payment.payment_status === "Paid"
    );
  };

  const handlePrizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newPrize.month && isMonthPaid(newPrize.month)) {
      toast.error("Cannot add a prize for a paid month.");
      return;
    }
    setShowPrizeModal(true);
  };

  const handleClosePrize = () => {
    setShowPrizeModal(false);
    setNewPrize({
      month: "",
      percentage: 0,
      reason: "",
    });
    setPrizeErrors({});
  };

  const calculatePrizeAmount = (percentage: number) => {
    if (!student) return 0;

    // Calculate the base amount for the prize
    let baseAmount = student.classfee;

    // Check if this is the first month (prorated)
    if (newPrize.month && student.startdate) {
      const [year, month] = newPrize.month.split("-").map(Number);
      const isFirstMonth =
        year === new Date(student.startdate).getFullYear() &&
        month - 1 === new Date(student.startdate).getMonth();

      if (isFirstMonth) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthEnd = new Date(year, month, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const startDate = new Date(student.startdate);
        startDate.setHours(0, 0, 0, 0);

        const daysFromStart = Math.min(
          differenceInDays(monthEnd, startDate) + 1,
          daysInMonth
        );

        baseAmount = (student.classfee * daysFromStart) / daysInMonth;
        baseAmount = Number(baseAmount.toFixed(2));
      }
    }

    return (baseAmount * percentage) / 100;
  };

  const handlePrizeSubmit = async () => {
    if (!student) return;
    if (newPrize.month && isMonthPaid(newPrize.month)) {
      toast.error("Cannot add a prize for a paid month.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Debug: Log initial state
      // Validate required fields
      if (!newPrize.month) {
        toast.error("Month is required");
        return;
      }

      // Only require reason if percentage is less than 100
      if (newPrize.percentage < 100 && !newPrize.reason) {
        toast.error("Reason is required for partial prizes");
        return;
      }

      // Validate percentage
      if (
        typeof newPrize.percentage !== "number" ||
        newPrize.percentage < 0 ||
        newPrize.percentage > 100
      ) {
        toast.error("Percentage must be between 0 and 100");
        return;
      }

      const isFullPrize = newPrize.percentage === 100;

      // Debug: Log validation result
      // Calculate the base amount for the prize
      let baseAmount = student.classfee;

      // Check if this is the first month (prorated)
      const [year, month] = newPrize.month.split("-").map(Number);
      const isFirstMonth =
        student.startdate &&
        year === new Date(student.startdate).getFullYear() &&
        month - 1 === new Date(student.startdate).getMonth();

      if (isFirstMonth && student.startdate) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthEnd = new Date(year, month, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const startDate = new Date(student.startdate);
        startDate.setHours(0, 0, 0, 0);

        const daysFromStart = Math.min(
          differenceInDays(monthEnd, startDate) + 1,
          daysInMonth
        );

        baseAmount = (student.classfee * daysFromStart) / daysInMonth;
        baseAmount = Number(baseAmount.toFixed(2));
      }

      const prizeAmount = (baseAmount * newPrize.percentage) / 100;

      // Debug: Log calculated amounts
      // Use correct studentId
      const studentId = student.wdt_ID || student.id;

      // Construct payload dynamically
      const payload = {
        studentId,
        month: newPrize.month,
        paidAmount: isFullPrize ? 0 : prizeAmount.toFixed(2),
        paymentStatus: "Paid",
        payment_type: isFullPrize ? "free" : "prizepartial",
        free_month_reason: isFullPrize
          ? "Full prize"
          : `Partial prize (${newPrize.percentage}%)`,
        is_free_month: isFullPrize,
      };

      // Add free_month_reason only for full prize
      if (isFullPrize) {
        payload.free_month_reason = newPrize.reason || "";
        payload.is_free_month = true;
      }

      // Debug: Log final payload
      // Submit the prize
      const prizeResponse = await fetch("/api/payments/monthly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!prizeResponse.ok) {
        const error = await prizeResponse.json();
        throw new Error(error.error || "Failed to submit prize");
      }

      // If it's a partial prize, automatically submit the remaining payment
      if (!isFullPrize) {
        const remainingAmount = baseAmount - prizeAmount;

        const remainingResponse = await fetch("/api/payments/monthly", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId,
            month: newPrize.month,
            paidAmount: remainingAmount.toFixed(2),
            paymentStatus: "Paid",
            payment_type: "partial",
            reason: `Remaining payment after ${newPrize.percentage}% prize`,
          }),
        });

        if (!remainingResponse.ok) {
          const error = await remainingResponse.json();
          throw new Error(error.error || "Failed to submit remaining payment");
        }
      }

      toast.success("Prize submitted successfully");
      setShowPrizeModal(false);
      setNewPrize({ month: "", reason: "", percentage: 0 });
      fetchPayments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit prize"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  // Add this function to calculate remaining balance
  const calculateRemainingBalance = () => {
    if (!student) return 0;

    // Calculate total from approved deposits only
    const totalApprovedDeposits = deposits.reduce((sum, deposit) => {
      if (deposit.status === "approved") {
        const amount =
          typeof deposit.paidamount === "number"
            ? deposit.paidamount
            : parseFloat(deposit.paidamount?.toString() || "0");
        return sum + amount;
      }
      return sum;
    }, 0);

    // Calculate total from paid monthly payments (excluding free months and prize-related partials)
    const totalPaidPayments = monthlyPayments.reduce((sum, payment) => {
      if (
        payment.payment_status === "Paid" &&
        payment.payment_type !== "free" &&
        (payment.payment_type === "full" ||
          (payment.payment_type === "partial" &&
            !payment.reason?.includes("prize")))
      ) {
        const amount =
          typeof payment.paid_amount === "number"
            ? payment.paid_amount
            : parseFloat(payment.paid_amount?.toString() || "0");
        return sum + amount;
      }
      return sum;
    }, 0);

    const balance = totalApprovedDeposits - totalPaidPayments;
    return balance;
  };
  const formatAmount = (amount: number | string): string => {
    if (amount === undefined || amount === null) return "0.00";
    const numAmount =
      typeof amount === "string" ? parseFloat(amount) || 0 : amount;
    return numAmount.toFixed(2);
  };

  const getPaymentAmount = (payment: Payment | MonthlyPayment): number => {
    if (!payment) return 0;
    if ("paidamount" in payment) {
      return typeof payment.paidamount === "string"
        ? parseFloat(payment.paidamount) || 0
        : payment.paidamount;
    }
    return typeof payment.paid_amount === "string"
      ? parseFloat(payment.paid_amount) || 0
      : payment.paid_amount;
  };

  const getPaymentDate = (
    payment: Payment | MonthlyPayment
  ): string | undefined => {
    if (!payment) return undefined;
    if ("paymentdate" in payment) {
      return payment.paymentdate;
    }
    if ("start_date" in payment) {
      return payment.start_date || undefined;
    }
    return undefined;
  };

  const getPaymentMonth = (
    payment: Payment | MonthlyPayment
  ): string | undefined => {
    if (!payment) return undefined;
    if ("month" in payment) {
      return payment.month;
    }
    return undefined;
  };

  const formatDate = (date: string | undefined | null): string => {
    if (!date) return "N/A";
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return "Invalid date";
      }
      return format(parsedDate, "MMMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatPaymentMonth = (month: string | undefined | null): string => {
    if (!month) return "N/A";
    try {
      const parsedDate = new Date(month + "-01");
      if (isNaN(parsedDate.getTime())) {
        return "Invalid month";
      }
      return format(parsedDate, "MMMM yyyy");
    } catch (error) {
      return "Invalid month";
    }
  };

  const fetchPayments = async () => {
    if (!student) return;
    setIsLoading(true);
    try {
      const studentId = student.wdt_ID || student.id;
      const [monthlyResponse, depositsResponse] = await Promise.all([
        fetch(`/api/payments/monthly?studentId=${studentId}`),
        fetch(`/api/payments/deposit?studentId=${studentId}`),
      ]);

      if (!monthlyResponse.ok || !depositsResponse.ok) {
        throw new Error("Failed to fetch payments");
      }

      const [monthlyData, depositsData] = await Promise.all<[any[], any[]]>([
        monthlyResponse.json(),
        depositsResponse.json(),
      ]);

      setMonthlyPayments(monthlyData);
      setDeposits(depositsData);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch payments"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <PaymentSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push("/controller")}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">
            Student Not Found
          </h2>
          <p className="text-yellow-600">
            The requested student could not be found.
          </p>
          <button
            onClick={() => router.push("/controller")}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }
