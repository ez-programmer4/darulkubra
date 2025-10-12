# ✅ Automatic Session Duration Tracking

## How It Works

**System automatically checks if Zoom meetings are still active by validating the Zoom link**

### Flow:

1. **Student clicks Zoom link**

   - System records start time
   - Student redirects to Zoom
   - Session status: "active"

2. **Automatic background checking**

   - Every minute, system checks if Zoom link is still valid
   - Tries to access the Zoom meeting URL
   - **If valid** → Session stays "active", shows live duration
   - **If invalid/ended** → Automatically ends session, records duration

3. **Admin dashboard**
   - Shows live duration for active sessions: "25 (ongoing)"
   - Shows final duration for ended sessions: "60"
   - Updates automatically every minute
   - Click "Check & Update Sessions" to force check now

---

## Setup Cron Job

**Call the check API every minute:**

### Linux/Mac:

```bash
crontab -e

# Add:
* * * * * curl https://your-domain.com/api/admin/auto-timeout
```

### Windows Task Scheduler:

- Create task that runs every 1 minute
- Action: `curl https://your-domain.com/api/admin/auto-timeout`

### External Service:

Use cron-job.org or easycron.com:

- URL: `https://your-domain.com/api/admin/auto-timeout`
- Schedule: Every 1 minute

---

## How Zoom Checking Works

```javascript
// System tries to access Zoom link
fetch(zoomLink, { method: "HEAD" });

// If link returns OK or redirects → Meeting still active
// If link returns error or 404 → Meeting ended
```

When meeting ends:

- Zoom link becomes invalid
- System detects this
- Records duration automatically
- Status changes to "ended"

---

## Admin Dashboard

**URL:** `/admin/teacher-monitoring`

### What You See:

**Active Session (Zoom valid):**

```
Teacher: Ahmed
Student: Sara
Start: 9:00 AM
Duration: 25 (ongoing)  ← Live counting!
Status: active
```

**Ended Session (Zoom ended):**

```
Teacher: Ahmed
Student: Sara
Start: 9:00 AM
Duration: 60
Status: ended
```

### Features:

- Simple table with all sessions
- Live duration updates
- Auto-refreshes every minute
- "Check & Update Sessions" button for immediate check

---

## Files

- `src/lib/check-zoom-status.ts` - Zoom validation logic
- `src/app/api/admin/auto-timeout/route.ts` - Check endpoint (for cron)
- `src/app/api/admin/teacher-sessions/route.ts` - Dashboard data
- `src/app/api/zoom/track/route.ts` - Student click tracking
- `src/app/admin/teacher-monitoring/page.tsx` - Admin dashboard

---

## Database

**Fields:**

- `clicked_at` - When student clicked
- `session_ended_at` - When Zoom meeting ended
- `session_duration_minutes` - Actual duration
- `session_status` - 'active' or 'ended'

---

## Summary

✅ **Fully automatic** - No manual intervention
✅ **Checks Zoom link validity** every minute
✅ **Records actual duration** when meeting ends
✅ **Live duration display** while meeting active
✅ **Simple dashboard** to view everything

**Just set up the cron job and it works!** 🎉
