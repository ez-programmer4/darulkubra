# 📊 Admin Guide: Viewing Teacher Teaching Durations

## ✅ What Was Built

This Zoom integration now **automatically tracks** how many minutes each teacher actually teaches.

---

## 🎯 How It Works

### Automatic Tracking Flow:

```
1. Teacher sends Zoom link to student
   ↓
2. Class happens on Zoom
   ↓
3. When class ends, Zoom sends webhook to your system
   ↓
4. System automatically saves:
   - Start time
   - End time
   - Actual duration (in minutes)
   ↓
5. Admin can view all teacher durations
```

---

## 📱 How to View Teacher Durations (3 Ways)

### Method 1: Admin Dashboard Page (NEW) ⭐

**URL:**

```
http://localhost:3000/admin/teacher-durations
```

**What You'll See:**

```
┌─────────────────────────────────────────────────┐
│ Teacher Teaching Durations                      │
│ Actual teaching hours tracked via Zoom          │
│                                                 │
│ Month: [2025-10 ▼] [Refresh]                   │
├─────────────────────────────────────────────────┤
│ Overall Stats:                                  │
│ ┌──────────┬──────────┬──────────┬──────────┐  │
│ │ Teachers │ Meetings │ Hours    │ Avg      │  │
│ │    45    │   1,234  │  621h    │ 30 min   │  │
│ └──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────┤
│ Teachers:                                       │
│                                                 │
│ ▼ Ahmed Mohamed (T001)                          │
│   Meetings: 45/50  Hours: 22.5h  Avg: 30 min  │
│   ┌─────────────────────────────────────────┐ │
│   │ Meeting History:                        │ │
│   │ Date       Student    Duration  Status  │ │
│   │ 10/15/25   Ali        28 min    ended   │ │
│   │ 10/14/25   Fatima     30 min    ended   │ │
│   └─────────────────────────────────────────┘ │
│                                                 │
│ ▶ Fatima Ali (T002)                             │
│   Meetings: 38/40  Hours: 19h  Avg: 30 min     │
└─────────────────────────────────────────────────┘
```

**Features:**

- ✅ Filter by month
- ✅ See all teachers at once
- ✅ Total hours per teacher
- ✅ Average duration per meeting
- ✅ Expand to see individual meetings
- ✅ Auto/Manual meeting indicator

---

### Method 2: Via API (For Developers)

**Endpoint:**

```
GET /api/admin/teacher-durations?month=2025-10
```

**Example Response:**

```json
{
  "month": "2025-10",
  "overallStats": {
    "totalTeachers": 45,
    "totalMeetings": 1234,
    "totalCompletedMeetings": 1180,
    "totalMinutes": 35400,
    "totalHours": 590,
    "averageDurationPerMeeting": 30
  },
  "teachers": [
    {
      "teacherId": "T001",
      "teacherName": "Ahmed Mohamed",
      "totalMeetings": 50,
      "completedMeetings": 45,
      "totalMinutes": 1350,
      "totalHours": 22.5,
      "averageDuration": 30,
      "meetings": [
        {
          "id": 123,
          "date": "2025-10-15T10:00:00Z",
          "studentName": "Ali Ahmed",
          "duration": 28,
          "status": "ended",
          "createdViaApi": true
        }
      ]
    }
  ]
}
```

**Use this to:**

- Build custom reports
- Export to Excel/CSV
- Integrate with other systems

---

### Method 3: Via Database (Prisma Studio)

**Access Prisma Studio:**

```bash
npx prisma studio
```

Then go to: http://localhost:5555

**View Duration Data:**

1. Click on `wpos_zoom_links` table
2. Key columns:
   - `ustazid` - Teacher ID
   - `studentid` - Student ID
   - `sent_time` - When link sent
   - `zoom_start_time` - When class started
   - `session_ended_at` - When class ended
   - **`zoom_actual_duration`** - Actual minutes taught ⭐
   - `session_status` - active/ended/timeout
   - `created_via_api` - Auto-created (true) or Manual (false)

**To calculate total for a teacher:**

- Filter by `ustazid`
- Sum all `zoom_actual_duration` values

---

## 📊 Database Schema Changes

### New Fields Added:

**Teachers Table (`wpos_wpdatatable_24`):**

```sql
zoom_user_id VARCHAR(255)           -- Teacher's Zoom account ID
zoom_access_token TEXT              -- OAuth access token (encrypted)
zoom_refresh_token TEXT             -- OAuth refresh token
zoom_token_expires_at DATETIME      -- Token expiration time
zoom_connected_at DATETIME          -- When teacher connected Zoom
```

**Zoom Links Table (`wpos_zoom_links`):**

```sql
zoom_meeting_id VARCHAR(255)        -- Zoom meeting ID
zoom_start_time DATETIME            -- When meeting actually started
zoom_actual_duration INT            -- Actual minutes taught ⭐
created_via_api BOOLEAN             -- Auto-created or manual link
```

---

## 🔍 Understanding the Data

### Meeting Statuses:

