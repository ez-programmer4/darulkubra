import { motion } from "framer-motion";
import { FiUsers, FiCheckCircle, FiClock } from "react-icons/fi";

interface StatsCardsProps {
  totalStudents: number;
  activeStudents: number;
  notYetStudents: number;
}

export default function StatsCards({
  totalStudents,
  activeStudents,
  notYetStudents,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
      >
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <FiUsers size={24} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Students</p>
            <p className="text-2xl font-semibold text-gray-900">
              {totalStudents}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
      >
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <FiCheckCircle size={24} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Active Students</p>
            <p className="text-2xl font-semibold text-gray-900">
              {activeStudents}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
      >
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <FiClock size={24} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">
              Not Yet Students
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {notYetStudents}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
