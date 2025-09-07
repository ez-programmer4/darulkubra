"use client";
import { useState, useEffect } from "react";
import { FiCalendar, FiUsers, FiAlertTriangle, FiCheck, FiX, FiSearch, FiClock } from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function DeductionAdjustmentsPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [adjustmentType, setAdjustmentType] = useState("waive_lateness");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTeachers();
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    const filtered = teachers.filter(teacher => 
      teacher.name.toLowerCase().includes(teacherSearch.toLowerCase())
    );
    setFilteredTeachers(filtered);
  }, [teachers, teacherSearch]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/admin/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
        setFilteredTeachers(data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers");
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const res = await fetch("/api/admin/time-slots");
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data);
      }
    } catch (error) {
      console.error("Failed to fetch time slots");
    }
  };

  const previewAdjustments = async () => {
    if (!dateRange.startDate || !dateRange.endDate || selectedTeachers.length === 0) {
      toast({
        title: "Error",
        description: "Please select date range and teachers",
        variant: "destructive"
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/deduction-adjustments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentType,
          dateRange,
          teacherIds: selectedTeachers,
          timeSlots: selectedTimeSlots
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.records);
        setShowPreview(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview adjustments",
        variant: "destructive"
      });
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

    if (previewData.length === 0) {
      toast({
        title: "Error",
        description: "Please preview adjustments first",
        variant: "destructive"
      });
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to adjust ${previewData.length} deduction record(s)?\n\nReason: ${reason}\n\nThis action cannot be undone.`
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
          timeSlots: selectedTimeSlots,
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
        setPreviewData([]);
        setShowPreview(false);
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <FiClock className="inline h-4 w-4 mr-2" />
                Time Slots (Optional)
              </label>
              <select
                multiple
                value={selectedTimeSlots}
                onChange={(e) => setSelectedTimeSlots(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 h-20"
              >
                <option value="">All Time Slots</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
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
              Select Teachers ({selectedTeachers.length} selected)
            </label>
            
            <div className="mb-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4">
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setSelectedTeachers(filteredTeachers.map(t => t.id))}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Select All Visible
                </button>
                <button
                  onClick={() => setSelectedTeachers([])}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredTeachers.map((teacher) => (
                  <label key={teacher.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
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
                    <span className="text-sm">{teacher.name}</span>
                  </label>
                ))}
              </div>
              
              {filteredTeachers.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No teachers found matching "{teacherSearch}"
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={previewAdjustments}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              <FiSearch className="h-4 w-4" />
              Preview Adjustments
            </button>
            
            <button
              onClick={handleAdjustment}
              disabled={loading || previewData.length === 0}
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

          {/* Preview Section */}
          {showPreview && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Preview: {previewData.length} records will be adjusted
              </h3>
              
              {previewData.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="text-left p-2">Teacher</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Current Deduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((record, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{record.teacherName}</td>
                          <td className="p-2">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="p-2">{record.type}</td>
                          <td className="p-2 text-right font-mono">{record.deduction} ETB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <p className="text-center text-gray-500 mt-2">
                      ... and {previewData.length - 10} more records
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No deduction records found for the selected criteria.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}