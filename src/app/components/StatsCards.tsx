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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FiUsers className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">
              Total Students
            </p>
            <p className="text-3xl font-bold text-black">{totalStudents}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <FiCheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">
              Active Students
            </p>
            <p className="text-3xl font-bold text-black">{activeStudents}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-xl">
            <FiClock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">
              Not yet Students
            </p>
            <p className="text-3xl font-bold text-black">{notYetStudents}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
