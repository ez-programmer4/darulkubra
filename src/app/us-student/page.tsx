"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiArrowRight,
  FiUsers,
  FiCheck,
  FiRefreshCw,
  FiArrowLeft,
} from "react-icons/fi";
import { getStudents } from "./action";

interface UsStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  wpos_wpdatatable_23Wdt_ID: number | null;
  registrationDate: Date | null;
}

export default function Page() {
  const [data, setData] = useState<UsStudent[]>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const response = await getStudents();
      setData(response);
    } catch (error) {
      console.error("Failed to fetch US students:", error);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    await fetchData();
    setRefreshing(false);
  };

  const handleRegister = (student: UsStudent) => {
    // Pre-fill registration form with student data
    const params = new URLSearchParams({
      name: `${student.firstName} ${student.lastName}`,
      email: student.email || "",
      phoneno: student.phoneNumber || "",
      country: "USA",
      prefilled: "true",
      usStudentId: student.id.toString(),
    });

    router.push(`/registration?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading US students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FiUsers className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  US Students Registration
                </h1>
                <p className="text-gray-600">
                  Students registered through external system - Complete their
                  registration
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Instructions:</strong> These students have registered
              through the US system. Click "Complete Registration" to assign
              them a teacher, package, and finalize their enrollment.
            </p>
          </div>
        </div>

        {/* Stats */}
        {data && data.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {data.length}
                </div>
                <div className="text-sm text-gray-600">Total US Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {data.filter((s) => s.wpos_wpdatatable_23Wdt_ID).length}
                </div>
                <div className="text-sm text-gray-600">Registered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {data.filter((s) => !s.wpos_wpdatatable_23Wdt_ID).length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {data.filter((s) => s.email).length}
                </div>
                <div className="text-sm text-gray-600">With Email</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {data.filter((s) => s.phoneNumber).length}
                </div>
                <div className="text-sm text-gray-600">With Phone</div>
              </div>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data && data.length > 0 ? (
                  data.map((student, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                              <FiUser className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              US Student
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.email || "No email provided"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.phoneNumber || "No phone provided"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.wpos_wpdatatable_23Wdt_ID ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <FiCheck className="mr-1 h-3 w-3" />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.wpos_wpdatatable_23Wdt_ID ? (
                          <div className="text-center">
                            <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 text-sm font-bold rounded-lg border border-green-200">
                              <FiCheck className="mr-2 h-4 w-4" />
                              Registration Completed
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {student.wpos_wpdatatable_23Wdt_ID}
                            </div>
                            {student.registrationDate && (
                              <div className="text-xs text-gray-600 mt-1 font-medium">
                                Registered:{" "}
                                {new Date(
                                  student.registrationDate
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegister(student)}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            <FiArrowRight className="mr-2 h-4 w-4" />
                            Complete Registration
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FiUsers className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No US Students Found
                        </h3>
                        <p className="text-gray-500">
                          No students from the US system are pending
                          registration.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
