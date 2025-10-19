# 🧪 Zoom OAuth Testing Guide - Complete Walkthrough

## ✅ What's Ready

✅ Database has webhook fields  
✅ Zoom OAuth connection working  
✅ Auto-create meeting enabled  
✅ Manual link still works  
✅ Webhook handler ready  
✅ Admin duration page ready

---

## 🎯 Complete Testing Flow

### Prerequisites:

- [ ] Zoom account connected (check dashboard: "Connected" status)
- [ ] ngrok running (Terminal 2)
- [ ] npm run dev running (Terminal 1)
- [ ] Zoom webhook configured with ngrok URL

---

## 📋 TEST 1: Auto-Create Meeting (OAuth)

### Step 1.1: Navigate to Students Page

```
http://localhost:3000/teachers/students
```

### Step 1.2: Open Send Zoom Modal

- Find any student
- Click "Send Zoom" button (📹 icon)

**You should see two options:**

```
┌─────────────────────────────────────────┐
│ Send Zoom Link                          │
├─────────────────────────────────────────┤
│ 🤖 Auto-Create Meeting (Recommended)   │
│ Instantly create & send 30-min meeting │
│                                         │
│ [✨ Auto-Create & Send Meeting]        │
│                                         │
│ ─────── OR USE MANUAL LINK ────────    │
│                                         │
│ Manual Meeting Link                     │
│ [_________________________________]     │
│ [Send Manual Link]                      │
└─────────────────────────────────────────┘
```

### Step 1.3: Click "Auto-Create & Send Meeting"

**Watch server console (Terminal 1):**

```
🤖 Creating Zoom meeting via API for teacher T001
✅ Created Zoom meeting via OAuth: ID 123456789
💾 Creating zoom link with package data:
  packageId: MWF
  packageRate: 450
  zoom_meeting_id: 123456789
  created_via_api: true
✅ Zoom link created with ID: 156
```

**Should see success toast:**

```
🎉 Meeting Created & Sent!
📱 Ahmed notified via Telegram
```

### Step 1.4: Verify in Database

