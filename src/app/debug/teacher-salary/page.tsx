"use client";

import { useState } from "react";
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

interface DebugResult {
  teacher: {
    id: string;
    name: string;
    exists: boolean;
  };
  zoomLinks: {
    total: number;
    details: Array<{
      date: string;
      studentId: number;
      studentName: string;
      studentPackage: string;
    }>;
  };
  students: {
    total: number;
    analysis: Array<{
      studentId: number;
      studentName: string;
      package: string;
      hasPackageSalary: boolean;
      packageSalary: number;
      status: string;
      daypackages: string;
      currentTeacher: string;
      zoomLinksCount: number;
    }>;
  };
  packageSalaries: {
    total: number;
    configured: Array<{
      name: string;
      salary: number;
    }>;
  };
  occupiedTimes: {
    total: number;
    details: Array<{
      studentId: number;
      studentName: string;
      package: string;
      daypackage: string;
      period: {
        start: string;
        end: string;
      };
    }>;
  };
  salaryCalculation: {
    baseSalary: number;
    totalSalary: number;
    teachingDays: number;
    numStudents: number;
    studentsWithEarnings: number;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
    }>;
  };
  issues: string[];
  recommendations: string[];
}

export default function TeacherSalaryDebugPage() {
  const [teacherId, setTeacherId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDebug = async () => {
    if (!teacherId || !fromDate || !toDate) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/debug/teacher-salary-debug?teacherId=${encodeURIComponent(
          teacherId
        )}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(
          toDate
        )}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch debug data");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getIssueColor = (issue: string) => {
    if (issue.includes("❌")) return "destructive";
    if (issue.includes("⚠️")) return "secondary";
    return "default";
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teacher Salary Debug Tool</h1>
        <p className="text-muted-foreground">
          Debug why teachers with zoom links are not getting their salaries
          calculated
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug Parameters</CardTitle>
          <CardDescription>
            Enter the teacher ID and date range to analyze salary calculation
            issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="teacherId">Teacher ID</Label>
              <Input
                id="teacherId"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="e.g., U271"
              />
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
          <Button onClick={handleDebug} disabled={loading} className="w-full">
            {loading ? "Analyzing..." : "Debug Salary Calculation"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Summary
                {result.issues.length > 0 && (
                  <Badge variant="destructive">
                    {result.issues.length} Issues Found
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Teacher</p>
                  <p className="font-semibold">{result.teacher.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zoom Links</p>
                  <p className="font-semibold">{result.zoomLinks.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Students</p>
                  <p className="font-semibold">{result.students.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Salary</p>
                  <p className="font-semibold">
                    {result.salaryCalculation.totalSalary} ETB
                  </p>
                </div>
              </div>

              {result.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600">Issues Found:</h4>
                  {result.issues.map((issue, index) => (
                    <Alert
                      key={index}
                      variant={
                        getIssueColor(issue) === "destructive"
                          ? "destructive"
                          : "default"
                      }
                    >
                      <AlertDescription>{issue}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-blue-600">
                    Recommendations:
                  </h4>
                  {result.recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="zoomlinks">Zoom Links</TabsTrigger>
              <TabsTrigger value="salary">Salary Details</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student Analysis</CardTitle>
                  <CardDescription>
                    Analysis of students assigned to this teacher and their
                    package configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.students.analysis.map((student, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">
                            {student.studentName}
                          </h4>
                          <div className="flex gap-2">
                            {student.hasPackageSalary ? (
                              <Badge variant="default">
                                ✅ Package Configured
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                ❌ No Package Salary
                              </Badge>
                            )}
                            {student.currentTeacher !== teacherId && (
                              <Badge variant="secondary">
                                ⚠️ Wrong Teacher
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Package:
                            </span>
                            <p className="font-medium">
                              {student.package || "Not Set"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Package Salary:
                            </span>
                            <p className="font-medium">
                              {student.packageSalary} ETB
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Status:
                            </span>
                            <p className="font-medium">{student.status}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Zoom Links:
                            </span>
                            <p className="font-medium">
                              {student.zoomLinksCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="packages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Package Salary Configuration</CardTitle>
                  <CardDescription>
                    All packages configured in the system with their salary
                    rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.packageSalaries.configured.map((pkg, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 border rounded"
                      >
                        <span className="font-medium">{pkg.name}</span>
                        <Badge variant="outline">{pkg.salary} ETB</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="zoomlinks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Zoom Links</CardTitle>
                  <CardDescription>
                    All zoom links sent by this teacher during the specified
                    period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.zoomLinks.details.map((link, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 border rounded"
                      >
                        <div>
                          <p className="font-medium">{link.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {link.studentId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{link.date}</p>
                          <p className="text-sm text-muted-foreground">
                            {link.studentPackage}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Salary Calculation Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of the salary calculation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Base Salary
                        </p>
                        <p className="text-2xl font-bold">
                          {result.salaryCalculation.baseSalary} ETB
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Salary
                        </p>
                        <p className="text-2xl font-bold">
                          {result.salaryCalculation.totalSalary} ETB
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Teaching Days
                        </p>
                        <p className="text-2xl font-bold">
                          {result.salaryCalculation.teachingDays}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Students with Earnings
                        </p>
                        <p className="text-2xl font-bold">
                          {result.salaryCalculation.studentsWithEarnings}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Student Breakdown</h4>
                      <div className="space-y-2">
                        {result.salaryCalculation.studentBreakdown.map(
                          (student, index) => (
                            <div key={index} className="border rounded p-3">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium">
                                  {student.studentName}
                                </h5>
                                <Badge variant="outline">
                                  {student.totalEarned} ETB
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    Package:
                                  </span>
                                  <p>{student.package}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Daily Rate:
                                  </span>
                                  <p>{student.dailyRate} ETB</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Days Worked:
                                  </span>
                                  <p>{student.daysWorked}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Monthly Rate:
                                  </span>
                                  <p>{student.monthlyRate} ETB</p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
