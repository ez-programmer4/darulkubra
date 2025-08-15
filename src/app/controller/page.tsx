"use client";

import React, { useEffect, useState } from "react";
import { FiUser, FiLoader, FiAlertTriangle, FiUsers, FiCheckCircle, FiClock } from "react-icons/fi";
import StatsCards from "@/app/components/StatsCards";
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

export default function Controller() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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
            ustazname: updatedStudent.teacher?.ustazname ?? updatedStudent.ustaz ?? "N/A",
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
            <p className="text-black font-medium text-lg">Loading your dashboard...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
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
            <h3 className="text-3xl font-bold text-black mb-4">Error Loading Dashboard</h3>
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

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:ml-auto">
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FiUsers className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-600">Total Students</span>
                  </div>
                  <div className="text-2xl font-bold text-black">{totalStudents}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FiCheckCircle className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-600">Active</span>
                  </div>
                  <div className="text-2xl font-bold text-black">{activeStudents}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FiClock className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-600">Pending</span>
                  </div>
                  <div className="text-2xl font-bold text-black">{notYetStudents}</div>
                </div>
              </div>
            </div>

            {/* Legacy Stats Cards Component */}
            <div className="mt-8">
              <StatsCards
                totalStudents={totalStudents}
                activeStudents={activeStudents}
                notYetStudents={notYetStudents}
              />
            </div>
          </div>

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