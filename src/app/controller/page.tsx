"use client";
import React, { useEffect, useState } from "react";
import { FiUser } from "react-icons/fi";
import ControllerHeader from "@/app/components/ControllerHeader";
import StatsCards from "@/app/components/StatsCards";
// import StudentCard from "@/app/components/StudentCard";
// import StudentManagement from "@/app/components/StudentManagement";
import AttendanceManager from "@/app/components/AttendanceManager";
import toast from "react-hot-toast";
import StudentList from "@/app/components/StudentList";

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
  progress: string;
  chatId: string | null;
  teacher: {
    ustazname: string;
  };
}

export default function Controller() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{
    name: string;
    username: string;
    role: string;
  } | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, userRes] = await Promise.all([
        fetch("/api/controller/students", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!studentsRes.ok) {
        const errorData = await studentsRes.json();
        throw new Error(errorData.error || "Failed to fetch students");
      }
      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || "Failed to fetch user data");
      }

      const studentsData = await studentsRes.json();
      const userData = await userRes.json();

      if (!userData.user || userData.user.role !== "controller") {
        throw new Error("Unauthorized access");
      }

      const processedStudents = studentsData.map((student: any) => ({
        ...student,
        teacher: student.teacher || { ustazname: student.ustaz || "N/A" },
        isTrained: Boolean(student.isTrained),
        progress: student.progress || "",
        chatId: student.chatId || null,
      }));

      setStudents(processedStudents);
      setUser(userData.user);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      // Redirect to login if unauthorized
      if (err instanceof Error && err.message.includes("Unauthorized")) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
  };

  const handleUpdate = (updatedStudent: Student) => {
    setStudents(
      students.map((s) =>
        s.id === updatedStudent.id
          ? {
              ...updatedStudent,
              teacher: updatedStudent.teacher || {
                ustazname: updatedStudent.ustaz || "N/A",
              },
              isTrained: Boolean(updatedStudent.isTrained),
              progress: updatedStudent.progress || "",
              chatId: updatedStudent.chatId || null,
            }
          : s
      )
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <ControllerHeader userName={user?.name || "User"} />
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
          user={user}
        />
      </div>
      {editingStudent && (
        <StudentPayment
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
