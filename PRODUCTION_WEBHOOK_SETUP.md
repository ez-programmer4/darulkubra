# 🚀 Production Webhook Setup Guide

## Problem

Webhooks work in development (with ngrok) but not in production deployment.

## Solution

Update the webhook URL in Zoom Marketplace to point to your production domain.

---

## 📋 Step-by-Step Instructions

### **STEP 1: Verify Production Endpoint is Accessible**

1. **Open browser and visit:**

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

   _(Replace with your actual domain)_

2. **You should see:**

   ```json
   {
     "status": "ok",
     "message": "Zoom webhook endpoint is ready",
     "timestamp": "2024-10-21T..."
   }
   ```

3. **If you DON'T see this:**

   - ❌ Server is not running
   - ❌ Application not deployed
   - ❌ Route not built correctly

   **Fix:**

   ```bash
   # On production server
   npm run build
   pm2 restart all
   ```

---

### **STEP 2: Check Production Environment Variables**

1. **SSH into production server**

2. **Check `.env` file has:**

   ```env
   ZOOM_WEBHOOK_SECRET_TOKEN=EXR7JH5pR3S2I9Rdofqf1A
   ```

3. **If missing, add it and restart:**

   ```bash
   # Add to .env file
   echo 'ZOOM_WEBHOOK_SECRET_TOKEN=EXR7JH5pR3S2I9Rdofqf1A' >> .env

   # Restart server
   pm2 restart all
   ```

---

### **STEP 3: Update Zoom Marketplace Configuration**

1. **Login to Zoom Marketplace:**

   - Go to: https://marketplace.zoom.us/
   - Click: **"Manage"** → **"My Apps"**

2. **Select your Zoom app** (or create one if you haven't)

3. **Go to "Feature" tab**

4. **Find "Event Subscriptions" section**

5. **Toggle "Event Subscriptions" to ON**

6. **Update Webhook URL:**

   **Old URL (Development with ngrok):**

   ```
   https://abc123.ngrok-free.app/api/zoom/webhooks
   ```

   **New URL (Production):**

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

   _(Replace `exam.darelkubra.com` with YOUR production domain)_

7. **Click "Validate" button**

   - Zoom will send a test request to your server
   - Should see: ✅ **"URL Validated"** with green checkmark

8. **Select Event Types:**

   - ☑️ `meeting.started`
   - ☑️ `meeting.ended`
   - ☑️ `meeting.participant_joined`
   - ☑️ `meeting.participant_left`
   - ☑️ `recording.started` (optional)
   - ☑️ `recording.stopped` (optional)
   - ☑️ `meeting.sharing_started` (optional)
   - ☑️ `meeting.sharing_ended` (optional)

9. **Click "Save"**

---

### **STEP 4: Test Webhook in Production**

1. **Create a test meeting as a teacher**

2. **Start the meeting and join**

3. **Check production logs:**

   ```bash
   # On production server
   pm2 logs --lines 50
   ```

4. **You should see:**

   ```
   Zoom webhook event received: meeting.started
   Meeting started: 123456789 at ...
   Participant joined meeting 123456789: ...
   ```

5. **End the meeting**

6. **Check logs again:**

   ```
   Zoom webhook event received: meeting.ended
   Meeting ended: 123456789
   Updated zoom link ID ... with duration ... minutes
   ```

7. **Verify in database:**
   ```sql
   SELECT
     zoom_meeting_id,
     session_status,
     teacher_duration_minutes,
     student_duration_minutes,
     zoom_start_time,
     session_ended_at
   FROM wpos_zoom_links
   WHERE zoom_meeting_id IS NOT NULL
   ORDER BY sent_time DESC
   LIMIT 1;
   ```

---

## 🔍 Troubleshooting

### Problem: "URL Validation Failed"

**Possible Causes:**

1. **Endpoint not accessible**

   ```bash
   # Test from command line
   curl https://exam.darelkubra.com/api/zoom/webhooks
   ```

   Should return: `{"status":"ok"...}`

2. **SSL Certificate issue**

   - Make sure your domain has valid HTTPS certificate
   - Visit your domain in browser - should show 🔒 padlock

3. **Server not running**

   ```bash
   pm2 list
   # Should show your app as "online"
   ```

4. **ZOOM_WEBHOOK_SECRET_TOKEN not set**
   - Check production `.env` file
   - Restart server after adding

---

### Problem: Validation works but no webhook events received

**Check:**

1. **Events are selected in Zoom Marketplace**

   - Go to Feature → Event Subscriptions
   - Make sure events are checked

2. **App is activated**

   - Go to Activation tab
   - Should say "Activated"

3. **Server logs for errors**

   ```bash
   pm2 logs --err
   ```

4. **Database connectivity**
   - Make sure production database is accessible
   - Check DATABASE_URL in `.env`

---

### Problem: Getting old ngrok URL errors

**This means webhooks are still pointing to development URL**

**Fix:**

1. Go to Zoom Marketplace
2. Update webhook URL to production domain
3. Click Validate again
4. Save changes

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] Production webhook endpoint accessible in browser
- [ ] Zoom Marketplace shows ✅ green checkmark for webhook URL
- [ ] Event types selected and saved
- [ ] Test meeting generates webhook events in logs
- [ ] Duration tracking data appears in database
- [ ] Admin dashboard shows meeting durations
- [ ] No errors in production logs

---

## 🎯 Quick Reference

**Production Webhook URL:**

```
https://YOUR-DOMAIN.com/api/zoom/webhooks
```

**Test URL in Browser:**

```
https://YOUR-DOMAIN.com/api/zoom/webhooks
```

**Expected Response:**

```json
{
  "status": "ok",
  "message": "Zoom webhook endpoint is ready",
  "timestamp": "2024-10-21T..."
}
```

**Environment Variable:**

```env
ZOOM_WEBHOOK_SECRET_TOKEN=EXR7JH5pR3S2I9Rdofqf1A
```

**Check Logs:**

```bash
pm2 logs --lines 50
```

---

## 📞 Still Having Issues?

### Quick Diagnostic Commands:

```bash
# 1. Test endpoint
curl https://exam.darelkubra.com/api/zoom/webhooks

# 2. Check if server running
pm2 list

# 3. Check server logs
pm2 logs --lines 100

# 4. Check environment variables
cat .env | grep ZOOM_WEBHOOK

# 5. Test DNS
ping exam.darelkubra.com

# 6. Test SSL
curl -I https://exam.darelkubra.com
```

### Common Issues:

| Issue              | Solution                                            |
| ------------------ | --------------------------------------------------- |
| Connection refused | Server not running - restart with `pm2 restart all` |
| 404 Not Found      | Route not built - run `npm run build`               |
| SSL Error          | Certificate invalid - renew SSL certificate         |
| No events received | Events not selected in Zoom Marketplace             |
| Old ngrok errors   | Update webhook URL in Zoom to production domain     |

---

**Created:** October 21, 2024  
**Purpose:** Configure Zoom webhooks for production deployment  
**Time Required:** 10-15 minutes  
**Difficulty:** Easy
