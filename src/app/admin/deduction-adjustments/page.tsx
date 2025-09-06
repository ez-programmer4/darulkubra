"use client";
import { useState, useEffect } from "react";
import { FiCalendar, FiUsers, FiAlertTriangle, FiCheck, FiX } from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function DeductionAdjustmentsPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [adjustmentType, setAdjustmentType] = useState("waive_lateness");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers");
    }
  };

  const handleAdjustment = async () => {
    if (!dateRange.startDate || !dateRange.endDate || selectedTeachers.length === 0 || !reason) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to ${adjustmentType.replace('_', ' ')} for ${selectedTeachers.length} teacher(s) from ${dateRange.startDate} to ${dateRange.endDate}?\n\nReason: ${reason}\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/deduction-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentType,
          dateRange,
          teacherIds: selectedTeachers,
          reason
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Success",
          description: `${data.message}. Please refresh teacher payments to see changes.`
        });
        setSelectedTeachers([]);
        setReason("");
        setDateRange({ startDate: "", endDate: "" });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to adjust deductions");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust deductions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-600 rounded-xl">
              <FiAlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deduction Adjustments</h1>
              <p className="text-gray-600">Adjust deductions for system-related issues</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FiCalendar className="inline h-4 w-4 mr-2" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Adjustment Type
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="waive_lateness">Waive Lateness Deductions</option>
                <option value="waive_absence">Waive Absence Deductions</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Reason for Adjustment
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Server downtime from 9:00 AM to 11:30 AM"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              rows={3}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <FiUsers className="inline h-4 w-4 mr-2" />
              Select Teachers
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4">
              <div className="mb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTeachers.length === teachers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTeachers(teachers.map(t => t.id));
                      } else {
                        setSelectedTeachers([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="font-medium">Select All Teachers</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {teachers.map((teacher) => (
                  <label key={teacher.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachers(prev => [...prev, teacher.id]);
                        } else {
                          setSelectedTeachers(prev => prev.filter(id => id !== teacher.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span>{teacher.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAdjustment}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <FiCheck className="h-4 w-4" />
              )}
              Apply Adjustments
            </button>
            
            <button
              onClick={() => {
                if (window.opener) {
                  window.opener.location.reload();
                }
                window.close();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
            >
              <FiX className="h-4 w-4" />
              Close & Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}