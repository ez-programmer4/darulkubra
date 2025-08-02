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
  payment_status?: "pending" | "approved" | "rejected";
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
  month: string;
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
  const [newMonthlyPayment, setNewMonthlyPayment] = useState({
    month: "",
    amount: 0,
    calculatedAmount: 0,
    paymentType: "full" as "full" | "partial",
  });
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

  // Add useEffect to calculate amount when month or payment type changes
  useEffect(() => {
    if (student && newMonthlyPayment.month && newMonthlyPayment.paymentType) {
      const calculatedAmount = calculateMonthlyAmount(
        newMonthlyPayment.month,
        student.startdate,
        student.classfee
      );
      setNewMonthlyPayment((prev) => ({
        ...prev,
        calculatedAmount,
      }));
    }
  }, [student, newMonthlyPayment.month, newMonthlyPayment.paymentType]);

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
        payment.payment_status === "approved"
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

  // Add this function to check if a month is fully covered by prizes
  const isMonthFullyCoveredByPrizes = (month: string): boolean => {
    if (!student) return false;

    const monthPayment = monthlyPayments.find(
      (payment) =>
        payment.month === month &&
        payment.is_free_month &&
        payment.payment_status === "approved"
    );

    return !!monthPayment;
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
        month: currentMonth,
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
    if (!newMonthlyPayment.month || !student) {
      toast.error("Please select a month");
      return;
    }
    // Guard: Ensure student and student.wdt_ID are present
    if (!student || (!student.id && !student.wdt_ID)) {
      toast.error("Student not loaded. Please try again.");
      return;
    }

    // Calculate current remaining balance
    const currentBalance = calculateRemainingBalance();

    // Get the calculated amount for the selected month
    const calculatedAmount = calculateMonthlyAmount(
      newMonthlyPayment.month,
      student.startdate,
      student.classfee
    );

    // Check if the new payment would result in a negative balance
    const newBalance = currentBalance - calculatedAmount;
    if (newBalance < 0) {
      toast.error(
        `Insufficient balance. Adding this payment (${calculatedAmount.toFixed(
          2
        )}) would result in a balance of ${newBalance.toFixed(
          2
        )}. Please add a deposit first.`
      );
      return;
    }

    try {
      // Check if there's a full prize (free month) for this month
      const existingFullPrize = monthlyPayments.find(
        (payment) =>
          payment.month === newMonthlyPayment.month &&
          payment.payment_type === "free"
      );

      if (existingFullPrize) {
        toast.error("This month is fully covered by a prize");
        return;
      }

      // Check if there's a partial prize for this month
      const existingPartialPrize = monthlyPayments.find(
        (payment) =>
          payment.month === newMonthlyPayment.month &&
          payment.payment_type === "prizepartial"
      );

      // Use the calculated prorated amount
      const amount = newMonthlyPayment.calculatedAmount;

      // Determine payment type based on amount and existing prizes
      let paymentType = "full";
      if (existingPartialPrize) {
        paymentType = "partial";
      } else if (amount < student.classfee) {
        paymentType = "partial";
      }

      const studentId = student.wdt_ID || student.id;
      const payload = {
        studentId,
        month: newMonthlyPayment.month,
        paidAmount: amount.toFixed(2),
        paymentStatus: "approved",
        payment_type: paymentType,
      };
      const response = await fetch("/api/payments/monthly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit monthly payment");
      }

      toast.success("Monthly payment submitted successfully");
      setShowMonthlyModal(false);
      setNewMonthlyPayment({
        month: "",
        amount: 0,
        calculatedAmount: 0,
        paymentType: "full",
      });
      fetchPayments();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit monthly payment"
      );
    }
  };

  // Add a helper to check if a month is already paid (full or partial)
  const isMonthPaid = (month: string): boolean => {
    return monthlyPayments.some(
      (payment) =>
        payment.month === month &&
        ["full", "partial"].includes(payment.payment_type) &&
        payment.payment_status === "approved"
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
        paymentStatus: "approved",
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
            paymentStatus: "approved",
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

    // Calculate total from approved monthly payments (excluding free months and prize-related partials)
    const totalApprovedPayments = monthlyPayments.reduce((sum, payment) => {
      if (
        payment.payment_status === "approved" &&
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

    const balance = totalApprovedDeposits - totalApprovedPayments;
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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage payments for {student?.name || "Student"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => router.push("/controller")}
            className="group flex items-center gap-1 px-4 py-2 bg-blue-600 text-white hover:text-gray-900 transition-colors duration-200 rounded-md hover:bg-gray-300 w-full sm:w-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            Back to Students
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              toast.success("Export functionality coming soon!");
            }}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
            aria-label="Download payment report as PDF"
          >
            <FiDownload size={18} />
            Export PDF
          </motion.button>
        </div>
      </div>
      <main className="space-y-6 sm:space-y-8">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                <FiDollarSign className="text-blue-500" size={20} />
                Payment Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="text-sm text-gray-600">Total Deposits</p>
                  <p className="text-2xl font-bold text-blue-700">
                    $
                    {formatAmount(
                      deposits
                        .filter((deposit) => deposit.status === "approved")
                        .reduce(
                          (sum, deposit) =>
                            sum +
                            (typeof deposit.paidamount === "string"
                              ? parseFloat(deposit.paidamount) || 0
                              : deposit.paidamount || 0),
                          0
                        )
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {
                      deposits.filter(
                        (deposit) => deposit.status === "approved"
                      ).length
                    }{" "}
                    deposit
                    {deposits.filter((deposit) => deposit.status === "approved")
                      .length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <p className="text-sm text-gray-600">Monthly Payments</p>
                  <p className="text-2xl font-bold text-green-700">
                    $
                    {formatAmount(
                      monthlyPayments
                        .filter(
                          (payment) =>
                            payment.payment_status === "approved" &&
                            payment.payment_type !== "free" &&
                            (payment.payment_type === "full" ||
                              (payment.payment_type === "partial" &&
                                !payment.reason?.includes("prize")))
                        )
                        .reduce(
                          (sum, payment) => sum + getPaymentAmount(payment),
                          0
                        )
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {
                      monthlyPayments.filter(
                        (p) =>
                          p.payment_status === "approved" &&
                          p.payment_type !== "free"
                      ).length
                    }{" "}
                    payment
                    {monthlyPayments.filter(
                      (p) =>
                        p.payment_status === "approved" &&
                        p.payment_type !== "free"
                    ).length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <p className="text-sm text-gray-600">Remaining Balance</p>
                  <p className="text-2xl font-bold text-purple-700">
                    $
                    {formatAmount(
                      deposits
                        .filter((deposit) => deposit.status === "approved")
                        .reduce(
                          (sum, deposit) =>
                            sum +
                            (typeof deposit.paidamount === "string"
                              ? parseFloat(deposit.paidamount) || 0
                              : deposit.paidamount || 0),
                          0
                        ) -
                        monthlyPayments
                          .filter(
                            (payment) =>
                              payment.payment_status === "approved" &&
                              payment.payment_type !== "free" &&
                              (payment.payment_type === "full" ||
                                (payment.payment_type === "partial" &&
                                  !payment.reason?.includes("prize")))
                          )
                          .reduce(
                            (sum, payment) => sum + getPaymentAmount(payment),
                            0
                          )
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Available for future payments
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Monthly Fee</p>
                  <p className="font-semibold text-gray-900">
                    ${student?.classfee ? student.classfee.toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-semibold text-gray-900">
                    {student?.startdate
                      ? (() => {
                          try {
                            const date = new Date(student.startdate);
                            return isNaN(date.getTime())
                              ? "Invalid date"
                              : format(date, "MMM d, yyyy");
                          } catch {
                            return "Invalid date";
                          }
                        })()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
                <FiPlus className="text-indigo-500" size={20} /> Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowDepositModal(true);
                    setNewDeposit({
                      amount: "",
                      reason: "",
                      transactionId: "",
                      senderName: "",
                    });
                    setDepositErrors({});
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 border border-blue-200"
                >
                  <FiDollarSign className="text-blue-500" size={18} />
                  <span className="text-sm font-medium text-blue-700">
                    Deposit
                  </span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowMonthlyModal(true);
                    setNewMonthlyPayment({
                      month: "",
                      amount: 0,
                      calculatedAmount: 0,
                      paymentType: "full",
                    });
                    setMonthlyError(null);
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-300 border border-green-200"
                >
                  <FiCalendar className="text-green-500" size={18} />
                  <span className="text-sm font-medium text-green-700">
                    Monthly
                  </span>
                </motion.button>
                <button
                  onClick={handlePrizeClick}
                  className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-300 border border-purple-200"
                  title="Add Prize"
                >
                  <FiGift size={20} className="text-purple-500" />
                  <span className="text-sm font-medium text-purple-700">
                    Prize
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
              <FiCalendar className="text-indigo-500" size={20} />
              Payment Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 flex items-center gap-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Total Monthly Payments
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    $
                    {formatAmount(
                      monthlyPayments
                        .filter(
                          (payment) =>
                            payment.payment_status === "approved" &&
                            (payment.payment_type === "full" ||
                              (payment.payment_type === "partial" &&
                                !payment.reason?.includes("prize")))
                        )
                        .reduce(
                          (sum, payment) => sum + getPaymentAmount(payment),
                          0
                        )
                    )}
                  </p>
                </div>
              </div>
              <div className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 flex items-center gap-4">
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <FiClock className="text-yellow-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Months</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {
                      monthlyPayments.filter(
                        (p) => p.payment_status === "pending"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-4 sm:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-6">
            <div className="flex border-b border-gray-200 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("deposits")}
                className={`px-6 py-3 text-base font-semibold flex items-center gap-3 relative ${
                  activeTab === "deposits"
                    ? "text-blue-700"
                    : "text-gray-600 hover:text-blue-700"
                } transition-all duration-300 group`}
                aria-label="View deposit history"
                aria-current={activeTab === "deposits" ? "true" : "false"}
              >
                <FiDollarSign className="transition-transform duration-300 group-hover:scale-110" />
                Deposit History
                {activeTab === "deposits" && (
                  <motion.span
                    layoutId="tabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.6,
                    }}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("monthly")}
                className={`px-6 py-3 text-base font-semibold flex items-center gap-3 relative ${
                  activeTab === "monthly"
                    ? "text-blue-700"
                    : "text-gray-600 hover:text-blue-700"
                } transition-all duration-300 group`}
                aria-label="View monthly payment history"
                aria-current={activeTab === "monthly" ? "true" : "false"}
              >
                <FiCalendar className="transition-transform duration-300 group-hover:scale-110" />
                Monthly History
                {activeTab === "monthly" && (
                  <motion.span
                    layoutId="tabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.6,
                    }}
                  />
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-sm text-gray-600">
                Total Records:{" "}
                {activeTab === "deposits"
                  ? deposits.length
                  : activeTab === "monthly"
                  ? monthlyPayments.length
                  : deposits.length}
              </div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="text-sm text-gray-600">
                Last Updated: {format(new Date(), "MMM d, yyyy HH:mm")}
              </div>
            </div>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-md overflow-hidden"
          >
            {activeTab === "deposits" && (
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          $
                          {typeof deposit.paidamount === "number"
                            ? deposit.paidamount.toFixed(2)
                            : parseFloat(
                                deposit.paidamount?.toString() || "0"
                              ).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {deposit.reason}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(deposit.paymentdate)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            deposit.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : deposit.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {deposit.status.charAt(0).toUpperCase() +
                            deposit.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "monthly" && (
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
                <div className="overflow-x-auto">
                  <table className="min-w-[600px] w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Month
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(
                        monthlyPayments.reduce((acc, payment) => {
                          const month = payment.month;
                          if (!acc[month]) {
                            acc[month] = {
                              month,
                              total: 0,
                              status: payment.payment_status,
                              type: payment.payment_type,
                              hasPrize: false,
                              prizeAmount: 0,
                            };
                          }

                          if (payment.payment_type === "prizepartial") {
                            acc[month].hasPrize = true;
                            acc[month].prizeAmount = getPaymentAmount(payment);
                          } else if (payment.payment_type === "partial") {
                            acc[month].total += getPaymentAmount(payment);
                          } else if (payment.payment_type === "full") {
                            acc[month].total = getPaymentAmount(payment);
                          }

                          return acc;
                        }, {} as Record<string, MonthPaymentData>)
                      ).map((entry) => {
                        const [month, data] = entry as [
                          string,
                          MonthPaymentData
                        ];
                        return (
                          <tr key={month} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatPaymentMonth(month)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${data.total.toFixed(2)}
                              {data.hasPrize && (
                                <span className="ml-2 text-xs text-purple-600">
                                  (includes ${data.prizeAmount.toFixed(2)}{" "}
                                  prize)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  data.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : data.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {data.status.charAt(0).toUpperCase() +
                                  data.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {data.type.charAt(0).toUpperCase() +
                                data.type.slice(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </section>

        <AnimatePresence>
          {showDepositModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-2 sm:p-8 max-w-full sm:max-w-2xl w-full mx-2 sm:mx-4 shadow-2xl border border-gray-200 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4 sm:gap-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl">
                      <FiDollarSign className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Add Deposit
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Add a new deposit for the student
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDepositModal(false);
                      setNewDeposit({
                        amount: "",
                        reason: "",
                        transactionId: "",
                        senderName: "",
                      });
                      setDepositErrors({});
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiX size={24} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          name="amount"
                          value={newDeposit.amount}
                          onChange={(e) => {
                            const updatedValue = e.target.value
                              .replace("$", "")
                              .trim();
                            setNewDeposit((prev) => ({
                              ...prev,
                              amount: updatedValue,
                            }));
                            if (
                              depositErrors[
                                e.target.name as keyof typeof depositErrors
                              ]
                            ) {
                              setDepositErrors((prev) => ({
                                ...prev,
                                [e.target.name]: undefined,
                              }));
                            }
                          }}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                          className={`w-full pl-8 pr-4 py-3 rounded-xl border ${
                            depositErrors.amount
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          } transition-all`}
                        />
                      </div>
                      {depositErrors.amount && (
                        <p className="mt-2 text-sm text-red-600">
                          {depositErrors.amount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="reason"
                        value={newDeposit.reason}
                        onChange={(e) => {
                          const updatedValue = e.target.value;
                          setNewDeposit((prev) => ({
                            ...prev,
                            reason: updatedValue,
                          }));
                          if (
                            depositErrors[
                              e.target.name as keyof typeof depositErrors
                            ]
                          ) {
                            setDepositErrors((prev) => ({
                              ...prev,
                              [e.target.name]: undefined,
                            }));
                          }
                        }}
                        placeholder="Enter deposit reason"
                        required
                        className={`w-full px-4 py-3 rounded-xl border ${
                          depositErrors.reason
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } transition-all`}
                      />
                      {depositErrors.reason && (
                        <p className="mt-2 text-sm text-red-600">
                          {depositErrors.reason}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="transactionId"
                        value={newDeposit.transactionId}
                        onChange={(e) => {
                          const updatedValue = e.target.value;
                          setNewDeposit((prev) => ({
                            ...prev,
                            transactionId: updatedValue,
                          }));
                          if (
                            depositErrors[
                              e.target.name as keyof typeof depositErrors
                            ]
                          ) {
                            setDepositErrors((prev) => ({
                              ...prev,
                              [e.target.name]: undefined,
                            }));
                          }
                        }}
                        placeholder="Enter transaction ID"
                        required
                        className={`w-full px-4 py-3 rounded-xl border ${
                          depositErrors.transactionId
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        } transition-all`}
                      />
                      {depositErrors.transactionId && (
                        <p className="mt-2 text-sm text-red-600">
                          {depositErrors.transactionId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Deposit Summary
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Student Name
                          </span>
                          <span className="font-medium text-gray-900">
                            {student?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Current Balance
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {(
                              deposits.reduce((sum, deposit) => {
                                // Only count approved deposits
                                if (deposit.status === "approved") {
                                  const amount =
                                    typeof deposit.paidamount === "number"
                                      ? deposit.paidamount
                                      : parseFloat(
                                          deposit.paidamount?.toString() || "0"
                                        );
                                  return sum + amount;
                                }
                                return sum;
                              }, 0) -
                              monthlyPayments.reduce((sum, payment) => {
                                if (payment.payment_status === "approved") {
                                  return (
                                    sum +
                                    (parseFloat(
                                      payment.paid_amount?.toString() || "0"
                                    ) || 0)
                                  );
                                }
                                return sum;
                              }, 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            New Balance
                          </span>
                          <span className="font-medium text-blue-600">
                            $
                            {(
                              deposits.reduce((sum, deposit) => {
                                // Only count approved deposits
                                if (deposit.status === "approved") {
                                  const amount =
                                    typeof deposit.paidamount === "number"
                                      ? deposit.paidamount
                                      : parseFloat(
                                          deposit.paidamount?.toString() || "0"
                                        );
                                  return sum + amount;
                                }
                                return sum;
                              }, 0) + parseFloat(newDeposit.amount)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total Deposits
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {(
                              deposits.reduce((sum, deposit) => {
                                // Only count approved deposits
                                if (deposit.status === "approved") {
                                  const amount =
                                    typeof deposit.paidamount === "number"
                                      ? deposit.paidamount
                                      : parseFloat(
                                          deposit.paidamount?.toString() || "0"
                                        );
                                  return sum + amount;
                                }
                                return sum;
                              }, 0) + parseFloat(newDeposit.amount)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-700 mb-4 flex items-center gap-2">
                        <FiInfo size={16} /> Deposit Information
                      </h4>
                      <ul className="space-y-3 text-sm text-blue-600">
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>
                            Deposits are added to the student's balance
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>Transaction ID must be unique</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>Balance can be used for monthly payments</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 w-full">
                  <button
                    onClick={() => {
                      setShowDepositModal(false);
                      setNewDeposit({
                        amount: "",
                        reason: "",
                        transactionId: "",
                        senderName: "",
                      });
                      setDepositErrors({});
                    }}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDepositSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <FiRefreshCw className="animate-spin" size={18} />{" "}
                        Adding...
                      </>
                    ) : (
                      <>
                        <FiDollarSign size={18} /> Add Deposit
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showMonthlyModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-2 sm:p-8 max-w-full sm:max-w-2xl w-full mx-2 sm:mx-4 shadow-2xl border border-gray-200 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4 sm:gap-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl">
                      <FiCalendar className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Add Monthly Payment
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Process a monthly payment for the student
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMonthlyModal(false);
                      setNewMonthlyPayment({
                        month: "",
                        amount: 0,
                        calculatedAmount: 0,
                        paymentType: "full",
                      });
                      setMonthlyError(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiX size={24} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                      </label>
                      <input
                        type="month"
                        value={newMonthlyPayment.month}
                        onChange={(e) => {
                          const selectedMonth = e.target.value;
                          if (student) {
                            const startDate = new Date(student.startdate);
                            const minMonth = `${startDate.getFullYear()}-${String(
                              startDate.getMonth() + 1
                            ).padStart(2, "0")}`;

                            // Convert selected month to Date object for comparison
                            const selectedDate = new Date(
                              selectedMonth + "-01"
                            );
                            const minDate = new Date(minMonth + "-01");

                            // Only allow selection if the month is >= start month
                            if (selectedDate >= minDate) {
                              if (isMonthFullyCoveredByPrizes(selectedMonth)) {
                                toast.error(
                                  "This month is fully covered by prizes"
                                );
                                return;
                              }
                              const calculatedAmount = calculateMonthlyAmount(
                                selectedMonth,
                                student.startdate,
                                student.classfee
                              );
                              setNewMonthlyPayment((prev) => ({
                                ...prev,
                                month: selectedMonth,
                                calculatedAmount,
                                paymentType:
                                  calculatedAmount === student.classfee
                                    ? "full"
                                    : "partial",
                              }));
                            } else {
                              toast.error(
                                `Please select a month starting from ${format(
                                  new Date(minMonth + "-01"),
                                  "MMMM yyyy"
                                )}`
                              );
                            }
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={
                          student
                            ? `${new Date(
                                student.startdate
                              ).getFullYear()}-${String(
                                new Date(student.startdate).getMonth() + 1
                              ).padStart(2, "0")}`
                            : undefined
                        }
                      />
                      {newMonthlyPayment.month && (
                        <div className="mt-2">
                          {(() => {
                            const monthPayment = monthlyPayments.find(
                              (payment) =>
                                payment.month === newMonthlyPayment.month &&
                                payment.is_free_month
                            );
                            if (monthPayment) {
                              return (
                                <div className="text-sm text-purple-600">
                                  {monthPayment.free_month_reason}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calculated Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          value={
                            newMonthlyPayment.calculatedAmount?.toFixed(2) ||
                            "0.00"
                          }
                          readOnly
                          className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-medium"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {newMonthlyPayment.calculatedAmount === 0
                          ? "No payment required for this month"
                          : newMonthlyPayment.calculatedAmount ===
                            student?.classfee
                          ? "Full month payment"
                          : "Prorated payment based on start date"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Payment Summary
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Student Name
                          </span>
                          <span className="font-medium text-gray-900">
                            {student?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Monthly Fee
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {student?.classfee
                              ? student.classfee.toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Current Balance
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {(
                              deposits.reduce((sum, deposit) => {
                                // Only count approved deposits
                                if (deposit.status === "approved") {
                                  const amount =
                                    typeof deposit.paidamount === "number"
                                      ? deposit.paidamount
                                      : parseFloat(
                                          deposit.paidamount?.toString() || "0"
                                        );
                                  return sum + amount;
                                }
                                return sum;
                              }, 0) -
                              monthlyPayments.reduce((sum, payment) => {
                                if (payment.payment_status === "approved") {
                                  return (
                                    sum +
                                    (parseFloat(
                                      payment.paid_amount?.toString() || "0"
                                    ) || 0)
                                  );
                                }
                                return sum;
                              }, 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Balance After Payment
                          </span>
                          <span className="font-medium text-green-600">
                            $
                            {(
                              deposits.reduce((sum, deposit) => {
                                // Only count approved deposits
                                if (deposit.status === "approved") {
                                  const amount =
                                    typeof deposit.paidamount === "number"
                                      ? deposit.paidamount
                                      : parseFloat(
                                          deposit.paidamount?.toString() || "0"
                                        );
                                  return sum + amount;
                                }
                                return sum;
                              }, 0) - newMonthlyPayment.calculatedAmount
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                      <h4 className="text-sm font-medium text-green-700 mb-4 flex items-center gap-2">
                        <FiInfo size={16} />
                        Payment Information
                      </h4>
                      <ul className="space-y-3 text-sm text-green-600">
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>
                            Payment will be deducted from student's balance
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>Amount is prorated for partial months</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>Previous months must be paid first</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 w-full">
                  <button
                    onClick={() => {
                      setShowMonthlyModal(false);
                      setNewMonthlyPayment({
                        month: "",
                        amount: 0,
                        calculatedAmount: 0,
                        paymentType: "full",
                      });
                      setMonthlyError(null);
                    }}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMonthlySubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-800 text-white hover:from-green-700 hover:to-green-900 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <FiRefreshCw className="animate-spin" size={18} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiCalendar size={18} />
                        Add Payment
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showPrizeModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-2 sm:p-8 max-w-full sm:max-w-2xl w-full mx-2 sm:mx-4 shadow-2xl border border-gray-200 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4 sm:gap-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl">
                      <FiGift className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Add Prize
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Add a prize for the student
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePrize}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiX size={24} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Month <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="month"
                        value={newPrize.month || ""}
                        onChange={(e) => {
                          const selectedMonth = e.target.value;
                          if (student) {
                            const startDate = new Date(student.startdate);
                            const minMonth = `${startDate.getFullYear()}-${String(
                              startDate.getMonth() + 1
                            ).padStart(2, "0")}`;
                            const selectedDate = new Date(
                              selectedMonth + "-01"
                            );
                            const minDate = new Date(minMonth + "-01");
                            if (selectedDate >= minDate) {
                              if (isMonthPaid(selectedMonth)) {
                                toast.error(
                                  "Cannot add a prize for a paid month."
                                );
                                return;
                              }
                              setNewPrize((prev) => ({
                                ...prev,
                                month: selectedMonth,
                              }));
                            } else {
                              toast.error(
                                `Please select a month starting from ${format(
                                  new Date(minMonth + "-01"),
                                  "MMMM yyyy"
                                )}`
                              );
                            }
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min={
                          student
                            ? `${new Date(
                                student.startdate
                              ).getFullYear()}-${String(
                                new Date(student.startdate).getMonth() + 1
                              ).padStart(2, "0")}`
                            : undefined
                        }
                        disabled={isMonthPaid(newPrize.month)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Percentage <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={newPrize.percentage || 0}
                          onChange={(e) =>
                            setNewPrize((prev) => ({
                              ...prev,
                              percentage: parseInt(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-sm text-gray-500">0%</span>
                          <span className="text-sm font-medium text-purple-600">
                            {newPrize.percentage || 0}%
                          </span>
                          <span className="text-sm text-gray-500">100%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={newPrize.reason || ""}
                        onChange={(e) =>
                          setNewPrize((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        placeholder="Enter reason for the prize (e.g., free month)"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Prize Summary
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Student Name
                          </span>
                          <span className="font-medium text-gray-900">
                            {student?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Monthly Fee
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {student?.classfee
                              ? student.classfee.toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Prize Amount
                          </span>
                          <span className="font-medium text-purple-600">
                            $
                            {student?.classfee
                              ? (
                                  (student.classfee *
                                    (newPrize.percentage || 0)) /
                                  100
                                ).toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                      <h4 className="text-sm font-medium text-purple-700 mb-4 flex items-center gap-2">
                        <FiInfo size={16} />
                        Prize Information
                      </h4>
                      <ul className="space-y-3 text-sm text-purple-600">
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>
                            Prize is calculated as a percentage of monthly fee
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>
                            Prize will be applied to the selected month
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>
                            Reason is optional for 100% prize (free month)
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 w-full">
                  <button
                    onClick={handleClosePrize}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrizeSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:from-purple-700 hover:to-purple-900 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <FiRefreshCw className="animate-spin" size={18} />
                        Adding...
                      </>
                    ) : (
                      <>
                        <FiGift size={18} />
                        Add Prize
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {selectedDeposit && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-4 sm:p-8 max-w-lg sm:max-w-2xl w-full mx-2 sm:mx-4 shadow-2xl border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl">
                      <FiDollarSign className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {"transactionid" in selectedDeposit
                          ? "Deposit Details"
                          : "Payment Details"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {"transactionid" in selectedDeposit
                          ? `Transaction ID: ${selectedDeposit.transactionid}`
                          : `Month: ${selectedDeposit.month}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDeposit(null)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <FiX size={24} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        {"transactionid" in selectedDeposit
                          ? "Transaction Information"
                          : "Payment Information"}
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Amount</span>
                          <span className="font-bold text-blue-700 text-xl">
                            ${formatAmount(getPaymentAmount(selectedDeposit))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Date</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(getPaymentDate(selectedDeposit))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Month</span>
                          <span className="font-medium text-gray-900">
                            {formatPaymentMonth(
                              getPaymentMonth(selectedDeposit)
                            )}
                          </span>
                        </div>
                        {"sendername" in selectedDeposit && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Sender
                            </span>
                            <span className="font-medium text-gray-900">
                              {selectedDeposit.sendername}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {"reason" in selectedDeposit && selectedDeposit.reason && (
                      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-700 mb-4 flex items-center gap-2">
                          <FiInfo size={16} />
                          Reason
                        </h4>
                        <p className="text-sm text-blue-600">
                          {selectedDeposit.reason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Student Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Student Name
                          </span>
                          <span className="font-medium text-gray-900">
                            {student?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Student ID
                          </span>
                          <span className="font-medium text-gray-900">
                            {student?.id || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Monthly Fee
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {student?.classfee
                              ? student.classfee.toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                      <h4 className="text-sm font-medium text-green-700 mb-4 flex items-center gap-2">
                        <FiInfo size={16} />
                        Impact on Balance
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Current Balance
                          </span>
                          <span className="font-medium text-gray-900">
                            ${calculateRemainingBalance().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total Deposits
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {deposits
                              .reduce((sum, deposit) => {
                                if (deposit.status === "approved") {
                                  const amount =
                                    typeof deposit.paidamount === "number"
                                      ? deposit.paidamount
                                      : parseFloat(
                                          deposit.paidamount?.toString() || "0"
                                        );
                                  return sum + amount;
                                }
                                return sum;
                              }, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total Payments
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {monthlyPayments
                              .reduce((sum, payment) => {
                                if (payment.payment_status === "approved") {
                                  return (
                                    sum +
                                    (parseFloat(
                                      payment.paid_amount?.toString() || "0"
                                    ) || 0)
                                  );
                                }
                                return sum;
                              }, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 w-full">
                  <button
                    onClick={() => setSelectedDeposit(null)}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      toast.success("Export functionality coming soon!");
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <FiDownload size={18} />
                    Export Details
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
