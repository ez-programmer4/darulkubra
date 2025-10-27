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
import {
  Search,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

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
  period: {
    from: string;
    to: string;
  };
}

interface TeacherListData {
  teacherId: string;
  teacherName: string;
  totalSalary: number;
  numberOfStudents: number;
  teachingDays: number;
  lastCalculated: string;
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

  // New states for enhanced functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [teacherList, setTeacherList] = useState<TeacherListData[]>([]);
  const [loadingTeacherList, setLoadingTeacherList] = useState(false);
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherListData | null>(null);
  const [historicalData, setHistoricalData] = useState<TeacherPaymentData[]>(
    []
  );
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [activeTab, setActiveTab] = useState("search");

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

  const loadTeacherList = async () => {
    setLoadingTeacherList(true);
    try {
      const response = await fetch(
        "/api/debug/comprehensive-salary-comparison?fromDate=2024-12-01&toDate=2024-12-31"
      );
      if (response.ok) {
        const data = await response.json();
        const teacherListData: TeacherListData[] = data.data.results.map(
          (teacher: any) => ({
            teacherId: teacher.teacherId,
            teacherName: teacher.teacherName,
            totalSalary: teacher.newSalary,
            numberOfStudents: teacher.newStudents,
            teachingDays: teacher.newTeachingDays,
            lastCalculated: new Date().toISOString(),
          })
        );
        setTeacherList(teacherListData);
      }
    } catch (err) {
      console.error("Error loading teacher list:", err);
    } finally {
      setLoadingTeacherList(false);
    }
  };

  const loadHistoricalData = async (teacherId: string) => {
    setLoadingHistorical(true);
    try {
      const historicalResults = [];

      // Load data for last 3 months
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const response = await fetch(
          `/api/improved-teacher-payment?teacherId=${encodeURIComponent(
            teacherId
          )}&fromDate=${encodeURIComponent(
            firstDay.toISOString().split("T")[0]
          )}&toDate=${encodeURIComponent(lastDay.toISOString().split("T")[0])}`
        );

        if (response.ok) {
          const data = await response.json();
          historicalResults.push(data.data);
        }
      }

      setHistoricalData(historicalResults);
    } catch (err) {
      console.error("Error loading historical data:", err);
    } finally {
      setLoadingHistorical(false);
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

  const handleTeacherSelect = async (teacher: TeacherListData) => {
    setSelectedTeacher(teacher);
    setTeacherId(teacher.teacherId);
    await loadHistoricalData(teacher.teacherId);
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.ustazname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.ustazid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeacherList = teacherList.filter(
    (teacher) =>
      teacher.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacherId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <br />• <strong>NEW:</strong> Search functionality and historical
            data comparison
          </AlertDescription>
        </Alert>
      </div>

      {/* Enhanced Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">🔍 Search & Calculate</TabsTrigger>
          <TabsTrigger value="list">📋 Teacher List</TabsTrigger>
          <TabsTrigger value="historical">📊 Historical Data</TabsTrigger>
        </TabsList>

        {/* Search & Calculate Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Calculation Parameters</CardTitle>
              <CardDescription>
                Select teacher and date range for salary calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <Input
                  placeholder="Search teachers by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="teacherId">Teacher</Label>
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTeachers.map((teacher) => (
                        <SelectItem
                          key={teacher.ustazid}
                          value={teacher.ustazid}
                        >
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
        </TabsContent>

        {/* Teacher List Tab */}
        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Teachers Payment Overview</CardTitle>
              <CardDescription>
                Complete list of teachers with their payment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <Input
                    placeholder="Search teachers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={loadTeacherList} disabled={loadingTeacherList}>
                  {loadingTeacherList ? "Loading..." : "Refresh Data"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeacherList.map((teacher, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedTeacher?.teacherId === teacher.teacherId
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => handleTeacherSelect(teacher)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{teacher.teacherName}</h4>
                        <Badge variant="outline">{teacher.teacherId}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Salary:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(teacher.totalSalary)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Students:
                          </span>
                          <span>{teacher.numberOfStudents}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Teaching Days:
                          </span>
                          <span>{teacher.teachingDays}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historical Data Tab */}
        <TabsContent value="historical" className="space-y-6">
          {selectedTeacher ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Historical Data for {selectedTeacher.teacherName}
                </CardTitle>
                <CardDescription>
                  Payment history for the last 3 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistorical ? (
                  <div className="text-center py-8">
                    Loading historical data...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {historicalData.map((data, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar size={20} />
                            {new Date(
                              data.period.from
                            ).toLocaleDateString()} -{" "}
                            {new Date(data.period.to).toLocaleDateString()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Total Salary
                              </p>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(data.totalSalary)}
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Students
                              </p>
                              <p className="text-xl font-bold">
                                {data.numberOfStudents}
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Teaching Days
                              </p>
                              <p className="text-xl font-bold">
                                {data.teachingDays}
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Zoom Links
                              </p>
                              <p className="text-xl font-bold">
                                {data.summary.totalZoomLinks}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-green-50 border border-green-200 rounded">
                              <h5 className="font-semibold text-green-600 mb-2">
                                Earnings
                              </h5>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(data.baseSalary)}
                              </p>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                              <h5 className="font-semibold text-red-600 mb-2">
                                Deductions
                              </h5>
                              <p className="text-lg font-bold text-red-600">
                                -{formatCurrency(data.deductions.total)}
                              </p>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                              <h5 className="font-semibold text-blue-600 mb-2">
                                Bonuses
                              </h5>
                              <p className="text-lg font-bold text-blue-600">
                                +{formatCurrency(data.bonuses)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Teacher Selected
                  </h3>
                  <p className="text-muted-foreground">
                    Go to the Teacher List tab and select a teacher to view
                    their historical data.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
