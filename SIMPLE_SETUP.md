# Simple Session Duration Tracking

## How It Works

**Background automatic tracking - no student or teacher interaction needed**

1. Student clicks Zoom link → Records start time
2. Background job checks active sessions every minute
3. When duration exceeds package duration + 10 min → Auto-ends session
4. Admin sees all durations in dashboard

## Setup

### 1. Run Cron Job Every Minute

Since you're not deploying to Vercel, you need to set up a cron job manually.

**Option A: Linux/Mac Cron**
```bash
# Edit crontab
crontab -e

# Add this line (replace with your domain)
* * * * * curl https://your-domain.com/api/admin/auto-timeout -X POST
```

**Option B: Windows Task Scheduler**
Create a task that runs every minute:
```powershell
# Command to run:
curl https://your-domain.com/api/admin/auto-timeout -X POST
```

**Option C: External Cron Service**
Use a service like:
- cron-job.org
- easycron.com
- Set URL: `https://your-domain.com/api/admin/auto-timeout`
- Method: POST
- Schedule: Every 1 minute

### 2. View Dashboard

Go to: `/admin/teacher-monitoring`

Shows:
- All sessions
- Live duration for active sessions
- Final duration for ended sessions
- Auto-updates every minute

## API Endpoints

### Check Zoom Status (Background Job)
**POST** `/api/admin/auto-timeout`
- Checks all active sessions
- Auto-ends sessions that exceed duration
- Run this every minute via cron

### Admin Dashboard Data
**GET** `/api/admin/teacher-sessions`
- Returns all sessions with durations
- Used by admin dashboard

### Track Student Click
**GET** `/api/zoom/track?token=XXX`
- Records when student clicks
- Redirects to Zoom

## Files

- `src/lib/check-zoom-status.ts` - Background check logic
- `src/app/api/admin/auto-timeout/route.ts` - Cron endpoint
- `src/app/api/admin/teacher-sessions/route.ts` - Dashboard data
- `src/app/api/zoom/track/route.ts` - Student click tracking
- `src/app/admin/teacher-monitoring/page.tsx` - Admin dashboard

## Package Durations

Edit in `src/lib/check-zoom-status.ts`:

```javascript
const packageDurations = {
  Europe: 60,    // 60 minutes
  USA: 60,
  Canada: 60,
  "0 Fee": 30,
  Free: 30,
};
```

Auto-end = Package duration + 10 minutes buffer

## Database Fields

```sql
clicked_at              - When student clicked
session_ended_at        - When session ended  
session_duration_minutes - Duration in minutes
session_status          - 'active' or 'ended'
packageId               - Package name
```

## That's It!

Simple automatic tracking:
- Student: Click → Zoom (no extra steps)
- Teacher: No interaction needed
- System: Checks every minute in background
- Admin: See all durations in dashboard

✅ Clean & Simple!
