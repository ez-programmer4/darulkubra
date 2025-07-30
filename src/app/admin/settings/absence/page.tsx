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
        <div className="lg:col-span-2 space-y-6"></div>

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
