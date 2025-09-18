"use client";

import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiLoader,
  FiAlertTriangle,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiBarChart,
  FiDollarSign,
  FiXCircle,
  FiEye,
} from "react-icons/fi";

import StudentList from "@/app/components/StudentList";
import { useSession } from "next-auth/react";
import StudentPayment from "@/app/components/StudentPayment";
import ControllerLayout from "@/app/components/ControllerLayout";
import { toast } from "react-hot-toast";

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
  teacher: {
    ustazname: string;
  };
  progress: string;
  chatId: string | null;
}

interface Deposit {
  id: number;
  studentid: number;
  studentname: string;
  paymentdate: string;
  transactionid: string;
  paidamount: number;
  reason: string;
  status: string;
}

export default function Controller() {
  const [students, setStudents] = useState<Student[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showDeposits, setShowDeposits] = useState(false);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "controller") {
      fetchData();
    } else if (status === "unauthenticated") {
      setError("Unauthorized access");
      setLoading(false);
    }
  }, [status, session]);

  const fetchData = async () => {
    try {
      const studentsRes = await fetch("/api/controller/students", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!studentsRes.ok) {
        const errorData = await studentsRes.json();
        throw new Error(errorData.error || "Failed to fetch students");
      }
      
      const studentsData = await studentsRes.json();
      const processedStudents = studentsData.map((student: any) => ({
        id: student.id ?? 0,
        name: student.name ?? "Unknown",
        phoneno: student.phoneno ?? "",
        classfee: student.classfee ?? 0,
        startdate: student.startdate ?? "",
        control: student.control ?? "",
        status: student.status ?? "unknown",
        ustaz: student.ustaz ?? "",
        package: student.package ?? "",
        subject: student.subject ?? "",
        country: student.country ?? "",
        rigistral: student.rigistral ?? "",
        daypackages: student.daypackages ?? "",
        isTrained: Boolean(student.isTrained ?? false),
        refer: student.refer ?? "",
        registrationdate: student.registrationdate ?? "",
        selectedTime: student.selectedTime ?? "",
        teacher: {
          ustazname: student.teacher?.ustazname ?? student.ustaz ?? "N/A",
        },
        progress: student.progress ?? "",
        chatId: student.chatId ?? null,
      }));
      setStudents(processedStudents);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
      toast.error(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeposits = async () => {
    setLoadingDeposits(true);
    try {
      const depositsRes = await fetch("/api/controller/deposits", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!depositsRes.ok) {
        const errorData = await depositsRes.json();
        throw new Error(errorData.error || "Failed to fetch deposits");
      }
      
      const depositsData = await depositsRes.json();
      setDeposits(depositsData.deposits || []);
      setShowDeposits(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch deposits");
    } finally {
      setLoadingDeposits(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
  };

  const handleUpdate = (updatedStudent: Student) => {
    setStudents(
      students.map((s) => {
        const safeStudent = {
          ...updatedStudent,
          id: updatedStudent.id ?? 0,
          name: updatedStudent.name ?? "Unknown",
          phoneno: updatedStudent.phoneno ?? "",
          classfee: updatedStudent.classfee ?? 0,
          startdate: updatedStudent.startdate ?? "",
          control: updatedStudent.control ?? "",
          status: updatedStudent.status ?? "unknown",
          ustaz: updatedStudent.ustaz ?? "",
          package: updatedStudent.package ?? "",
          subject: updatedStudent.subject ?? "",
          country: updatedStudent.country ?? "",
          rigistral: updatedStudent.rigistral ?? "",
          daypackages: updatedStudent.daypackages ?? "",
          isTrained: Boolean(updatedStudent.isTrained ?? false),
          refer: updatedStudent.refer ?? "",
          registrationdate: updatedStudent.registrationdate ?? "",
          selectedTime: updatedStudent.selectedTime ?? "",
          teacher: {
            ustazname:
              updatedStudent.teacher?.ustazname ??
              updatedStudent.ustaz ??
              "N/A",
          },
          progress: updatedStudent.progress ?? "",
          chatId: updatedStudent.chatId ?? null,
        };
        return s.id === updatedStudent.id ? safeStudent : s;
      })
    );
    setEditingStudent(null);
    toast.success("Student information updated successfully");
  };

  const handleDelete = async (studentId: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const response = await fetch(`/api/controller/students/${studentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to delete student");

      setStudents(students.filter((s) => s.id !== studentId));
      toast.success("Student deleted successfully");
    } catch (error) {
      toast.error("Failed to delete student");
    }
  };

  // Calculate statistics
  const totalStudents = students.length;
  const activeStudents = students.filter(
    (s) => s.status == "active" || s.status == "Active"
  ).length;
  const notYetStudents = students.filter(
    (s) => s.status == "not yet" || s.status == "Not yet"
  ).length;

  if (loading) {
    return (
      <ControllerLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
            <p className="text-black font-medium text-lg">
              Loading your dashboard...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Please wait while we fetch the data
            </p>
          </div>
        </div>
      </ControllerLayout>
    );
  }

  if (error) {
    return (
      <ControllerLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
              <FiAlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-4">
              Error Loading Dashboard
            </h3>
            <p className="text-red-600 text-xl mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            >
              Retry
            </button>
          </div>
        </div>
      </ControllerLayout>
    );
  }

  return (
    <ControllerLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header + Stats */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-black rounded-2xl shadow-lg">
                  <FiUser className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                    Controller Dashboard
                  </h1>
                  <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                    Manage and monitor your assigned students
                  </p>
                </div>
              </div>

              {/* View Deposits Button */}
              <div className="lg:ml-auto">
                <button
                  onClick={fetchDeposits}
                  disabled={loadingDeposits}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
                >
                  {loadingDeposits ? (
                    <FiLoader className="h-5 w-5 animate-spin" />
                  ) : (
                    <FiDollarSign className="h-5 w-5" />
                  )}
                  {loadingDeposits ? "Loading..." : "View Deposits"}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <FiUsers className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Students</p>
                    <p className="text-2xl font-bold text-blue-900">{totalStudents}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <FiCheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Students</p>
                    <p className="text-2xl font-bold text-green-900">{activeStudents}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-6 border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-600 rounded-lg">
                    <FiClock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pending Students</p>
                    <p className="text-2xl font-bold text-yellow-900">{notYetStudents}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Management Modal */}
          {showDeposits && (
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FiDollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Current Month Deposits</h2>
                      <p className="text-blue-100">View-only deposit tracking</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeposits(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <FiXCircle className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {deposits.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
                      <FiDollarSign className="h-16 w-16 text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Deposits Found</h3>
                    <p className="text-gray-600">No deposits found for the current month.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <FiUser className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{deposit.studentname}</h4>
                              <p className="text-sm text-gray-600">{deposit.transactionid}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">${deposit.paidamount}</p>
                            <p className="text-sm text-gray-600">{new Date(deposit.paymentdate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                              deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                              deposit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                            </span>
                            <button
                              onClick={() => {
                                const student = students.find(s => s.id === deposit.studentid);
                                if (student) setEditingStudent(student);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Student"
                            >
                              <FiEye className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Student List */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl">
                  <FiUsers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Student Management</h2>
                  <p className="text-gray-600">View and manage your assigned students</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <StudentList
                students={students}
                onEdit={handleEdit}
                onDelete={handleDelete}
                user={
                  session?.user
                    ? {
                        name: session.user.name ?? "Unknown",
                        username: session.user.username ?? "",
                        role: session.user.role ?? "controller",
                      }
                    : null
                }
              />
            </div>
          </div>
        </div>

        {/* Student Payment Modal */}
        {editingStudent && (
          <StudentPayment
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </ControllerLayout>
  );
}
