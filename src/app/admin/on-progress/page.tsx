"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiUser, FiPhone, FiGlobe, FiCalendar, FiUserCheck, FiEdit } from "react-icons/fi";

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
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading students...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">On Progress Students</h1>
          <p className="text-gray-600">Students who registered but haven't been assigned teachers/time slots yet</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">ID: {student.wdt_ID}</div>
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
                          {new Date(student.registrationdate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          By: {student.rigistral || "System"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            On Progress
                          </span>
                          <div className="ml-2">
                            {student.isTrained ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                <FiUserCheck className="h-3 w-3 mr-1" />
                                Trained
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Not Trained
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => router.push(`/registration?id=${student.wdt_ID}`)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <FiEdit className="h-4 w-4 mr-1" />
                          Assign Teacher
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{students.length}</div>
              <div className="text-sm text-yellow-700">Total On Progress</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {students.filter(s => s.isTrained).length}
              </div>
              <div className="text-sm text-green-700">Trained Students</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-600">
                {students.filter(s => !s.isTrained).length}
              </div>
              <div className="text-sm text-gray-700">Not Trained</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}