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
  const [fromDate, setFromDate] = useState("2024-12-01");
  const [toDate, setToDate] = useState("2024-12-31");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TeacherDebugResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [teacherCheck, setTeacherCheck] = useState<any>(null);
  const [checkingTeachers, setCheckingTeachers] = useState(false);
  const [zoomLinkHistory, setZoomLinkHistory] = useState<any>(null);
  const [checkingHistory, setCheckingHistory] = useState(false);
  const [improvedSalaryResults, setImprovedSalaryResults] = useState<any>(null);
  const [testingImproved, setTestingImproved] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const [comparingSalaries, setComparingSalaries] = useState(false);
  const [comprehensiveResults, setComprehensiveResults] = useState<any>(null);
  const [comparingAllTeachers, setComparingAllTeachers] = useState(false);
  const [discussionData, setDiscussionData] = useState<any>(null);
  const [showingDiscussion, setShowingDiscussion] = useState(false);
  const [oldSalaryDebug, setOldSalaryDebug] = useState<any>(null);
  const [loadingOldDebug, setLoadingOldDebug] = useState(false);

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

  const handleCheckZoomHistory = async () => {
    setCheckingHistory(true);
    setError(null);
    setZoomLinkHistory(null);

    try {
      const response = await fetch("/api/debug/zoom-link-history");
      if (!response.ok) {
        throw new Error("Failed to check zoom link history");
      }
      const data = await response.json();
      setZoomLinkHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCheckingHistory(false);
    }
  };

  const handleTestImprovedSalary = async () => {
    setTestingImproved(true);
    setError(null);
    setImprovedSalaryResults(null);

    try {
      const teacherIdList = teacherIds.split(",").map((id) => id.trim());
      const testPromises = teacherIdList.map(async (teacherId) => {
        const response = await fetch(
          `/api/debug/improved-salary?teacherId=${encodeURIComponent(
            teacherId
          )}&fromDate=${encodeURIComponent(
            fromDate
          )}&toDate=${encodeURIComponent(toDate)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to test improved salary");
        }

        const data = await response.json();
        return {
          teacherId,
          ...data.data,
        };
      });

      const results = await Promise.all(testPromises);
      setImprovedSalaryResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setTestingImproved(false);
    }
  };

  const handleCompareSalaries = async () => {
    setComparingSalaries(true);
    setError(null);
    setComparisonResults(null);

    try {
      const teacherIdList = teacherIds.split(",").map((id) => id.trim());
      const comparisonPromises = teacherIdList.map(async (teacherId) => {
        const response = await fetch(
          `/api/debug/salary-comparison?teacherId=${encodeURIComponent(
            teacherId
          )}&fromDate=${encodeURIComponent(
            fromDate
          )}&toDate=${encodeURIComponent(toDate)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to compare salaries");
        }

        const data = await response.json();
        return data.data;
      });

      const results = await Promise.all(comparisonPromises);
      setComparisonResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setComparingSalaries(false);
    }
  };

  const handleCompareAllTeachers = async () => {
    setComparingAllTeachers(true);
    setError(null);
    setComprehensiveResults(null);

    try {
      const response = await fetch(
        `/api/debug/comprehensive-salary-comparison?fromDate=${encodeURIComponent(
          fromDate
        )}&toDate=${encodeURIComponent(toDate)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to compare all teachers");
      }

      const data = await response.json();
      setComprehensiveResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setComparingAllTeachers(false);
    }
  };

  const handleShowDiscussion = async () => {
    setShowingDiscussion(true);
    setError(null);
    setDiscussionData(null);

    try {
      const response = await fetch("/api/debug/salary-comparison-discussion");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load discussion");
      }

      const data = await response.json();
      setDiscussionData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setShowingDiscussion(false);
    }
  };

  // Test old salary calculator for specific teacher
  const handleOldSalaryDebug = async () => {
    if (!teacherIds || !fromDate || !toDate) {
      setError("Please fill in all fields");
      return;
    }

    setLoadingOldDebug(true);
    try {
      const teacherId = teacherIds.split(",")[0].trim(); // Use first teacher ID
      const response = await fetch(
        `/api/debug/old-salary-debug?teacherId=${encodeURIComponent(
          teacherId
        )}&fromDate=${fromDate}&toDate=${toDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setOldSalaryDebug(data.data);
      }
    } catch (err) {
      setError("Failed to debug old salary calculator");
    } finally {
      setLoadingOldDebug(false);
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

        <Alert className="mt-4">
          <AlertDescription>
            <strong>🔍 Key Finding:</strong> The teachers exist in the database
            but have <strong>0 zoom links</strong> in the specified period. This
            is why their salaries aren't being calculated. Use the "Check Zoom
            History" button to see if they have links in other time periods.
            <br />
            <br />
            <strong>🆕 New:</strong> Use "Compare Old vs New" to see the exact
            difference between the current salary calculator and the improved
            version that pays based on zoom links.
            <br />
            <br />
            <strong>🏢 Comprehensive Analysis:</strong> Use "Compare ALL
            Teachers" to analyze the impact across your entire organization.
            <br />
            <br />
            <strong>📚 Discussion:</strong> Use "Discussion" to understand the
            fundamental differences between the old and new salary calculators.
          </AlertDescription>
        </Alert>
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
            <Button
              onClick={handleCheckZoomHistory}
              disabled={checkingHistory}
              variant="outline"
            >
              {checkingHistory ? "Checking..." : "Check Zoom History"}
            </Button>
            <Button
              onClick={handleTestImprovedSalary}
              disabled={testingImproved}
              variant="secondary"
            >
              {testingImproved ? "Testing..." : "Test Improved Salary"}
            </Button>
            <Button
              onClick={handleCompareSalaries}
              disabled={comparingSalaries}
              variant="destructive"
            >
              {comparingSalaries ? "Comparing..." : "Compare Old vs New"}
            </Button>
            <Button
              onClick={handleCompareAllTeachers}
              disabled={comparingAllTeachers}
              variant="outline"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {comparingAllTeachers
                ? "Analyzing All Teachers..."
                : "Compare ALL Teachers"}
            </Button>
            <Button
              onClick={handleShowDiscussion}
              disabled={showingDiscussion}
              variant="outline"
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {showingDiscussion ? "Loading..." : "📚 Discussion"}
            </Button>
            <Button
              onClick={handleOldSalaryDebug}
              disabled={loadingOldDebug}
              variant="outline"
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {loadingOldDebug ? "Debugging..." : "🔍 Debug Old Calculator"}
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

      {zoomLinkHistory && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Zoom Link History Analysis</CardTitle>
            <CardDescription>
              Historical zoom link data for the target teachers across all time
              periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Zoom Links
                </p>
                <p className="text-2xl font-bold">
                  {zoomLinkHistory.totalZoomLinks}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Recent (3 months)
                </p>
                <p className="text-2xl font-bold">
                  {zoomLinkHistory.recentZoomLinks}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Teachers with Links
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {zoomLinkHistory.summary.teachersWithLinks}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Teachers without Links
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {zoomLinkHistory.summary.teachersWithoutLinks}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(zoomLinkHistory.teacherZoomHistory).map(
                ([teacherId, history]: [string, any]) => (
                  <div key={teacherId} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">{teacherId}</h4>
                      <Badge
                        variant={
                          history.totalLinks > 0 ? "default" : "destructive"
                        }
                      >
                        {history.totalLinks} total links
                      </Badge>
                    </div>

                    {history.totalLinks > 0 ? (
                      <div className="space-y-3">
                        {/* Monthly breakdown */}
                        <div>
                          <h5 className="font-medium mb-2">Links by Month:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(history.linksByMonth)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .slice(0, 8)
                              .map(([month, count]: [string, any]) => (
                                <div
                                  key={month}
                                  className="p-2 border rounded text-sm"
                                >
                                  <p className="font-medium">{month}</p>
                                  <p className="text-muted-foreground">
                                    {count} links
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Students taught */}
                        <div>
                          <h5 className="font-medium mb-2">Students Taught:</h5>
                          <div className="flex flex-wrap gap-1">
                            {history.students
                              .slice(0, 10)
                              .map((student: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {student}
                                </Badge>
                              ))}
                            {history.students.length > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{history.students.length - 10} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Recent links */}
                        <div>
                          <h5 className="font-medium mb-2">Recent Links:</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {history.recentLinks.map(
                              (link: any, index: number) => (
                                <div
                                  key={index}
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
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertDescription>
                          <strong>No zoom links found for {teacherId}</strong>
                          <br />
                          This teacher has never sent any zoom links in the
                          system.
                          <br />
                          Possible reasons:
                          <ul className="list-disc list-inside mt-2">
                            <li>
                              Teacher is new and hasn't started teaching yet
                            </li>
                            <li>
                              Teacher uses a different method to send links
                            </li>
                            <li>Teacher ID might be incorrect</li>
                            <li>Zoom links are stored in a different table</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {improvedSalaryResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Improved Salary Calculator Results</CardTitle>
            <CardDescription>
              Salary calculation based on zoom links as the primary source of
              truth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {improvedSalaryResults.map((result: any, index: number) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-lg">
                      {result.teacherName}
                    </h4>
                    <div className="flex gap-2">
                      <Badge variant="default">
                        {result.numberOfStudents} Students
                      </Badge>
                      <Badge variant="secondary">
                        {result.studentsWithEarnings} With Earnings
                      </Badge>
                      <Badge variant="outline">{result.totalSalary} ETB</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Salary
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {result.totalSalary} ETB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Teaching Days
                      </p>
                      <p className="text-2xl font-bold">
                        {result.teachingDays}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Students</p>
                      <p className="text-2xl font-bold">
                        {result.numberOfStudents}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        With Earnings
                      </p>
                      <p className="text-2xl font-bold">
                        {result.studentsWithEarnings}
                      </p>
                    </div>
                  </div>

                  {result.breakdown && result.breakdown.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Student Breakdown:</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.breakdown.map(
                          (student: any, studentIndex: number) => (
                            <div
                              key={studentIndex}
                              className="flex justify-between items-center p-2 border rounded text-sm"
                            >
                              <div>
                                <p className="font-medium">
                                  {student.studentName}
                                </p>
                                <p className="text-muted-foreground">
                                  {student.package} • {student.daysWorked} days
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {student.totalEarned} ETB
                                </p>
                                <p className="text-muted-foreground">
                                  {student.dailyRate} ETB/day
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {comparisonResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Salary Calculator Comparison: Old vs Improved</CardTitle>
            <CardDescription>
              Side-by-side comparison showing the difference between old and
              improved salary calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparisonResults.map((comparison: any, index: number) => (
                <div key={index} className="border rounded p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-xl">
                      {comparison.teacherName}
                    </h4>
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          comparison.differences.impact === "POSITIVE"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {comparison.differences.impact}
                      </Badge>
                      <Badge variant="outline">
                        {comparison.differences.percentageIncrease}% Change
                      </Badge>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Old Salary
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {comparison.oldCalculator.totalSalary} ETB
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <p className="text-sm text-muted-foreground">
                        New Salary
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {comparison.improvedCalculator.totalSalary} ETB
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Difference
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {comparison.differences.salaryDifference} ETB
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <p className="text-sm text-muted-foreground">
                        Students Gained
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {comparison.differences.studentDifference}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold mb-3 text-red-600">
                        ❌ Old Calculator Issues:
                      </h5>
                      <div className="space-y-2">
                        {comparison.oldCalculator.issues.map(
                          (issue: string, issueIndex: number) => (
                            <div
                              key={issueIndex}
                              className="p-2 bg-red-50 border border-red-200 rounded text-sm"
                            >
                              {issue}
                            </div>
                          )
                        )}
                        {comparison.oldCalculator.issues.length === 0 && (
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                            No specific issues detected
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold mb-3 text-green-600">
                        ✅ Improved Calculator Benefits:
                      </h5>
                      <div className="space-y-2">
                        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                          ✅ Found{" "}
                          {comparison.improvedCalculator.numberOfStudents}{" "}
                          students via zoom links
                        </div>
                        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                          ✅ Calculated salary based on actual teaching days
                        </div>
                        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                          ✅ Handles teacher assignment mismatches properly
                        </div>
                        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                          ✅ Pays for{" "}
                          {comparison.improvedCalculator.teachingDays} total
                          teaching days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Breakdown */}
                  {comparison.improvedCalculator.breakdown &&
                    comparison.improvedCalculator.breakdown.length > 0 && (
                      <div className="mt-6">
                        <h5 className="font-semibold mb-3">
                          📊 Students Now Getting Paid:
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {comparison.improvedCalculator.breakdown.map(
                            (student: any, studentIndex: number) => (
                              <div
                                key={studentIndex}
                                className="flex justify-between items-center p-2 border rounded text-sm"
                              >
                                <div>
                                  <p className="font-medium">
                                    {student.studentName}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {student.package} • {student.daysWorked}{" "}
                                    days
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">
                                    {student.totalEarned} ETB
                                  </p>
                                  <p className="text-muted-foreground">
                                    {student.dailyRate} ETB/day
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {comprehensiveResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              🏢 Organization-Wide Salary Calculator Comparison
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of salary calculator impact across ALL
              teachers in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 border rounded bg-red-50">
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold text-red-600">
                  {comprehensiveResults.summary.totalTeachers}
                </p>
              </div>
              <div className="text-center p-4 border rounded bg-green-50">
                <p className="text-sm text-muted-foreground">
                  Teachers with Salary Increase
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {comprehensiveResults.summary.teachersWithSalaryIncrease}
                </p>
              </div>
              <div className="text-center p-4 border rounded bg-blue-50">
                <p className="text-sm text-muted-foreground">
                  Total Salary Impact
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {comprehensiveResults.summary.totalSalaryDifference.toFixed(
                    2
                  )}{" "}
                  ETB
                </p>
              </div>
              <div className="text-center p-4 border rounded bg-purple-50">
                <p className="text-sm text-muted-foreground">Students Gained</p>
                <p className="text-2xl font-bold text-purple-600">
                  {comprehensiveResults.summary.totalStudentDifference}
                </p>
              </div>
            </div>

            {/* Detailed Impact Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 border rounded">
                <h4 className="font-semibold mb-4 text-red-600">
                  ❌ Old Calculator Issues
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Old Salary:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.totalOldSalary.toFixed(2)}{" "}
                      ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teachers with 0 Salary:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.totalTeachers -
                        comprehensiveResults.summary.processedTeachers +
                        comprehensiveResults.summary.teachersWithNoChange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Old Salary:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.averageOldSalary.toFixed(2)}{" "}
                      ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Teaching Days:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.totalOldTeachingDays}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border rounded">
                <h4 className="font-semibold mb-4 text-green-600">
                  ✅ Improved Calculator Benefits
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total New Salary:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.totalNewSalary.toFixed(2)}{" "}
                      ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teachers Now Getting Paid:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.teachersWithSalaryIncrease}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average New Salary:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.averageNewSalary.toFixed(2)}{" "}
                      ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Teaching Days:</span>
                    <span className="font-semibold">
                      {comprehensiveResults.summary.totalNewTeachingDays}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="p-6 border rounded bg-gradient-to-r from-blue-50 to-green-50 mb-8">
              <h4 className="font-semibold mb-4 text-center">
                🎯 Overall Impact Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {comprehensiveResults.summary.totalSalaryDifference.toFixed(
                      2
                    )}{" "}
                    ETB
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Salary Recovery
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {comprehensiveResults.summary.percentageIncrease}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Overall Increase
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">
                    {comprehensiveResults.summary.totalStudentDifference}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Students Now Recognized
                  </p>
                </div>
              </div>
            </div>

            {/* Top Impact Teachers */}
            <div className="mb-8">
              <h4 className="font-semibold mb-4">
                🏆 Top 20 Teachers with Highest Salary Impact
              </h4>
              <div className="border rounded max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {comprehensiveResults.results
                    .filter((teacher: any) => teacher.salaryDifference > 0)
                    .slice(0, 20)
                    .map((teacher: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border-b hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium">{teacher.teacherName}</p>
                          <p className="text-sm text-muted-foreground">
                            {teacher.oldStudents} → {teacher.newStudents}{" "}
                            students
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +{teacher.salaryDifference.toFixed(2)} ETB
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {teacher.oldSalary.toFixed(2)} →{" "}
                            {teacher.newSalary.toFixed(2)} ETB
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Error Summary */}
            {comprehensiveResults.summary.teachersWithErrors > 0 && (
              <div className="p-4 border rounded bg-yellow-50">
                <h4 className="font-semibold mb-2 text-yellow-700">
                  ⚠️ Teachers with Processing Errors
                </h4>
                <p className="text-sm text-yellow-600">
                  {comprehensiveResults.summary.teachersWithErrors} teachers had
                  errors during processing. This might be due to missing data or
                  calculation issues.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {discussionData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{discussionData.title}</CardTitle>
            <CardDescription>
              Comprehensive analysis comparing the old assignment-based
              calculator with the new activity-based calculator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Summary */}
            <div className="p-6 border rounded bg-gradient-to-r from-blue-50 to-green-50">
              <h3 className="font-semibold mb-4 text-center">
                🎯 Key Difference
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {discussionData.summary.oldCalculator}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Assignment-Based
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <p className="text-2xl">→</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {discussionData.summary.newCalculator}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Activity-Based
                  </p>
                </div>
              </div>
            </div>

            {/* Student Discovery Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border rounded">
                <h4 className="font-semibold mb-4 text-red-600">
                  ❌ Old Calculator: Assignment-Based Discovery
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Method:</p>
                    <p className="text-sm text-muted-foreground">
                      {
                        discussionData.detailedComparison.studentDiscovery.old
                          .method
                      }
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Process:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {discussionData.detailedComparison.studentDiscovery.old.process.map(
                        (step: string, index: number) => (
                          <li key={index}>{step}</li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Issues:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {discussionData.detailedComparison.studentDiscovery.old.issues.map(
                        (issue: string, index: number) => (
                          <li key={index}>{issue}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 border rounded">
                <h4 className="font-semibold mb-4 text-green-600">
                  ✅ New Calculator: Activity-Based Discovery
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Method:</p>
                    <p className="text-sm text-muted-foreground">
                      {
                        discussionData.detailedComparison.studentDiscovery.new
                          .method
                      }
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Process:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {discussionData.detailedComparison.studentDiscovery.new.process.map(
                        (step: string, index: number) => (
                          <li key={index}>{step}</li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Benefits:</p>
                    <ul className="text-sm text-green-600 space-y-1">
                      {discussionData.detailedComparison.studentDiscovery.new.benefits.map(
                        (benefit: string, index: number) => (
                          <li key={index}>{benefit}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Real World Scenarios */}
            <div>
              <h3 className="font-semibold mb-4">
                🌍 Real-World Impact Scenarios
              </h3>
              <div className="space-y-6">
                {Object.values(discussionData.realWorldImpact).map(
                  (scenario: any, index: number) => (
                    <div key={index} className="p-6 border rounded">
                      <h4 className="font-semibold mb-3">{scenario.title}</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {scenario.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                          <h5 className="font-semibold text-red-600 mb-2">
                            Old Calculator Result:
                          </h5>
                          <p className="text-sm mb-2">
                            {scenario.oldCalculator.result}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Reason: {scenario.oldCalculator.reason}
                          </p>
                          <p className="text-xs text-red-600">
                            Impact: {scenario.oldCalculator.impact}
                          </p>
                        </div>

                        <div className="p-4 bg-green-50 border border-green-200 rounded">
                          <h5 className="font-semibold text-green-600 mb-2">
                            New Calculator Result:
                          </h5>
                          <p className="text-sm mb-2">
                            {scenario.newCalculator.result}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Reason: {scenario.newCalculator.reason}
                          </p>
                          <p className="text-xs text-green-600">
                            Impact: {scenario.newCalculator.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Technical Comparison */}
            <div>
              <h3 className="font-semibold mb-4">⚙️ Technical Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3">Code Complexity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Old Calculator:</span>
                      <Badge variant="destructive">
                        {
                          discussionData.technicalComparison.codeComplexity.old
                            .rating
                        }
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>New Calculator:</span>
                      <Badge variant="default">
                        {
                          discussionData.technicalComparison.codeComplexity.new
                            .rating
                        }
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3">Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Old Calculator:</span>
                      <Badge variant="secondary">
                        {
                          discussionData.technicalComparison.performance.old
                            .rating
                        }
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>New Calculator:</span>
                      <Badge variant="default">
                        {
                          discussionData.technicalComparison.performance.new
                            .rating
                        }
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3">Maintainability</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Old Calculator:</span>
                      <Badge variant="destructive">
                        {
                          discussionData.technicalComparison.maintainability.old
                            .rating
                        }
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>New Calculator:</span>
                      <Badge variant="default">
                        {
                          discussionData.technicalComparison.maintainability.new
                            .rating
                        }
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Impact */}
            <div>
              <h3 className="font-semibold mb-4">💼 Business Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3 text-red-600">
                    Old Calculator
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Fairness:</strong>{" "}
                      {discussionData.businessImpact.fairness.old}
                    </div>
                    <div>
                      <strong>Accuracy:</strong>{" "}
                      {discussionData.businessImpact.accuracy.old}
                    </div>
                    <div>
                      <strong>Reliability:</strong>{" "}
                      {discussionData.businessImpact.reliability.old}
                    </div>
                    <div>
                      <strong>Transparency:</strong>{" "}
                      {discussionData.businessImpact.transparency.old}
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-3 text-green-600">
                    New Calculator
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Fairness:</strong>{" "}
                      {discussionData.businessImpact.fairness.new}
                    </div>
                    <div>
                      <strong>Accuracy:</strong>{" "}
                      {discussionData.businessImpact.accuracy.new}
                    </div>
                    <div>
                      <strong>Reliability:</strong>{" "}
                      {discussionData.businessImpact.reliability.new}
                    </div>
                    <div>
                      <strong>Transparency:</strong>{" "}
                      {discussionData.businessImpact.transparency.new}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conclusion */}
            <div className="p-6 border rounded bg-gradient-to-r from-green-50 to-blue-50">
              <h3 className="font-semibold mb-4 text-center">🎯 Conclusion</h3>
              <p className="text-center mb-4">
                {discussionData.conclusion.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Key Benefits:</h4>
                  <ul className="text-sm space-y-1">
                    {discussionData.conclusion.keyBenefits.map(
                      (benefit: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 mr-2">✅</span>
                          {benefit}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Overall Impact:</h4>
                  <p className="text-sm">{discussionData.conclusion.impact}</p>
                </div>
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

      {/* Old Salary Calculator Debug Results */}
      {oldSalaryDebug && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Old Salary Calculator Debug Results
            </CardTitle>
            <CardDescription>
              Detailed analysis of why the old calculator might not be paying
              teachers with zoom links
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Teacher Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded bg-blue-50">
                <p className="text-sm text-muted-foreground">Teacher</p>
                <p className="font-bold">
                  {oldSalaryDebug.teacherInMainTable?.ustazname ||
                    "Not in main table"}
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {oldSalaryDebug.teacherId}
                </p>
              </div>
              <div className="p-4 border rounded bg-green-50">
                <p className="text-sm text-muted-foreground">
                  Total Zoom Links
                </p>
                <p className="font-bold text-green-600">
                  {oldSalaryDebug.zoomLinkCount}
                </p>
              </div>
              <div className="p-4 border rounded bg-yellow-50">
                <p className="text-sm text-muted-foreground">
                  Period Zoom Links
                </p>
                <p className="font-bold text-yellow-600">
                  {oldSalaryDebug.periodZoomLinks}
                </p>
              </div>
            </div>

            {/* Salary Result */}
            <div className="p-4 border rounded bg-gray-50">
              <h4 className="font-semibold mb-2">Salary Calculation Result</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Salary</p>
                  <p className="font-bold text-lg">
                    {oldSalaryDebug.salaryResult.totalSalary} ETB
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teaching Days</p>
                  <p className="font-bold">
                    {oldSalaryDebug.salaryResult.totalTeachingDays}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Students Found
                  </p>
                  <p className="font-bold">
                    {oldSalaryDebug.salaryResult.studentsCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Students with Earnings
                  </p>
                  <p className="font-bold">
                    {oldSalaryDebug.salaryResult.studentsWithEarnings}
                  </p>
                </div>
              </div>
            </div>

            {/* Students Found by Old Calculator */}
            <div>
              <h4 className="font-semibold mb-2">
                Students Found by Old Calculator
              </h4>
              <div className="mb-4 p-3 border rounded bg-gray-50">
                <p className="text-sm text-muted-foreground">
                  The old calculator found{" "}
                  <strong>{oldSalaryDebug.studentsFound}</strong> students
                </p>
              </div>
              {oldSalaryDebug.studentsDetails &&
              oldSalaryDebug.studentsDetails.length > 0 ? (
                <div className="space-y-2">
                  {oldSalaryDebug.studentsDetails.map(
                    (student: any, index: number) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                          <div>
                            <p className="font-medium">{student.name}</p>
                          </div>
                          <div>
                            <p className="font-medium">Package</p>
                            <p className="text-muted-foreground">
                              {student.package || "None"}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Status</p>
                            <p className="text-muted-foreground">
                              {student.status || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Zoom Links</p>
                            <p className="text-muted-foreground">
                              {student.zoomLinks}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Occupied Times</p>
                            <p className="text-muted-foreground">
                              {student.occupiedTimes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="p-4 border rounded bg-red-50">
                  <p className="text-red-600 font-medium">
                    ❌ No students found by old calculator
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This explains why the salary is 0. The old calculator is not
                    finding any students for this teacher.
                  </p>
                </div>
              )}
            </div>

            {/* Zoom Links Details */}
            <div>
              <h4 className="font-semibold mb-2">Zoom Links Analysis</h4>
              <div className="space-y-2">
                {oldSalaryDebug.zoomLinksDetails.map(
                  (link: any, index: number) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                        <div>
                          <p className="font-medium">{link.studentName}</p>
                          <p className="text-muted-foreground">
                            ID: {link.studentId}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Package</p>
                          <p className="text-muted-foreground">
                            {link.studentPackage || "None"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Status</p>
                          <p className="text-muted-foreground">
                            {link.studentStatus || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Assigned To</p>
                          <p className="text-muted-foreground">
                            {link.studentAssignedTo || "None"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Package Salary</p>
                          <p className="text-muted-foreground">
                            {link.packageSalary || "Not configured"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Zoom Date</p>
                          <p className="text-muted-foreground">
                            {link.sentTime?.split("T")[0]}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Student Breakdown */}
            <div>
              <h4 className="font-semibold mb-2">
                Student Breakdown from Old Calculator
              </h4>
              <div className="space-y-2">
                {oldSalaryDebug.salaryResult.studentBreakdown.map(
                  (student: any, index: number) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                        <div>
                          <p className="font-medium">{student.name}</p>
                        </div>
                        <div>
                          <p className="font-medium">Package</p>
                          <p className="text-muted-foreground">
                            {student.package || "None"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Monthly Rate</p>
                          <p className="text-muted-foreground">
                            {student.monthlyRate} ETB
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Daily Rate</p>
                          <p className="text-muted-foreground">
                            {student.dailyRate} ETB
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Days Worked</p>
                          <p className="text-muted-foreground">
                            {student.daysWorked}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Total Earned</p>
                          <p
                            className={`font-bold ${
                              student.totalEarned > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {student.totalEarned} ETB
                          </p>
                        </div>
                      </div>
                      {student.hasZoomLinks && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          ✅ This student has zoom links but earned{" "}
                          {student.totalEarned} ETB
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Package Salaries */}
            <div>
              <h4 className="font-semibold mb-2">Available Package Salaries</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {oldSalaryDebug.packageSalaries.map(
                  (pkg: any, index: number) => (
                    <div key={index} className="p-2 border rounded text-sm">
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-muted-foreground">{pkg.salary} ETB</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
