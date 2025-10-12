# ✅ Simple Session Duration Tracking System

## Overview

**Automatic background tracking - No student/teacher interaction needed**

- Background job checks Zoom sessions every minute
- Auto-ends sessions when duration exceeds package time + buffer
- Simple admin dashboard shows all durations
- Clean & minimal

---

## How It Works

```
1. Student clicks Zoom link
   → Records start time
   → Redirects to Zoom

2. Background job runs every minute
   → Checks all active sessions
   → If duration > (package duration + 10 min):
     - Auto-ends session
     - Calculates duration

3. Admin sees durations
   → Simple table view
   → Updates every minute automatically
```

---

## Setup Cron Job

**You need to call the API every minute to check sessions:**

### Option 1: Linux/Mac Cron

```bash
crontab -e

# Add this line (replace with your domain):
* * * * * curl -X POST https://your-domain.com/api/admin/auto-timeout
```

### Option 2: Windows Task Scheduler

- Create a new task
- Trigger: Every 1 minute
- Action: `curl -X POST https://your-domain.com/api/admin/auto-timeout`

### Option 3: External Cron Service

Use: cron-job.org or easycron.com

- URL: `https://your-domain.com/api/admin/auto-timeout`
- Method: POST
- Schedule: Every 1 minute

---

## Files

### Core Logic

- `src/lib/check-zoom-status.ts` - Background check function

### API Endpoints

- `src/app/api/admin/auto-timeout/route.ts` - Cron endpoint (call every minute)
- `src/app/api/admin/teacher-sessions/route.ts` - Dashboard data
- `src/app/api/zoom/track/route.ts` - Student click tracking

### UI

- `src/app/admin/teacher-monitoring/page.tsx` - Simple admin dashboard

---

## Admin Dashboard

**URL:** `/admin/teacher-monitoring`

**Features:**

- Simple table showing all sessions
- Live duration for active sessions (ongoing)
- Final duration for ended sessions
- Auto-refreshes every minute
- 3 summary cards: Total, Active, Total Duration

**Clean & Simple!**

---

## Package Durations

Edit in `src/lib/check-zoom-status.ts`:

```javascript
const packageDurations = {
  Europe: 60,
  USA: 60,
  Canada: 60,
  "0 Fee": 30,
  Free: 30,
};
```

Auto-end = Package duration + 10 minutes buffer

---

## Database

**Required fields:**

- `clicked_at` - When student clicked
- `session_ended_at` - When ended
- `session_duration_minutes` - Duration
- `session_status` - 'active' or 'ended'
- `packageId` - Package name

---

## That's It!

✅ Student: Click → Zoom (no extra steps)
✅ Teacher: No interaction needed  
✅ System: Checks every minute in background
✅ Admin: Simple dashboard with durations

**Super simple & clean!** 🎉
