# 🔔 Testing Zoom Webhooks in Localhost

## 📋 Overview

Zoom webhooks require a **public HTTPS URL** to send events. Since `localhost` isn't accessible from the internet, we'll use **ngrok** to create a secure tunnel.

---

## 🎯 What We're Testing

When a Zoom meeting ends, Zoom will:

1. Send a webhook to your server
2. Your server updates the meeting duration
3. Admin panel shows the actual duration automatically

---

## 🚀 Step-by-Step Setup

### STEP 1: Install ngrok

#### Windows:

```bash
# Download from: https://ngrok.com/download
# Or use chocolatey:
choco install ngrok

# Or use scoop:
scoop install ngrok
```

#### Mac:

```bash
brew install ngrok
```

#### Linux:

```bash
# Download and install
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

### STEP 2: Sign Up for ngrok (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Create a free account
3. Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken

### STEP 3: Configure ngrok

```bash
# Add your auth token (only needed once)
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## 🔧 Testing Process

### STEP 1: Start Your Dev Server

Make sure your Next.js app is running:

```bash
npm run dev
```

You should see:

```
✓ Ready on http://localhost:3000
```

### STEP 2: Start ngrok Tunnel

Open a **NEW terminal window** and run:

```bash
ngrok http 3000
```

You should see something like:

```
ngrok

Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL:** `https://abc123def456.ngrok-free.app`

⚠️ **IMPORTANT:** Keep this terminal window open! If you close it, the tunnel stops.

### STEP 3: Configure Zoom Webhook

1. **Go to Zoom App Marketplace:**

   ```
   https://marketplace.zoom.us/
   ```

2. **Click "Develop" → "Build App"**

3. **Select your existing app** (or create a new Server-to-Server OAuth app)

4. **Go to "Feature" → "Event Subscriptions"**

5. **Add Event Subscription:**

   - Click "Add Event Subscription"
   - Subscription Name: `Local Testing`
   - Event notification endpoint URL:
     ```
     https://YOUR-NGROK-URL.ngrok-free.app/api/zoom/webhooks
     ```
     Example: `https://abc123def456.ngrok-free.app/api/zoom/webhooks`

6. **Zoom will verify the endpoint:**

   - It sends a POST request with a challenge
   - Your server should respond with the challenge
   - If successful, you'll see ✅ "Validated"

7. **Select Event Types:**

   - Check: ☑️ **"End Meeting" (meeting.ended)**
   - This is the event that sends duration data

8. **Save** the configuration

---

## 🧪 Testing the Complete Flow

### Test 1: Send Zoom Link

1. **Login as teacher:**

   ```
   http://localhost:3000/teachers/login
   ```

2. **Go to students page:**

   ```
   http://localhost:3000/teachers/students
   ```

3. **Send Zoom link** to a student (auto-create or manual)

4. **Note the meeting ID** from the terminal logs:
   ```
   ✅ Zoom meeting created via API: ID 86232822596
   ```

### Test 2: Start a Real Zoom Meeting

1. **Join the meeting** using the Zoom link that was created

2. **Start the meeting** (as host)

