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
      value: payments.filter((p) => p.status === "approved").length,
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
        .filter((p) => p.status === "approved")
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
  const PIE_COLORS = ["#0088FE", "#FFBB28", "#FF8042"];

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
    <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
      {/* Statistics Cards and Charts */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="text-gray-500">Total Payments</div>
          <div className="text-2xl font-bold">{payments.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-gray-500">Approved Amount</div>
          <div className="text-2xl font-bold">${statusAmounts[0].value}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-gray-500">Pending Amount</div>
          <div className="text-2xl font-bold">${statusAmounts[1].value}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-gray-500">Rejected Amount</div>
          <div className="text-2xl font-bold">${statusAmounts[2].value}</div>
        </div>
      </div>
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            Payments by Status
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            Payments Amount by Status
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusAmounts}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {statusAmounts.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center mb-6 gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-4">
          <div className="relative w-full sm:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 text-xs sm:text-base"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <FiFilter className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-lg bg-gray-50 w-full sm:w-40 text-xs sm:text-base"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[220px] justify-start text-left font-normal"
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
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full text-xs sm:text-sm">
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
              paginatedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 text-indigo-700 font-semibold hover:underline cursor-pointer">
                    {payment.studentname}
                  </td>
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
      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-2">
        <p className="text-sm text-indigo-700 font-semibold">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border-2 border-indigo-200 rounded-full bg-white text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all"
          >
            &lt;
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border-2 border-indigo-200 rounded-full bg-white text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all"
          >
            &gt;
          </button>
        </div>
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
