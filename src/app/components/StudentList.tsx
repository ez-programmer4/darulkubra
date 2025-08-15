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
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [ustazFilter, setUstazFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [timeSlotFilter, setTimeSlotFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const itemsPerPage = 10;
  const [studentsWithPaymentStatus, setStudentsWithPaymentStatus] = useState<Student[]>(
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

  const safeParseISO = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr || dateStr === "") return null;
    try {
      const parsed = parseISO(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
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
              const endpoint =
                user?.role === "controller"
                  ? `/api/controller/students/${studentId}/payment-history`
                  : `/api/students?studentId=${studentId}`;

              const response = await fetch(endpoint, {
                credentials: "include",
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
              const latestPayment = paymentHistory.length > 0
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
                      return endDate ? endDate.getTime() < new Date().getTime() : false;
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

  const statuses = useMemo(() => {
    const uniqueStatuses = [
      ...new Set(students.map((student) => student.status).filter(Boolean)),
    ];
    return ["all", ...uniqueStatuses];
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

  const filteredStudents = useMemo((): Student[] => {
    const filtered = studentsWithPaymentStatus.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phoneno.includes(searchQuery) ||
        (student.teacher?.ustazname || student.ustaz)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      const matchesSubject = subjectFilter === "all" || student.subject === subjectFilter;
      const matchesUstaz =
        ustazFilter === "all" ||
        (student.teacher?.ustazname || student.ustaz) === ustazFilter;
      const matchesPackage = packageFilter === "all" || student.package === packageFilter;
      const matchesTimeSlot = timeSlotFilter === "all" || student.selectedTime === timeSlotFilter;

      const paymentStatus = student.paymentStatus;
      let matchesPaymentStatus = true;
      if (paymentStatusFilter === "paid") {
        matchesPaymentStatus = paymentStatus?.currentMonthPaid || false;
      } else if (paymentStatusFilter === "unpaid") {
        matchesPaymentStatus = !paymentStatus?.currentMonthPaid;
      } else if (paymentStatusFilter === "overdue") {
        matchesPaymentStatus = paymentStatus?.hasOverdue || false;
      }

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

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("active");
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
    if (statusFilter !== "active") count++;
    if (subjectFilter !== "all") count++;
    if (ustazFilter !== "all") count++;
    if (packageFilter !== "all") count++;
    if (timeSlotFilter !== "all") count++;
    if (paymentStatusFilter !== "all") count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search students by name, phone, or teacher..."
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 ${
                isFilterPanelOpen
                  ? "bg-black text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <FiFilter className="h-4 w-4" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold transition-all hover:scale-105"
              >
                <FiX className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All Statuses" : status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Teacher</label>
              <select
                value={ustazFilter}
                onChange={(e) => setUstazFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
              >
                {ustazes.map((ustaz) => (
                  <option key={ustaz} value={ustaz}>
                    {ustaz === "all" ? "All Teachers" : ustaz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject === "all" ? "All Subjects" : subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Payment Status</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid This Month</option>
                <option value="unpaid">Unpaid This Month</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Package</label>
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
              >
                {packages.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg === "all" ? "All Packages" : pkg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Time Slot</label>
              <select
                value={timeSlotFilter}
                onChange={(e) => setTimeSlotFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot === "all" ? "All Time Slots" : slot}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {paginatedStudents.length} of {filteredStudents.length} students
        </span>
        {filteredStudents.length !== students.length && (
          <span className="text-blue-600 font-semibold">
            {filteredStudents.length} filtered from {students.length} total
          </span>
        )}
      </div>

      {/* Student Cards */}
      <div className="space-y-4">
        {paginatedStudents.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
              <FiUsers className="h-16 w-16 text-gray-500" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-4">No Students Found</h3>
            <p className="text-gray-600 text-xl">
              {searchQuery || getActiveFiltersCount() > 0
                ? "No students match your current filters."
                : "No students available."}
            </p>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="mt-4 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
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
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-lg font-semibold text-gray-700">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
            >
              <FiChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-3 border border-gray-300 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all hover:scale-105"
            >
              <FiChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}