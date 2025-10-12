# ✅ Automatic Session End Detection Using Zoom Leave URL

## 🎯 **How It Works:**

### **The Problem:**

- Student clicks link → Goes to tracking page → Redirects to Zoom
- Tracking page closes → Can't detect when student leaves Zoom
- Manual "End Session" button required → Not automatic

### **The Solution:**

**Use Zoom's `leave_url` parameter!**

Zoom supports a `leave_url` parameter that automatically redirects users when they leave the meeting.

---

## 🔄 **Complete Flow:**

### **1. Teacher Sends Link**

```
Teacher creates Zoom link in system
  ↓
System stores:
  - Zoom URL: https://zoom.us/j/123456
  - Tracking token: ABC123
  - Package data
```

### **2. Student Clicks Telegram Button**

```
Student clicks button
  ↓
Redirects to: /api/zoom/track?token=ABC123
  ↓
Database updates:
  - clicked_at = NOW (START TIME)
  - session_status = 'active'
  - last_activity_at = NOW
```

### **3. Tracking Page Modifies Zoom URL**

```
Original Zoom URL:
  https://zoom.us/j/123456?pwd=xyz

Enhanced with leave_url:
  https://zoom.us/j/123456?pwd=xyz&leave_url=https://your-domain.com/api/zoom/session-complete?token=ABC123
```

### **4. Countdown and Redirect**

```
Tracking page shows: "Redirecting in 5, 4, 3, 2, 1..."
  ↓
After 5 seconds: window.location.href = enhancedZoomUrl
  ↓
Student goes directly to Zoom (no popup needed!)
```

### **5. Student in Zoom Meeting**

```
Student attends Zoom meeting
  ↓
(Optional) Heartbeats can run if tracking page stays open
  ↓
Session stays "active" in database
```

### **6. Student Leaves Zoom** ⭐ **AUTOMATIC!**

```
Student clicks "Leave Meeting" in Zoom
  ↓
Zoom automatically redirects to leave_url:
  /api/zoom/session-complete?token=ABC123
  ↓
API endpoint called automatically
  ↓
Database updates:
  - session_ended_at = NOW (END TIME)
  - session_duration_minutes = (NOW - clicked_at) / 60000
  - session_status = 'ended'
  ↓
Student sees: "✅ Session Complete - Duration: 45 minutes"
```

---

## 📊 **Technical Implementation:**

### **Enhanced Zoom URL:**

```javascript
// Original
const originalUrl = "https://zoom.us/j/123456?pwd=xyz";

// Add leave URL
const leaveUrl =
  "https://your-domain.com/api/zoom/session-complete?token=ABC123";
const enhancedUrl = originalUrl + "&leave_url=" + encodeURIComponent(leaveUrl);

// Result
("https://zoom.us/j/123456?pwd=xyz&leave_url=https%3A%2F%2Fyour-domain.com%2Fapi%2Fzoom%2Fsession-complete%3Ftoken%3DABC123");
```

### **Session Complete Endpoint:**

```javascript
// GET /api/zoom/session-complete?token=ABC123

1. Receive token from Zoom redirect
2. Find active session with that token
3. Calculate duration = NOW - clicked_at
4. Update database:
   - session_ended_at = NOW
   - session_duration_minutes = duration
   - session_status = 'ended'
5. Show "Session Complete" page
```

---

## ✅ **Advantages:**

| Feature                   | Old Method                               | New Method                     |
| ------------------------- | ---------------------------------------- | ------------------------------ |
| **Zoom opens**            | window.open() (blocked by popup blocker) | Direct redirect (always works) |
| **Session end detection** | Manual button or page close              | Automatic when leaving Zoom    |
| **User action required**  | Must close tracking page                 | None - automatic               |
| **Accuracy**              | Depends on user closing page             | Always accurate                |
| **Mobile friendly**       | Tracking page may be lost                | Works on all devices           |
| **Duration calculation**  | Manual or timeout                        | Automatic on Zoom leave        |

---

## 🎯 **User Experience:**

### **Student Perspective:**

```
1. Click Telegram button
2. See "Redirecting in 5 seconds..."
3. Automatically go to Zoom
4. Attend meeting
5. Click "Leave Meeting" in Zoom
6. See "Session Complete - Duration: 45 min"
7. Done! No extra steps needed
```

### **Admin Perspective:**

```
1. Open admin dashboard
2. See all sessions with accurate durations
3. Duration calculated automatically
4. No manual entry needed
5. Data ready for billing/reports
```

---

## 📝 **Database Records:**

### **After Student Clicks:**

```sql
id: 341023
studentid: 244480
ustazid: U430
tracking_token: ABC123
clicked_at: 2025-10-12 09:00:00        ← START
session_ended_at: NULL
session_duration_minutes: NULL
session_status: active
last_activity_at: 2025-10-12 09:00:00
```

### **After Student Leaves Zoom:**

```sql
id: 341023
studentid: 244480
ustazid: U430
tracking_token: ABC123
clicked_at: 2025-10-12 09:00:00        ← START
session_ended_at: 2025-10-12 10:30:00  ← END (AUTOMATIC!)
session_duration_minutes: 90            ← CALCULATED!
session_status: ended
last_activity_at: 2025-10-12 10:30:00
```

---

## 🚀 **Deployment:**

### **Environment Variable:**

```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### **Test Flow:**

1. Create Zoom link as teacher
2. Click link as student
3. See countdown
4. Redirect to Zoom
5. Leave Zoom meeting
6. Should redirect to "Session Complete" page
7. Check database - duration should be recorded

---

## 🔧 **API Endpoints:**

### **1. Track Session** (Student clicks link)

```
GET /api/zoom/track?token=ABC123

- Records clicked_at
- Adds leave_url to Zoom link
- Shows countdown page
- Redirects to Zoom
```

### **2. Session Complete** (Zoom leave redirect)

```
GET /api/zoom/session-complete?token=ABC123

- Receives token from Zoom
- Calculates duration
- Updates database
- Shows "Session Complete" page
```

### **3. Heartbeat** (Optional, every 30 sec)

```
POST /api/zoom/heartbeat
Body: { token: "ABC123" }

- Updates last_activity_at
- Backup tracking method
```

---

## ✅ **Success Indicators:**

You'll know it's working when:

1. ✅ Student clicks link → Countdown appears
2. ✅ After 5 seconds → Redirects to Zoom (not opens in new tab)
3. ✅ Zoom URL includes `leave_url` parameter
4. ✅ Student leaves Zoom → Redirects to "Session Complete"
5. ✅ Database has `session_ended_at` filled
6. ✅ Database has `session_duration_minutes` calculated
7. ✅ Admin dashboard shows accurate duration
8. ✅ No manual steps required!

---

## 🎉 **Result:**

**Fully automatic session duration tracking:**

- ✅ No popup blockers
- ✅ No manual buttons
- ✅ No page close detection needed
- ✅ Works on all devices
- ✅ Accurate duration every time
- ✅ User-friendly experience

**The student just attends the meeting and leaves - everything else is automatic!** 🚀
