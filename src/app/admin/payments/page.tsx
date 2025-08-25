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
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { Decimal } from "@prisma/client/runtime/library";
import { useDebounce } from "use-debounce";
import Modal from "@/app/components/Modal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
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

// Currency formatters
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

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
    className: "bg-blue-100 text-blue-800",
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
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      if (date?.from) params.append("startDate", date.from.toISOString());
      if (date?.to) params.append("endDate", date.to.toISOString());
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPayments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearchQuery, date]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Pagination logic
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics for charts
  const statusCounts = [
    {
      name: "Approved",
      value: payments.filter((p) => p.status === "Approved").length,
    },
    {
      name: "Pending",
      value: payments.filter((p) => p.status === "pending").length,
    },
    {
      name: "Rejected",
      value: payments.filter((p) => p.status === "rejected").length,
    },
  ];
  const statusAmounts = [
    {
      name: "Approved",
      value: payments
        .filter((p) => p.status === "Approved")
        .reduce((sum, p) => sum + Number(p.paidamount), 0),
    },
    {
      name: "Pending",
      value: payments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + Number(p.paidamount), 0),
    },
    {
      name: "Rejected",
      value: payments
        .filter((p) => p.status === "rejected")
        .reduce((sum, p) => sum + Number(p.paidamount), 0),
    },
  ];
  const PIE_COLORS = ["#000000", "#6b7280", "#9ca3af"];

  const updatePaymentStatus = async (
    id: number,
    status: "Approved" | "rejected"
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiDollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Payment Management
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Monitor and manage student payment transactions
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto w-full">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiUsers className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Total</span>
                </div>
                <div className="text-2xl font-bold text-black">{payments.length}</div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiCheckCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Approved</span>
                </div>
                <div className="text-2xl font-bold text-black truncate" title={currencyFormatter.format(statusAmounts[0].value)}>
                  {compactCurrencyFormatter.format(statusAmounts[0].value)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiClock className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Pending</span>
                </div>
                <div className="text-2xl font-bold text-black truncate" title={currencyFormatter.format(statusAmounts[1].value)}>
                  {compactCurrencyFormatter.format(statusAmounts[1].value)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiXCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600">Rejected</span>
                </div>
                <div className="text-2xl font-bold text-black truncate" title={currencyFormatter.format(statusAmounts[2].value)}>
                  {compactCurrencyFormatter.format(statusAmounts[2].value)}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Payments
                </label>
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiCalendar className="inline h-4 w-4 mr-2" />
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base text-left">
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </button>
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
              </div>
              <div className="lg:col-span-2">
                <button
                  onClick={() => setDate(undefined)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiTrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Payments by Status</h2>
                  <p className="text-gray-600">Count distribution</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#4b5563" />
                  <YAxis allowDecimals={false} stroke="#4b5563" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#000000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiDollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Amount by Status</h2>
                  <p className="text-gray-600">Financial distribution</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusAmounts}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#000000"
                  >
                    {statusAmounts.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => currencyFormatter.format(Number(value as number))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Payment Transactions</h2>
                <p className="text-gray-600">Manage payment approvals and rejections</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 lg:p-10">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
                <p className="text-black font-medium text-lg">Loading payments...</p>
                <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
                  <FiAlertCircle className="h-16 w-16 text-red-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">Error Loading Payments</h3>
                <p className="text-red-600 text-xl">{error}</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                  <FiDollarSign className="h-16 w-16 text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-black mb-4">No Payments Found</h3>
                <p className="text-gray-600 text-xl">No payment transactions match your current filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-black uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedPayments.map((payment, index) => (
                        <tr
                          key={payment.id}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-6 py-4 text-black font-semibold">
                            {payment.studentname}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {currencyFormatter.format(Number(payment.paidamount))}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {new Date(payment.paymentdate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={payment.status} />
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-mono text-xs break-all whitespace-pre-wrap max-w-xs">
                            {payment.transactionid}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {payment.status === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      updatePaymentStatus(payment.id, "Approved")
                                    }
                                    className="p-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all hover:scale-105"
                                    title="Approve"
                                  >
                                    <FiCheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      updatePaymentStatus(payment.id, "rejected")
                                    }
                                    className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all hover:scale-105"
                                    title="Reject"
                                  >
                                    <FiXCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openDetailsModal(payment)}
                                className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all hover:scale-105"
                                title="View Details"
                              >
                                <FiEye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                  <p className="text-lg font-semibold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <FiChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Details Modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        >
          {selectedPayment && (
            <div className="bg-white rounded-3xl p-8 max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-black rounded-xl">
                  <FiDollarSign className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-black">Payment Details</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Student</label>
                    <p className="text-lg font-bold text-black">{selectedPayment.studentname}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Amount</label>
                    <p className="text-lg font-bold text-black">{currencyFormatter.format(Number(selectedPayment.paidamount))}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Date</label>
                    <p className="text-lg text-gray-700">{new Date(selectedPayment.paymentdate).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Status</label>
                    <StatusBadge status={selectedPayment.status} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Transaction ID</label>
                    <p className="text-lg font-mono text-gray-700 bg-gray-50 p-3 rounded-xl break-all whitespace-pre-wrap">{selectedPayment.transactionid}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Sender</label>
                    <p className="text-lg text-gray-700">{selectedPayment.sendername}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Reason</label>
                    <p className="text-lg text-gray-700">{selectedPayment.reason}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}