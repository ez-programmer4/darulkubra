# 🚀 Complete Setup Guide - Zoom Integration

## 📋 **WHO DOES WHAT?**

### 🔧 **ADMIN** (You - ONE TIME Setup)

- Set up Zoom OAuth in Zoom Marketplace
- Add credentials to server
- Takes **30 minutes**
- Done ONCE for entire system

### 👨‍🏫 **TEACHERS** (After Admin Setup)

- Connect their personal Zoom accounts (optional)
- Use manual link method (always works)
- Takes **30 seconds per teacher**

---

## 🎯 SIMPLE VERSION

### **Option 1: Manual Method (Works RIGHT NOW)**

**No setup needed!**

- Teacher creates Zoom meeting manually
- Pastes link in system
- Sends to student
- ✅ Works perfectly!

### **Option 2: Auto Method (Requires Setup)**

**One-time admin setup required**

- Admin configures OAuth (30 min)
- Teachers connect Zoom (30 sec each)
- Then: One-click meetings
- ✅ Faster for daily use!

---

## 👔 PART 1: ADMIN SETUP (You Do This Once)

### What You Need:

- [ ] A Zoom account email (any - even free Gmail works!)
- [ ] 30 minutes
- [ ] Server access

### Step 1: Go to Zoom Marketplace

1. Open browser
2. Go to: https://marketplace.zoom.us/
3. Login with your Zoom account
4. Click **"Develop"** → **"Build App"**

### Step 2: Create App

1. Choose **"Server-to-Server OAuth"**
2. Click **"Create"**
3. Fill in:
   - App Name: `DarulKubra Teaching`
   - Description: `Teaching platform`
   - Company: `DarulKubra`
4. Click **"Create"**

### Step 3: Copy These 3 Things

**IMPORTANT: Copy these NOW!**

```
Account ID: ________________
Client ID: ________________
Client Secret: ________________
```

### Step 4: Add Scopes

1. Click **"Scopes"** tab (left sidebar)
2. Click **"+ Add Scopes"** button
3. In the search box, type and check these 3 boxes:
   - ☑️ `meeting:write:admin` - Create and manage meetings
   - ☑️ `meeting:read:admin` - Read meeting details
   - ☑️ `user:read:admin` - Read user information
4. Click **"Done"** button
5. Click **"Continue"** to save

✅ **Scopes Added!**

---

### Step 5: Configure Event Subscriptions (For Duration Tracking)

**This step enables automatic meeting duration tracking**

1. Click **"Feature"** tab (left sidebar)

2. Find **"Event Subscriptions"** section

3. Toggle **"Enable Event Subscription"** to ON

