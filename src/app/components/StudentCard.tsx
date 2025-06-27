import { motion } from "framer-motion";
import {
  FiPhone,
  FiFlag,
  FiUser,
  FiBook,
  FiClock,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiPackage,
  FiEdit,
  FiChevronDown,
  FiChevronUp,
  FiBarChart2,
  FiMessageSquare,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import PaymentManagement from "./PaymentManagement";

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
}

interface StudentCardProps {
  student: Student;
  index: number;
  onEdit: (student: Student) => void;
  onDelete: (studentId: number) => void;
  user: { name: string; username: string; role: string } | null;
}

export default function StudentCard({
  student,
  index,
  onEdit,
  onDelete,
  user,
}: StudentCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add console logging to debug
  console.log("Student data:", {
    progress: student.progress,
    chatId: student.chatId,
    name: student.name,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(student.id);
    } catch (error) {
      console.error("Error deleting student:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePaymentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/paymentmanagement/${student.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "leave":
        return "bg-red-100 text-red-800 border-red-300";
      case "fresh":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden"
    >
      {/* Main Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-sm">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {student.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <FiPhone className="text-gray-400" size={14} />
                <span className="text-sm text-gray-600">{student.phoneno}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                student.status
              )} border`}
            >
              {student.status}
            </span>
            <div className="flex items-center space-x-2">
              <Link
                href={`/registration?id=${student.id}&step=3`}
                className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-all duration-300 shadow-sm"
                title="Edit"
                aria-label="Edit student"
              >
                <FiEdit size={16} />
              </Link>
              <button
                onClick={handlePaymentClick}
                className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-all duration-300 shadow-sm"
                title="Payments"
                aria-label="Manage payments"
              >
                <FiDollarSign size={16} />
              </button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-all duration-300 shadow-sm disabled:opacity-50"
                aria-label="Delete student"
              >
                <FiTrash2 size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-300 shadow-sm"
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
              >
                {isExpanded ? (
                  <FiChevronUp size={16} />
                ) : (
                  <FiChevronDown size={16} />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Progress
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Teacher
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Registral
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Start Date
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Telegram
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FiBarChart2 className="text-indigo-600" size={16} />
                    </div>
                    <span className="font-medium text-gray-900">
                      {student.progress || "Not set"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <FiUser className="text-purple-600" size={16} />
                    </div>
                    <span className="font-medium text-gray-900">
                      {student.teacher?.ustazname || student.ustaz}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FiFlag className="text-indigo-600" size={16} />
                    </div>
                    <span className="font-medium text-gray-900">
                      {student.rigistral || "Not set"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      <FiCalendar className="text-pink-600" size={16} />
                    </div>
                    <span className="font-medium text-gray-900">
                      {format(new Date(student.startdate), "MMM d, yyyy")}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    {student.chatId ? (
                      <>
                        <div className="p-2 bg-green-50 rounded-lg">
                          <FiMessageSquare
                            className="text-green-600"
                            size={16}
                          />
                        </div>
                        <span className="font-medium text-green-600">
                          Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <FiMessageSquare
                            className="text-gray-400"
                            size={16}
                          />
                        </div>
                        <span className="font-medium text-gray-500">
                          Not Connected
                        </span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-50 border-t border-gray-200"
        >
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FiPackage className="text-blue-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Package</p>
                  <p className="text-sm font-medium text-gray-900">
                    {student.package}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-50 rounded-lg">
                  <FiBook className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Subject</p>
                  <p className="text-sm font-medium text-gray-900">
                    {student.subject}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <FiClock className="text-yellow-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time Slot</p>
                  <p className="text-sm font-medium text-gray-900">
                    {student.selectedTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FiDollarSign className="text-blue-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Class Fee</p>
                  <p className="text-sm font-medium text-gray-900">
                    ${student.classfee}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <FiMapPin className="text-yellow-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Country</p>
                  <p className="text-sm font-medium text-gray-900">
                    {student.country}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FiBarChart2 className="text-purple-600" size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Training Status</p>
                  <p className="text-sm font-medium text-gray-900">
                    {student.isTrained ? "Trained" : "Not Trained"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500">
            Registration:{" "}
            {format(new Date(student.registrationdate), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-500">
            Day Package: {student.daypackages}
          </span>
        </div>
        <div className="text-xs text-gray-500">ID: {student.id}</div>
      </div>
    </motion.div>
  );
}
