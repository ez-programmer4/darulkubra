"use client";

import React, { useEffect, useState } from "react";
import { FiUser, FiLoader, FiAlertTriangle } from "react-icons/fi";
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6">
          <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6 sm:p-8 border border-indigo-100 animate-slide-in">
            <FiLoader className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 animate-spin mx-auto" />
            <p className="mt-4 text-indigo-700 text-sm sm:text-base font-semibold">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </ControllerLayout>
    );
  }

  if (error) {
    return (
      <ControllerLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6">
          <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6 sm:p-8 border border-indigo-100 animate-slide-in">
            <FiAlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mx-auto" />
            <p className="mt-4 text-red-700 text-sm sm:text-base font-semibold">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 hover:scale-105 transition-all text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
              aria-label="Retry loading dashboard"
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
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 p-4 sm:p-6 lg:p-8">
        <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 mb-6 sm:mb-8 animate-slide-in">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <FiUser className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-indigo-900">
              Controller Dashboard
            </h1>
          </div>
          <StatsCards
            totalStudents={totalStudents}
            activeStudents={activeStudents}
            notYetStudents={notYetStudents}
          />
        </section>
        <section className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 animate-slide-in">
          <h2 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-4">
            Student List
          </h2>
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
        </section>
        {editingStudent && (
          <StudentPayment
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onUpdate={handleUpdate}
          />
        )}
      </main>
      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </ControllerLayout>
  );
}
