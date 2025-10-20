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
  FiUsers,
  FiCalendar,
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

interface PackageSalary {
  id: number;
  packageName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeStudentCount: number;
  salaryConfigured: boolean;
  salaryPerStudent: number;
  salaryId: number | null;
  salaryCreatedAt: string | null;
  salaryUpdatedAt: string | null;
}

export default function PackageSalariesPage() {
  const [salaries, setSalaries] = useState<PackageSalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSalary, setEditingSalary] = useState<PackageSalary | null>(
    null
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    packageName: "",
    salaryPerStudent: 0,
  });

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/package-salaries");
      if (response.ok) {
        const data = await response.json();
        setSalaries(data);
      } else {
        throw new Error("Failed to fetch salaries");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch package salaries",
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

    if (formData.salaryPerStudent <= 0) {
      toast({
        title: "Error",
        description: "Salary per student must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if we're editing an existing salary or creating a new one
      const isEditing =
        editingSalary?.salaryConfigured && editingSalary?.salaryId;
      const url = isEditing
        ? `/api/admin/package-salaries/${editingSalary.salaryId}`
        : "/api/admin/package-salaries";
      const method = isEditing ? "PUT" : "POST";

      console.log("Saving package salary:");
      console.log("- isEditing:", isEditing);
      console.log("- editingSalary:", editingSalary);
      console.log("- method:", method);
      console.log("- url:", url);
      console.log("- formData:", formData);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: isEditing
            ? "Package salary updated successfully"
            : "Package salary created successfully",
        });
        fetchSalaries();
        setShowAddDialog(false);
        setEditingSalary(null);
        setFormData({
          packageName: "",
          salaryPerStudent: 0,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save salary");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save package salary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (salary: PackageSalary) => {
    console.log("Editing salary:", salary);
    console.log("Salary configured:", salary.salaryConfigured);
    console.log("Salary ID:", salary.salaryId);
    setEditingSalary(salary);
    setFormData({
      packageName: salary.packageName,
      salaryPerStudent: salary.salaryConfigured ? salary.salaryPerStudent : 0,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this package salary?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/package-salaries/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Package salary deleted successfully",
        });
        fetchSalaries();
      } else {
        throw new Error("Failed to delete salary");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete package salary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      packageName: "",
      salaryPerStudent: 0,
    });
    setEditingSalary(null);
    setShowAddDialog(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Package Salaries</h1>
            <p className="text-green-100 mt-1">
              Configure monthly salary per student for each package type
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchSalaries}
              disabled={loading}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-green-600"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Dialog
              open={showAddDialog}
              onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-white hover:bg-gray-100 text-green-600"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FiDollarSign className="w-5 h-5" />
                    {editingSalary?.salaryConfigured
                      ? "Edit Package Salary"
                      : "Configure Package Salary"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSalary?.salaryConfigured
                      ? "Update monthly salary per student for this package type"
                      : "Set monthly salary per student for this package type"}
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
                      placeholder="e.g., est 3 Fee, Premium Package"
                      className="mt-1"
                      disabled={editingSalary?.salaryConfigured}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Monthly Salary per Student (ETB)
                    </label>
                    <Input
                      type="number"
                      value={formData.salaryPerStudent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salaryPerStudent: Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 900"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      <FiSave className="w-4 h-4 mr-2" />
                      {editingSalary?.salaryConfigured ? "Update" : "Configure"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <FiAlertTriangle className="w-5 h-5" />
            How Package Salaries Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-green-700">
            <div className="flex items-start gap-2">
              <FiDollarSign className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Package Management:</strong> All student packages are
                listed here for salary configuration
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiUsers className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Active Students:</strong> Shows how many students are
                currently using each package
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiCheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Configuration Status:</strong> Configured packages have
                salary settings, unconfigured ones need setup
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiCalendar className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Salary Calculation:</strong> Monthly salary ÷ working
                days = daily rate per student
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salaries Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <FiDollarSign className="w-5 h-5" />
            Package Salary Configuration
          </CardTitle>
          <CardDescription>
            View all student packages and configure salary settings for each
            package type
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <FiRefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading student packages...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="p-8 text-center">
              <FiDollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
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
                      Salary Configuration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Salary per Student
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
                  {salaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FiUsers className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {salary.packageName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {salary.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              salary.activeStudentCount > 0
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <FiUsers className="w-3 h-3 mr-1 inline" />
                            {salary.activeStudentCount} active
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {salary.salaryConfigured ? (
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
                          {salary.salaryConfigured ? (
                            <>
                              <FiDollarSign className="w-4 h-4 text-green-500 mr-2" />
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(salary.salaryPerStudent)}
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
                        {salary.salaryConfigured && salary.salaryUpdatedAt
                          ? new Date(
                              salary.salaryUpdatedAt
                            ).toLocaleDateString()
                          : new Date(salary.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(salary)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiEdit className="w-4 h-4" />
                            {salary.salaryConfigured ? "Edit" : "Configure"}
                          </Button>
                          {salary.salaryConfigured && salary.salaryId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(salary.salaryId!)}
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