4. **Event notification endpoint URL:**

   ```
   https://darulkubra.com/api/zoom/webhooks
   ```

   ⚠️ **Important Notes:**

   - Replace `darulkubra.com` with YOUR actual domain
   - Must be **HTTPS** (not HTTP)
   - Must be publicly accessible
   - For **localhost testing**: Skip this step (duration tracking won't work locally, but manual links still work!)

5. Click **"Validate"** button

   - Zoom will send test request to your URL
   - Should show ✅ green checkmark if successful

   **❌ VALIDATION FAILED? READ THIS:**

   **Quick Test:** Open browser and go to your webhook URL:

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

   **Should see:**

   ```json
   { "status": "ok", "message": "Zoom webhook endpoint is ready" }
   ```

   **If you DON'T see this:**

   - ❌ Server not running → restart it
   - ❌ URL wrong → check domain name
   - ❌ Not deployed yet → webhooks need production server
   - ❌ SSL issue → check HTTPS certificate

   **📄 Full troubleshooting: See `WEBHOOK_TROUBLESHOOTING.md` file**

   **⚠️ CAN'T FIX IT NOW?**
   **SKIP THIS STEP!** Jump to Step 6 (Activate)

   - Everything works except duration tracking
   - Add webhooks later when server ready
   - Manual links work perfectly

6. Click **"Add Event Subscription"** button (if validation succeeded)

7. **Add Event Types** - Click **"+ Add Events"** button and select these:

   **Under "Meeting" category, check these:**

   - ☑️ **Start Meeting** (`meeting.started`)
   - ☑️ **End Meeting** (`meeting.ended`)
   - ☑️ **Participant/Host joined meeting before host** (`meeting.participant_joined`)
   - ☑️ **Participant/Host left meeting** (`meeting.participant_left`)

8. Click **"Done"** button

9. Click **"Save"** button

10. **Copy Verification Token** (you'll need this):
    ```
    Verification Token: _______________________
    ```
    (Write this down!)

✅ **Event Subscriptions Configured!**

---

### Step 6: Activate the App

1. Click **"Activation"** tab (left sidebar)
2. Toggle **"Activated"** switch to **ON**
3. Read the terms and click **"Continue"**

✅ **App Activated!**

---

### Step 7: Add to Server

Open your `.env` file and add:

```env
# Zoom OAuth Credentials (from Step 3)
ZOOM_CLIENT_ID=paste_client_id_here
ZOOM_CLIENT_SECRET=paste_client_secret_here
ZOOM_ACCOUNT_ID=paste_account_id_here

# Webhook Verification Token (from Step 5)
ZOOM_WEBHOOK_SECRET_TOKEN=paste_verification_token_here

# Your domain
NEXTAUTH_URL=https://darulkubra.com
```

**Example with real values:**

```env
ZOOM_CLIENT_ID=ABcdEF123456
ZOOM_CLIENT_SECRET=xYz789AbC123456DEF789
ZOOM_ACCOUNT_ID=abc123def456
ZOOM_WEBHOOK_SECRET_TOKEN=v1_abc123xyz789
NEXTAUTH_URL=https://darulkubra.com
```

Save the file!

✅ **Credentials Added to Server!**

---

### Step 8: Restart Server

```bash
pm2 restart all
```

✅ **ADMIN SETUP COMPLETE!**

---

### 📸 Visual Summary - What You Just Did:

**Zoom Marketplace App:**

```
✅ Created: DarulKubra Teaching Platform
✅ Credentials: 3 codes copied
✅ Scopes: 3 permissions added
✅ Event Subscriptions: 4 meeting events configured
✅ Webhook URL: https://darulkubra.com/api/zoom/webhooks
✅ Activated: App is live
```

**Server Configuration:**

```
✅ .env file updated with 4 values:
   - ZOOM_CLIENT_ID
   - ZOOM_CLIENT_SECRET
   - ZOOM_ACCOUNT_ID
   - ZOOM_WEBHOOK_SECRET_TOKEN
✅ Server restarted
```

**What This Enables:**

- ✅ Teachers can connect their Zoom accounts
- ✅ Auto-create meetings with one click
- ✅ Automatic duration tracking
- ✅ Teaching hours dashboard
- ✅ Real-time meeting notifications

---

## 👨‍🏫 PART 2: TEACHER USAGE

### Teachers Have 2 Options:

#### **Option A: Manual (Always Works)**

1. Create Zoom meeting yourself
2. Copy link
3. Paste in system
4. Send to student
   ✅ **3 steps, works immediately**

#### **Option B: Auto (After Connecting)**

1. First time: Click "Connect Zoom Account" (30 seconds)
2. Then forever: Click "Create Meeting" (1 second)
   ✅ **One-click forever!**

---

## 🎥 HOW TEACHERS CONNECT (Optional)

**After admin setup is complete:**

1. Teacher logs in
2. Sees yellow banner: "Connect Zoom"
3. Clicks "Connect Zoom Account"
4. Zoom page opens
5. Teacher logs in with THEIR Zoom
6. Clicks "Allow"
7. ✅ Done! Auto-create now available

---

## ❓ FAQ - What's Confusing?

### Q: Does ADMIN need Zoom Pro?

**A:** No! Free Zoom account works fine for setup.

### Q: Do TEACHERS need Zoom Pro?

**A:** No! They can use free Zoom accounts.

### Q: Who's Zoom account is used for meetings?

**A:** Each teacher uses THEIR OWN Zoom account (after they connect it).

### Q: What if teacher doesn't connect?

**A:** They can still use manual method - paste link manually.

### Q: What email should admin use for setup?

**A:** Use your existing Zoom email, or create new one like:

- `youremail@gmail.com` (your personal)
- `admin@darulkubra.com` (organization)
- `zoom@darulkubra.com` (dedicated)

**Just use whatever Zoom account you have!**

---

## 🔄 THE FLOW

### Admin's Job (One Time):

```
Admin → Zoom Marketplace → Create App → Get Credentials → Add to Server
```

**Result:** System can now integrate with Zoom

### Teacher's Job (Optional):

```
Teacher → Login → Click "Connect" → Allow → Auto-create available
```

**Result:** This teacher can now auto-create meetings

### Teacher's Job (Always Works):

```
Teacher → Create Zoom → Copy Link → Paste → Send
```

**Result:** Student gets link (no connection needed!)

---

## ✅ QUICK START FOR YOU

**Right now, you can:**

1. **Skip OAuth entirely** - Manual method works!
2. **Or do OAuth setup** - Follow Part 1 above (30 min)

**For video:**

- Show manual method first (works now)
- Show OAuth setup (optional enhancement)
- Show teacher connecting (if OAuth done)

---

## 📊 WHAT YOU SEE AFTER SETUP

### If OAuth NOT configured:

- Teachers see "Connect Zoom" banner
- Auto-create section shows "Not Available"
- Manual method always visible
- ✅ Everything works!

### If OAuth IS configured:

- Teachers can connect
- After connecting: Auto-create available
- Manual method still works
- ✅ Both methods work!

---

## 🎯 MY RECOMMENDATION

**Start simple:**

1. Deploy system now
2. Teachers use manual method
3. See if they want auto-create
4. If yes, do OAuth setup
5. Roll out gradually

**Why?**

- Manual works immediately
- No confusion
- Test system first
- Add OAuth when ready

---

## 💡 THE KEY DIFFERENCE

### **ADMIN SETUP** (Part 1):

- Creates the "bridge" between your system and Zoom
- Uses ONE Zoom account for configuration
- Done ONCE for entire organization
- Enables auto-create features

### **TEACHER USAGE** (Part 2):

- Each teacher can optionally connect THEIR Zoom
- OR just use manual method
- No setup required to use manual
- Personal choice per teacher

---

## 🎬 FOR YOUR VIDEO

**Show this order:**

### Part 1: "Works Right Now" (2 min)

- Login as teacher
- Use manual method
- Show it working

### Part 2: "Optional Enhancement" (3 min)

- Explain OAuth benefits
- Show admin setup screens
- Show where to get credentials

### Part 3: "Teacher Connecting" (2 min)

- Teacher clicks connect
- Zoom authorization
- Auto-create now available

### Part 4: "Both Methods Work" (1 min)

- Compare manual vs auto
- Both are valid choices
- Up to teacher preference

---

---

## 🔧 TROUBLESHOOTING

### Webhook Validation Failed?

**Problem:** When adding webhook URL, Zoom says "Validation failed"

**Solutions:**

1. **Check URL is correct:**

   - Must be: `https://darulkubra.com/api/zoom/webhooks`
   - Replace `darulkubra.com` with YOUR domain
   - Must start with `https://` (not `http://`)

2. **Check server is running:**

   - Your application must be running
   - Endpoint must be publicly accessible
   - Test by visiting: `https://darulkubra.com/api/zoom/webhooks`

3. **For localhost testing:**
   - Webhooks won't work on localhost
   - Skip Event Subscriptions step
   - Manual links will still work
   - Duration tracking won't work until deployed

### "Invalid Client" Error?

**Check:** `.env` file credentials are exactly as copied (no extra spaces)

### Teachers Can't See "Connect Zoom"?

**Check:**

1. OAuth setup completed by admin
2. `.env` has all credentials
3. Server restarted after adding credentials

### Auto-Create Button Not Showing?

**Check:**

1. Admin completed OAuth setup
2. Teacher has connected their Zoom account
3. Hard refresh page (Ctrl + Shift + R)

### Duration Not Tracking?

**Check:**

1. Event Subscriptions configured in Zoom
2. Webhook URL is validated (green checkmark)
3. Meeting was created via auto-create (not manual)
4. Application is deployed (not localhost)

---

## 📝 CHECKLIST - Print This!

### Admin Setup:

- [ ] Zoom Marketplace account created
- [ ] "Server-to-Server OAuth" app created
- [ ] 3 credentials copied (Account ID, Client ID, Secret)
- [ ] 3 scopes added (meeting:write, meeting:read, user:read)
- [ ] Event Subscriptions enabled
- [ ] Webhook URL added: `https://YOUR_DOMAIN/api/zoom/webhooks`
- [ ] Webhook validated (green checkmark)
- [ ] 4 event types added (started, ended, joined, left)
- [ ] Verification token copied
- [ ] App activated (toggle ON)
- [ ] All 4 values added to `.env` file
- [ ] Server restarted

### Teacher Testing:

- [ ] Teacher can login
- [ ] Yellow banner shows "Connect Zoom"
- [ ] Click "Connect" opens Zoom authorization
- [ ] After allowing, banner disappears
- [ ] Auto-create section now visible
- [ ] Can create meeting with one click
- [ ] Student receives Telegram notification
- [ ] Teacher's Zoom opens on "Start Class"

---

**Still confused? Ask me specific questions!**

Which part is unclear?

- Scopes configuration?
- Event Subscriptions setup?
- Webhook validation?
- Teacher connection process?
