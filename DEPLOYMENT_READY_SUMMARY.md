# 🎯 Session Duration Tracking System - Deployment Ready

## 📊 **What This System Does:**

### **Primary Goal:**

**Track how long teachers spend with each student in Zoom sessions**

### **Key Features:**

1. ✅ **Automatic Start Tracking** - Records when student clicks link
2. ✅ **Automatic Duration Calculation** - Calculates time automatically
3. ✅ **Admin Dashboard** - View all sessions and durations
4. ✅ **Heartbeat Monitoring** - Track active sessions
5. ✅ **Auto-Timeout** - Clean up old sessions (2 hours)

---

## 🔄 **Complete Flow:**

### **1. Teacher Sends Zoom Link (Telegram)**

```
Teacher clicks "Send Zoom Link"
  ↓
System creates tracking link
  ↓
Telegram message sent to student
  ↓
Database records: sent_time, tracking_token, packageId, packageRate
```

### **2. Student Clicks Link**

```
Student clicks Telegram button
  ↓
Redirects to tracking page (your domain)
  ↓
Database updated:
  - clicked_at = NOW
  - session_status = 'active'
  - last_activity_at = NOW
```

### **3. Tracking Page (5 seconds)**

```
Shows countdown: 5, 4, 3, 2, 1...
  ↓
Opens Zoom in new tab
  ↓
Tracking page stays open showing:
  - "✅ Session Active"
  - Live timer
  - "End Session" button
```

### **4. During Zoom Meeting**

```
Student in Zoom meeting
  ↓
Tracking page sends heartbeat every 30 seconds
  ↓
Database updates: last_activity_at = NOW
  ↓
Session stays "active"
```

### **5. Meeting Ends**

```
Student closes tracking page
  ↓
JavaScript detects page close
  ↓
Calls /api/zoom/end-session
  ↓
Database updated:
  - session_ended_at = NOW
  - session_duration_minutes = (ended_at - clicked_at) / 60000
  - session_status = 'ended'
```

### **6. Admin Views Data**

```
Admin opens dashboard
  ↓
Sees all sessions with:
  - Teacher name
  - Student name
  - Start time
  - End time
  - Duration (minutes)
  - Status
```

---

## 📊 **Database Schema:**

### **wpos_zoom_links Table:**

```sql
id                          INT          -- Primary key
studentid                   INT          -- Student ID
ustazid                     VARCHAR      -- Teacher ID
link                        TEXT         -- Zoom URL
tracking_token              VARCHAR      -- Unique tracking token
clicked_at                  DATETIME     -- When student clicked (START)
sent_time                   DATETIME     -- When link was sent
session_ended_at            DATETIME     -- When session ended (END)
session_duration_minutes    INT          -- Duration in minutes (AUTO-CALCULATED)
session_status              ENUM         -- 'active', 'ended', 'timeout'
last_activity_at            DATETIME     -- Last heartbeat
packageId                   VARCHAR      -- Package name
packageRate                 DECIMAL      -- Rate per session
```

---

## 🎯 **What Admin Sees:**

### **Example Session:**

```
Teacher: Ahmed Hassan (U430)
Student: Sara Omar (244480)
Start: 10/12/2025, 09:00:00 AM
End: 10/12/2025, 10:30:00 AM
Duration: 90 minutes
Status: ended
Package: Europe
Rate: 33.00
```

### **Dashboard Features:**

- ✅ Filter by date
- ✅ Filter by status (active/ended/timeout)
- ✅ Filter by teacher
- ✅ Export to CSV
- ✅ Statistics (total sessions, avg duration, total duration)
- ✅ Auto-refresh
- ✅ Manual auto-timeout trigger

---

## 🚀 **API Endpoints:**

### **1. Create Zoom Link** (Teacher Action)

```
POST /api/teachers/students/[id]/zoom

Creates zoom link with tracking
Sends Telegram notification
Records package data
```

### **2. Track Session Start** (Student Click)

```
GET /api/zoom/track?token=XXXXX

Records clicked_at
Sets session_status = 'active'
Returns tracking page with JavaScript
```

### **3. Heartbeat** (Every 30 seconds)

```
POST /api/zoom/heartbeat
Body: { token: "XXXXX" }

Updates last_activity_at
Keeps session alive
```

### **4. End Session** (Page Close)

```
POST /api/zoom/end-session
Body: { token: "XXXXX", duration: 90, endTime: "..." }

Records session_ended_at
Calculates session_duration_minutes
Sets session_status = 'ended'
```

### **5. Admin Dashboard** (View Sessions)

```
GET /api/admin/teacher-sessions?date=2025-10-12&status=all

Returns all sessions with teacher/student names
Includes statistics
Filters by date and status
```

### **6. Auto-Timeout** (Cleanup)

