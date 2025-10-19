# 🧪 Teacher Duration Functionality - Testing Guide

## 📍 Access the Feature

**URL:** `http://localhost:3000/admin/teacher-durations`

Or navigate through:

- Login as Admin
- Go to Admin Panel
- Click on "Teacher Durations" in the sidebar (under Daily Attendance)

---

## 🎯 What This Feature Does

This feature tracks **actual teaching time** for each teacher based on their Zoom meetings. It shows:

1. **Overall Statistics** - Total teachers, meetings, hours, and average duration
2. **Per-Teacher Breakdown** - Each teacher's total hours and meeting history
3. **Individual Meeting Details** - Date, student, duration, status for each session

---

## 🧪 Testing Steps

### Step 1: Check the Page Loads

1. Navigate to `http://localhost:3000/admin/teacher-durations`
2. ✅ Page should load without errors
3. ✅ Should see overall stats cards (even if showing zeros)
4. ✅ Month selector should default to current month (October 2025)

---

### Step 2: Check Data Display

#### What You'll See:

**Overall Stats Section:**

- Total Teachers
- Total Meetings
- Completed Meetings
- Total Hours
- Total Minutes
- Average Duration per Meeting

**Teachers List:**

- Each teacher with expandable details
- Meeting count (completed/total)
- Total hours taught
- Average duration per meeting
- Click to expand and see individual meetings

---

### Step 3: Test Filters

1. **Change Month:**

   - Click the month selector
   - Select different months (Oct 2024, Sep 2025, etc.)
   - Data should update accordingly

2. **Refresh Button:**
   - Click "Refresh" button
   - Data should reload

---

### Step 4: Test Teacher Expansion

1. Click on any teacher in the list
2. Should expand to show:
   - Meeting History table
   - Columns: Date, Student, Duration, Status, Type
   - Duration shown in minutes
   - Status badges (ended/active/timeout)
   - Type indicators (🤖 Auto or ✋ Manual)

---

## 📊 Expected Behavior

### If You Have Real Zoom Meeting Data:

```
✅ Should show actual teachers
✅ Should show completed meetings with durations
✅ Should calculate total hours correctly
✅ Should show accurate average durations
```

### If No Meeting Data Yet:

```
✅ Page loads successfully
✅ Shows "0" for all stats
✅ Empty teachers list or no completed meetings
✅ Info card explains how duration tracking works
```

---

## 🔍 What to Check

### 1. Overall Stats Accuracy

- **Total Teachers:** Count of unique teachers with meetings
- **Total Meetings:** All meetings sent in the month
- **Completed:** Only meetings with status "ended"
- **Total Hours:** Sum of all durations ÷ 60
- **Average Duration:** Total minutes ÷ completed meetings

### 2. Teacher-Level Accuracy

- **Meetings Count:** Shows completed/total
- **Hours:** Should be accurate (minutes ÷ 60, rounded to 1 decimal)
- **Average:** Should match (total minutes ÷ completed meetings)

### 3. Meeting Details

- **Date:** Should match when link was sent
- **Student Name:** Should show student name or "Unknown"
- **Duration:** Should show minutes or "-" if not completed
- **Status:**
  - 🟢 Green badge for "ended"
  - 🔵 Blue badge for "active"
  - ⚪ Gray badge for other statuses
- **Type:**
  - 🤖 Auto for API-created meetings
  - ✋ Manual for manually pasted links

---

## 🧪 Advanced Testing (Optional)

### Test with Sample Data

If you want to test with sample data, run this SQL query:

```sql
-- Check existing zoom_links data
SELECT
    ustazid,
    COUNT(*) as total_meetings,
    SUM(CASE WHEN session_status = 'ended' THEN 1 ELSE 0 END) as completed,
    SUM(zoom_actual_duration) as total_minutes
FROM wpos_zoom_links
WHERE sent_time >= '2025-10-01' AND sent_time < '2025-11-01'
GROUP BY ustazid;
```

### Manual Test Data Creation

To test the UI with sample data:

```sql
-- Update a meeting with sample duration
UPDATE wpos_zoom_links
SET
    zoom_actual_duration = 28,
    session_status = 'ended',
    session_ended_at = NOW()
WHERE id = <existing_meeting_id>
LIMIT 1;
```

Then refresh the admin page to see the changes.

---

## ✅ Success Criteria

The feature is working correctly if:

1. ✅ Page loads without errors
2. ✅ Month selector works and updates data
3. ✅ Overall stats display correctly
4. ✅ Teachers list shows all teachers with meetings
5. ✅ Expandable sections work smoothly
6. ✅ Meeting details show complete information
7. ✅ Calculations are accurate
8. ✅ Loading states work
9. ✅ Empty states display properly
10. ✅ Responsive on mobile/desktop

---

## 🐛 Common Issues & Solutions

### Issue 1: "Unauthorized" Error

**Solution:** Make sure you're logged in as an admin, not a teacher or controller

### Issue 2: No Data Showing

**Reason:** No completed Zoom meetings in the selected month
**Solution:**

- Check a different month
- Or manually update a meeting record with sample duration

### Issue 3: Page Not Loading

**Solution:**

- Check browser console for errors (F12)
- Restart dev server
- Check database connection

### Issue 4: Calculations Look Wrong

**Check:**

- Are there meetings with `NULL` durations? (These shouldn't be counted)
- Are there meetings with `session_status != 'ended'`? (These shouldn't be counted)
- Manual calculation: Does sum match?

---

## 📝 Testing Checklist

Copy this checklist to track your testing:

```
Desktop Testing:
[ ] Page loads successfully
[ ] Overall stats display correctly
[ ] Month selector works
[ ] Refresh button works
[ ] Teachers list displays
[ ] Can expand teacher details
[ ] Can collapse teacher details
[ ] Meeting table displays correctly
[ ] Status badges show correct colors
[ ] Type indicators show correctly
[ ] Info card displays at bottom

Mobile Testing (Optional):
[ ] Page is responsive
[ ] Stats cards stack vertically
[ ] Tables are scrollable
[ ] Touch interactions work

Edge Cases:
[ ] Empty state (no data)
[ ] Single teacher
[ ] Many teachers (scrolling)
[ ] Long teacher names
[ ] Long student names
[ ] No completed meetings (all active)
```

---

## 🎯 Next Steps After Testing

Once you've confirmed the feature works:

1. ✅ Test with real Zoom data (if available)
2. ✅ Configure Zoom webhooks for automatic duration tracking
3. ✅ Generate reports based on this data
4. ✅ Use for salary calculations
5. ✅ Monitor teacher performance

---

## 📞 Need Help?

If something doesn't work:

1. Check browser console (F12 → Console tab)
2. Check server logs in terminal
3. Verify database connection
4. Check if Prisma schema is up to date: `npx prisma generate`

---

## 🎉 That's It!

You're now ready to test the Teacher Duration tracking feature. This provides valuable insights into:

- How much each teacher is actually teaching
- Average session lengths
- Meeting completion rates
- Teacher performance metrics

Enjoy testing! 🚀
