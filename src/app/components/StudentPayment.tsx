"use client";

import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { format } from "date-fns";

interface Student {
  id: number;
  name: string;
  phoneno: string;
  classfee: number;
  startdate: string;
  control: string;
  status: string;
  ustaz: string;
  package: string;
  subject: string;
  country: string;
  rigistral: string;
  daypackages: string;
  isTrained: boolean;
  refer: string;
  registrationdate: string;
  selectedTime: string;
  teacher: {
    ustazname: string;
  };
  progress: string;
  chatId: string | null;
}

interface StudentPaymentProps {
  student: Student;
  onClose: () => void;
  onUpdate: (student: Student) => void;
}

export default function StudentPayment({
  student,
  onClose,
  onUpdate,
}: StudentPaymentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    months: [format(new Date(), "yyyy-MM")],
    amount: student.classfee.toString(),
    transactionId: "",
  });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Generate available months (current and next 11 months)
  useEffect(() => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      months.push(format(monthDate, "yyyy-MM"));
    }
    setAvailableMonths(months);
  }, []);

  // Calculate total amount when months change
  useEffect(() => {
    const totalAmount = paymentData.months.length * student.classfee;
    setPaymentData(prev => ({ ...prev, amount: totalAmount.toString() }));
  }, [paymentData.months, student.classfee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentData.months.length === 0) {
      setError("Please select at least one month");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/students/${student.id}/payments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          months: paymentData.months,
          amount: paymentData.amount,
          transactionId: paymentData.transactionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit payment");
      }

      const updatedStudent = await response.json();
      onUpdate(updatedStudent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Payment for {student.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Months ({paymentData.months.length} selected)
              </label>
              <div className="grid grid-cols-3 gap-2 p-4 border border-gray-300 rounded-xl bg-gray-50 max-h-48 overflow-y-auto">
                {availableMonths.map((month) => {
                  const monthDate = new Date(month + "-01");
                  const monthName = monthDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  });
                  const isSelected = paymentData.months.includes(month);
                  
                  return (
                    <label key={month} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPaymentData(prev => ({
                              ...prev,
                              months: [...prev.months, month].sort()
                            }));
                          } else {
                            setPaymentData(prev => ({
                              ...prev,
                              months: prev.months.filter(m => m !== month)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{monthName}</span>
                    </label>
                  );
                })}
              </div>
              {paymentData.months.length === 0 && (
                <p className="text-sm text-red-600 mt-1">Please select at least one month</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, amount: e.target.value })
                  }
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>Monthly fee: ${student.classfee}</p>
                <p>Selected months: {paymentData.months.length}</p>
                <p>Calculated total: ${(paymentData.months.length * student.classfee).toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                value={paymentData.transactionId}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    transactionId: e.target.value,
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
