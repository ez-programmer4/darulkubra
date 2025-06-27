"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiFilter,
  FiSearch,
  FiEye,
  FiXCircle,
} from "react-icons/fi";
import { Decimal } from "@prisma/client/runtime/library";
import { useDebounce } from "use-debounce";
import Modal from "@/app/components/Modal";

interface Payment {
  id: number;
  studentid: number;
  studentname: string;
  paymentdate: string;
  paidamount: Decimal;
  transactionid: string;
  reason: string;
  status: string;
  sendername: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<
    string,
    { icon: React.ReactNode; className: string }
  > = {
    pending: { icon: <FiClock />, className: "bg-yellow-100 text-yellow-800" },
    approved: {
      icon: <FiCheckCircle />,
      className: "bg-green-100 text-green-800",
    },
    rejected: { icon: <FiAlertCircle />, className: "bg-red-100 text-red-800" },
  };
  const style = statusStyles[status.toLowerCase()] || {
    icon: <FiAlertCircle />,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${style.className}`}
    >
      {style.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function PaymentManagementPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  // Modals
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: debouncedSearchQuery,
      });
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPayments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearchQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updatePaymentStatus = async (
    id: number,
    status: "approved" | "rejected"
  ) => {
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${status} payment`);
      }
      fetchPayments(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openDetailsModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-lg bg-gray-50"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Transaction ID
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  Loading payments...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-red-500">
                  Error: {error}
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4">{payment.studentname}</td>
                  <td className="px-6 py-4">
                    ${payment.paidamount.toString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(payment.paymentdate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-4">{payment.transactionid}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    {payment.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            updatePaymentStatus(payment.id, "approved")
                          }
                          className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                          title="Approve"
                        >
                          <FiCheckCircle />
                        </button>
                        <button
                          onClick={() =>
                            updatePaymentStatus(payment.id, "rejected")
                          }
                          className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                          title="Reject"
                        >
                          <FiXCircle />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openDetailsModal(payment)}
                      className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      >
        {selectedPayment && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Payment Details</h2>
            <div className="space-y-2">
              <p>
                <strong>Student:</strong> {selectedPayment.studentname}
              </p>
              <p>
                <strong>Amount:</strong> $
                {selectedPayment.paidamount.toString()}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedPayment.paymentdate).toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <StatusBadge status={selectedPayment.status} />
              </p>
              <p>
                <strong>Transaction ID:</strong> {selectedPayment.transactionid}
              </p>
              <p>
                <strong>Sender:</strong> {selectedPayment.sendername}
              </p>
              <p>
                <strong>Reason:</strong> {selectedPayment.reason}
              </p>
            </div>
            <div className="text-right mt-6">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