**Prisma Studio** (http://localhost:5555):

1. Go to `wpos_zoom_links` table
2. Click **Refresh**
3. Find latest record (ID: 156)
4. **Check:**
   - ✅ `zoom_meeting_id`: `"123456789"` (filled!)
   - ✅ `created_via_api`: `true`
   - ✅ `link`: Full Zoom URL
   - ✅ `session_status`: `"active"`
   - ⏳ `zoom_actual_duration`: `NULL` (will fill when meeting ends)

### Step 1.5: Start the Meeting

**Option A: Via Zoom Dashboard**

- Go to https://zoom.us/meeting
- Find the meeting (named "Class with Ahmad")
- Click "Start"

**Option B: Via Start URL (in database)**

- Copy the Zoom link from database
- Open in browser
- Click "Start Meeting"

### Step 1.6: Watch for meeting.started Webhook

**Server console should show:**

```
Zoom webhook event received: meeting.started
Meeting started: 123456789 at 2025-10-15T...
```

**ngrok terminal (Terminal 2) shows:**

```
POST /api/zoom/webhooks    200 OK
```

### Step 1.7: End the Meeting (After 1-2 Minutes)

**In Zoom, click "End Meeting"**

**Server console should show:**

```
Zoom webhook event received: meeting.ended
Meeting ended: 123456789, Duration: 2 minutes
✅ Updated zoom link ID 156 with duration 2 minutes
Cleared salary cache for teacher T001
```

### Step 1.8: Verify Duration Saved

**Prisma Studio:**

1. Click **Refresh** on `wpos_zoom_links`
2. Find your record (ID: 156)
3. **Check:**
   - ✅ `zoom_actual_duration`: `2` (actual minutes!)
   - ✅ `session_status`: `"ended"`
   - ✅ `session_ended_at`: Current timestamp
   - ✅ `zoom_start_time`: Start timestamp

**SUCCESS!** ✅ OAuth auto-create + webhook tracking working!

---

## 📋 TEST 2: Manual Link (Backward Compatible)

### Step 2.1: Create Meeting Manually

- Go to https://zoom.us/meeting/schedule
- Create 30-min meeting
- Copy join URL

### Step 2.2: Send via System

- Students page → Send Zoom modal
- **Paste manual link** in the "Manual Meeting Link" field
- Click "Send Manual Link"

**Server console:**

```
📹 Extracted Zoom meeting ID from manual link: 987654321
💾 Creating zoom link with package data:
  zoom_meeting_id: 987654321
  created_via_api: false
✅ Zoom link created with ID: 157
```

### Step 2.3: Test Webhook with Manual Link

- Start the meeting
- Wait 1-2 minutes
- End the meeting

**Server console:**

```
Zoom webhook event received: meeting.ended
Meeting ended: 987654321, Duration: 2 minutes
Trying to find meeting by link pattern: /j/987654321
✅ Updated zoom link ID 157 with duration 2 minutes
```

**Verify in database:**

- `zoom_actual_duration`: Filled
- `created_via_api`: `false`

---

## 📊 TEST 3: View in Admin Dashboard

### Step 3.1: Open Admin Page

```
http://localhost:3000/admin/teacher-durations
```

### Step 3.2: What You Should See

```
┌─────────────────────────────────────────┐
│ Teacher Teaching Durations              │
│                                         │
│ Overall Stats:                          │
│ • Total Teachers: 1                     │
│ • Total Meetings: 2                     │
│ • Total Hours: 0.07h (4 minutes)        │
│ • Average Duration: 2 min               │
├─────────────────────────────────────────┤
│ Teachers:                               │
│                                         │
│ ▼ Ahmed Mohamed (T001)                  │
│   Meetings: 2/2  Hours: 0.07h  Avg: 2min│
│                                         │
│   Meeting History:                      │
│   Date       Student    Duration  Type  │
│   10/15/25   Ahmad      2 min     🤖Auto│
│   10/15/25   Fatima     2 min     ✋Man │
└─────────────────────────────────────────┘
```

**Features to verify:**

- ✅ Total hours calculated
- ✅ Individual meetings listed
- ✅ Auto vs Manual indicator
- ✅ Accurate durations

---

## 🔍 TEST 4: Duration Per Student

### Step 4.1: Send Multiple Meetings to Same Student

- Auto-create 3 meetings for Student A
- Manual link 2 meetings for Student B
- All with different durations (1 min, 2 min, 3 min)

### Step 4.2: Check Admin Page

**Should show:**

- Teacher's total hours
- Breakdown by student when expanded
- Accurate tracking for each session

---

## 📈 Expected Console Output

### When Sending Auto-Create:

```
🤖 Creating Zoom meeting via API for teacher T001
✅ Created Zoom meeting via OAuth: ID 123456789
💾 Creating zoom link with package data:
  packageId: MWF
  packageRate: 450
  zoom_meeting_id: 123456789
  created_via_api: true
✅ Zoom link created with ID: 156
```

### When Sending Manual Link:

```
📹 Extracted Zoom meeting ID from manual link: 987654321
💾 Creating zoom link with package data:
  packageId: TTS
  packageRate: 380
  zoom_meeting_id: 987654321
  created_via_api: false
✅ Zoom link created with ID: 157
```

### When Meeting Starts:

```
Zoom webhook event received: meeting.started
Meeting started: 123456789 at 2025-10-15T14:30:00.000Z
```

### When Meeting Ends:

```
Zoom webhook event received: meeting.ended
Meeting ended: 123456789, Duration: 2 minutes
✅ Updated zoom link ID 156 with duration 2 minutes
Cleared salary cache for teacher T001
```

---

## 🆘 Troubleshooting

### Issue 1: "Make sure your Zoom account is connected"

**Fix:**

- Go to `/teachers/dashboard`
- Check Zoom connection status
- If not connected, click "Connect Zoom"
- Authorize and try again

### Issue 2: "No zoom link found for meeting X"

**Check:**

1. Server console when sending - did you see "Extracted Zoom meeting ID"?
2. Prisma Studio - is `zoom_meeting_id` filled?
3. Does the ID match between webhook and database?

**If zoom_meeting_id is NULL:**

- Link didn't match regex pattern
- Share the link format you're using

### Issue 3: Auto-Create Button Not Working

**Check:**

1. Is Zoom connected? (Dashboard shows "Connected")
2. Server console errors?
3. Token expired? (Auto-refreshes, but check logs)

**Common error:**

```
Failed to refresh Zoom token
```

**Fix:** Reconnect Zoom account

### Issue 4: Webhook Not Firing

**Check:**

1. ngrok still running?
2. Zoom webhook configured?
3. Event types selected?
4. Server console shows webhook received?

**Verify:**

- Visit http://localhost:4040 (ngrok inspector)
- Should see POST requests to `/api/zoom/webhooks`

---

## ✅ Success Checklist

### Auto-Create Flow:

- [ ] Zoom connected on dashboard
- [ ] Clicked "Auto-Create & Send Meeting"
- [ ] Server created meeting via API
- [ ] Database has zoom_meeting_id
- [ ] Student received Telegram notification
- [ ] Meeting started → webhook fired
- [ ] Meeting ended → duration saved
- [ ] Admin page shows duration

### Manual Link Flow:

- [ ] Pasted manual Zoom link
- [ ] Server extracted meeting ID
- [ ] Database has zoom_meeting_id
- [ ] Student received link
- [ ] Meeting ended → webhook fired
- [ ] Duration saved correctly
- [ ] Admin page shows data

### Admin Dashboard:

- [ ] Shows total hours per teacher
- [ ] Shows individual meetings
- [ ] Indicates Auto vs Manual
- [ ] Calculates averages correctly
- [ ] Expands to show details

---

## 📊 Expected Database State

### After Auto-Create:

```
wpos_zoom_links:
- id: 156
- zoom_meeting_id: "123456789"
- created_via_api: true
- link: "https://zoom.us/j/123456789?pwd=..."
- session_status: "active" → "ended" (after meeting)
- zoom_actual_duration: NULL → 2 (after webhook)
```

### After Manual Link:

```
wpos_zoom_links:
- id: 157
- zoom_meeting_id: "987654321"
- created_via_api: false
- link: "https://zoom.us/j/987654321"
- session_status: "active" → "ended"
- zoom_actual_duration: NULL → 2
```

---

## 🎯 Quick Test Procedure (5 Minutes)

1. **Auto-create a meeting** (1 min)
2. **Start the meeting** (instantly)
3. **Wait 1-2 minutes** (class time)
4. **End the meeting** (instantly)
5. **Check console** for webhook (instantly)
6. **Check database** for duration (instantly)
7. **Check admin page** (instantly)

**Total time: ~5 minutes to see full flow!**

---

## 💡 What to Look For

### In Server Console:

```
✅ "Creating Zoom meeting via API"
✅ "Created Zoom meeting via OAuth: ID X"
✅ "Zoom link created with ID: Y"
✅ "meeting.ended" webhook received
✅ "Updated zoom link ID Y with duration Z"
```

### In Database:

```
✅ zoom_meeting_id filled
✅ created_via_api = true (for auto) or false (for manual)
✅ zoom_actual_duration filled after meeting ends
✅ session_status = "ended"
```

### In Admin Page:

```
✅ Teacher listed
✅ Total hours shown
✅ Individual meetings with durations
✅ Auto/Manual indicator (🤖 vs ✋)
```

---

## 🚀 Start Testing Now!

1. **Go to:** http://localhost:3000/teachers/students
2. **Click "Send Zoom"** on any student
3. **Click "✨ Auto-Create & Send Meeting"** button
4. **Watch the console** for success messages
5. **Start the meeting** (from Zoom dashboard or link)
6. **End after 1-2 minutes**
7. **Check everything updated!**

---

**Ready to test? Start with auto-create and tell me what you see!** 🎉