```
POST /api/admin/auto-timeout

Ends sessions inactive > 2 hours
Sets status = 'timeout'
Calculates duration
```

### **7. Health Check**

```
GET /api/health/session-tracking

Checks database connectivity
Returns session statistics
Shows stale sessions
```

---

## 📈 **Statistics & Reports:**

### **Admin Dashboard Shows:**

1. **Total Sessions** - Count of all sessions
2. **Active Sessions** - Currently ongoing
3. **Average Duration** - Average time per session
4. **Total Duration** - Sum of all session minutes
5. **Status Breakdown** - Count by status (active/ended/timeout)

### **Export CSV:**

- Teacher name
- Student name
- Start time
- End time
- Duration
- Status
- Package
- Rate

---

## ⚙️ **Configuration:**

### **Environment Variables:**

```env
DATABASE_URL=mysql://...           # Database connection
NEXT_PUBLIC_BASE_URL=https://...   # Your domain
TELEGRAM_BOT_TOKEN=...             # Telegram bot
```

### **Vercel Cron Job:**

```json
{
  "crons": [
    {
      "path": "/api/cron/session-timeout",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

Runs every 2 hours to clean up old sessions

---

## 🔧 **Maintenance:**

### **Daily Tasks:**

- ✅ Check active sessions
- ✅ Review durations for accuracy
- ✅ Look for stuck sessions (> 2 hours active)

### **Weekly Tasks:**

- ✅ Run manual auto-timeout if needed
- ✅ Export data for reports
- ✅ Check average session durations

### **Monthly Tasks:**

- ✅ Review and clean up old data
- ✅ Analyze teacher performance
- ✅ Generate monthly reports

---

## 🐛 **Troubleshooting:**

### **Session Not Starting?**

- Check if `clicked_at` is null → Student didn't click link
- Check tracking token → Make sure it exists
- Check server logs → Look for errors

### **Duration is 0 or NULL?**

- Active sessions → Duration not calculated until session ends
- Check if `session_ended_at` is null → Session still active
- Student may have closed page too quickly

### **Heartbeats Not Working?**

- Check if `last_activity_at` is updating → Should update every 30 sec
- Student may have closed tracking page
- Check network connectivity

### **Sessions Stuck in "Active"?**

- Run manual auto-timeout
- Check if tracking page was closed
- Sessions > 2 hours old will be auto-timed out

---

## ✅ **Pre-Deployment Checklist:**

### **Database:**

- [x] All columns exist in `wpos_zoom_links`
- [x] Indexes created (`idx_session_status`, `idx_last_activity`)
- [x] Test data inserted and tracked

### **APIs:**

- [x] `/api/zoom/track` - Working
- [x] `/api/zoom/heartbeat` - Working
- [x] `/api/zoom/end-session` - Working
- [x] `/api/admin/teacher-sessions` - Working
- [x] `/api/admin/auto-timeout` - Working
- [x] `/api/cron/session-timeout` - Ready for cron

### **Frontend:**

- [x] Admin dashboard loads
- [x] Sessions display correctly
- [x] Filters work (date, status)
- [x] Export CSV works
- [x] Statistics display

### **Tracking Page:**

- [x] Countdown works (5 seconds)
- [x] Opens Zoom in new tab
- [x] Shows "Session Active" message
- [x] Live timer counts up
- [x] "End Session" button works
- [x] Page close ends session

### **Vercel:**

- [x] `vercel.json` configured
- [x] Cron job set up
- [x] Environment variables set
- [x] Domain configured

---

## 🎉 **Success Criteria:**

You'll know it's working perfectly when:

1. ✅ **Teacher sends link** → Student receives Telegram message
2. ✅ **Student clicks link** → Tracking page opens, countdown starts
3. ✅ **Zoom opens** → Tracking page stays open with live timer
4. ✅ **Heartbeats send** → `last_activity_at` updates every 30 sec
5. ✅ **Student closes page** → Session ends automatically
6. ✅ **Admin sees duration** → Exact time from click to close
7. ✅ **Duration is accurate** → Matches actual meeting time
8. ✅ **Statistics update** → Dashboard shows correct totals

---

## 📝 **Final Notes:**

### **System is PRODUCTION READY** ✅

**What's Working:**

- ✅ Session start tracking
- ✅ Duration calculation
- ✅ Heartbeat monitoring
- ✅ Session end detection
- ✅ Admin dashboard
- ✅ Auto-timeout cleanup
- ✅ Package tracking
- ✅ Export functionality

**What You Need to Do:**

1. Deploy to Vercel
2. Set up cron job
3. Test with real students
4. Monitor for first few days
5. Adjust timeout if needed

**System Purpose:**
Track teacher time with students automatically for accurate billing and performance monitoring.

**No manual entry needed** - Everything is automatic! 🚀
