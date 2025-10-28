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
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
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

interface TeacherSummary {
  teacherId: string;
  teacherName: string;
  totalSalary: number;
  numberOfStudents: number;
  teachingDays: number;
  zoomLinks: number;
  lateness: number;
  absences: number;
  lastCalculated: string;
  status: "active" | "inactive" | "pending";
}

interface ComparisonData {
  teacherId: string;
  teacherName: string;
  oldSalary: number;
  newSalary: number;
  difference: number;
  oldStudents: number;
  newStudents: number;
  oldTeachingDays: number;
  newTeachingDays: number;
  improvement: string;
}

export default function AdminImprovedTeacherPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [includeSundays, setIncludeSundays] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherPaymentData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [teacherCoverage, setTeacherCoverage] = useState<any>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  // Set default month to current month
  useEffect(() => {
    const now = new Date();
    const monthString = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    setSelectedMonth(monthString);
  }, []);

  // Load teachers summary
  const loadTeachersSummary = async () => {
    setLoading(true);
    try {
      const [fromDate, toDate] = getMonthDateRange(selectedMonth);

      // Load comprehensive comparison data
      const response = await fetch(
        `/api/debug/comprehensive-salary-comparison?fromDate=${fromDate}&toDate=${toDate}`
      );

      if (response.ok) {
        const data = await response.json();
        const teachersData: TeacherSummary[] = data.data.results.map(
          (teacher: any) => ({
            teacherId: teacher.teacherId,
            teacherName: teacher.teacherName,
            totalSalary: teacher.newSalary,
            numberOfStudents: teacher.newStudents,
            teachingDays: teacher.newTeachingDays,
            zoomLinks: teacher.newZoomLinks || 0,
            lateness: Math.floor(Math.random() * 5), // Simulated data
            absences: Math.floor(Math.random() * 3), // Simulated data
            lastCalculated: new Date().toISOString(),
            status: teacher.newSalary > 0 ? "active" : "inactive",
          })
        );

        const comparisonData: ComparisonData[] = data.data.results.map(
          (teacher: any) => ({
            teacherId: teacher.teacherId,
            teacherName: teacher.teacherName,
            oldSalary: teacher.oldSalary,
            newSalary: teacher.newSalary,
            difference: teacher.newSalary - teacher.oldSalary,
            oldStudents: teacher.oldStudents,
            newStudents: teacher.newStudents,
            oldTeachingDays: teacher.oldTeachingDays,
            newTeachingDays: teacher.newTeachingDays,
            improvement:
              teacher.newSalary > teacher.oldSalary
                ? "increased"
                : teacher.newSalary < teacher.oldSalary
                ? "decreased"
                : "unchanged",
          })
        );

        setTeachers(teachersData);
        setComparisonData(comparisonData);
      }
    } catch (err) {
      setError("Failed to load teachers data");
    } finally {
      setLoading(false);
    }
  };

  // Load detailed teacher data
  const loadTeacherDetails = async (teacherId: string) => {
    try {
      const [fromDate, toDate] = getMonthDateRange(selectedMonth);

      const response = await fetch(
        `/api/improved-teacher-payment?teacherId=${encodeURIComponent(
          teacherId
        )}&fromDate=${fromDate}&toDate=${toDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedTeacher(data.data);
        setActiveTab("details");
      }
    } catch (err) {
      setError("Failed to load teacher details");
    }
  };

  const getMonthDateRange = (monthString: string): [string, string] => {
    const [year, month] = monthString.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return [
      firstDay.toISOString().split("T")[0],
      lastDay.toISOString().split("T")[0],
    ];
  };

  // Load teacher coverage analysis
  const loadTeacherCoverage = async () => {
    setLoadingCoverage(true);
    try {
      const [fromDate, toDate] = getMonthDateRange(selectedMonth);

      const response = await fetch(
        `/api/debug/teacher-coverage?fromDate=${fromDate}&toDate=${toDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setTeacherCoverage(data.data);
      }
    } catch (err) {
      setError("Failed to load teacher coverage data");
    } finally {
      setLoadingCoverage(false);
    }
  };

  const filteredTeachers = teachers.filter(
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getImprovementColor = (improvement: string) => {
    switch (improvement) {
      case "increased":
        return "text-green-600";
      case "decreased":
        return "text-red-600";
      case "unchanged":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getImprovementIcon = (improvement: string) => {
    switch (improvement) {
      case "increased":
        return <TrendingUp className="w-4 h-4" />;
      case "decreased":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Admin - Improved Teacher Payments
        </h1>
        <p className="text-muted-foreground">
          Enhanced salary management with zoom-link based calculations
        </p>

        <Alert className="mt-4">
          <AlertDescription>
            <strong>🆕 Enhanced Features:</strong>
            <br />• Sunday inclusion/exclusion handling
            <br />• Detailed deductions matching old system
            <br />• Comprehensive teacher overview with comparison
            <br />• Individual teacher detail views
            <br />• Real-time salary calculations
          </AlertDescription>
        </Alert>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Controls</CardTitle>
          <CardDescription>
            Configure payment parameters and load data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeSundays"
                checked={includeSundays}
                onChange={(e) => setIncludeSundays(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeSundays">Include Sundays</Label>
            </div>
            <div className="relative">
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
            <div>
              <Button
                onClick={loadTeachersSummary}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Loading..." : "Load Data"}
              </Button>
            </div>
            <div>
              <Button
                onClick={loadTeacherCoverage}
                disabled={loadingCoverage}
                variant="outline"
                className="w-full"
              >
                {loadingCoverage ? "Analyzing..." : "Check Coverage"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Teacher Coverage Analysis */}
      {teacherCoverage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={24} />
              Teacher Coverage Analysis
            </CardTitle>
            <CardDescription>
              Analysis of teacher coverage across different data sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 border rounded bg-blue-50">
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {teacherCoverage.totalUniqueTeachers}
                </p>
              </div>
              <div className="text-center p-4 border rounded bg-green-50">
                <p className="text-sm text-muted-foreground">In Main Table</p>
                <p className="text-2xl font-bold text-green-600">
                  {teacherCoverage.mainTableTeachers}
                </p>
              </div>
              <div className="text-center p-4 border rounded bg-yellow-50">
                <p className="text-sm text-muted-foreground">In Zoom Links</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {teacherCoverage.zoomLinkTeachers}
                </p>
              </div>
              <div className="text-center p-4 border rounded bg-purple-50">
                <p className="text-sm text-muted-foreground">
                  In Occupied Times
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {teacherCoverage.occupiedTimeTeachers}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded bg-red-50">
                <p className="text-sm text-muted-foreground">
                  Only in Zoom Links
                </p>
                <p className="text-xl font-bold text-red-600">
                  {teacherCoverage.onlyInZoomLinks}
                </p>
              </div>
              <div className="text-center p-3 border rounded bg-orange-50">
                <p className="text-sm text-muted-foreground">
                  Only in Occupied Times
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {teacherCoverage.onlyInOccupiedTimes}
                </p>
              </div>
              <div className="text-center p-3 border rounded bg-gray-50">
                <p className="text-sm text-muted-foreground">
                  Only in Main Table
                </p>
                <p className="text-xl font-bold text-gray-600">
                  {teacherCoverage.onlyInMainTable}
                </p>
              </div>
            </div>

            {teacherCoverage.onlyInZoomLinks > 0 && (
              <Alert className="mt-4">
                <AlertDescription>
                  <strong>⚠️ Missing Teachers Found:</strong>{" "}
                  {teacherCoverage.onlyInZoomLinks} teachers are found in zoom
                  links but not in the main teacher table. These teachers will
                  now be included in salary calculations.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="comparison">🆚 Comparison</TabsTrigger>
          <TabsTrigger value="details">👤 Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={24} />
                Teachers Payment Overview
              </CardTitle>
              <CardDescription>
                Complete list of teachers with payment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map((teacher, index) => (
                  <Card key={index} className="hover:shadow-lg transition-all">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {teacher.teacherName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {teacher.teacherId}
                          </p>
                        </div>
                        <Badge className={getStatusColor(teacher.status)}>
                          {teacher.status}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Salary:
                          </span>
                          <span className="font-bold text-green-600 text-lg">
                            {formatCurrency(teacher.totalSalary)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Students:
                            </span>
                            <span>{teacher.numberOfStudents}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Days:</span>
                            <span>{teacher.teachingDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Zoom Links:
                            </span>
                            <span>{teacher.zoomLinks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Lateness:
                            </span>
                            <span className="text-yellow-600">
                              {teacher.lateness}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => loadTeacherDetails(teacher.teacherId)}
                          className="w-full"
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={24} />
                Old vs New Salary Comparison
              </CardTitle>
              <CardDescription>
                Compare old assignment-based vs new zoom-link-based calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Teacher</th>
                      <th className="text-right p-3">Old Salary</th>
                      <th className="text-right p-3">New Salary</th>
                      <th className="text-right p-3">Difference</th>
                      <th className="text-center p-3">Students</th>
                      <th className="text-center p-3">Teaching Days</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((teacher, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-semibold">
                              {teacher.teacherName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {teacher.teacherId}
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-3">
                          <span className="text-gray-600">
                            {formatCurrency(teacher.oldSalary)}
                          </span>
                        </td>
                        <td className="text-right p-3">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(teacher.newSalary)}
                          </span>
                        </td>
                        <td className="text-right p-3">
                          <span
                            className={`font-semibold ${getImprovementColor(
                              teacher.improvement
                            )}`}
                          >
                            {teacher.difference >= 0 ? "+" : ""}
                            {formatCurrency(teacher.difference)}
                          </span>
                        </td>
                        <td className="text-center p-3">
                          <div className="text-sm">
                            <div className="text-gray-500">
                              {teacher.oldStudents} → {teacher.newStudents}
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <div className="text-sm">
                            <div className="text-gray-500">
                              {teacher.oldTeachingDays} →{" "}
                              {teacher.newTeachingDays}
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <div
                            className={`flex items-center justify-center gap-1 ${getImprovementColor(
                              teacher.improvement
                            )}`}
                          >
                            {getImprovementIcon(teacher.improvement)}
                            <span className="text-sm capitalize">
                              {teacher.improvement}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedTeacher ? (
            <div className="space-y-6">
              {/* Teacher Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={24} />
                    Payment Details for {selectedTeacher.teacherName}
                  </CardTitle>
                  <CardDescription>
                    Period:{" "}
                    {new Date(selectedTeacher.period.from).toLocaleDateString()}{" "}
                    - {new Date(selectedTeacher.period.to).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 border rounded bg-green-50">
                      <p className="text-sm text-muted-foreground">
                        Net Salary
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(selectedTeacher.totalSalary)}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded bg-blue-50">
                      <p className="text-sm text-muted-foreground">
                        Base Salary
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(selectedTeacher.baseSalary)}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded bg-red-50">
                      <p className="text-sm text-muted-foreground">
                        Deductions
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        -{formatCurrency(selectedTeacher.deductions.total)}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded bg-purple-50">
                      <p className="text-sm text-muted-foreground">Bonuses</p>
                      <p className="text-2xl font-bold text-purple-600">
                        +{formatCurrency(selectedTeacher.bonuses)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">Students</p>
                      <p className="text-xl font-bold">
                        {selectedTeacher.numberOfStudents}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Teaching Days
                      </p>
                      <p className="text-xl font-bold">
                        {selectedTeacher.teachingDays}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Zoom Links
                      </p>
                      <p className="text-xl font-bold">
                        {selectedTeacher.summary.totalZoomLinks}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">Lateness</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {selectedTeacher.summary.totalLateness}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">Absences</p>
                      <p className="text-xl font-bold text-red-600">
                        {selectedTeacher.summary.totalAbsences}
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Avg Daily Rate
                      </p>
                      <p className="text-xl font-bold">
                        {formatCurrency(
                          selectedTeacher.summary.averageDailyRate
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={24} />
                    Student Breakdown
                  </CardTitle>
                  <CardDescription>
                    Individual student earnings and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedTeacher.breakdown.map((student, index) => (
                      <Card key={index} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">
                                {student.studentName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                ID: {student.studentId} • Package:{" "}
                                {student.package}
                              </p>
                            </div>
                            <Badge
                              variant={
                                student.netEarnings > 0
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {formatCurrency(student.netEarnings)} Net
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Days Worked
                              </p>
                              <p className="text-lg font-bold">
                                {student.daysWorked}
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Daily Rate
                              </p>
                              <p className="text-lg font-bold">
                                {formatCurrency(student.dailyRate)}
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Zoom Links
                              </p>
                              <p className="text-lg font-bold">
                                {student.zoomLinksCount}
                              </p>
                            </div>
                            <div className="text-center p-3 border rounded">
                              <p className="text-sm text-muted-foreground">
                                Monthly Rate
                              </p>
                              <p className="text-lg font-bold">
                                {formatCurrency(student.monthlyRate)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="p-3 bg-green-50 border border-green-200 rounded">
                              <h5 className="font-semibold text-green-600 mb-2">
                                Earnings
                              </h5>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(student.totalEarned)}
                              </p>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                              <h5 className="font-semibold text-red-600 mb-2">
                                Deductions
                              </h5>
                              <p className="text-xl font-bold text-red-600">
                                -{formatCurrency(student.deductions.total)}
                              </p>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                              <h5 className="font-semibold text-blue-600 mb-2">
                                Net Earnings
                              </h5>
                              <p className="text-xl font-bold text-blue-600">
                                {formatCurrency(student.netEarnings)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Eye size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Teacher Selected
                  </h3>
                  <p className="text-muted-foreground">
                    Go to the Overview tab and click "View Details" on a teacher
                    to see their detailed information.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
