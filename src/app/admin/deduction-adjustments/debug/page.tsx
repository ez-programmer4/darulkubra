"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DebugResult {
  records: any[];
  summary: {
    totalRecords: number;
    totalAmount: number;
    debugInfo: {
      dateRange: {
        start: string;
        end: string;
        daysInRange: number;
      };
      teachers: Array<{
        teacherId: string;
        teacherName: string;
        students: Array<{
          id: number;
          name: string;
          package: string;
          status: string;
          zoomLinksCount: number;
          occupiedTimesCount: number;
          attendanceRecordsCount: number;
        }>;
        dateAnalysis: Array<{
          date: string;
          dayOfWeek: number;
          isSunday: boolean;
          skipSunday: boolean;
          hasExistingRecord: boolean;
          isWaived: boolean;
        }>;
        totalDeduction: number;
        issues: string[];
      }>;
    };
  };
}

export default function DeductionAdjustmentDebugPage() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [teacherId, setTeacherId] = useState("U03");
  const [adjustmentType, setAdjustmentType] = useState("waive_absence");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const handleDebug = async () => {
    if (!startDate || !endDate || !teacherId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/deduction-adjustments/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adjustmentType,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          teacherIds: [teacherId],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch debug data");
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: "Success",
        description: "Debug data retrieved successfully",
      });
    } catch (error) {
      console.error("Debug error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch debug data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const presetRanges = [
    { label: "01-25 (25 days)", start: "2025-01-01", end: "2025-01-25" },
    { label: "01-18 (18 days)", start: "2025-01-01", end: "2025-01-18" },
    { label: "01-16 (16 days)", start: "2025-01-01", end: "2025-01-16" },
    { label: "10/01-10/26 (26 days)", start: "2025-10-01", end: "2025-10-26" },
  ];

  const applyPresetRange = (start: string, end: string) => {
    setStartDate(new Date(start));
    setEndDate(new Date(end));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deduction Adjustment Debug</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacherId">Teacher ID</Label>
              <Input
                id="teacherId"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="e.g., U03"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustmentType">Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waive_absence">Waive Absence</SelectItem>
                  <SelectItem value="waive_lateness">Waive Lateness</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preset Date Ranges</Label>
            <div className="flex flex-wrap gap-2">
              {presetRanges.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPresetRange(preset.start, preset.end)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={handleDebug} disabled={loading} className="w-full">
            {loading ? "Debugging..." : "Run Debug Analysis"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.totalRecords}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Records
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.summary.totalAmount} ETB
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Amount
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.summary.debugInfo.dateRange.daysInRange}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Days in Range
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.summary.debugInfo.teachers.map((teacher, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>
                  Teacher: {teacher.teacherName} ({teacher.teacherId})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">
                      Students ({teacher.students.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {teacher.students.map((student) => (
                        <div
                          key={student.id}
                          className="text-sm p-2 bg-gray-50 rounded"
                        >
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-gray-600">
                            Package: {student.package} | Status:{" "}
                            {student.status}
                          </div>
                          <div className="text-xs text-gray-500">
                            Zoom Links: {student.zoomLinksCount} | Occupied
                            Times: {student.occupiedTimesCount} | Attendance:{" "}
                            {student.attendanceRecordsCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Date Analysis</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {teacher.dateAnalysis.map((dateInfo) => (
                        <div
                          key={dateInfo.date}
                          className="text-sm p-2 bg-gray-50 rounded"
                        >
                          <div className="font-medium">{dateInfo.date}</div>
                          <div className="text-xs text-gray-600">
                            Day: {dateInfo.dayOfWeek} |
                            {dateInfo.isSunday && " Sunday"} |
                            {dateInfo.skipSunday && " Skipped"} |
                            {dateInfo.hasExistingRecord && " Has Record"} |
                            {dateInfo.isWaived && " Waived"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {teacher.issues.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Issues</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {teacher.issues.map((issue, issueIndex) => (
                        <li key={issueIndex} className="text-sm text-red-600">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    Total Deduction: {teacher.totalDeduction} ETB
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Detailed Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Student</th>
                      <th className="text-left p-2">Package</th>
                      <th className="text-left p-2">Deduction</th>
                      <th className="text-left p-2">Source</th>
                      <th className="text-left p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.records.map((record) => (
                      <tr key={record.id} className="border-b">
                        <td className="p-2">
                          {format(new Date(record.date), "yyyy-MM-dd")}
                        </td>
                        <td className="p-2">{record.type}</td>
                        <td className="p-2">{record.studentName || "N/A"}</td>
                        <td className="p-2">
                          {record.studentPackage || "N/A"}
                        </td>
                        <td className="p-2">{record.deduction} ETB</td>
                        <td className="p-2">{record.source}</td>
                        <td className="p-2">{record.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
