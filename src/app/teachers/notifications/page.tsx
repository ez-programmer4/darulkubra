"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherNotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      const res = await fetch("/api/teachers/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
      setLoading(false);
    }
    fetchNotifications();
  }, []);

  if (loading) return <div className="p-8">Loading notifications...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <div>No notifications.</div>
      ) : (
        notifications.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-60" : "border-primary"}>
            <CardHeader>
              <CardTitle>{n.type.replace("_", " ").toUpperCase()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">{n.message}</div>
              <div className="text-xs text-gray-500">
                {new Date(n.createdAt).toLocaleString()}
              </div>
              {!n.read && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    await fetch(`/api/teachers/notifications/${n.id}/read`, {
                      method: "POST",
                    });
                    setNotifications((prev) =>
                      prev.map((x) =>
                        x.id === n.id ? { ...x, read: true } : x
                      )
                    );
                  }}
                >
                  Mark as read
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
