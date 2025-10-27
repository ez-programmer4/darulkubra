"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface ZoomStatus {
  connected: boolean;
  connectedAt?: string;
  teacherName?: string;
}

export function ZoomConnectionCard() {
  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkZoomStatus();
  }, []);

  const checkZoomStatus = async () => {
    try {
      const res = await fetch("/api/zoom/oauth/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to check Zoom status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = "/api/zoom/oauth/authorize";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Zoom account?")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/zoom/oauth/disconnect", {
        method: "POST",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Zoom account disconnected successfully",
        });
        setStatus({ connected: false });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Zoom account",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Zoom Account</h3>

          {status?.connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>
              {status.connectedAt && (
                <p className="text-sm text-gray-500">
                  Connected on{" "}
                  {new Date(status.connectedAt).toLocaleDateString()}
                </p>
              )}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  ✅ Auto-Create Meetings Enabled
                </p>
                <p className="text-xs text-blue-700">
                  Your Zoom account will automatically create 30-minute meetings
                  for your classes. No need to manually create links!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Not Connected</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Connect your Zoom account to automatically create meetings for
                your classes.
              </p>
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-900 font-medium mb-1">
                  💡 Benefits of Connecting:
                </p>
                <ul className="text-xs text-amber-700 space-y-1 ml-4 list-disc">
                  <li>No need to manually create Zoom links</li>
                  <li>Automatic meeting creation (30 min sessions)</li>
                  <li>Accurate duration tracking for salary</li>
                  <li>Works with free Zoom accounts (40 min limit)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="ml-4">
          {status?.connected ? (
            <Button
              onClick={handleDisconnect}
              variant="outline"
              size="sm"
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : (
            <Button onClick={handleConnect} size="sm">
              Connect Zoom
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

















