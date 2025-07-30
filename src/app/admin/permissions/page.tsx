"use client";
import { useEffect, useState, useRef } from "react";
import {
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiBell,
  FiSend,
  FiUser,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiDownload,
} from "react-icons/fi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import JSConfetti from "js-confetti";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminPermissionsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({
    status: "Approved",
    reviewNotes: "",
    lateReviewReason: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const confettiRef = useRef<JSConfetti | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: string;
    message: string;
  } | null>(null);

  // Permission Reasons Section
  const [permissionReasons, setPermissionReasons] = useState<
    { id: number; reason: string }[]
  >([]);
  const [newReason, setNewReason] = useState("");
  const [savingReasons, setSavingReasons] = useState(false);
  const [reasonsError, setReasonsError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReasons() {
      try {
        const res = await fetch("/api/admin/permission-reasons");
        if (!res.ok) throw new Error("Failed to fetch permission reasons");
        const data = await res.json();
        setPermissionReasons(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setReasonsError(e.message || "Failed to load reasons");
      }
    }
    fetchReasons();
  }, []);

  async function addReason() {
    if (
      !newReason.trim() ||
      permissionReasons.some((r) => r.reason === newReason.trim())
    )
      return;
    setSavingReasons(true);
    setReasonsError(null);
    try {
      const res = await fetch("/api/admin/permission-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: newReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add reason");
      }
      const created = await res.json();
      setPermissionReasons((prev) => [...prev, created]);
      setNewReason("");
      toast({ title: "Reason Added", description: created.reason });
    } catch (e: any) {
      setReasonsError(e.message || "Failed to add reason");
      toast({
        title: "Error",
        description: e.message || "Failed to add reason",
        variant: "destructive",
      });
    } finally {
      setSavingReasons(false);
    }
  }

  async function removeReason(reasonId: number) {
    setSavingReasons(true);
    setReasonsError(null);
    try {
      const res = await fetch("/api/admin/permission-reasons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reasonId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete reason");
      }
      setPermissionReasons((prev) => prev.filter((r) => r.id !== reasonId));
      toast({ title: "Reason Removed" });
    } catch (e: any) {
      setReasonsError(e.message || "Failed to remove reason");
      toast({
        title: "Error",
        description: e.message || "Failed to remove reason",
        variant: "destructive",
      });
    } finally {
      setSavingReasons(false);
    }
  }

  useEffect(() => {
    confettiRef.current = new JSConfetti();
    return () => {
      confettiRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  async function fetchRequests() {
    setLoading(true);
    setError(null);
    try {
      // Use the current statusFilter value
      const statusParam = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const res = await fetch(`/api/admin/permissions${statusParam}`);
      if (!res.ok) throw new Error("Failed to fetch permission requests");
      setRequests(await res.json());
    } catch (e: any) {
      setError(e.message);
      setToastMessage({
        type: "error",
        message: e.message || "Failed to fetch requests",
      });
    } finally {
      setLoading(false);
    }
  }

  function openModal(req: any) {
    setSelected(req);
    setForm({ status: "Approved", reviewNotes: "", lateReviewReason: "" });
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/permissions/${selected.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Failed to review request");
        return;
      }
      closeModal();
      fetchRequests();
      setToastMessage({
        type: "success",
        message: `Permission request ${form.status.toLowerCase()} successfully!`,
      });
      confettiRef.current?.addConfetti({
        emojis: ["🎉", "🎊", "🎈", "✨", "🎀"],
        emojiSize: 48,
        confettiNumber: 50,
      });
    } catch (e: any) {
      setFormError(e.message || "Failed to review request");
      setToastMessage({
        type: "error",
        message: e.message || "Failed to review request",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNotifyStudents(req: any) {
    try {
      const res = await fetch(`/api/teachers/${req.teacherId}/notify-absence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: req.requestedDates,
          teacherName: req.teacher?.ustazname || req.teacherId,
        }),
      });
      if (!res.ok) throw new Error("Failed to notify students");
      setToastMessage({
        type: "success",
        message: "Students notified successfully!",
      });
      confettiRef.current?.addConfetti({
        emojis: ["✅", "🎉", "🎊", "🎈"],
        emojiSize: 48,
        confettiNumber: 30,
      });
    } catch (e: any) {
      setToastMessage({
        type: "error",
        message: e.message || "Failed to notify students",
      });
    }
  }

  const filteredRequests = requests.filter((req) => {
    return (
      (!statusFilter || req.status === statusFilter) &&
      (!search ||
        (req.teacher?.ustazname || req.teacherId)
          .toLowerCase()
          .includes(search.toLowerCase()))
    );
  });
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-900 flex items-center gap-3">
            <FiBell className="text-yellow-600 h-10 w-10" />
            Permission Review Dashboard
          </h1>
        </div>

        {/* Filter/Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
          <div className="relative flex-1 max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              aria-label="Search teacher"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
          </select>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2"
            onClick={() => {
              const headers = [
                "Teacher",
                "Dates",
                "Category",
                "Details",
                "Submitted",
                "Status",
              ];
              const rows = filteredRequests.map((req) => [
                req.teacher?.ustazname || req.teacherId,
                dayjs(req.requestedDates).format("MMM D, YYYY"),
                req.reasonCategory,
                req.reasonDetails,
                dayjs(req.createdAt).fromNow(),
                req.status,
              ]);
              const csv = [
                headers.join(","),
                ...rows.map((r) => r.join(",")),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `permission_requests_${dayjs().format(
                "YYYY-MM-DD"
              )}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
              toast({
                title: "CSV Exported",
                description: "Permission requests exported successfully!",
              });
            }}
          >
            <FiDownload /> Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 animate-pulse">
              <FiLoader className="text-blue-600 text-4xl mr-3 animate-spin" />
              <span className="text-blue-700 text-lg font-semibold">
                Loading...
              </span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-600 text-lg font-semibold">
              <FiX className="mr-3 text-2xl" /> {error}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100">
                  <thead className="bg-blue-50 sticky top-0 z-10">
                    <tr>
                      {[
                        "Teacher",
                        "Dates",
                        "Category",
                        "Details",
                        "Submitted",
                        "Status",
                        "",
                      ].map((header, idx) => (
                        <th
                          key={idx}
                          className="px-6 py-4 text-left text-xs font-bold text-blue-800 uppercase tracking-wider whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center text-gray-500 py-12"
                        >
                          No requests found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRequests.map((req, idx) => (
                        <tr
                          key={req.id}
                          className={`border-b transition-all duration-200 ${
                            idx % 2 === 0 ? "bg-white" : "bg-blue-50"
                          } hover:bg-blue-100 hover:shadow-md`}
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-lg">
                              {(req.teacher?.ustazname || req.teacherId)
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </div>
                            <span className="font-semibold text-blue-900">
                              {req.teacher?.ustazname || req.teacherId}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              title={req.requestedDates}
                              className="text-blue-800"
                            >
                              {dayjs(req.requestedDates).format("MMM D, YYYY")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-blue-800">
                            {req.reasonCategory}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {req.reasonDetails}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              title={req.createdAt}
                              className="text-gray-600"
                            >
                              {dayjs(req.createdAt).fromNow()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                req.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : req.status === "Approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all hover:shadow-md"
                              onClick={() => openModal(req)}
                              aria-label={`Review request for ${
                                req.teacher?.ustazname || req.teacherId
                              }`}
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              <div className="flex justify-between items-center py-4 px-6 bg-white border-t border-gray-200">
                <Button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft /> Prev
                </Button>
                <span className="text-sm text-gray-600 font-semibold">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next <FiChevronRight />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl text-white font-semibold ${
              toastMessage.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toastMessage.message}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-2 sm:mx-4 p-4 sm:p-8 relative border border-blue-200 max-h-screen overflow-y-auto">
              <Button
                onClick={closeModal}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-800 rounded-full p-2 bg-transparent hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
                aria-label="Close modal"
              >
                <FiX size={24} />
              </Button>
              <h2 className="text-2xl font-bold text-blue-900 mb-4 sm:mb-6 flex items-center gap-3">
                <FiBell className="text-yellow-600 h-8 w-8" />
                Review Permission Request
              </h2>
              <div className="space-y-4 mb-4 sm:mb-6">
                {[
                  {
                    label: "Teacher",
                    value: selected?.teacher?.ustazname || selected?.teacherId,
                  },
                  {
                    label: "Dates",
                    value: dayjs(selected?.requestedDates).format(
                      "MMM D, YYYY"
                    ),
                  },
                  { label: "Reason", value: selected?.reasonCategory },
                  { label: "Details", value: selected?.reasonDetails },
                  {
                    label: "Submitted",
                    value: selected?.createdAt
                      ? new Date(selected.createdAt).toLocaleString()
                      : "-",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="font-semibold text-blue-700">
                      {item.label}:
                    </span>
                    <span className="text-gray-600">{item.value}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      form.status === "Approved"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-100 text-gray-700 hover:bg-green-100"
                    }`}
                    onClick={() =>
                      setForm((f) => ({ ...f, status: "Approved" }))
                    }
                    disabled={submitting}
                  >
                    <FiCheck /> Accept
                  </Button>
                  <Button
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      form.status === "Declined"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-gray-100 text-gray-700 hover:bg-red-100"
                    }`}
                    onClick={() =>
                      setForm((f) => ({ ...f, status: "Declined" }))
                    }
                    disabled={submitting}
                  >
                    <FiX /> Decline
                  </Button>
                </div>
                {form.status === "Declined" && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-lg flex items-center gap-3">
                    <FiAlertTriangle className="text-red-600" />
                    <span className="text-red-800 font-semibold">
                      Unpermitted Absence Deduction will apply.
                    </span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-blue-700 mb-2">
                    Review Notes
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.reviewNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reviewNotes: e.target.value }))
                    }
                    rows={3}
                    placeholder="Enter any review notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-700 mb-2">
                    Late Review Reason
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    value={form.lateReviewReason}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        lateReviewReason: e.target.value,
                      }))
                    }
                  >
                    <option value="">-- Select --</option>
                    <option value="Accepted Reason">
                      Accepted Reason (No Deduction)
                    </option>
                    <option value="Not Relevant Reason">
                      Not Relevant Reason (Deduction Applies)
                    </option>
                  </select>
                </div>
                {formError && (
                  <div className="text-red-600 text-sm">{formError}</div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-4 mt-6">
                  <Button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition w-full sm:w-auto"
                    aria-label="Cancel review modal"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold w-full sm:w-auto"
                    onClick={async () => {
                      if (!selected) return;
                      const res = await fetch(
                        `/api/permissions/${selected.id}/notify-teacher`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            status: form.status,
                            reviewNotes: form.reviewNotes,
                          }),
                        }
                      );
                      const data = await res.json();
                      setToastMessage({
                        type: data.success ? "success" : "error",
                        message: data.success
                          ? "Teacher notified successfully!"
                          : data.error || "Failed to notify teacher",
                      });
                    }}
                    aria-label="Notify Teacher"
                    title="Notify the teacher about this review"
                  >
                    <FiSend /> Notify Teacher
                  </Button>
                  <Button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold w-full sm:w-auto"
                    onClick={async () => {
                      if (!selected || form.status !== "Approved") return;
                      const res = await fetch(
                        `/api/permissions/${selected.id}/notify-students`,
                        {
                          method: "POST",
                        }
                      );
                      const data = await res.json();
                      setToastMessage({
                        type: data.success ? "success" : "error",
                        message: data.success
                          ? `Students notified successfully! (${data.sentCount} sent)`
                          : data.error || "Failed to notify students",
                      });
                    }}
                    aria-label="Notify Students"
                    title="Notify all students about this absence"
                    disabled={form.status !== "Approved"}
                  >
                    <FiSend /> Notify Students
                  </Button>
                  <Button
                    type="submit"
                    className={classNames(
                      "px-4 py-2 rounded-lg font-semibold text-white w-full sm:w-auto",
                      submitting
                        ? "bg-blue-400"
                        : "bg-blue-600 hover:bg-blue-700"
                    )}
                    disabled={submitting}
                    aria-label="Submit review"
                  >
                    {submitting ? (
                      <>
                        <FiLoader className="animate-spin inline-block mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permission Reasons Section */}
        <Card className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900">
              Permission Reasons
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage pre-approved reasons for teacher time-off requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reasonsError && (
              <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-lg text-red-800">
                {reasonsError}
              </div>
            )}
            <div className="space-y-3">
              {permissionReasons.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <Input
                    value={r.reason}
                    readOnly
                    className="flex-grow border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReason(r.id)}
                    aria-label={`Remove ${r.reason}`}
                    className="text-red-600 hover:text-red-800 hover:bg-red-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Add a new reason"
                onKeyDown={(e) => e.key === "Enter" && addReason()}
                className="border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={addReason}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                disabled={savingReasons}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
