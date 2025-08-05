import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiUser,
  FiClock,
  FiBook,
  FiPackage,
  FiUsers,
  FiX,
  FiDollarSign,
  FiSliders,
  FiRefreshCw,
} from "react-icons/fi";
import StudentCard from "./StudentCard";
import { debounce } from "lodash";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";

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
  const [statusFilter, setStatusFilter] = useState("active");
  const [dayPackageFilter, setDayPackageFilter] = useState("all");
  const [timeSlotFilter, setTimeSlotFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [ustazFilter, setUstazFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [registrationDateFrom, setRegistrationDateFrom] = useState("");
  const [registrationDateTo, setRegistrationDateTo] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [telegramFilter, setTelegramFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const itemsPerPage = 10;
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMonthFilter, setPaymentMonthFilter] = useState("");
  const [paymentAmountMin, setPaymentAmountMin] = useState("");
  const [paymentAmountMax, setPaymentAmountMax] = useState("");
  const [lastPaymentDateFrom, setLastPaymentDateFrom] = useState("");
  const [lastPaymentDateTo, setLastPaymentDateTo] = useState("");
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
  const router = useRouter();

  // Helper function to safely parse dates
  const safeParseISO = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr || dateStr === "") return null;
    try {
      const parsed = parseISO(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  // Fetch payment history for all students
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const updatedStudents = await Promise.all(
          students.map(async (student) => {
            // Remove reference to wdt_ID on Student type, only use id
            // Defensive: ensure student.id is defined
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
              // Use different endpoints based on user role
              const endpoint =
                user?.role === "controller"
                  ? `/api/controller/students/${studentId}/payment-history`
                  : `/api/students?studentId=${studentId}`;

              const response = await fetch(endpoint, {
                credentials: "include", // This handles cookies automatically if needed
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (!response.ok) {
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

              const paymentHistory: MonthlyPayment[] = await response.json();

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

              const currentMonth = format(new Date(), "yyyy-MM");
              const hasOverdue = paymentHistory.some(
                (p) =>
                  p.payment_status === "rejected" ||
                  (p.payment_status !== "paid" &&
                    (() => {
                      const endDate = safeParseISO(p.end_date);
                      return endDate
                        ? endDate.getTime() < new Date().getTime()
                        : false;
                    })())
              );
              const currentMonthPaid = paymentHistory.some(
                (p) =>
                  p.month === currentMonth &&
                  p.payment_status === "paid" &&
                  p.payment_type !== "free"
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
      } catch (error) {}
    };

    if (students.length > 0 && user) {
      fetchPaymentHistory();
    }
  }, [students, user]);

  // Get unique values for filters dynamically from student data
  const statuses = useMemo(() => {
    const uniqueStatuses = [
      ...new Set(students.map((student) => student.status).filter(Boolean)),
    ];
    return ["all", ...uniqueStatuses];
  }, [students]);

  const dayPackages = useMemo(() => {
    const uniquePackages = [
      ...new Set(students.map((student) => student.daypackages)),
    ];
    return ["all", ...uniquePackages.filter(Boolean)];
  }, [students]);

  const packages = useMemo(() => {
    const uniquePackages = [
      ...new Set(students.map((student) => student.package)),
    ];
    return ["all", ...uniquePackages.filter(Boolean)];
  }, [students]);

  const timeSlots = useMemo(() => {
    const uniqueSlots = [
      ...new Set(students.map((student) => student.selectedTime)),
    ];
    return ["all", ...uniqueSlots.filter(Boolean)];
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
        students.map((student) => student.teacher?.ustazname || student.ustaz)
      ),
    ];
    return ["all", ...uniqueUstazes.filter(Boolean)];
  }, [students]);

  // Filter and search students
  const filteredStudents = useMemo((): Student[] => {
    const filtered = studentsWithPaymentStatus.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phoneno.includes(searchQuery);
      const matchesStatus =
        statusFilter === "all" ||
        (student.status &&
          student.status.toLowerCase() === statusFilter.toLowerCase());
      const matchesDayPackage =
        dayPackageFilter === "all" || student.daypackages === dayPackageFilter;
      const matchesPackage =
        packageFilter === "all" || student.package === packageFilter;
      const matchesTimeSlot =
        timeSlotFilter === "all" || student.selectedTime === timeSlotFilter;
      const matchesSubject =
        subjectFilter === "all" || student.subject === subjectFilter;
      const matchesUstaz =
        ustazFilter === "all" ||
        (student.teacher?.ustazname || student.ustaz) === ustazFilter;
      const matchesTelegram =
        telegramFilter === "all" ||
        (telegramFilter === "connected" && student.chatId) ||
        (telegramFilter === "not_connected" && !student.chatId);

      // Payment filters
      const paymentStatus = student.paymentStatus || {
        currentMonthPaid: false,
        hasOverdue: false,
        lastPayment: undefined,
        paymentHistory: [],
      };
      const latestPayment = paymentStatus.lastPayment;

      // Payment status filter
      let matchesPaymentStatus = paymentStatusFilter === "all";
      if (paymentStatusFilter === "paid") {
        matchesPaymentStatus = paymentStatus.currentMonthPaid;
      } else if (paymentStatusFilter === "unpaid") {
        matchesPaymentStatus =
          !paymentStatus.currentMonthPaid && !paymentStatus.hasOverdue;
      } else if (paymentStatusFilter === "overdue") {
        matchesPaymentStatus = paymentStatus.hasOverdue;
      }

      // Payment month filter only applies if a status is selected and payment data exists
      let matchesPaymentMonth = true;
      if (
        paymentStatusFilter !== "all" &&
        paymentMonthFilter &&
        latestPayment &&
        latestPayment.month
      ) {
        matchesPaymentMonth = latestPayment.month === paymentMonthFilter;
      } else if (
        !latestPayment &&
        paymentStatusFilter !== "all" &&
        paymentMonthFilter
      ) {
        matchesPaymentMonth = false; // Exclude if no payment data and month is specified
      }

      // Payment amount range filter
      const matchesPaymentAmount =
        (!paymentAmountMin ||
          (latestPayment &&
            latestPayment.paid_amount >= Number(paymentAmountMin))) &&
        (!paymentAmountMax ||
          (latestPayment &&
            latestPayment.paid_amount <= Number(paymentAmountMax)));

      // Last payment date range filter
      const matchesLastPaymentDate =
        (!lastPaymentDateFrom ||
          (latestPayment &&
            (() => {
              const endDate = safeParseISO(latestPayment.end_date);
              return endDate
                ? endDate.getTime() >= new Date(lastPaymentDateFrom).getTime()
                : false;
            })())) &&
        (!lastPaymentDateTo ||
          (latestPayment &&
            (() => {
              const endDate = safeParseISO(latestPayment.end_date);
              return endDate
                ? endDate.getTime() <= new Date(lastPaymentDateTo).getTime()
                : false;
            })()));

      // Date range filters - safely parse dates
      const registrationDate = safeParseISO(student.registrationdate);
      const startDate = safeParseISO(student.startdate);

      const matchesRegistrationDate =
        (!registrationDateFrom ||
          (registrationDate &&
            registrationDate >= new Date(registrationDateFrom))) &&
        (!registrationDateTo ||
          (registrationDate &&
            registrationDate <= new Date(registrationDateTo)));

      const matchesStartDate =
        (!startDateFrom ||
          (startDate && startDate >= new Date(startDateFrom))) &&
        (!startDateTo || (startDate && startDate <= new Date(startDateTo)));

      const isMatch =
        matchesSearch &&
        matchesStatus &&
        matchesDayPackage &&
        matchesTimeSlot &&
        matchesSubject &&
        matchesUstaz &&
        matchesRegistrationDate &&
        matchesStartDate &&
        matchesPackage &&
        matchesTelegram &&
        matchesPaymentStatus &&
        matchesPaymentMonth &&
        matchesPaymentAmount &&
        matchesLastPaymentDate;

      if (!isMatch) {
        // Student filtered out
      }

      return isMatch;
    });

    return filtered;
  }, [
    studentsWithPaymentStatus,
    searchQuery,
    statusFilter,
    dayPackageFilter,
    timeSlotFilter,
    subjectFilter,
    ustazFilter,
    registrationDateFrom,
    registrationDateTo,
    startDateFrom,
    startDateTo,
    packageFilter,
    telegramFilter,
    paymentStatusFilter,
    paymentMonthFilter,
    paymentAmountMin,
    paymentAmountMax,
    lastPaymentDateFrom,
    lastPaymentDateTo,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Handle search with debounce
  const debouncedSearch = debounce((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  }, 300);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("active");
    setDayPackageFilter("all");
    setTimeSlotFilter("all");
    setSubjectFilter("all");
    setUstazFilter("all");
    setPackageFilter("all");
    setRegistrationDateFrom("");
    setRegistrationDateTo("");
    setStartDateFrom("");
    setStartDateTo("");
    setTelegramFilter("all");
    setPaymentStatusFilter("all");
    setPaymentMonthFilter("");
    setPaymentAmountMin("");
    setPaymentAmountMax("");
    setLastPaymentDateFrom("");
    setLastPaymentDateTo("");
    setCurrentPage(1);
  };

  // Filter tabs
  const filterTabs = [
    { id: "all", label: "All Filters", icon: <FiSliders /> },
    { id: "payment", label: "Payment", icon: <FiDollarSign /> },
    { id: "basic", label: "Basic Info", icon: <FiUser /> },
    { id: "schedule", label: "Schedule", icon: <FiClock /> },
    { id: "academic", label: "Academic", icon: <FiBook /> },
    { id: "dates", label: "Dates", icon: <FiCalendar /> },
  ];

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              placeholder="Search students by name or phone..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-sm text-gray-800 placeholder-gray-400 text-sm sm:text-base"
              aria-label="Search students by name or phone number"
              value={searchQuery}
            />
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2 sm:py-3 rounded-xl shadow-sm transition-all duration-300 text-sm sm:text-base w-full sm:w-auto ${
                isFilterPanelOpen
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FiFilter />
              <span className="font-medium">Filters</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-xl shadow-sm hover:bg-gray-200 transition-all duration-300 text-sm sm:text-base w-full sm:w-auto"
            >
              <FiRefreshCw />
              <span className="font-medium">Reset</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isFilterPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              {/* Filter Tabs */}
              <div className="flex overflow-x-auto pb-4 mb-6 border-b border-gray-200">
                <div className="flex space-x-4">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilterTab(tab.id)}
                      className={`flex items-center px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all duration-200 ${
                        activeFilterTab === tab.id
                          ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Content */}
              <div className="space-y-6">
                {/* All Filters (Grid View) */}
                {activeFilterTab === "all" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Payment Status Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => {
                          setPaymentStatusFilter(e.target.value);
                          if (e.target.value === "all")
                            setPaymentMonthFilter(""); // Reset month if status is "all"
                        }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>

                    {/* Payment Month Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Month
                      </label>
                      <div className="relative">
                        <input
                          type="month"
                          value={paymentMonthFilter}
                          onChange={(e) =>
                            setPaymentMonthFilter(e.target.value)
                          }
                          disabled={paymentStatusFilter === "all"}
                          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status === "all" ? "All Statuses" : status}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Telegram Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telegram
                      </label>
                      <select
                        value={telegramFilter}
                        onChange={(e) => setTelegramFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        <option value="all">All Connections</option>
                        <option value="connected">Connected</option>
                        <option value="not_connected">Not Connected</option>
                      </select>
                    </div>

                    {/* Package Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Package
                      </label>
                      <select
                        value={packageFilter}
                        onChange={(e) => setPackageFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {packages.map((pkg) => (
                          <option key={pkg} value={pkg}>
                            {pkg === "all" ? "All Packages" : pkg}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Day Package Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day Package
                      </label>
                      <select
                        value={dayPackageFilter}
                        onChange={(e) => setDayPackageFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {dayPackages.map((pkg) => (
                          <option key={pkg} value={pkg}>
                            {pkg === "all" ? "All Day Packages" : pkg}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Slot Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Slot
                      </label>
                      <select
                        value={timeSlotFilter}
                        onChange={(e) => setTimeSlotFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot === "all" ? "All Time Slots" : slot}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {subjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject === "all" ? "All Subjects" : subject}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ustaz Filter */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teacher
                      </label>
                      <select
                        value={ustazFilter}
                        onChange={(e) => setUstazFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {ustazes.map((ustaz) => (
                          <option key={ustaz} value={ustaz}>
                            {ustaz === "all" ? "All Teachers" : ustaz}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Registration Date Range */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={registrationDateFrom}
                            onChange={(e) =>
                              setRegistrationDateFrom(e.target.value)
                            }
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={registrationDateTo}
                            onChange={(e) =>
                              setRegistrationDateTo(e.target.value)
                            }
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Start Date Range */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={startDateFrom}
                            onChange={(e) => setStartDateFrom(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={startDateTo}
                            onChange={(e) => setStartDateTo(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Filters */}
                {activeFilterTab === "payment" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => {
                          setPaymentStatusFilter(e.target.value);
                          if (e.target.value === "all")
                            setPaymentMonthFilter(""); // Reset month if status is "all"
                        }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Month
                      </label>
                      <div className="relative">
                        <input
                          type="month"
                          value={paymentMonthFilter}
                          onChange={(e) =>
                            setPaymentMonthFilter(e.target.value)
                          }
                          disabled={paymentStatusFilter === "all"}
                          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Info Filters */}
                {activeFilterTab === "basic" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status === "all" ? "All Statuses" : status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telegram Connection
                      </label>
                      <select
                        value={telegramFilter}
                        onChange={(e) => setTelegramFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        <option value="all">All Connections</option>
                        <option value="connected">Connected</option>
                        <option value="not_connected">Not Connected</option>
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Package
                      </label>
                      <select
                        value={packageFilter}
                        onChange={(e) => setPackageFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {packages.map((pkg) => (
                          <option key={pkg} value={pkg}>
                            {pkg === "all" ? "All Packages" : pkg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Schedule Filters */}
                {activeFilterTab === "schedule" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day Package
                      </label>
                      <select
                        value={dayPackageFilter}
                        onChange={(e) => setDayPackageFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {dayPackages.map((pkg) => (
                          <option key={pkg} value={pkg}>
                            {pkg === "all" ? "All Day Packages" : pkg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Slot
                      </label>
                      <select
                        value={timeSlotFilter}
                        onChange={(e) => setTimeSlotFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot === "all" ? "All Time Slots" : slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Academic Filters */}
                {activeFilterTab === "academic" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {subjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject === "all" ? "All Subjects" : subject}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teacher
                      </label>
                      <select
                        value={ustazFilter}
                        onChange={(e) => setUstazFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                      >
                        {ustazes.map((ustaz) => (
                          <option key={ustaz} value={ustaz}>
                            {ustaz === "all" ? "All Teachers" : ustaz}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Date Filters */}
                {activeFilterTab === "dates" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Date Range
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={registrationDateFrom}
                            onChange={(e) =>
                              setRegistrationDateFrom(e.target.value)
                            }
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={registrationDateTo}
                            onChange={(e) =>
                              setRegistrationDateTo(e.target.value)
                            }
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date Range
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={startDateFrom}
                            onChange={(e) => setStartDateFrom(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={startDateTo}
                            onChange={(e) => setStartDateTo(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                          />
                          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count and Timestamp */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-sm sm:text-base">
        <div className="flex flex-col gap-1 mb-2 md:mb-0">
          <div className="flex items-center gap-2">
            <FiUsers className="text-blue-500" />
            <span className="text-gray-600">
              Showing {paginatedStudents.length} of {filteredStudents.length}{" "}
              students
            </span>
          </div>
          {statusFilter === "active" && (
            <p className="text-xs text-indigo-500">
              📋 <strong>Note:</strong> Only active students are shown by
              default
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FiCalendar className="text-blue-500" />
          <span className="text-gray-600">
            {format(new Date(), "EEEE, MMMM d, yyyy")} |{" "}
            {format(new Date(), "hh:mm a")} EAT
          </span>
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-4 overflow-x-auto">
        {paginatedStudents.map((student, index) => (
          <StudentCard
            key={student.id}
            student={student}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
            user={user}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-sm sm:text-base">
          <div className="mb-4 sm:mb-0">
            <span className="text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full sm:w-auto"
            >
              <FiChevronLeft className="mr-1" />
              Previous
            </motion.button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-all duration-200 w-full sm:w-auto ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {page}
                  </motion.button>
                )
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full sm:w-auto"
            >
              Next
              <FiChevronRight className="ml-1" />
            </motion.button>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredStudents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <p className="text-gray-600 font-medium">
            No students found matching your criteria
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200"
          >
            Reset all filters
          </button>
        </motion.div>
      )}
    </div>
  );
}
