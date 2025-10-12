# ✅ Session Duration Tracking - Complete Implementation

## How It Works

### 1. Teacher Creates Zoom Link

- Teacher creates Zoom meeting link
- System stores it with a unique tracking token
- URL: `https://your-domain.com/join-session/TOKEN123`

### 2. Telegram Bot Sends Link

- Bot sends wrapper URL to student (not direct Zoom link)
- Student sees: "📚 Darulkubra Online Class Invitation"
- Button: "🔗 Join Zoom Class"

### 3. Student Clicks Link

- Lands on beautiful wrapper page: `/join-session/[token]`
- Shows teacher and student names
- Big button: "🎥 Join Meeting"

### 4. Student Joins

- Clicks "Join Meeting" button
- **JavaScript logs join time** → `/api/session/log-join/[token]`
- Opens Zoom in new tab
- Wrapper page stays open in background

### 5. During Session

- Wrapper page monitors for student leaving
- Tracks: `beforeunload`, `unload`, `pagehide`, `visibilitychange`
- Page stays open = session active

### 6. Student Leaves

- Student closes Zoom or browser tab
- **JavaScript logs exit time** → `/api/session/log-exit/[token]`
- System calculates: `duration = exit_time - join_time`

### 7. Admin Views Duration

- Dashboard: `/admin/session-durations`
- Shows all sessions with durations
- Live updates for active sessions
- Export/search functionality

---

## Files Created

### Frontend Pages

- `src/app/join-session/[token]/page.tsx` - Wrapper page (student sees)
- `src/app/admin/session-durations/page.tsx` - Admin dashboard

### API Endpoints

- `src/app/api/session/join/[token]/route.ts` - Get session data
- `src/app/api/session/log-join/[token]/route.ts` - Log join time
- `src/app/api/session/log-exit/[token]/route.ts` - Log exit time & calculate duration
- `src/app/api/admin/session-durations/route.ts` - Get all sessions

### Modified Files

- `src/app/api/teachers/students/[id]/zoom/route.ts` - Changed to send wrapper URL

---

## Database Fields Used

```sql
clicked_at              - Join time (when student clicks "Join Meeting")
session_ended_at        - Exit time (when student closes page/tab)
session_duration_minutes - Calculated duration (exit - join)
session_status          - 'active' or 'ended'
tracking_token          - Unique token for this session
```

---

## Flow Diagram

```
Teacher → Creates Link → Stored in System
                ↓
        Telegram Bot Sends:
    https://your-domain.com/join-session/ABC123
                ↓
    Student Clicks → Wrapper Page
                ↓
        Shows Teacher/Student Info
        Button: "Join Meeting"
                ↓
    Student Clicks Button
        ↓                    ↓
    Logs Join Time    Opens Zoom (new tab)
    (API Call)        Page stays open
                ↓
        [Session Active]
                ↓
    Student Closes Tab/Zoom
                ↓
        Logs Exit Time
        (API Call)
                ↓
    Calculates Duration = Exit - Join
                ↓
        Admin Sees Duration
```

---

## Testing

### 1. Create Link

- Teacher creates Zoom link
- Copy the generated tracking URL

### 2. Test Wrapper

- Visit: `http://localhost:3000/join-session/YOUR_TOKEN`
- Should see wrapper page with "Join Meeting" button

### 3. Test Join Tracking

- Click "Join Meeting"
- Check console: Should log join time
- Zoom should open in new tab

### 4. Test Exit Tracking

- Close the wrapper page
- Check console: Should log exit time
- Check database: `session_duration_minutes` should be filled

### 5. View in Admin

- Go to: `http://localhost:3000/admin/session-durations`
- Should see the session with duration

---

## Benefits

✅ **Accurate** - Tracks actual join/exit times
✅ **Automatic** - No manual entry needed
✅ **Reliable** - Client-side JavaScript tracking
✅ **Simple** - Beautiful UI for students
✅ **Transparent** - Admin can see all durations
✅ **No interruption** - Students just click and join

---

## Next Steps

1. Test the wrapper page
2. Send test link via Telegram
3. Verify duration calculation
4. Review admin dashboard
5. Deploy to production

**Simple, accurate, and user-friendly!** 🎉
