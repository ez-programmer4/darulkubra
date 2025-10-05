"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FiUser,
  FiCalendar,
  FiClock,
  FiArrowRight,
  FiPlus,
  FiSearch,
  FiRefreshCw,
} from "react-icons/fi";
import { format } from "date-fns";

interface TeacherChange {
  id: number;
  student_id: number;
  old_teacher_id: string | null;
  new_teacher_id: string;
  change_date: string;
  change_reason: string | null;
  time_slot: string;
  daypackage: string;
  student_package: string | null;
  monthly_rate: number | null;
  daily_rate: number | null;
  created_by: string | null;
  student: {
    name: string | null;
    package: string | null;
  };
  old_teacher: {
    ustazname: string | null;
  } | null;
  new_teacher: {
    ustazname: string | null;
  };
}

interface Teacher {
  ustazid: string;
  ustazname: string | null;
}

interface Student {
  wdt_ID: number;
  name: string | null;
  package: string | null;
  ustaz: string | null;
  daypackages: string | null;
}

export default function TeacherChangeManagement() {
  const [changes, setChanges] = useState<TeacherChange[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChange, setNewChange] = useState({
    studentId: "",
    oldTeacherId: "",
    newTeacherId: "",
    timeSlot: "",
    dayPackage: "",
    changeReason: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [changesRes, teachersRes, studentsRes] = await Promise.all([
        fetch("/api/admin/teacher-changes"),
        fetch("/api/admin/users?role=teacher"),
        fetch("/api/registrations"),
      ]);

      if (changesRes.ok) {
        const changesData = await changesRes.json();
        setChanges(changesData.changes || []);
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData.users || []);
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChange = async () => {
    try {
      const response = await fetch("/api/admin/teacher-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: parseInt(newChange.studentId),
          oldTeacherId: newChange.oldTeacherId || null,
          newTeacherId: newChange.newTeacherId,
          timeSlot: newChange.timeSlot,
          dayPackage: newChange.dayPackage,
          changeReason: newChange.changeReason,
        }),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setNewChange({
          studentId: "",
          oldTeacherId: "",
          newTeacherId: "",
          timeSlot: "",
          dayPackage: "",
          changeReason: "",
        });
        loadData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to add teacher change:", error);
      alert("Failed to add teacher change");
    }
  };

  const filteredChanges = changes.filter((change) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      change.student.name?.toLowerCase().includes(searchLower) ||
      change.old_teacher?.ustazname?.toLowerCase().includes(searchLower) ||
      change.new_teacher.ustazname?.toLowerCase().includes(searchLower)
    );
  });

  const getStudentCurrentTeacher = (studentId: number) => {
    const student = students.find((s) => s.wdt_ID === studentId);
    return student?.ustaz || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FiRefreshCw className="w-8 h-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Changes</h1>
          <p className="text-gray-600 mt-1">
            Manage and track teacher assignments for students
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-800 text-white">
              <FiPlus className="w-4 h-4 mr-2" />
              Add Teacher Change
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Teacher Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Student
                </label>
                <Select
                  value={newChange.studentId}
                  onValueChange={(value) =>
                    setNewChange({ ...newChange, studentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem
                        key={student.wdt_ID}
                        value={student.wdt_ID.toString()}
                      >
                        {student.name} ({student.package})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Current Teacher
                </label>
                <Select
                  value={newChange.oldTeacherId}
                  onValueChange={(value) =>
                    setNewChange({ ...newChange, oldTeacherId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select current teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No current teacher</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.ustazid} value={teacher.ustazid}>
                        {teacher.ustazname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  New Teacher
                </label>
                <Select
                  value={newChange.newTeacherId}
                  onValueChange={(value) =>
                    setNewChange({ ...newChange, newTeacherId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.ustazid} value={teacher.ustazid}>
                        {teacher.ustazname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Time Slot
                </label>
                <Input
                  value={newChange.timeSlot}
                  onChange={(e) =>
                    setNewChange({ ...newChange, timeSlot: e.target.value })
                  }
                  placeholder="e.g., 09:00 AM"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Day Package
                </label>
                <Select
                  value={newChange.dayPackage}
                  onValueChange={(value) =>
                    setNewChange({ ...newChange, dayPackage: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MWF">MWF</SelectItem>
                    <SelectItem value="TTS">TTS</SelectItem>
                    <SelectItem value="All days">All days</SelectItem>
                    <SelectItem value="Weekdays">Weekdays</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Reason (Optional)
                </label>
                <Input
                  value={newChange.changeReason}
                  onChange={(e) =>
                    setNewChange({ ...newChange, changeReason: e.target.value })
                  }
                  placeholder="Reason for change"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddChange}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  Add Change
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by student or teacher name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Changes List */}
      <div className="space-y-4">
        {filteredChanges.map((change) => (
          <Card key={change.id} className="border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {change.student.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Package:{" "}
                      {change.student.package || change.student_package}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {change.old_teacher?.ustazname || "No Teacher"}
                    </p>
                    <p className="text-xs text-gray-500">From</p>
                  </div>
                  <FiArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {change.new_teacher.ustazname}
                    </p>
                    <p className="text-xs text-gray-500">To</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <FiClock className="w-4 h-4 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">{change.time_slot}</p>
                  </div>
                  <div className="text-center">
                    <FiCalendar className="w-4 h-4 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">{change.daypackage}</p>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(change.change_date), "MMM dd, yyyy")}
                    </Badge>
                  </div>
                </div>
              </div>

              {change.change_reason && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Reason:</strong> {change.change_reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredChanges.length === 0 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <FiUser className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No teacher changes found
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "No teacher changes have been recorded yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
