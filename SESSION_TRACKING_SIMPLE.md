# Session Duration Tracking - Simple & Clean

## How It Works

### 1. Student Clicks Link

- Student clicks Telegram button
- System records `clicked_at` timestamp (START)
- Student redirects directly to Zoom (app on mobile, web on desktop)
- Session status set to "active"

### 2. Meeting Happens

- Teacher and student in Zoom meeting
- System waits...

### 3. Auto-Timeout Ends Session

- Cron job runs every 5 minutes
- Checks all active sessions
- If session age >= (package duration + 10 min buffer):
  - Records `session_ended_at`
  - Calculates `session_duration_minutes`
  - Sets `session_status` to "timeout"

## Configuration

### Auto-Timeout Logic

```javascript
// Package durations
Europe: 60 minutes
USA: 60 minutes
Canada: 60 minutes
0 Fee: 30 minutes
Default: 60 minutes

// Auto-end after
Max Duration = Package Duration + 10 minutes

Example:
- Europe package → auto-end after 70 minutes
- 0 Fee package → auto-end after 40 minutes
```

### Cron Schedule

- Runs every 5 minutes
- Schedule: `*/5 * * * *`
- Defined in `vercel.json`

## Admin Dashboard

### Features

- View all sessions with durations
- Filter by date and status
- Search by teacher/student name
- Live duration for active sessions
- Export to CSV
- Auto-refresh every 30 seconds
- Manual "Auto-Timeout" trigger button

### Duration Display

- **Active sessions**: Shows live counting duration
- **Ended sessions**: Shows final recorded duration
- **Status badges**: Active (green), Ended (blue), Timeout (red)

## Teacher Dashboard

### Features

- Send Zoom links to students
- Mark attendance
- No manual session ending needed
- Sessions end automatically

## Database

### Key Fields

- `clicked_at` - When student clicked (START)
- `session_ended_at` - When session ended (END)
- `session_duration_minutes` - Duration in minutes
- `session_status` - active | ended | timeout
- `packageId` - Package name (determines duration)
- `packageRate` - Rate per session

## API Endpoints

### `/api/zoom/track?token=XXX` (GET)

- Records student click
- Redirects to Zoom

### `/api/zoom/teacher-left?session=123` (GET)

- Called by Zoom when teacher leaves (via leave_url)
- Ends session immediately
- Calculates exact duration

### `/api/admin/teacher-sessions` (GET)

- Fetches sessions for admin dashboard
- Supports filters (date, status)

### `/api/admin/auto-timeout` (POST)

- Manually triggers auto-timeout
- Ends old sessions immediately

### `/api/cron/session-timeout` (GET)

- Cron job endpoint
- Runs every 5 minutes
- Auto-ends old sessions

## Deployment

### Environment Variables

```
DATABASE_URL=mysql://...
NEXT_PUBLIC_BASE_URL=https://your-domain.com
TELEGRAM_BOT_TOKEN=...
NEXTAUTH_SECRET=...
```

### Vercel Deployment

```bash
vercel --prod
```

### Cron Job

Automatically configured in `vercel.json` to run every 5 minutes.

## Summary

**Simple, automatic session duration tracking:**

- Student: Click → Zoom (automatic)
- System: Auto-end after package duration + buffer
- Admin: See all durations in dashboard
- Trustworthy: Based on package, can't be manipulated
- Accurate: ±10 minutes
