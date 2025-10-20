import { prisma } from "@/lib/prisma";

export interface ZoomMeetingConfig {
  topic: string;
  type: 1 | 2; // 1 = Instant meeting, 2 = Scheduled meeting
  start_time: string; // ISO 8601 format
  duration: number; // in minutes
  timezone: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    watermark?: boolean;
    use_pmi?: boolean;
    approval_type?: number;
    audio?: string;
    auto_recording?: string;
    waiting_room?: boolean;
  };
}

export interface ZoomMeeting {
  id: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  start_url: string;
  join_url: string;
}

export class ZoomService {
  private static ZOOM_API_BASE = "https://api.zoom.us/v2";

  /**
   * Refresh access token if expired
   */
  static async refreshAccessToken(teacherId: string): Promise<string> {
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: {
        zoom_refresh_token: true,
        zoom_token_expires_at: true,
        zoom_access_token: true,
      },
    });

    if (!teacher?.zoom_refresh_token) {
      throw new Error("Teacher Zoom account not connected");
    }

    // Check if token is still valid (with 5 min buffer)
    const now = new Date();
    const expiresAt = teacher.zoom_token_expires_at;
    if (expiresAt && expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      return teacher.zoom_access_token!;
    }

    // Refresh the token with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: teacher.zoom_refresh_token,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to refresh Zoom token: ${error}`);
      }

      const data = await response.json();

      // Update tokens in database
      const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      await prisma.wpos_wpdatatable_24.update({
        where: { ustazid: teacherId },
        data: {
          zoom_access_token: data.access_token,
          zoom_refresh_token: data.refresh_token || teacher.zoom_refresh_token,
          zoom_token_expires_at: newExpiresAt,
        },
      });

      return data.access_token;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Zoom token refresh timed out - please try again");
      }
      throw error;
    }
  }

  /**
   * Get teacher's Zoom user info
   */
  static async getZoomUser(accessToken: string) {
    const response = await fetch(`${this.ZOOM_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Zoom user info");
    }

    return response.json();
  }

  /**
   * Create a scheduled Zoom meeting
   */
  static async createMeeting(
    teacherId: string,
    config: ZoomMeetingConfig
  ): Promise<ZoomMeeting> {
    const accessToken = await this.refreshAccessToken(teacherId);

    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { zoom_user_id: true },
    });

    if (!teacher?.zoom_user_id) {
      throw new Error("Teacher Zoom user ID not found");
    }

    // Create meeting with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(
        `${this.ZOOM_API_BASE}/users/${teacher.zoom_user_id}/meetings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Failed to create Zoom meeting: ${
            error.message || response.statusText
          }`
        );
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Zoom meeting creation timed out - please try again");
      }
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  static async getMeeting(teacherId: string, meetingId: string): Promise<any> {
    const accessToken = await this.refreshAccessToken(teacherId);

    const response = await fetch(
      `${this.ZOOM_API_BASE}/meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch meeting details");
    }

    return response.json();
  }

  /**
   * Delete a meeting
   */
  static async deleteMeeting(
    teacherId: string,
    meetingId: string
  ): Promise<void> {
    const accessToken = await this.refreshAccessToken(teacherId);

    const response = await fetch(
      `${this.ZOOM_API_BASE}/meetings/${meetingId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error("Failed to delete meeting");
    }
  }

  /**
   * Get past meeting details (for duration tracking)
   */
  static async getPastMeetingDetails(
    teacherId: string,
    meetingId: string
  ): Promise<any> {
    const accessToken = await this.refreshAccessToken(teacherId);

    const response = await fetch(
      `${this.ZOOM_API_BASE}/past_meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch past meeting details");
    }

    return response.json();
  }

  /**
   * Check if teacher has Zoom connected
   */
  static async isZoomConnected(teacherId: string): Promise<boolean> {
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid: teacherId },
      select: { zoom_access_token: true, zoom_refresh_token: true },
    });

    return !!(teacher?.zoom_access_token && teacher?.zoom_refresh_token);
  }

  /**
   * Disconnect Zoom account
   */
  static async disconnectZoom(teacherId: string): Promise<void> {
    await prisma.wpos_wpdatatable_24.update({
      where: { ustazid: teacherId },
      data: {
        zoom_user_id: null,
        zoom_access_token: null,
        zoom_refresh_token: null,
        zoom_token_expires_at: null,
        zoom_connected_at: null,
      },
    });
  }
}
