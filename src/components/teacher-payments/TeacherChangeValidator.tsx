"use client";

import React, { useState, useEffect } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiRefreshCw,
  FiCalendar,
  FiUsers,
  FiDollarSign,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

interface TeacherChangeConflict {
  studentId: number;
  studentName: string;
  oldTeacherId: string;
  oldTeacherName: string;
  newTeacherId: string;
  newTeacherName: string;
  changeDate: string;
  conflictType: "overlapping_payment" | "duplicate_assignment";
  message: string;
}

interface TeacherChangeValidationResult {
  hasConflicts: boolean;
  conflicts: TeacherChangeConflict[];
  warnings: string[];
  recommendations: string[];
}

interface TeacherChangeSummary {
  totalChanges: number;
  changes: Array<{
    studentId: number;
    oldTeacher: string;
    newTeacher: string;
    changeDate: string;
  }>;
  affectedStudents: number;
  affectedTeachers: number;
}

interface TeacherChangeValidatorProps {
  period: string;
  onClose: () => void;
}

function TeacherChangeValidator({
  period,
  onClose,
}: TeacherChangeValidatorProps) {
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] =
    useState<TeacherChangeValidationResult | null>(null);
  const [summary, setSummary] = useState<TeacherChangeSummary | null>(null);

  const validateChanges = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/teacher-changes/validate?period=${period}`
      );
      if (!response.ok) {
        throw new Error("Failed to validate teacher changes");
      }

      const data = await response.json();
      setValidation(data.validation);
      setSummary(data.summary);

      if (data.validation.hasConflicts) {
        toast({
          title: "Validation Issues Found",
          description: `${data.validation.conflicts.length} conflicts detected`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Validation Complete",
          description: "No conflicts found",
        });
      }
    } catch (error) {
      console.error("Error validating teacher changes:", error);
      toast({
        title: "Error",
        description: "Failed to validate teacher changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateChanges();
  }, [period]);

  const getConflictIcon = (type: string) => {
    switch (type) {
      case "overlapping_payment":
        return <FiDollarSign className="w-4 h-4 text-red-500" />;
      case "duplicate_assignment":
        return <FiUsers className="w-4 h-4 text-orange-500" />;
      default:
        return <FiAlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConflictBadge = (type: string) => {
    switch (type) {
      case "overlapping_payment":
        return (
          <Badge variant="destructive" className="text-xs">
            Payment Conflict
          </Badge>
        );
      case "duplicate_assignment":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-orange-50 text-orange-700 border-orange-200"
          >
            Assignment Conflict
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Changes
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalChanges}
                  </p>
                </div>
                <FiCalendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Affected Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.affectedStudents}
                  </p>
                </div>
                <FiUsers className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Affected Teachers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.affectedTeachers}
                  </p>
                </div>
                <FiUsers className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conflicts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {validation?.conflicts.length || 0}
                  </p>
                </div>
                <FiAlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="space-y-4">
          {/* Conflicts */}
          {validation.conflicts.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <FiXCircle className="w-5 h-5" />
                  Conflicts Found ({validation.conflicts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {validation.conflicts.map((conflict, index) => (
                    <div
                      key={index}
                      className="border border-red-200 rounded-lg p-4 bg-red-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getConflictIcon(conflict.conflictType)}
                          <span className="font-medium text-red-900">
                            Student: {conflict.studentName}
                          </span>
                        </div>
                        {getConflictBadge(conflict.conflictType)}
                      </div>
                      <div className="text-sm text-red-700 mb-2">
                        <p>
                          <strong>From:</strong> {conflict.oldTeacherName} (
                          {conflict.oldTeacherId})
                        </p>
                        <p>
                          <strong>To:</strong> {conflict.newTeacherName} (
                          {conflict.newTeacherId})
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date(conflict.changeDate).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-red-800 font-medium">
                        {conflict.message}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader className="bg-yellow-50">
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <FiAlertTriangle className="w-5 h-5" />
                  Warnings ({validation.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {validation.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm text-yellow-700"
                    >
                      <FiInfo className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {validation.recommendations.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <FiCheckCircle className="w-5 h-5" />
                  Recommendations ({validation.recommendations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {validation.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm text-blue-700"
                    >
                      <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Issues */}
          {!validation.hasConflicts && validation.warnings.length === 0 && (
            <Card className="border-green-200">
              <CardContent className="p-6 text-center">
                <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  No Issues Found
                </h3>
                <p className="text-green-700">
                  All teacher changes for this period have been validated
                  successfully.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={validateChanges}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Validation
        </Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default TeacherChangeValidator;
