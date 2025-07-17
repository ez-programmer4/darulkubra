import {
  FiCalendar,
  FiLogOut,
  FiBarChart,
  FiGift,
  FiAward,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface ControllerHeaderProps {
  userName: string;
}

export default function ControllerHeader({ userName }: ControllerHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        {/* Left side - Title and description */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Controller Dashboard
          </h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Welcome back, {userName}! Here's an overview of your students.
          </p>
        </div>

        {/* Right side - Button group */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => router.push("/attendance-list")}
            className="bg-green-300 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiCalendar className="mr-2" />
            Attendance List
          </button>

          <button
            onClick={() => router.push("/analytics")}
            className="bg-indigo-300 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiBarChart className="mr-2" />
            Analytics
          </button>

          <button
            onClick={() => router.push("/controller/ratings")}
            className="bg-indigo-300 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiBarChart className="mr-2" />
            ustaz rating
          </button>

          {/* Prize Button */}
          <button
            onClick={() => router.push("/controller/earnings")}
            className="bg-pink-500 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiAward className="mr-2" />
            Earnings
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2.5 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base"
          >
            <FiLogOut className="mr-2" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
