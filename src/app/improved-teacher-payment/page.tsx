"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeacherPaymentData {
  teacherId: string;
  teacherName: string;
  totalSalary: number;
  baseSalary: number;
  deductions: {
    lateness: number;
    absence: number;
    total: number;
  };
  bonuses: number;
  numberOfStudents: number;
  teachingDays: number;
  studentsWithEarnings: number;
  breakdown: Array<{
    studentId: number;
    studentName: string;
    package: string;
    monthlyRate: number;
    dailyRate: number;
    daysWorked: number;
    totalEarned: number;
    zoomLinksCount: number;
    latenessCount: number;
    absenceCount: number;
    deductions: {
      lateness: number;
      absence: number;
      total: number;
    };
    bonuses: number;
    netEarnings: number;
  }>;
  summary: {
    totalZoomLinks: number;
    totalLateness: number;
    totalAbsences: number;
    averageDailyRate: number;
    packageDistribution: Record<string, number>;
  };
}

export default function ImprovedTeacherPaymentDashboard() {
  const [teacherId, setTeacherId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<TeacherPaymentData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Set default dates to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
  }, []);

  // Load teachers list
  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const response = await fetch("/api/debug/check-teachers");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.filteredTeachers || []);
      }
    } catch (err) {
      console.error("Error loading teachers:", err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleCalculatePayment = async () => {
    if (!teacherId || !fromDate || !toDate) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentData(null);

    try {
      const response = await fetch(
        `/api/improved-teacher-payment?teacherId=${encodeURIComponent(
          teacherId
        )}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(
          toDate
        )}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate payment");
      }

      const data = await response.json();
      setPaymentData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPackageColor = (packageType: string) => {
    const colors: Record<string, string> = {
      "3 days": "bg-blue-100 text-blue-800",
      "5 days": "bg-green-100 text-green-800",
      "3 Fee": "bg-purple-100 text-purple-800",
      "5 Fee": "bg-orange-100 text-orange-800",
    };
    return colors[packageType] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Improved Teacher Payment Dashboard
        </h1>
        <p className="text-muted-foreground">
          Enhanced salary calculation using zoom links as the primary source of
          truth
        </p>

        <Alert className="mt-4">
          <AlertDescription>
            <strong>🆕 New Features:</strong> This dashboard uses the improved
            salary calculator that:
            <br />• Pays based on actual teaching activity (zoom links)
            <br />• Includes detailed deductions for lateness and absences
            <br />• Shows bonuses and net earnings per student
            <br />• Provides comprehensive breakdowns and analytics
          </AlertDescription>
        </Alert>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Calculation Parameters</CardTitle>
          <CardDescription>
            Select teacher and date range for salary calculation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="teacherId">Teacher</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.ustazid} value={teacher.ustazid}>
                      {teacher.ustazid} - {teacher.ustazname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleCalculatePayment}
            disabled={loading || !teacherId}
            className="w-full"
          >
            {loading ? "Calculating Payment..." : "Calculate Payment"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {paymentData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Total Salary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(paymentData.totalSalary)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Net after deductions & bonuses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Base Salary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(paymentData.baseSalary)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Before deductions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  -{formatCurrency(paymentData.deductions.total)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Lateness: {formatCurrency(paymentData.deductions.lateness)}
                  <br />
                  Absence: {formatCurrency(paymentData.deductions.absence)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Bonuses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  +{formatCurrency(paymentData.bonuses)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Performance bonuses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Analytics</CardTitle>
              <CardDescription>
                Detailed breakdown of teaching activity and earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-muted-foreground">Students</p>
                  <p className="text-2xl font-bold">
                    {paymentData.numberOfStudents}
                  </p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-muted-foreground">Teaching Days</p>
                  <p className="text-2xl font-bold">
                    {paymentData.teachingDays}
                  </p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-muted-foreground">Zoom Links</p>
                  <p className="text-2xl font-bold">
                    {paymentData.summary.totalZoomLinks}
                  </p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-muted-foreground">Lateness</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {paymentData.summary.totalLateness}
                  </p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-muted-foreground">Absences</p>
                  <p className="text-2xl font-bold text-red-600">
                    {paymentData.summary.totalAbsences}
                  </p>
                </div>
              </div>

              {/* Package Distribution */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Package Distribution</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(paymentData.summary.packageDistribution).map(
                    ([packageType, count]) => (
                      <Badge
                        key={packageType}
                        className={getPackageColor(packageType)}
                      >
                        {packageType}: {count} students
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Student Payment Breakdown</CardTitle>
              <CardDescription>
                Detailed earnings, deductions, and bonuses per student
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentData.breakdown.map((student, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {student.studentName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            ID: {student.studentId} • Package: {student.package}
                          </p>
                        </div>
                        <Badge className={getPackageColor(student.package)}>
                          {student.package}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-muted-foreground">
                            Days Worked
                          </p>
                          <p className="text-xl font-bold">
                            {student.daysWorked}
                          </p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-muted-foreground">
                            Daily Rate
                          </p>
                          <p className="text-xl font-bold">
                            {formatCurrency(student.dailyRate)}
                          </p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-muted-foreground">
                            Zoom Links
                          </p>
                          <p className="text-xl font-bold">
                            {student.zoomLinksCount}
                          </p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-muted-foreground">
                            Monthly Rate
                          </p>
                          <p className="text-xl font-bold">
                            {formatCurrency(student.monthlyRate)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded">
                          <h5 className="font-semibold text-green-600 mb-2">
                            Earnings
                          </h5>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(student.totalEarned)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.daysWorked} days ×{" "}
                            {formatCurrency(student.dailyRate)}
                          </p>
                        </div>

                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                          <h5 className="font-semibold text-red-600 mb-2">
                            Deductions
                          </h5>
                          <p className="text-2xl font-bold text-red-600">
                            -{formatCurrency(student.deductions.total)}
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Lateness: {student.latenessCount} ×{" "}
                              {formatCurrency(student.dailyRate * 0.1)}
                            </p>
                            <p>
                              Absence: {student.absenceCount} ×{" "}
                              {formatCurrency(student.dailyRate)}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                          <h5 className="font-semibold text-blue-600 mb-2">
                            Net Earnings
                          </h5>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(student.netEarnings)}
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              Earnings: {formatCurrency(student.totalEarned)}
                            </p>
                            <p>
                              Deductions: -
                              {formatCurrency(student.deductions.total)}
                            </p>
                            <p>Bonuses: +{formatCurrency(student.bonuses)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comparison with Old System */}
          <Card>
            <CardHeader>
              <CardTitle>🆚 Comparison with Old System</CardTitle>
              <CardDescription>
                Key differences between old assignment-based and new
                activity-based calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3 text-red-600">
                    ❌ Old System Issues
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      • Paid based on formal assignments, not actual teaching
                    </li>
                    <li>• Missed teachers with incorrect assignment records</li>
                    <li>• Complex period calculations could fail</li>
                    <li>• No detailed student-level breakdown</li>
                    <li>• Limited deduction and bonus tracking</li>
                  </ul>
                </div>

                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3 text-green-600">
                    ✅ New System Benefits
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      • Pays based on actual teaching activity (zoom links)
                    </li>
                    <li>• Handles teacher changes automatically</li>
                    <li>• Simple, reliable calculations</li>
                    <li>• Detailed student-level breakdowns</li>
                    <li>• Comprehensive deduction and bonus tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
