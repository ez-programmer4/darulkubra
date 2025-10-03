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
  salaryPerStudent: number;
  createdAt: string;
  updatedAt: string;
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
      const response = await fetch("/api/admin/package-salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Package salary created successfully",
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
    setEditingSalary(salary);
    setFormData({
      packageName: salary.packageName,
      salaryPerStudent: salary.salaryPerStudent,
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

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
                    {editingSalary
                      ? "Edit Package Salary"
                      : "Add Package Salary"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure monthly salary per student for this package type
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
                      {editingSalary ? "Update" : "Create"}
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
                <strong>Monthly Salary:</strong> Base amount paid per student
                per month for this package
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiCalendar className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Daily Rate Calculation:</strong> Monthly salary ÷
                working days in month
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FiUsers className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <strong>Per Student:</strong> Each student with this package
                generates this amount monthly
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
            Manage monthly salary per student for each package type
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <FiRefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading package salaries...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="p-8 text-center">
              <FiDollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No package salaries configured</p>
              <p className="text-sm text-gray-500">
                Add your first package salary above
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
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiDollarSign className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(salary.salaryPerStudent)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(salary.updatedAt).toLocaleDateString()}
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
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(salary.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </Button>
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
