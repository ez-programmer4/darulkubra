import { useState, useMemo, useEffect } from "react";
import {
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiX,
} from "react-icons/fi";
import StudentCard from "./StudentCard";
import { debounce } from "lodash";
import { format, parseISO } from "date-fns";

interface MonthlyPayment {
  id: number;
  studentid: number;
  month: string;
  paid_amount: number;
  payment_status: string;
  payment_type: string;
  start_date: string | null;
  end_date: string | null;
}

interface Student {
  id: number;
  name: string;
  phoneno: string;
  classfee: number;
  startdate: string;
  control: string;
  status: string;
  ustaz: string;
  ustazname?: string;
  package: string;
  subject: string;
  country: string;
  rigistral: string;
  daypackages: string;
  isTrained: boolean;
  refer: string;
  registrationdate: string;
  selectedTime: string;
  progress: string;
  chatId: string | null;
  teacher: {
    ustazname: string;
    name?: string;
    username?: string;
  };
  paymentStatus?: {
    currentMonthPaid: boolean;
    hasOverdue: boolean;
    lastPayment?: MonthlyPayment;
    paymentHistory?: MonthlyPayment[];
  };
}

interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (studentId: number) => void;
  user: { name: string; username: string; role: string } | null;
}

export default function StudentList({
  students,
  onEdit,
  onDelete,
  user,
}: StudentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active-Not yet");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [ustazFilter, setUstazFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [timeSlotFilter, setTimeSlotFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [studentsWithPaymentStatus, setStudentsWithPaymentStatus] = useState<
    Student[]
  >(
    students.map((student) => ({
      ...student,
      paymentStatus: {
        currentMonthPaid: false,
        hasOverdue: false,
        lastPayment: undefined,
        paymentHistory: [],
      },
    }))
  );

  // Toggle payment debug logs
  const DEBUG_PAYMENTS = true;

  const safeParseISO = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr || dateStr === "") return null;
    try {
      const parsed = parseISO(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  // Normalize status values coming from backend to consistent buckets
  const normalizeStatus = (s: string | null | undefined): string => {
    const val = (s || "").toLowerCase().trim();
    if (!val) return "";
    if (val === "active") return "active";
    if (["notyet", "not-yet", "not_yet", "not yet"].includes(val))
      return "not yet";
    return val; // return other custom statuses as-is (lowercased, trimmed)
  };

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const updatedStudents = await Promise.all(
          students.map(async (student) => {
            const studentId = student.id;
            if (!studentId) {
              return {
                ...student,
                paymentStatus: {
                  currentMonthPaid: false,
                  hasOverdue: false,
                  lastPayment: undefined,
                  paymentHistory: [],
                },
              };
            }
            try {
              // Fetch actual payment data from API
              const response = await fetch(
                `/api/payments/monthly?studentId=${studentId}`
              );
              let paymentHistory: MonthlyPayment[] = [];

              if (response.ok) {
                const raw = await response.json();
                // Extract array from common wrappers
                const arr = Array.isArray(raw)
                  ? raw
                  : Array.isArray(raw?.payments)
                  ? raw.payments
                  : Array.isArray(raw?.data)
                  ? raw.data
                  : Array.isArray(raw?.results)
                  ? raw.results
                  : [];
                // Normalize varying backend field names into MonthlyPayment shape
                paymentHistory = arr
                  ? arr.map((r: any): MonthlyPayment => {
                      const monthVal: string | undefined =
                        r.month ||
                        r.Month ||
                        r.month_table ||
                        r.billing_month ||
                        undefined;
                      const startDateVal: string | null =
                        r.start_date || r.startdate || r.StartDate || null;
                      const endDateVal: string | null =
                        r.end_date || r.enddate || r.EndDate || null;
                      const statusVal: string =
                        r.payment_status ||
                        r.Payment_status ||
                        r.status ||
                        r.Status ||
                        r.PaymentStatus ||
                        "";
                      const typeVal: string =
                        r.payment_type || r.type || r.PaymentType || "";
                      const paidAmt: number =
                        r.paid_amount ??
                        r.paidamount ??
                        r.amount_paid ??
                        r.amount ??
                        0;
                      return {
                        id: r.id ?? r.paymentid ?? 0,
                        studentid:
                          r.studentid ??
                          r.student_id ??
                          r.StudentId ??
                          studentId,
                        month:
                          monthVal ??
                          (startDateVal ? String(startDateVal) : ""),
                        paid_amount: Number(paidAmt) || 0,
                        payment_status: String(statusVal),
                        payment_type: String(typeVal),
                        start_date: startDateVal ?? null,
                        end_date: endDateVal ?? null,
                      } as MonthlyPayment;
                    })
                  : [];
                if (DEBUG_PAYMENTS) {
                  console.debug("[PAYMENTS] API OK", {
                    studentId,
                    studentName: student.name,
                    rawCount: Array.isArray(raw) ? raw.length : undefined,
                    arrCount: Array.isArray(arr) ? arr.length : undefined,
                  });
                }
              } else {
                // Fallback: Use mock data based on student status and ID for testing
                const currentMonth = format(new Date(), "yyyy-MM");
                const isPaid =
                  student.status === "Active" && studentId % 2 === 0;
                paymentHistory = isPaid
                  ? [
                      {
                        id: 1,
                        studentid: studentId,
                        month: currentMonth,
                        paid_amount: student.classfee || 100,
                        payment_status: "paid",
                        payment_type: "full",
                        start_date: format(new Date(), "yyyy-MM-dd"),
                        end_date: format(new Date(), "yyyy-MM-dd"),
                      },
                    ]
                  : [];
                if (DEBUG_PAYMENTS) {
                  console.warn("[PAYMENTS] API not OK, using fallback", {
                    studentId,
                    status: response.status,
                  });
                }
              }

              const currentMonth = format(new Date(), "yyyy-MM");
              // Helpers mirroring backend logic
              const calculateExpectedAmount = (monthStr: string): number => {
                const [y, m] = monthStr.split("-").map(Number);
                const monthStart = new Date(y, (m || 1) - 1, 1);
                const monthEnd = new Date(y, m || 1, 0);
                const studentStart =
                  safeParseISO(student.startdate) || new Date();
                const studentStartMonthStart = new Date(
                  studentStart.getFullYear(),
                  studentStart.getMonth(),
                  1
                );
                if (monthStart < studentStartMonthStart) return 0;
                const daysInMonth = monthEnd.getDate();
                let daysInClass = daysInMonth;
                if (
                  y === studentStart.getFullYear() &&
                  (m || 1) - 1 === studentStart.getMonth()
                ) {
                  const startDate = new Date(studentStart);
                  startDate.setHours(0, 0, 0, 0);
                  monthEnd.setHours(23, 59, 59, 999);
                  // differenceInDays imported above
                  // We cannot import here, so approximate using direct diff in ms
                  const diffDays = Math.min(
                    Math.ceil(
                      (monthEnd.getTime() - startDate.getTime() + 1) /
                        (1000 * 60 * 60 * 24)
                    ),
                    daysInMonth
                  );
                  daysInClass = diffDays;
                }
                const expected =
                  (Number(student.classfee || 0) * daysInClass) / daysInMonth;
                return Math.round(expected);
              };

              const isMonthFullyCovered = (monthStr: string): boolean => {
                const monthKey = monthStr.slice(0, 7);
                const monthPayments = paymentHistory.filter(
                  (p) => String(p.month).slice(0, 7) === monthKey
                );
                if (monthPayments.length === 0) return false;
                // Free month
                if (monthPayments.some((p) => p.payment_type === "free"))
                  return true;
                // prizepartial + any payment
                const hasPrizePartial = monthPayments.some(
                  (p) => p.payment_type === "prizepartial"
                );
                const hasPaid = monthPayments.some(
                  (p) =>
                    p.payment_type === "partial" || p.payment_type === "full"
                );
                if (hasPrizePartial && hasPaid) return true;
                // Sum of paid amounts
                const totalPaid = monthPayments.reduce(
                  (sum, p) => sum + Number(p.paid_amount || 0),
                  0
                );
                const expected = calculateExpectedAmount(monthKey);
                return totalPaid >= expected;
              };

              const currentMonthPaid = isMonthFullyCovered(currentMonth);

              if (DEBUG_PAYMENTS) {
                const monthMatches = (p: MonthlyPayment): boolean => {
                  if (!p.month) return false;
                  return String(p.month).slice(0, 7) === currentMonth;
                };
                const sample = paymentHistory
                  .filter((p) => monthMatches(p))
                  .map((p) => ({
                    month: p.month,
                    payment_status: p.payment_status,
                    paid_amount: p.paid_amount,
                  }));
                console.debug("[PAYMENTS] classification", {
                  studentId,
                  studentName: student.name,
                  currentMonth,
                  currentMonthPaid,
                  monthMatchesCount: sample.length,
                  sample,
                });
              }

              // Get latest payment sorted by date
              const latestPayment =
                paymentHistory.length > 0
                  ? paymentHistory.sort((a, b) => {
                      const dateA = safeParseISO(a.end_date);
                      const dateB = safeParseISO(b.end_date);
                      if (!dateA && !dateB) return 0;
                      if (!dateA) return 1;
                      if (!dateB) return -1;
                      return dateB.getTime() - dateA.getTime();
                    })[0]
                  : undefined;

              // Check for overdue payments: any month before current that is not fully covered
              const uniqueMonths = Array.from(
                new Set(
                  paymentHistory
                    .map((p) => String(p.month).slice(0, 7))
                    .filter(Boolean)
                )
              ).sort();
              const hasOverdue = uniqueMonths.some(
                (m) => m < currentMonth && !isMonthFullyCovered(m)
              );

              return {
                ...student,
                paymentStatus: {
                  currentMonthPaid,
                  hasOverdue,
                  lastPayment: latestPayment,
                  paymentHistory,
                },
              };
            } catch (error) {
              console.error(
                `Error fetching payment for student ${studentId}:`,
                error
              );
              return {
                ...student,
                paymentStatus: {
                  currentMonthPaid: false,
                  hasOverdue: false,
                  lastPayment: undefined,
                  paymentHistory: [],
                },
              };
            }
          })
        );

        setStudentsWithPaymentStatus(updatedStudents);
      } catch (error) {
        console.error("Error in fetchPaymentHistory:", error);
      }
    };

    if (students.length > 0) {
      fetchPaymentHistory();
    } else {
      // Initialize empty state when no students
      setStudentsWithPaymentStatus([]);
    }
  }, [students, user]);

  const statuses = useMemo(() => {
    const uniqueStatuses = [
      ...new Set(
        students
          .map((student) => normalizeStatus(student.status))
          .filter((s) => s && s.length > 0)
      ),
    ];
    return ["all", "active-Not yet", ...uniqueStatuses.sort()];
  }, [students]);

  const subjects = useMemo(() => {
    const uniqueSubjects = [
      ...new Set(students.map((student) => student.subject)),
    ];
    return ["all", ...uniqueSubjects.filter(Boolean)];
  }, [students]);

  const ustazes = useMemo(() => {
    const uniqueUstazes = [
      ...new Set(
        students.map((student) => {
          // Prioritize ustazname from teacher object, fallback to ustaz field
          return student.teacher?.ustazname || "Unknown Teacher";
        })
      ),
    ];
    return [
      "all",
      ...uniqueUstazes.filter((name) => name && name !== "Unknown Teacher"),
    ];
  }, [students]);

  const packages = useMemo(() => {
    const uniquePackages = [
      ...new Set(students.map((student) => student.package)),
    ];
    return ["all", ...uniquePackages.filter(Boolean)];
  }, [students]);

  const timeSlots = useMemo(() => {
    const convertTo12Hour = (time: string): string => {
      if (!time || time.includes("AM") || time.includes("PM")) {
        return time;
      }
      const [hour, minute] = time.split(":").map(Number);
      if (isNaN(hour) || isNaN(minute)) return time;
      const period = hour >= 12 ? "PM" : "AM";
      const adjustedHour = hour % 12 || 12;
      return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${period}`;
    };

    const uniqueSlots = [
      ...new Set(
        students
          .map((student) => {
            const time = student.selectedTime;
            if (!time || time.trim() === "" || time === "Not specified")
              return null;
            return convertTo12Hour(time.trim());
          })
          .filter(Boolean)
      ),
    ];
    return ["all", ...uniqueSlots];
  }, [students]);

  const filteredStudents = useMemo((): Student[] => {
    const filtered = studentsWithPaymentStatus.filter((student) => {
      const teacherName = student.teacher?.ustazname || "";

      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phoneno.includes(searchQuery) ||
        teacherName.toLowerCase().includes(searchQuery.toLowerCase());

      const studentStatus = normalizeStatus(student.status);
      const matchesStatus =
        statusFilter === "all" ||
        studentStatus === statusFilter.toLowerCase() ||
        (statusFilter === "active-Not yet" &&
          (studentStatus === "active" || studentStatus === "not yet"));
      const matchesSubject =
        subjectFilter === "all" || student.subject === subjectFilter;
      const currentTeacherName =
        student.teacher?.ustazname || "Unknown Teacher";

      const matchesUstaz =
        ustazFilter === "all" || currentTeacherName === ustazFilter;
      const matchesPackage =
        packageFilter === "all" || student.package === packageFilter;
      const convertTo12Hour = (time: string): string => {
        if (!time || time.includes("AM") || time.includes("PM")) {
          return time;
        }
        const [hour, minute] = time.split(":").map(Number);
        if (isNaN(hour) || isNaN(minute)) return time;
        const period = hour >= 12 ? "PM" : "AM";
        const adjustedHour = hour % 12 || 12;
        return `${adjustedHour}:${minute
          .toString()
          .padStart(2, "0")} ${period}`;
      };

      const matchesTimeSlot =
        timeSlotFilter === "all" ||
        convertTo12Hour(student.selectedTime) === timeSlotFilter;

      const paymentStatus = student.paymentStatus;
      let matchesPaymentStatus = true;

      if (paymentStatusFilter === "Paid") {
        // Student has paid for current month
        matchesPaymentStatus = Boolean(
          paymentStatus?.currentMonthPaid === true
        );
      } else if (paymentStatusFilter === "unpaid") {
        // Student has NOT paid for current month (but exclude students with no payment history if they're inactive)
        matchesPaymentStatus = Boolean(
          paymentStatus &&
            paymentStatus.currentMonthPaid === false &&
            (student.status.toLowerCase() === "active" ||
              student.status.toLowerCase() === "not yet" ||
              (paymentStatus?.paymentHistory &&
                paymentStatus.paymentHistory.length > 0))
        );
      } else if (paymentStatusFilter === "overdue") {
        // Student has overdue payments
        matchesPaymentStatus = Boolean(paymentStatus?.hasOverdue === true);
      }
      // For "all", matchesPaymentStatus remains true

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSubject &&
        matchesUstaz &&
        matchesPackage &&
        matchesTimeSlot &&
        matchesPaymentStatus
      );
    });

    return filtered;
  }, [
    studentsWithPaymentStatus,
    searchQuery,
    statusFilter,
    subjectFilter,
    ustazFilter,
    packageFilter,
    timeSlotFilter,
    paymentStatusFilter,
  ]);

  const totalPages =
    itemsPerPage === -1 ? 1 : Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex =
    itemsPerPage === -1 ? filteredStudents.length : startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("active-Not yet");
    setSubjectFilter("all");
    setUstazFilter("all");
    setPackageFilter("all");
    setTimeSlotFilter("all");
    setPaymentStatusFilter("all");
    setCurrentPage(1);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter !== "active-Not yet") count++;
    if (subjectFilter !== "all") count++;
    if (ustazFilter !== "all") count++;
    if (packageFilter !== "all") count++;
    if (timeSlotFilter !== "all") count++;
    if (paymentStatusFilter !== "all") count++;
    return count;
  };

  return (
    <div className="space-y-8">
      {/* Search and Filter Controls */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-lg">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search students by name, phone, or teacher..."
              onChange={handleSearchChange}
              className="w-full pl-12 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300 text-lg"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isFilterPanelOpen
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  : "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200"
              }`}
            >
              <FiFilter className="h-5 w-5" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-sm">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <FiX className="h-5 w-5" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Filter Options
            </h3>
            <p className="text-gray-600">
              Refine your student search with advanced filters
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "all"
                      ? "All Statuses"
                      : status === "active-Not yet"
                      ? "Active & Not Yet"
                      : status?.charAt(0)?.toUpperCase() + status?.slice(1) ||
                        "Unknown"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Teacher
              </label>
              <select
                value={ustazFilter}
                onChange={(e) => setUstazFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300"
              >
                {ustazes.map((ustaz) => (
                  <option key={ustaz} value={ustaz}>
                    {ustaz === "all" ? "All Teachers" : ustaz}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Subject
              </label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject === "all" ? "All Subjects" : subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300"
              >
                <option value="all">All Payment Status</option>
                <option value="Paid">✅ Paid This Month</option>
                <option value="unpaid">❌ Unpaid This Month</option>
                <option value="overdue">⚠️ Overdue Payments</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Package
              </label>
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300"
              >
                {packages.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg === "all" ? "All Packages" : pkg}
                  </option>
                ))}
              </select>
            </div>

            {timeSlots.length > 1 && (
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  Time Slot
                </label>
                <select
                  value={timeSlotFilter}
                  onChange={(e) => setTimeSlotFilter(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white text-gray-900 shadow-sm transition-all duration-300"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot || "empty"} value={slot || ""}>
                      {slot === "all" ? "All Time Slots" : slot || "Empty"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Showing {paginatedStudents.length} of {filteredStudents.length}{" "}
                students
              </p>
              <p className="text-sm text-gray-600">
                Total records in database: {students.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const newItemsPerPage = parseInt(e.target.value);
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={-1}>All students</option>
              </select>
            </div>
            {filteredStudents.length !== students.length && (
              <div className="bg-blue-50 px-4 py-2 rounded-xl">
                <span className="text-blue-700 font-semibold text-sm">
                  {filteredStudents.length} filtered from {students.length}{" "}
                  total
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Cards */}
      <div className="space-y-6">
        {paginatedStudents.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-12 rounded-full w-fit mx-auto mb-8 shadow-lg">
              <FiUsers className="h-20 w-20 text-gray-500" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 mb-6">
              No Students Found
            </h3>
            <p className="text-gray-600 text-xl mb-8 max-w-md mx-auto">
              {searchQuery || getActiveFiltersCount() > 0
                ? "No students match your current filters. Try adjusting your search criteria."
                : "No students available in the system."}
            </p>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          paginatedStudents.map((student, index) => (
            <StudentCard
              key={student.id}
              student={student}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
              user={user}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {itemsPerPage !== -1 && totalPages > 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 px-4 py-2 rounded-xl">
                <span className="text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                ({startIndex + 1}-{Math.min(endIndex, filteredStudents.length)}{" "}
                of {filteredStudents.length})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <FiChevronLeft className="h-5 w-5" />
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Next
                <FiChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
