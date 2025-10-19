# 🧪 Zoom Duration Tracking - End-to-End Testing Guide

## 📋 Complete Flow Overview

```
Step 1: Teacher sends Zoom link to student
   ↓
Step 2: Link stored in database with meeting info
   ↓
Step 3: Meeting happens on Zoom
   ↓
Step 4: Meeting ends → Zoom webhook updates duration
   ↓
Step 5: Admin views duration in Teacher Durations page
```

---

## 🎯 Test Scenario: Full Duration Tracking

### Prerequisites

- ✅ Server running: `npm run dev`
- ✅ Database accessible
- ✅ Teacher account with students assigned
- ✅ Admin account

---

## 📝 STEP 1: Login as Teacher

1. **Navigate to teacher login:**

   ```
   http://localhost:3000/teachers/login
   ```

2. **Login credentials:**

   - Use your teacher account (ustazid/password)
   - Or check database for a teacher account

3. **After login, go to students page:**
   ```
   http://localhost:3000/teachers/students
   ```

---

## 📤 STEP 2: Send Zoom Link to Student

### Option A: Auto-Create Meeting (if Zoom connected)

1. **Click on "Send Zoom" button** for any student
2. **In the modal, click** "🤖 Auto-Create & Send Meeting"
3. **System will:**
   - Create a 30-minute Zoom meeting
   - Store meeting ID in database
   - Send notification to student
   - Show success toast

**Example Success Message:**

```
🎉 Meeting Created & Sent!
📱 [Student Name] notified via Telegram
```

### Option B: Manual Link (if no Zoom connected)

1. **Click on "Send Zoom" button** for any student
2. **Paste a Zoom link** in the manual link field
   ```
   Example: https://zoom.us/j/1234567890
   ```
3. **Click "Send Manual Link"**
4. **System will:**
   - Extract meeting ID (1234567890)
   - Store in database
   - Send to student

---

## 🔍 STEP 3: Verify Link Created in Database

### Check Database (Prisma Studio)

1. **Open Prisma Studio:**

   ```bash
   npx prisma studio
   ```

2. **Navigate to:**

   ```
   http://localhost:5555
   ```

3. **Open `wpos_zoom_links` table**

4. **Find your record** (should be the most recent)

5. **Verify fields:**
   ```
   ✅ ustazid = teacher ID
   ✅ studentid = student ID
   ✅ zoom_meeting_id = meeting ID (extracted or created)
   ✅ sent_time = current time
   ✅ session_status = "active"
   ✅ zoom_actual_duration = NULL (initially)
   ✅ created_via_api = true/false
   ✅ packageId = student's package
   ✅ packageRate = calculated daily rate
   ```

**Example Record:**
| Field | Value |
|-------|-------|
| id | 123 |
| ustazid | T001 |
| studentid | 45 |
| zoom_meeting_id | 82345678901 |
| session_status | active |
| zoom_actual_duration | NULL |
| created_via_api | true |

---

## ⏱️ STEP 4: Simulate Meeting Duration

Since webhooks require public URL, we'll manually update the duration for testing:

### Method 1: Update via Prisma Studio

1. **Stay in Prisma Studio**
2. **Click on the record you just created**
3. **Edit the following fields:**
   - `zoom_actual_duration`: Enter `28` (minutes)
   - `session_status`: Change to `ended`
   - `session_ended_at`: Set to current time
4. **Click "Save"**

### Method 2: Update via SQL Query

Open your MySQL client and run:

```sql
-- Find your recent zoom link
SELECT id, ustazid, studentid, zoom_meeting_id, session_status, zoom_actual_duration
FROM wpos_zoom_links
ORDER BY sent_time DESC
LIMIT 5;

-- Update with sample duration (replace ID with yours)
UPDATE wpos_zoom_links
SET
    zoom_actual_duration = 28,
    session_status = 'ended',
    session_ended_at = NOW(),
    zoom_start_time = DATE_SUB(NOW(), INTERVAL 28 MINUTE)
WHERE id = <YOUR_MEETING_ID>;

-- Verify the update
SELECT id, ustazid, zoom_actual_duration, session_status, session_ended_at
FROM wpos_zoom_links
WHERE id = <YOUR_MEETING_ID>;
```

