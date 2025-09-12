"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, subDays } from "date-fns";
import { FiCheck, FiLoader, FiDollarSign } from "react-icons/fi";

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function AbsenceSettingsPage() {
  const [permissionReasons, setPermissionReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/absence-settings");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        setPermissionReasons(data.permissionReasons || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not fetch settings.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    try {
      const response = await fetch("/api/admin/absence-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissionReasons,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast({
        title: "Success",
        description: "Settings saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save settings.",
        variant: "destructive",
      });
    }
  };

  const addReason = () => {
    if (newReason.trim() && !permissionReasons.includes(newReason.trim())) {
      setPermissionReasons([...permissionReasons, newReason.trim()]);
      setNewReason("");
    }
  };

  const removeReason = (reasonToRemove: string) => {
    setPermissionReasons(
      permissionReasons.filter((reason) => reason !== reasonToRemove)
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Absence & Permission Settings
        </h1>
        <p className="text-muted-foreground">
          Configure the rules for teacher absences, including financial
          deductions and acceptable reasons for permission requests.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PackageDeductionManager type="absence" />
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Permission Reasons</CardTitle>
              <CardDescription>
                Manage the list of pre-approved reasons that teachers can select
                from when requesting time off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {permissionReasons.map((reason) => (
                  <div key={reason} className="flex items-center gap-2">
                    <Input value={reason} readOnly className="flex-grow" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReason(reason)}
                      aria-label={`Remove ${reason}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Input
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Add a new reason"
                  onKeyDown={(e) => e.key === "Enter" && addReason()}
                />
                <Button onClick={addReason}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save All Settings
        </Button>
      </div>
    </div>
  );
}

// Package Deduction Manager Component
function PackageDeductionManager({ type }: { type: 'lateness' | 'absence' }) {
  const [packageDeductions, setPackageDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackageDeductions();
  }, []);

  const fetchPackageDeductions = async () => {
    try {
      const response = await fetch('/api/admin/package-deductions');
      if (response.ok) {
        const data = await response.json();
        setPackageDeductions(data);
      }
    } catch (error) {
      console.error('Failed to fetch package deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (packageName: string, amount: number) => {
    setSaving(packageName);
    try {
      const existing = packageDeductions.find(p => p.packageName === packageName);
      const payload = {
        packageName,
        latenessBaseAmount: type === 'lateness' ? amount : (existing?.latenessBaseAmount || 30),
        absenceBaseAmount: type === 'absence' ? amount : (existing?.absenceBaseAmount || 25)
      };

      const response = await fetch('/api/admin/package-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({ title: 'Success', description: `${packageName} ${type} deduction updated` });
        fetchPackageDeductions();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save package deduction', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const updateAmount = (packageName: string, amount: number) => {
    setPackageDeductions(prev => {
      const existing = prev.find(p => p.packageName === packageName);
      if (existing) {
        return prev.map(p => 
          p.packageName === packageName 
            ? { ...p, [type === 'lateness' ? 'latenessBaseAmount' : 'absenceBaseAmount']: amount }
            : p
        );
      } else {
        return [...prev, {
          id: 0,
          packageName,
          latenessBaseAmount: type === 'lateness' ? amount : 30,
          absenceBaseAmount: type === 'absence' ? amount : 25
        }];
      }
    });
  };

  const commonPackages = ['0 Fee', '3 days', '5 days', 'Europe'];

  if (loading) return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiDollarSign className="h-5 w-5" />
          Package-Specific {type === 'lateness' ? 'Lateness' : 'Absence'} Base Deductions
        </CardTitle>
        <CardDescription>
          Set different base deduction amounts for each package type. These amounts are used as the base for calculations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commonPackages.map((packageName) => {
            const existing = packageDeductions.find(p => p.packageName === packageName);
            const currentAmount = existing?.[type === 'lateness' ? 'latenessBaseAmount' : 'absenceBaseAmount'] || (type === 'lateness' ? 30 : 25);

            return (
              <div key={packageName} className="border rounded-lg p-4">
                <Label className="font-semibold mb-2 block">{packageName}</Label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => updateAmount(packageName, Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                  <Button
                    onClick={() => handleSave(packageName, currentAmount)}
                    disabled={saving === packageName}
                    size="sm"
                    className="w-full"
                  >
                    {saving === packageName ? (
                      <FiLoader className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <FiCheck className="h-4 w-4 mr-2" />
                    )}
                    {saving === packageName ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
