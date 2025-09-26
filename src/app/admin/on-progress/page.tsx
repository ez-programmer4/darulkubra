"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiPhone,
  FiGlobe,
  FiCalendar,
  FiUserCheck,
  FiEdit,
} from "react-icons/fi";

interface OnProgressStudent {
  wdt_ID: number;
  name: string;
  phoneno: string;
  country: string;
  registrationdate: string;
  rigistral: string;
  isTrained: boolean;
  package: string;
  subject: string;
  daypackages: string;
}

export default function OnProgressStudents() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<OnProgressStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchOnProgressStudents = async () => {
      try {
        const res = await fetch("/api/admin/on-progress-students");
        if (!res.ok) throw new Error("Failed to fetch students");
        const data = await res.json();
        setStudents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchOnProgressStudents();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading students...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-xl p-8 mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <FiUserCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🔄 On Progress Students
              </h1>
              <p className="text-blue-100 text-lg">
                Students who registered but haven't been assigned teachers/time
                slots yet
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No "On Progress" students found
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.wdt_ID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {student.wdt_ID}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FiPhone className="h-4 w-4 mr-2 text-gray-400" />
                          {student.phoneno}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <FiGlobe className="h-4 w-4 mr-2 text-gray-400" />
                          {student.country}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Package: {student.package}</div>
                          <div>Subject: {student.subject}</div>
                          <div>Days: {student.daypackages}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FiCalendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(
                            student.registrationdate
                          ).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          By: {student.rigistral || "System"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-2">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm">
                            🔄 On Progress
                          </span>
                          {student.isTrained ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm">
                              <FiUserCheck className="h-3 w-3 mr-1" />✅ Trained
                            </span>
                          ) : (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm">
                              ⏳ Not Trained
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-xl p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            📊 Summary Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1">
                    {students.length}
                  </div>
                  <div className="text-yellow-100 font-medium">
                    🔄 Total On Progress
                  </div>
                </div>
                <div className="text-4xl opacity-80">📋</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1">
                    {students.filter((s) => s.isTrained).length}
                  </div>
                  <div className="text-green-100 font-medium">
                    ✅ Trained Students
                  </div>
                </div>
                <div className="text-4xl opacity-80">🎓</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1">
                    {students.filter((s) => !s.isTrained).length}
                  </div>
                  <div className="text-gray-100 font-medium">
                    ⏳ Not Trained
                  </div>
                </div>
                <div className="text-4xl opacity-80">📚</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
