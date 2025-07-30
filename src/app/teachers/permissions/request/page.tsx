"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FiArrowLeft, FiInfo, FiCheckCircle } from "react-icons/fi";

export default function RequestPermissionPage() {
  const { user, isLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [permissionReasons, setPermissionReasons] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequests, setExistingRequests] = useState<any[]>([]);

  useEffect(() => {
    // Fetch permission reasons from new admin API
    const fetchReasons = async () => {
      try {
        const response = await fetch("/api/admin/permission-reasons");
        if (response.ok) {
          const data = await response.json();
          setPermissionReasons(
            Array.isArray(data) ? data.map((r: any) => r.reason) : []
          );
        }
      } catch (error) {
        console.error("Failed to fetch permission reasons:", error);
      }
    };
    fetchReasons();

    // Fetch existing permission requests for this teacher
    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/teachers/permissions");
        if (res.ok) {
          const data = await res.json();
          setExistingRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        // ignore
      }
    };
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check for duplicate date on frontend
    if (existingRequests.some((req) => req.requestedDates === date)) {
      toast({
        title: "Error",
        description:
          "You have already submitted a permission request for this date.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teachers/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          reason,
          details,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to submit permission request";
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) errorMsg = errorData.error;
        } catch {}
        throw new Error(errorMsg);
      }

      setSubmitted(true);
      toast({
        title: "Success",
        description: "Permission request submitted successfully.",
      });

      setTimeout(() => {
        router.push("/teachers/dashboard");
      }, 1800);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit permission request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 p-8 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-10 flex flex-col items-center">
          <FiCheckCircle className="text-green-500 text-5xl mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Request Submitted!
          </h2>
          <p className="text-green-700 mb-4 text-center">
            Your permission request has been sent to the admin team. You will be
            notified once it is reviewed.
          </p>
          <Button
            onClick={() => router.push("/teachers/dashboard")}
            className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:from-green-700 hover:to-teal-700"
          >
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </Button>
        </div>
        <style jsx global>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: none;
            }
          }
          .animate-fade-in {
            animation: fade-in 0.4s ease;
          }
          .animate-bounce {
            animation: bounce 1s infinite alternate;
          }
          @keyframes bounce {
            from {
              transform: translateY(0);
            }
            to {
              transform: translateY(-10px);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/teachers/dashboard")}
            className="flex items-center gap-2 px-4 py-2 border-green-200 text-green-700 hover:bg-green-50"
          >
            <FiArrowLeft /> Back to Dashboard
          </Button>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 animate-fade-in">
          <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 border-l-4 border-green-400 rounded">
            <FiInfo className="text-green-500 text-2xl" />
            <div>
              <div className="font-semibold text-green-800 mb-1">
                How Permission Requests Work
              </div>
              <div className="text-green-900 text-sm">
                Use this form to request permission for an absence. Please
                provide the date, select a reason, and add any additional
                details. Your request will be reviewed by the admin team, and
                you will be notified of the decision.
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Request Permission for Absence
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date of Absence</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border-green-200 focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="border-green-200 focus:ring-2 focus:ring-green-400">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {permissionReasons.map((r) => (
                    <SelectItem key={r} value={r} className="hover:bg-green-50">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Additional Details</Label>
              <Textarea
                id="details"
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please provide more information about your absence..."
                className="min-h-[100px] border-green-200 focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-24 border-green-200 text-green-700 hover:bg-green-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-24 bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting
                  </div>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </form>
        </div>
        <style jsx global>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: none;
            }
          }
          .animate-fade-in {
            animation: fade-in 0.4s ease;
          }
        `}</style>
      </div>
    </div>
  );
}
