"use client";

import { useState, useEffect } from "react";
import {
  FiSettings,
  FiSave,
  FiRefreshCw,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiDollarSign,
  FiClock,
  FiUsers,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PackageDeduction {
  id: number;
  packageName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeStudentCount: number;
  deductionConfigured: boolean;
  latenessBaseAmount: number;
  absenceBaseAmount: number;
  deductionId: number | null;
  deductionCreatedAt: string | null;
  deductionUpdatedAt: string | null;
}

export default function PackageDeductionsPage() {
  const [deductions, setDeductions] = useState<PackageDeduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDeduction, setEditingDeduction] =
    useState<PackageDeduction | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    packageName: "",
    latenessBaseAmount: 30,
    absenceBaseAmount: 25,
  });

  useEffect(() => {
    fetchDeductions();
  }, []);

  const fetchDeductions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/package-deductions");
      if (response.ok) {
        const data = await response.json();
        setDeductions(data);
      } else {
        throw new Error("Failed to fetch deductions");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch package deductions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.packageName.trim()) {
      toast({
        title: "Error",
        description: "Package name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // If editingDeduction exists AND has a valid deductionId, update; otherwise create new
      const hasExistingDeduction =
        editingDeduction && editingDeduction.deductionId;

      const url = hasExistingDeduction
        ? `/api/admin/package-deductions/${editingDeduction.deductionId}`
        : "/api/admin/package-deductions";

      const method = hasExistingDeduction ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: hasExistingDeduction
            ? "Package deduction updated successfully"
            : "Package deduction created successfully",
        });
        fetchDeductions();
        setShowAddDialog(false);
        setEditingDeduction(null);
        setFormData({
          packageName: "",
          latenessBaseAmount: 30,
          absenceBaseAmount: 25,
        });
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to save deduction"
        );
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save package deduction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (deduction: PackageDeduction) => {
    setEditingDeduction(deduction);
    setFormData({
      packageName: deduction.packageName,
      latenessBaseAmount: deduction.deductionConfigured
        ? deduction.latenessBaseAmount
        : 30,
      absenceBaseAmount: deduction.deductionConfigured
        ? deduction.absenceBaseAmount
        : 25,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this package deduction?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/package-deductions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Package deduction deleted successfully",
        });
        fetchDeductions();
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to delete deduction"
        );
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete package deduction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      packageName: "",
      latenessBaseAmount: 30,
      absenceBaseAmount: 25,
    });
    setEditingDeduction(null);
    setShowAddDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Package Deductions</h1>
            <p className="text-purple-100 mt-1">
              Configure base deduction amounts for lateness and absence by
              package type
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchDeductions}
              disabled={loading}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-purple-600"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-white hover:bg-gray-100 text-purple-600"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FiSettings className="w-5 h-5" />
                    {editingDeduction?.deductionConfigured
                      ? "Edit Package Deduction"
                      : "Configure Package Deduction"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDeduction?.deductionConfigured
                      ? "Update base deduction amounts for this package type"
                      : "Set base deduction amounts for this package type"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Package Name
                    </label>
                    <Input
                      value={formData.packageName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          packageName: e.target.value,
                        })
                      }
                      placeholder="e.g., 3 days, 5 days, Premium"
                      className="mt-1"
                      disabled={editingDeduction?.deductionConfigured}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Lateness Base Amount (ETB)
                    </label>
                    <Input
                      type="number"
                      value={formData.latenessBaseAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          latenessBaseAmount: Number(e.target.value),
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Absence Base Amount (ETB)
                    </label>
                    <Input
                      type="number"
                      value={formData.absenceBaseAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          absenceBaseAmount: Number(e.target.value),
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      <FiSave className="w-4 h-4 mr-2" />
                      {editingDeduction?.deductionConfigured
                        ? "Update"
                        : "Configure"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FiAlertTriangle className="w-5 h-5" />
            How Package Deductions Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <FiSettings className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <strong>Package Management:</strong> All student packages are
                listed here for deduction configuration
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiUsers className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <strong>Active Students:</strong> Shows how many students are
                currently using each package
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <strong>Configuration Status:</strong> Configured packages have
                deduction settings, unconfigured ones need setup
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiClock className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <strong>Deduction Types:</strong> Lateness and absence base
                amounts per student per package
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <FiSettings className="w-5 h-5" />
            Package Deduction Configuration
          </CardTitle>
          <CardDescription>
            View all student packages and configure deduction settings for each
            package type
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading student packages...</p>
            </div>
          ) : deductions.length === 0 ? (
            <div className="p-8 text-center">
              <FiSettings className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No student packages found</p>
              <p className="text-sm text-gray-500">
                Student packages will appear here when they are created in the
                system
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Students
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deduction Configuration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lateness Base Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absence Base Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deductions.map((deduction) => (
                    <tr key={deduction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiUsers className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {deduction.packageName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {deduction.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              deduction.activeStudentCount > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <FiUsers className="w-3 h-3 mr-1 inline" />
                            {deduction.activeStudentCount} active
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {deduction.deductionConfigured ? (
                            <div className="flex items-center text-green-600">
                              <FiCheckCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">
                                Configured
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center text-orange-600">
                              <FiAlertTriangle className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">
                                Not Configured
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {deduction.deductionConfigured ? (
                            <>
                              <FiClock className="w-4 h-4 text-orange-500 mr-2" />
                              <span className="text-sm text-gray-900">
                                ETB {deduction.latenessBaseAmount}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              Not set
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {deduction.deductionConfigured ? (
                            <>
                              <FiUsers className="w-4 h-4 text-red-500 mr-2" />
                              <span className="text-sm text-gray-900">
                                ETB {deduction.absenceBaseAmount}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              Not set
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {deduction.deductionConfigured &&
                        deduction.deductionUpdatedAt
                          ? new Date(
                              deduction.deductionUpdatedAt
                            ).toLocaleDateString()
                          : new Date(deduction.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(deduction)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiEdit className="w-4 h-4" />
                            {deduction.deductionConfigured
                              ? "Edit"
                              : "Configure"}
                          </Button>
                          {deduction.deductionConfigured &&
                            deduction.deductionId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDelete(deduction.deductionId!)
                                }
                                className="text-red-600 hover:text-red-800"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
