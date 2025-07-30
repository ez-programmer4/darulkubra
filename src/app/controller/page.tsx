"use client";
import React, { useEffect, useState } from "react";
import { FiUser } from "react-icons/fi";
import StatsCards from "@/app/components/StatsCards";
// import StudentCard from "@/app/components/StudentCard";
// import StudentManagement from "@/app/components/StudentManagement";
import toast from "react-hot-toast";
import StudentList from "@/app/components/StudentList";
import { useSession } from "next-auth/react";
import StudentPayment from "@/app/components/StudentPayment";
import ControllerLayout from "@/app/components/ControllerLayout";

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
        ...student,
        teacher: student.teacher || { ustazname: student.ustaz || "N/A" },
        isTrained: Boolean(student.isTrained),
        progress: student.progress || "",
        chatId: student.chatId || null,
      }));
      setStudents(processedStudents);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
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
          progress: updatedStudent.progress ?? "",
          chatId: updatedStudent.chatId ?? null,
        };
        return s.id === updatedStudent.id
          ? {
              ...safeStudent,
              teacher: safeStudent.teacher || {
                ustazname: safeStudent.ustaz || "N/A",
              },
              isTrained: Boolean(safeStudent.isTrained),
            }
          : s;
      })
    );
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
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  // Calculate statistics
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "active").length;
  const newStudents = students.filter((s) => s.status === "fresh").length;

  if (loading) {
    return (
      <ControllerLayout>
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-0">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </ControllerLayout>
    );
  }

  if (error) {
    return (
      <ControllerLayout>
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-0">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">Error</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <StatsCards
        totalStudents={totalStudents}
        activeStudents={activeStudents}
        newStudents={newStudents}
      />
      <div className="mt-8">
        <StudentList
          students={students}
          onEdit={handleEdit}
          onDelete={handleDelete}
          user={
            session?.user
              ? {
                  name: session.user.name,
                  username: session.user.username,
                  role: session.user.role,
                }
              : null
          }
        />
      </div>
      {editingStudent && (
        <StudentPayment
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onUpdate={(student: any) =>
            handleUpdate({
              ...student,
              progress: student.progress ?? "",
              chatId: student.chatId ?? null,
            })
          }
        />
      )}
    </ControllerLayout>
  );
}