**Expected Result:**

```
zoom_actual_duration: 28
session_status: ended
session_ended_at: 2025-10-16 14:30:00
```

---

## 📊 STEP 5: View Duration in Admin Panel

### Login as Admin

1. **Navigate to:**

   ```
   http://localhost:3000/login
   ```

2. **Login with admin credentials**

3. **Go to Teacher Durations:**
   ```
   http://localhost:3000/admin/teacher-durations
   ```
   Or click "Teacher Durations" in the admin sidebar

### Verify Data Display

**You should see:**

1. **Overall Stats Updated:**

   - Total Meetings: +1
   - Completed Meetings: +1
   - Total Minutes: +28
   - Total Hours: Updated

2. **Teacher in List:**

   - Find the teacher you sent the link as
   - Should show:
     ```
     Meetings: 1/1
     Hours: 0.5h (or updated total)
     Avg: 28 min
     ```

3. **Expand Teacher Details:**
   - Click on the teacher row
   - Should show meeting history table:
     ```
     Date       | Student      | Duration | Status | Type
     10/16/25   | Student Name | 28 min   | ended  | 🤖 Auto
     ```

---

## ✅ Success Criteria

Your test is successful if:

- [x] **Teacher can send Zoom link**
- [x] **Link stored with meeting ID**
- [x] **Duration can be updated (manually for testing)**
- [x] **Admin page shows:**
  - [x] Overall stats with the meeting counted
  - [x] Teacher in the list with updated hours
  - [x] Individual meeting showing in history
  - [x] Duration displayed correctly (28 min)
  - [x] Status shows as "ended"
  - [x] Type shows correctly (Auto/Manual)

---

## 🧪 Additional Test Cases

### Test Case 1: Multiple Meetings

1. Send 3 Zoom links to different students
2. Update each with different durations (25, 30, 28 min)
3. Verify admin page shows:
   - Total meetings: 3
   - Total hours: 1.4h (83 minutes ÷ 60)
   - Average: 27.7 min

### Test Case 2: Different Teachers

1. Send links as 2 different teachers
2. Update durations for each
3. Verify admin page shows both teachers separately

### Test Case 3: Month Filter

1. Send links today
2. Go to admin panel
3. Change month to previous month
4. Should show 0 meetings
5. Change back to current month
6. Should show your test meetings

### Test Case 4: Active Meeting

1. Send a Zoom link
2. DON'T update the duration
3. In admin panel, should show:
   - Meeting counted in "Total Meetings"
   - NOT counted in "Completed Meetings"
   - Status: "active" (blue badge)
   - Duration: "-" (not available)

---

## 🐛 Troubleshooting

### Issue: Teacher can't send Zoom link

**Check:**

- Is teacher logged in correctly?
- Does teacher have assigned students?
- Check browser console for errors

### Issue: Link not appearing in database

**Check:**

- Database connection working?
- Check terminal for API errors
- Verify student belongs to teacher

### Issue: Duration not showing in admin panel

**Check:**

- Is `zoom_actual_duration` field NULL or 0?
- Is `session_status` set to "ended"?
- Is the meeting in the selected month?
- Try refreshing the page

### Issue: Admin page shows 0 meetings

**Check:**

- Are you looking at the correct month?
- Are there meetings with `session_status = 'ended'`?
- Are there meetings with `zoom_actual_duration > 0`?

### Issue: Meeting ID is NULL

**Check:**

- For auto-created: Was Zoom OAuth successful?
- For manual link: Does link contain `/j/[numbers]`?
- Valid format: `https://zoom.us/j/1234567890`

---

## 📸 Expected Screenshots

### 1. Teacher Students Page

```
┌────────────────────────────────────┐
│ My Students                        │
├────────────────────────────────────┤
│ [Student Name]                     │
│ ID: 123                            │
│ Subject: Quran                     │
│                                    │
│ [Send Zoom] [Attendance] [Permission]
└────────────────────────────────────┘
```

### 2. Send Zoom Modal

```
┌────────────────────────────────────┐
│ Send Zoom Link                     │
├────────────────────────────────────┤
│ 🤖 Auto-Create Meeting (Recommended)│
│ [✨ Auto-Create & Send Meeting]   │
│                                    │
│ ───── OR USE MANUAL LINK ─────    │
│                                    │
│ Manual Meeting Link:               │
│ [https://zoom.us/j/1234567890]    │
│ [Send Manual Link]                │
└────────────────────────────────────┘
```

