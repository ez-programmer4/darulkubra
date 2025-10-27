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

interface TeacherDebugResult {
  teacherId: string;
  exists: boolean;
  teacherName?: string;
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
  issues: string[];
  recommendations: string[];
}

export default function MissingTeachersDebugPage() {
  const [teacherIds, setTeacherIds] = useState("U299,U294,U250");
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState("2024-01-31");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TeacherDebugResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [teacherCheck, setTeacherCheck] = useState<any>(null);
  const [checkingTeachers, setCheckingTeachers] = useState(false);

  const handleDebug = async () => {
    if (!teacherIds || !fromDate || !toDate) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const teacherIdList = teacherIds.split(",").map((id) => id.trim());
      const debugPromises = teacherIdList.map(async (teacherId) => {
        const response = await fetch(
          `/api/debug/teacher-salary-debug?teacherId=${encodeURIComponent(
            teacherId
          )}&fromDate=${encodeURIComponent(
            fromDate
          )}&toDate=${encodeURIComponent(toDate)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch debug data");
        }

        const data = await response.json();
        return {
          teacherId,
          exists: data.teacher?.exists || false,
          teacherName: data.teacher?.name,
          zoomLinks: data.zoomLinks || { total: 0, details: [] },
          students: data.students || { total: 0, analysis: [] },
          packageSalaries: data.packageSalaries || { total: 0, configured: [] },
          occupiedTimes: data.occupiedTimes || { total: 0, details: [] },
          issues: data.issues || [],
          recommendations: data.recommendations || [],
        };
      });

      const results = await Promise.all(debugPromises);
      setResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTeachers = async () => {
    setCheckingTeachers(true);
    setError(null);
    setTeacherCheck(null);

    try {
      const response = await fetch("/api/debug/check-teachers");
      if (!response.ok) {
        throw new Error("Failed to check teachers");
      }
      const data = await response.json();
      setTeacherCheck(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCheckingTeachers(false);
    }
  };

  const getIssueColor = (issue: string) => {
    if (issue.includes("❌")) return "destructive";
    if (issue.includes("⚠️")) return "secondary";
    return "default";
  };

  const getStatusBadge = (teacher: TeacherDebugResult) => {
    if (!teacher.exists) {
      return <Badge variant="destructive">Teacher Not Found</Badge>;
    }
    if (teacher.zoomLinks.total === 0) {
      return <Badge variant="secondary">No Zoom Links</Badge>;
    }
    if (teacher.issues.length === 0) {
      return <Badge variant="default">All Good</Badge>;
    }
    return <Badge variant="destructive">{teacher.issues.length} Issues</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Missing Teachers Debug Tool</h1>
        <p className="text-muted-foreground">
          Debug why specific teachers (U299, U294, U250) are not getting their
          salaries calculated
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug Parameters</CardTitle>
          <CardDescription>
            Enter teacher IDs and date range to analyze salary calculation
            issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="teacherIds">Teacher IDs (comma-separated)</Label>
              <Input
                id="teacherIds"
                value={teacherIds}
                onChange={(e) => setTeacherIds(e.target.value)}
                placeholder="U299,U294,U250"
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
          <div className="flex gap-2">
            <Button onClick={handleDebug} disabled={loading} className="flex-1">
              {loading ? "Analyzing..." : "Debug Missing Teachers"}
            </Button>
            <Button
              onClick={handleCheckTeachers}
              disabled={checkingTeachers}
              variant="outline"
            >
              {checkingTeachers ? "Checking..." : "Check Teachers"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {teacherCheck && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Teacher Database Check</CardTitle>
            <CardDescription>
              Analysis of teachers in the database and zoom link activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold">
                  {teacherCheck.totalTeachers}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Teachers with Zoom Links
                </p>
                <p className="text-2xl font-bold">
                  {teacherCheck.teachersWithZoomLinks.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Missing from Main Table
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {teacherCheck.teachersNotInMainTable.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Similar to Target IDs
                </p>
                <p className="text-2xl font-bold">
                  {teacherCheck.similarTeachers.length}
                </p>
              </div>
            </div>

            {teacherCheck.teachersNotInMainTable.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <strong>
                    Found {teacherCheck.teachersNotInMainTable.length} teachers
                    with zoom links but not in main table:
                  </strong>
                  <br />
                  {teacherCheck.teachersNotInMainTable.slice(0, 10).join(", ")}
                  {teacherCheck.teachersNotInMainTable.length > 10 && "..."}
                </AlertDescription>
              </Alert>
            )}

            {teacherCheck.similarTeachers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">
                  Teachers Similar to U299, U294, U250:
                </h4>
                <div className="space-y-1">
                  {teacherCheck.similarTeachers.map(
                    (teacher: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 border rounded"
                      >
                        <span className="font-medium">{teacher.ustazid}</span>
                        <span className="text-muted-foreground">
                          {teacher.ustazname}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">
                Sample Teachers (first 20):
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {teacherCheck.filteredTeachers.map(
                  (teacher: any, index: number) => (
                    <div key={index} className="p-2 border rounded text-sm">
                      <p className="font-medium">{teacher.ustazid}</p>
                      <p className="text-muted-foreground text-xs">
                        {teacher.ustazname}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((teacher, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {teacher.teacherId}
                    </CardTitle>
                    {getStatusBadge(teacher)}
                  </div>
                  <CardDescription>
                    {teacher.teacherName || "Teacher not found"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Zoom Links:</span>
                      <p className="font-semibold">{teacher.zoomLinks.total}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Students:</span>
                      <p className="font-semibold">{teacher.students.total}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issues:</span>
                      <p className="font-semibold">{teacher.issues.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-semibold">
                        {teacher.exists ? "Exists" : "Missing"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Analysis for Each Teacher */}
          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {results.map((teacher, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  {teacher.teacherId}
                </TabsTrigger>
              ))}
            </TabsList>

            {results.map((teacher, index) => (
              <TabsContent
                key={index}
                value={index.toString()}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Analysis for {teacher.teacherId}
                      {getStatusBadge(teacher)}
                    </CardTitle>
                    <CardDescription>
                      {teacher.teacherName || "Teacher not found in database"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!teacher.exists ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          <strong>
                            Teacher {teacher.teacherId} not found in database.
                          </strong>
                          <br />
                          This means the teacher ID doesn't exist in the
                          wpos_wpdatatable_24 table.
                          <br />
                          Possible reasons:
                          <ul className="list-disc list-inside mt-2">
                            <li>Teacher ID is incorrect</li>
                            <li>Teacher was deleted from the system</li>
                            <li>
                              Teacher ID format is different (e.g., different
                              prefix)
                            </li>
                            <li>Teacher exists in a different table</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        {/* Issues */}
                        {teacher.issues.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <h4 className="font-semibold text-red-600">
                              Issues Found:
                            </h4>
                            {teacher.issues.map((issue, issueIndex) => (
                              <Alert
                                key={issueIndex}
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

                        {/* Recommendations */}
                        {teacher.recommendations.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <h4 className="font-semibold text-blue-600">
                              Recommendations:
                            </h4>
                            {teacher.recommendations.map((rec, recIndex) => (
                              <Alert key={recIndex}>
                                <AlertDescription>{rec}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        {/* Data Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Zoom Links
                            </p>
                            <p className="text-2xl font-bold">
                              {teacher.zoomLinks.total}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Students
                            </p>
                            <p className="text-2xl font-bold">
                              {teacher.students.total}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Package Salaries
                            </p>
                            <p className="text-2xl font-bold">
                              {teacher.packageSalaries.total}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Occupied Times
                            </p>
                            <p className="text-2xl font-bold">
                              {teacher.occupiedTimes.total}
                            </p>
                          </div>
                        </div>

                        {/* Student Analysis */}
                        {teacher.students.analysis.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">
                              Student Analysis
                            </h4>
                            <div className="space-y-2">
                              {teacher.students.analysis.map(
                                (student, studentIndex) => (
                                  <div
                                    key={studentIndex}
                                    className="border rounded p-3"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="font-medium">
                                        {student.studentName}
                                      </h5>
                                      <div className="flex gap-2">
                                        {student.hasPackageSalary ? (
                                          <Badge variant="default">
                                            ✅ Package OK
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive">
                                            ❌ No Package Salary
                                          </Badge>
                                        )}
                                        {student.currentTeacher !==
                                          teacher.teacherId && (
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
                                        <p>{student.package || "Not Set"}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Package Salary:
                                        </span>
                                        <p>{student.packageSalary} ETB</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Status:
                                        </span>
                                        <p>{student.status}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Zoom Links:
                                        </span>
                                        <p>{student.zoomLinksCount}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Zoom Links Details */}
                        {teacher.zoomLinks.details.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Zoom Links</h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {teacher.zoomLinks.details.map(
                                (link, linkIndex) => (
                                  <div
                                    key={linkIndex}
                                    className="flex justify-between items-center p-2 border rounded text-sm"
                                  >
                                    <div>
                                      <p className="font-medium">
                                        {link.studentName}
                                      </p>
                                      <p className="text-muted-foreground">
                                        ID: {link.studentId}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p>{link.date}</p>
                                      <p className="text-muted-foreground">
                                        {link.studentPackage}
                                      </p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