| Status    | Meaning                         |
| --------- | ------------------------------- |
| `active`  | Meeting is currently happening  |
| `ended`   | Meeting finished (has duration) |
| `timeout` | Meeting expired/timed out       |

### Duration vs Status:

```
If status = "ended" AND zoom_actual_duration > 0
  → Reliable duration data ✅

If status = "active"
  → Meeting still in progress (duration will update) ⏳

If status = "ended" but zoom_actual_duration = NULL
  → Webhook not received yet (or webhooks not configured) ⚠️
```

---

## 📈 Sample Reports You Can Generate

### Report 1: Monthly Teaching Hours per Teacher

**Query the API:**

```
GET /api/admin/teacher-durations?month=2025-10
```

**Sort by:** `totalHours` (descending)

**Use for:**

- Verify teachers are active
- Identify top performers
- Calculate bonuses based on hours

---

### Report 2: Average Session Duration

**Look at:** `averageDuration` field per teacher

**Expected:** ~30 minutes (your session length)

**If lower:**

- Teacher might be ending classes early
- Technical issues cutting meetings short

**If higher:**

- Teacher giving extra time (good!)
- Free Zoom limit exceeded (40 min)

---

### Report 3: Completion Rate

**Calculate:**

```
Completion Rate = completedMeetings / totalMeetings × 100%
```

**Expected:** 95%+ completion rate

**If lower:**

- Meetings scheduled but not happening
- Students not showing up
- Technical issues

---

## 🧪 Testing Duration Tracking

### Test Now (Without Webhooks):

**You can test manually:**

1. **Send a Zoom link** (manual or auto-create)
2. **Check database:**
   ```
   Prisma Studio → wpos_zoom_links
   Find the record → zoom_actual_duration = NULL (initially)
   ```
3. **Simulate meeting end** (update manually):
   ```sql
   UPDATE wpos_zoom_links
   SET zoom_actual_duration = 28,
       session_status = 'ended',
       session_ended_at = NOW()
   WHERE id = <meeting_id>;
   ```
4. **Refresh admin page** → See 28 minutes!

---

### Test with Webhooks (Production):

**For real-time tracking, you need:**

1. **Ngrok for local testing:**

   ```bash
   ngrok http 3000
   ```

2. **Configure Zoom webhook:**

   - Webhook URL: `https://your-ngrok-url.ngrok.io/api/zoom/webhooks`
   - Events: `meeting.ended`

3. **Test:**
   - Create a real Zoom meeting
   - Start it
   - End it
   - Duration auto-updates! ✅

---

## 💡 Key Benefits for Admin

### 1. Salary Transparency

- See exact hours each teacher taught
- Verify against reported hours
- Fair compensation based on actual work

### 2. Quality Control

- Teachers teaching full 30 minutes?
- Any patterns of short classes?
- Consistent teaching schedule?

### 3. Performance Metrics

- Compare teachers objectively
- Identify top performers
- Spot issues early

### 4. Cost Management

- Know actual teaching hours
- Calculate cost per teaching hour
- Optimize teacher schedules

---

## 📋 Quick Access Summary

| What                | Where            | URL                                                               |
| ------------------- | ---------------- | ----------------------------------------------------------------- |
| **Admin Dashboard** | Visual interface | `http://localhost:3000/admin/teacher-durations`                   |
| **API Endpoint**    | JSON data        | `http://localhost:3000/api/admin/teacher-durations?month=2025-10` |
| **Database**        | Raw data         | Prisma Studio → `wpos_zoom_links` table                           |

---

## 🆘 Troubleshooting

### No Duration Data Showing?

**Check:**

1. Are there completed meetings? (status = 'ended')
2. Is `zoom_actual_duration` NULL? (webhooks not configured yet)
3. Is the month filter correct?

**Solution:**

- Manually update some records to test the UI
- Or configure webhooks for automatic tracking

### "Unauthorized" Error?

**Make sure:**

- You're logged in as admin
- Not logged in as teacher or controller

### Page Not Loading?

**Check:**

- Server is running: `npm run dev`
- No TypeScript errors in terminal
- Browser console for errors (F12)

---

## 🎯 Next Steps

1. **✅ Access the admin page:**

   ```
   http://localhost:3000/admin/teacher-durations
   ```

2. **✅ Add to admin navigation menu** (if not auto-added)

3. **⏳ Configure webhooks** (optional, for automatic duration)

   - Requires ngrok for local testing
   - Or deploy to production with public URL

4. **📊 Generate reports** based on the data

---

## 📝 Summary

**What Changed:**

- ✅ Database tracks actual teaching duration
- ✅ New admin page to view all teacher hours
- ✅ API endpoint for custom reports
- ✅ Automatic tracking via Zoom webhooks (when configured)

**How to Use:**

- Visit: `http://localhost:3000/admin/teacher-durations`
- Select month
- See all teacher teaching hours
- Expand to see individual meetings

**Data Location:**

- Database table: `wpos_zoom_links`
- Key field: `zoom_actual_duration` (minutes)

---

🎉 **You can now track and view teacher teaching durations!**