### 3. Admin Teacher Durations Page

```
┌────────────────────────────────────────────┐
│ Teacher Teaching Durations                 │
│ Month: [2025-10 ▼] [Refresh]              │
├────────────────────────────────────────────┤
│ Overall Stats:                             │
│ Teachers: 5  Meetings: 45  Hours: 22.5h   │
├────────────────────────────────────────────┤
│ ▼ Ahmed Mohamed (T001)                     │
│   Meetings: 3/3  Hours: 1.4h  Avg: 28 min │
│   ┌────────────────────────────────────┐  │
│   │ Date     Student   Duration Status │  │
│   │ 10/16/25 Ali      28 min   ended  │  │
│   │ 10/16/25 Fatima   30 min   ended  │  │
│   │ 10/16/25 Omar     25 min   ended  │  │
│   └────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## 🎯 Quick Test Commands

### Check Recent Zoom Links

```sql
SELECT
    id,
    ustazid,
    studentid,
    zoom_meeting_id,
    zoom_actual_duration,
    session_status,
    sent_time
FROM wpos_zoom_links
ORDER BY sent_time DESC
LIMIT 10;
```

### Check Teacher's Total Hours (This Month)

```sql
SELECT
    ustazid,
    COUNT(*) as total_meetings,
    SUM(CASE WHEN session_status = 'ended' THEN 1 ELSE 0 END) as completed,
    SUM(zoom_actual_duration) as total_minutes,
    ROUND(SUM(zoom_actual_duration) / 60, 1) as total_hours,
    ROUND(AVG(zoom_actual_duration), 0) as avg_duration
FROM wpos_zoom_links
WHERE
    sent_time >= DATE_FORMAT(NOW(), '%Y-%m-01')
    AND sent_time < DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH)
GROUP BY ustazid;
```

### Update Sample Meeting Duration

```sql
UPDATE wpos_zoom_links
SET
    zoom_actual_duration = 28,
    session_status = 'ended',
    session_ended_at = NOW()
WHERE id = (
    SELECT id FROM (
        SELECT id FROM wpos_zoom_links
        ORDER BY sent_time DESC
        LIMIT 1
    ) as subquery
);
```

---

## 🎉 Complete Test Checklist

Use this checklist for your testing session:

```
[ ] 1. Login as teacher
[ ] 2. Navigate to students page
[ ] 3. Click "Send Zoom" for a student
[ ] 4. Choose auto-create or manual link
[ ] 5. Send the link successfully
[ ] 6. Verify success toast appears
[ ] 7. Check Prisma Studio for zoom_links record
[ ] 8. Verify meeting ID is stored
[ ] 9. Verify packageRate is calculated
[ ] 10. Manually update duration to 28 minutes
[ ] 11. Set session_status to "ended"
[ ] 12. Logout from teacher account
[ ] 13. Login as admin
[ ] 14. Navigate to Teacher Durations page
[ ] 15. Verify overall stats show the meeting
[ ] 16. Find teacher in the list
[ ] 17. Verify hours/meetings counts are correct
[ ] 18. Expand teacher details
[ ] 19. Verify meeting appears in history
[ ] 20. Verify duration shows as "28 min"
[ ] 21. Verify status badge shows "ended" (green)
[ ] 22. Test month filter (previous/current)
[ ] 23. Test refresh button
[ ] 24. Test with multiple meetings
[ ] 25. Test with different teachers
```

---

## 🚀 Ready to Test!

You now have everything you need to:

1. ✅ Send Zoom links as a teacher
2. ✅ Track meeting durations
3. ✅ View analytics in admin panel

**Start Testing:** Go to `http://localhost:3000/teachers/login`

---

## 💡 Tips

- **For quick testing:** Use Prisma Studio to manually set durations
- **For real testing:** Configure Zoom webhooks (see ZOOM_OAUTH_SETUP.md)
- **Debug mode:** Check browser console and terminal for logs
- **Multiple tests:** Create test data for multiple teachers/students

**Good luck with your testing! 🎉**