3. **Wait at least 1-2 minutes** (so there's actual duration)

4. **End the meeting**

### Test 3: Watch for Webhook

**In your terminal** (where Next.js is running), you should see:

```
🔔 Zoom webhook received: meeting.ended
📊 Meeting ID: 86232822596
✅ Updated duration: 2 minutes
```

**In ngrok terminal**, you should see:

```
POST /api/zoom/webhooks          200 OK
```

### Test 4: Verify in Database

**Check Prisma Studio:**

```bash
npx prisma studio
```

1. Open `wpos_zoom_links` table
2. Find your meeting (ID: 86232822596)
3. Verify:
   - ✅ `zoom_actual_duration` = actual minutes (e.g., 2)
   - ✅ `session_status` = "ended"
   - ✅ `session_ended_at` = timestamp

**Or use SQL:**

```sql
SELECT
    id,
    zoom_meeting_id,
    zoom_actual_duration,
    session_status,
    session_ended_at
FROM wpos_zoom_links
WHERE zoom_meeting_id = '86232822596';
```

### Test 5: View in Admin Panel

1. **Login as admin:**

   ```
   http://localhost:3000/login
   ```

2. **Go to Teacher Durations:**

   ```
   http://localhost:3000/admin/teacher-durations
   ```

3. **Verify the meeting appears** with the actual duration!

---

## 🔍 Debugging Webhooks

### Check ngrok Web Interface

Open in your browser:

```
http://127.0.0.1:4040
```

This shows:

- All HTTP requests to your tunnel
- Request/response details
- Webhook payloads from Zoom
- Errors and status codes

Very useful for debugging!

### Check Webhook Endpoint

Test if your webhook endpoint is accessible:

```bash
# In a new terminal, test the endpoint
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/zoom/webhooks \
  -H "Content-Type: application/json" \
  -d '{"event": "endpoint.url_validation", "payload": {"plainToken": "test123"}}'
```

Should return:

```json
{
  "plainToken": "test123",
  "encryptedToken": "...",
  "message": "..."
}
```

### Common Issues

#### Issue 1: ngrok URL not validated by Zoom

**Symptoms:**

- Zoom shows "Failed to validate endpoint"

**Solutions:**

- Check if Next.js server is running
- Check if ngrok tunnel is active
- Check your webhook route: `/api/zoom/webhooks/route.ts`
- Test manually with curl (see above)

#### Issue 2: Webhook received but duration not updated

**Symptoms:**

- See webhook log in terminal
- But `zoom_actual_duration` still NULL

**Check:**

- Meeting ID matches in webhook and database
- Webhook includes duration data
- Check ngrok interface for full payload
- Check server logs for errors

#### Issue 3: "This site can't be reached"

**Symptoms:**

- ngrok URL shows error

**Solutions:**

- Make sure ngrok is running
- Make sure using the HTTPS URL (not HTTP)
- Check if tunnel expired (free ngrok URLs change on restart)

---

## 📊 Webhook Payload Example

When a meeting ends, Zoom sends this to your endpoint:

```json
{
  "event": "meeting.ended",
  "payload": {
    "account_id": "abc123",
    "object": {
      "id": "86232822596",
      "uuid": "abc123def456==",
      "host_id": "teacher_zoom_id",
      "topic": "Class with Student Name",
      "type": 2,
      "start_time": "2025-10-16T10:00:00Z",
      "duration": 28,
      "timezone": "Africa/Addis_Ababa"
    }
  },
  "event_ts": 1697461234567
}
```

Your server extracts:

- `object.id` → Meeting ID
- `object.duration` → Actual duration in minutes

---

## 🎯 Complete Test Checklist

```
Setup:
[ ] ngrok installed
[ ] ngrok auth token configured
[ ] Dev server running (npm run dev)
[ ] ngrok tunnel started (ngrok http 3000)
[ ] Copied ngrok HTTPS URL

Zoom Configuration:
[ ] Logged into Zoom Marketplace
[ ] Found/created app
[ ] Added webhook endpoint (ngrok URL + /api/zoom/webhooks)
[ ] Endpoint validated by Zoom ✅
[ ] Selected "meeting.ended" event
[ ] Saved configuration

Testing:
[ ] Logged in as teacher
[ ] Sent Zoom link to student
[ ] Noted meeting ID from logs
[ ] Started real Zoom meeting
[ ] Stayed in meeting for 2-3 minutes
[ ] Ended the meeting
[ ] Saw webhook log in terminal
[ ] Checked database - duration updated
[ ] Checked admin panel - duration shows

Verification:
[ ] Meeting shows in admin panel
[ ] Duration is accurate
[ ] Status is "ended"
[ ] Teacher's total hours updated
```

---

## 💡 Tips for Testing

### 1. Use Short Meetings

- 1-2 minutes is enough to test
- You don't need a 30-minute meeting!

### 2. Keep ngrok Running

- Don't close the ngrok terminal
- If you restart ngrok, URL changes
- You'll need to update Zoom webhook URL

### 3. Use ngrok Web Interface

- `http://127.0.0.1:4040` is your best friend
- See exactly what Zoom is sending
- Debug request/response issues

### 4. Test Multiple Times

- Send 2-3 links
- Join and end meetings
- Verify all durations are tracked

### 5. Watch Both Terminals

- **Terminal 1:** Next.js dev server (see webhook logs)
- **Terminal 2:** ngrok tunnel (see connection status)

---

## 🔄 Restart Process

If you need to restart everything:

1. **Stop ngrok** (Ctrl+C in ngrok terminal)
2. **Start ngrok again:**
   ```bash
   ngrok http 3000
   ```
3. **Copy new ngrok URL**
4. **Update Zoom webhook URL** with new ngrok URL
5. **Revalidate endpoint** in Zoom

---

## 📝 Sample Testing Session

Here's a typical testing session:

```bash
# Terminal 1: Start dev server
npm run dev
# Output: ✓ Ready on http://localhost:3000

# Terminal 2: Start ngrok
ngrok http 3000
# Output: Forwarding https://abc123.ngrok-free.app -> http://localhost:3000

# Browser 1: Configure Zoom webhook
# https://marketplace.zoom.us/
# Add endpoint: https://abc123.ngrok-free.app/api/zoom/webhooks
# Result: ✅ Validated

# Browser 2: Login as teacher
# http://localhost:3000/teachers/login
# Send Zoom link to student
# Terminal output: ✅ Zoom meeting created: ID 86232822596

# Browser 3: Open ngrok web interface
# http://127.0.0.1:4040
# Ready to monitor webhooks

# Zoom App: Join and end meeting
# Duration: 2 minutes

# Terminal 1 output:
# 🔔 Zoom webhook received: meeting.ended
# 📊 Meeting ID: 86232822596
# ✅ Updated duration: 2 minutes

# Browser 4: Check admin panel
# http://localhost:3000/admin/teacher-durations
# Result: Shows 2 minutes duration ✅
```

---

## 🎉 Success!

When you see this flow working:

1. ✅ Send Zoom link → Meeting created
2. ✅ End Zoom meeting → Webhook received
3. ✅ Database updated → Duration stored
4. ✅ Admin panel → Shows accurate duration

**You have full automatic duration tracking! 🎊**

---

## 🆘 Need Help?

### Check These First:

1. **ngrok running?** Check Terminal 2
2. **Dev server running?** Check Terminal 1
3. **Webhook validated?** Check Zoom Marketplace
4. **Meeting ID matches?** Check database vs webhook
5. **ngrok web interface** `http://127.0.0.1:4040`

### Debug Commands:

```bash
# Check if webhook endpoint is accessible
curl https://YOUR-NGROK-URL.ngrok-free.app/api/zoom/webhooks

# Check recent zoom links
npx prisma studio
# Then go to wpos_zoom_links table

# Check database directly
mysql -u root -p
USE your_database;
SELECT * FROM wpos_zoom_links ORDER BY id DESC LIMIT 5;
```

---

## 📚 Additional Resources

- **ngrok Documentation:** https://ngrok.com/docs
- **Zoom Webhooks Guide:** https://developers.zoom.us/docs/api/rest/webhook-reference/
- **Your webhook route:** `src/app/api/zoom/webhooks/route.ts`

---

**Ready to test? Start with Terminal 1 (npm run dev), then Terminal 2 (ngrok)! 🚀**
