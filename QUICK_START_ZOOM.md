# Quick Start Guide - Zoom OAuth Integration

## 🚀 Get Started in 5 Minutes

### Step 1: Create Zoom App (2 minutes)

1. Visit [https://marketplace.zoom.us/develop/create](https://marketplace.zoom.us/develop/create)
2. Choose **OAuth** → Click **Create**
3. Fill in:
   - App Name: `Darul Kubra`
   - Short Description: `Teacher portal`
   - Company Name: `Darul Kubra Academy`

### Step 2: Configure OAuth Settings

**Redirect URL for local testing:**

```
http://localhost:3000/api/zoom/oauth/callback
```

**Required Scopes:**

- ✅ `meeting:write:admin`
- ✅ `meeting:read:admin`
- ✅ `user:read:admin`

### Step 3: Add Environment Variables

Create or edit `.env.local` in your project root:

```env
# Copy from Zoom app credentials
ZOOM_CLIENT_ID="paste_your_client_id_here"
ZOOM_CLIENT_SECRET="paste_your_client_secret_here"

# These should already be set
ZOOM_REDIRECT_URI="http://localhost:3000/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="any_random_string_for_testing"
```

### Step 4: Run Database Migration

```bash
npx prisma migrate dev --name add_zoom_oauth_fields
```

**What this does:**

- Adds Zoom fields to teacher table
- Adds meeting tracking fields to zoom_links table
- Creates the migration in `prisma/migrations/`

### Step 5: Start Development Server

```bash
npm run dev
```

Visit: [http://localhost:3000/teachers/dashboard](http://localhost:3000/teachers/dashboard)

### Step 6: Test OAuth Flow

1. Login as a teacher
2. You'll see "Zoom Account" card at the top
3. Click **"Connect Zoom"**
4. Authorize with your Zoom account
5. You should see "Connected" status ✅

---

## 📱 Testing Webhooks (Optional for Now)

For local development, Zoom can't reach `localhost`. Use **ngrok**:

```bash
# Install ngrok
npm install -g ngrok

# In one terminal: run your app
npm run dev

# In another terminal: expose port 3000
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and update:

1. **Zoom App → Event Subscriptions**
   - Enable Event Subscriptions
   - Event notification endpoint URL:
     ```
     https://abc123.ngrok.io/api/zoom/webhooks
     ```
   - Subscribe to events:
     - `meeting.started`
     - `meeting.ended`
     - `meeting.participant_joined`
     - `meeting.participant_left`

---

## ✅ Verify It's Working

### Test 1: Connect Zoom Account

- [ ] Login as teacher
- [ ] See Zoom card on dashboard
- [ ] Click "Connect Zoom"
- [ ] Authorize successfully
- [ ] See "Connected" status

### Test 2: Check Database

```sql
SELECT ustazid, ustazname, zoom_user_id, zoom_connected_at
FROM wpos_wpdatatable_24
WHERE zoom_user_id IS NOT NULL;
```

Should show the connected teacher.

### Test 3: Send Zoom Link (Optional Auto-Create)

- Go to teacher students page
- Send a Zoom link (manual link still works)
- Check database:
  ```sql
  SELECT id, studentid, zoom_meeting_id, created_via_api
  FROM wpos_zoom_links
  ORDER BY id DESC LIMIT 5;
  ```

---

## 🎯 What Teachers Can Do Now

### Option A: Manual Link (Backward Compatible)

Teacher pastes their own Zoom link → Works as before

### Option B: Auto-Create (New Feature)

System creates meeting automatically using teacher's Zoom account

**To enable auto-create:**

1. Teacher connects Zoom account (one-time)
2. System handles meeting creation automatically

---

## 📊 View Meeting Durations

Teachers can see their actual teaching hours:

```
GET http://localhost:3000/api/teachers/meeting-durations?month=2025-10
```

Returns:

```json
{
  "stats": {
    "totalMeetings": 45,
    "completedMeetings": 42,
    "totalMinutes": 1260,
    "totalHours": 21,
    "averageDuration": 30
  },
  "meetings": [...]
}
```

---

## 🔧 Troubleshooting

### Error: "Zoom OAuth not configured"

**Fix:** Check `.env.local` has `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET`

### Error: Database connection issue

**Fix:** Run migration: `npx prisma migrate dev`

### Error: Can't connect Zoom

**Fix:**

1. Check redirect URI matches exactly
2. Verify scopes are added in Zoom app
3. Make sure app is activated

### Webhooks not working

**Fix:** Use ngrok for local testing (see above)

---

## 💰 Cost Breakdown

| Scenario              | Monthly Cost                         |
| --------------------- | ------------------------------------ |
| Teacher has free Zoom | **$0** (works for 30-min sessions)   |
| Teacher has Zoom Pro  | **$0 to academy** (teacher pays $15) |
| Academy wants to help | ~$15/teacher (optional)              |

**Total academy cost: $0** if teachers use own accounts! 🎉

---

## 📝 Next Steps After Local Testing

Once you've tested locally and it works:

1. **For Production:**

   - Update Zoom app redirect URL to production domain
   - Update webhook URL to production domain
   - Run migration on production: `npx prisma migrate deploy`
   - Add environment variables to production

2. **Teacher Onboarding:**

   - Send email to teachers explaining new feature
   - Optional: Create tutorial video
   - Support free Zoom users (40-min limit works for 30-min sessions)

3. **Monitor:**
   - Check webhook logs in `/api/zoom/webhooks`
   - Verify durations being tracked
   - Ensure salary cache clearing works

---

## 🎓 For Teachers: Benefits

✅ No more manual link creation (optional)  
✅ Use your own free Zoom account  
✅ Automatic meeting setup  
✅ Your hours tracked transparently  
✅ Keep your cloud recordings (if you have Pro)

---

## 📚 Full Documentation

- **Setup Guide:** `ZOOM_OAUTH_SETUP.md`
- **Implementation Details:** `ZOOM_OAUTH_IMPLEMENTATION_COMPLETE.md`
- **Schema Changes:** Check `prisma/migrations/`

---

**That's it! You're ready to test! 🚀**

Any questions? Check the troubleshooting section or review the detailed docs.
