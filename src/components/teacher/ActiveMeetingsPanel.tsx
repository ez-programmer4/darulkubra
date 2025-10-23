"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Video, Users, Monitor, Radio } from "lucide-react";

interface Meeting {
  id: number;
  meeting_id: string;
  start_url: string;
  join_url: string;
  topic: string;
  student_id: number;
  student_name: string;
  scheduled_time?: string;
  started_at?: string;
  participant_count?: number;
}

interface ActiveMeetings {
  ready_to_start: Meeting[];
  in_progress: Meeting[];
  upcoming: Meeting[];
}

export default function ActiveMeetingsPanel() {
  const [meetings, setMeetings] = useState<ActiveMeetings>({
    ready_to_start: [],
    in_progress: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);
  const [startingMeeting, setStartingMeeting] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveMeetings();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveMeetings, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveMeetings = async () => {
    try {
      const response = await fetch("/api/teachers/meetings/active");
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMeeting = async (meetingId: string, startUrl: string) => {
    try {
      setStartingMeeting(meetingId);

      // Record that teacher clicked start button
      await fetch(`/api/teachers/meetings/start/${meetingId}`, {
        method: "POST",
      });

      // Open meeting in new window
      window.open(startUrl, "_blank", "noopener,noreferrer");

      // Refresh meetings after 2 seconds
      setTimeout(fetchActiveMeetings, 2000);
    } catch (error) {
      console.error("Error starting meeting:", error);
    } finally {
      setStartingMeeting(null);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMinutesUntil = (dateString?: string) => {
    if (!dateString) return null;
    const now = new Date();
    const scheduled = new Date(dateString);
    const diff = scheduled.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading meetings...</p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyMeetings =
    meetings.ready_to_start.length > 0 ||
    meetings.in_progress.length > 0 ||
    meetings.upcoming.length > 0;

  if (!hasAnyMeetings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No upcoming or active meetings
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Your Zoom Meetings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ready to Start Meetings */}
        {meetings.ready_to_start.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-green-600 flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse" />
              Ready to Start
            </h3>
            {meetings.ready_to_start.map((meeting) => {
              const minutesUntil = getMinutesUntil(meeting.scheduled_time);
              return (
                <div
                  key={meeting.id}
                  className="border border-green-200 rounded-lg p-4 bg-green-50 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">
                        {meeting.topic}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        {meeting.student_name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {formatTime(meeting.scheduled_time)}
                        {minutesUntil !== null && minutesUntil < 0 && (
                          <Badge variant="destructive" className="ml-2">
                            Started {Math.abs(minutesUntil)} min ago
                          </Badge>
                        )}
                        {minutesUntil !== null && minutesUntil >= 0 && (
                          <Badge className="ml-2 bg-orange-500">
                            Starts in {minutesUntil} min
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      handleStartMeeting(meeting.meeting_id, meeting.start_url)
                    }
                    disabled={startingMeeting === meeting.meeting_id}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Video className="mr-2 h-5 w-5" />
                    {startingMeeting === meeting.meeting_id
                      ? "Opening..."
                      : "Start Meeting Now"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* In Progress Meetings */}
        {meetings.in_progress.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse" />
              In Progress
            </h3>
            {meetings.in_progress.map((meeting) => (
              <div
                key={meeting.id}
                className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{meeting.topic}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      {meeting.student_name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {meeting.participant_count || 0} participant
                      {meeting.participant_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Badge className="bg-blue-600">Live</Badge>
                </div>
                <Button
                  onClick={() =>
                    handleStartMeeting(meeting.meeting_id, meeting.start_url)
                  }
                  disabled={startingMeeting === meeting.meeting_id}
                  className="w-full"
                  variant="outline"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  {startingMeeting === meeting.meeting_id
                    ? "Opening..."
                    : "Join Meeting"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Meetings */}
        {meetings.upcoming.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600">
              Upcoming Today
            </h3>
            {meetings.upcoming.map((meeting) => {
              const minutesUntil = getMinutesUntil(meeting.scheduled_time);
              return (
                <div
                  key={meeting.id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {meeting.student_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTime(meeting.scheduled_time)}
                        {minutesUntil !== null && (
                          <span className="text-gray-400">
                            (in {minutesUntil} min)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}








