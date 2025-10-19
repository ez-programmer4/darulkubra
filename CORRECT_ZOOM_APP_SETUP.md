# ✅ CORRECT Zoom App Setup

## ❌ What You Did Wrong:

You created **"Server-to-Server OAuth"** - this is for apps that don't need user login.

## ✅ What You Need:

**"OAuth"** app (User-Managed OAuth) - this allows teachers to connect their personal Zoom accounts.

---

## 🔧 CREATE THE CORRECT APP

### **Step 1: Go to Zoom Marketplace**

https://marketplace.zoom.us/

### **Step 2: Create NEW App (Delete Old One)**

1. Click **"Develop"** → **"Build App"**

2. **Choose: "OAuth"** (NOT Server-to-Server!)

   - Look for the box that says **"OAuth"**
   - Description: "Apps that allow users to authorize your app"
   - Click **"Create"** under this one

3. **Fill in App Information:**

   - **App Name:** `DarulKubra Teaching Platform`
   - **Short Description:** `Zoom integration for teaching`
   - **Company Name:** `DarulKubra`
   - **Developer Name:** Your name
   - **Developer Email:** Your email

4. Click **"Create"**

---

### **Step 3: Configure App Credentials**

You'll now see different fields:

**App Credentials:**

```
Client ID: _________________ (copy this!)
Client Secret: _____________ (copy this!)
```

**OAuth Redirect URL:** ← THIS IS WHAT YOU NEED!

```
https://exam.darelkubra.com/api/zoom/oauth/callback
```

**Add this URL** and click **"Continue"**

---

### **Step 4: Add Scopes**

1. Click **"Scopes"** tab

2. Click **"+ Add Scopes"**

3. **Search and select these:**

   - ☑️ `meeting:write` (NOT meeting:write:admin)
   - ☑️ `meeting:read` (NOT meeting:read:admin)
   - ☑️ `user:read` (NOT user:read:admin)

4. Click **"Done"** → **"Continue"**

---

### **Step 5: Configure Event Subscriptions**

1. Click **"Feature"** tab

2. Enable **"Event Subscriptions"**

3. **Event notification endpoint URL:**

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

4. Click **"Validate"**

5. **Add Event Types:**

   - ☑️ `meeting.started`
   - ☑️ `meeting.ended`
   - ☑️ `meeting.participant_joined`
   - ☑️ `meeting.participant_left`

6. Click **"Save"**

7. **Copy Verification Token** - you'll need this

---

### **Step 6: Activate App**

1. Click **"Activation"** tab
2. Toggle **"Activate your app"** to ON
3. Accept terms
4. **Published!** ✅

---

### **Step 7: Update Production .env**

**Replace these values in your production `.env` file:**

```env
# OLD (from Server-to-Server app) - REMOVE THESE:
# ZOOM_ACCOUNT_ID="H0sEeeTDQ72L0stdsLsbwQ"

# NEW (from OAuth app):
ZOOM_CLIENT_ID="your_new_client_id_from_oauth_app"
ZOOM_CLIENT_SECRET="your_new_client_secret_from_oauth_app"
ZOOM_REDIRECT_URI="https://exam.darelkubra.com/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="verification_token_from_event_subscriptions"
```

**Note:** OAuth app doesn't have "Account ID" - you don't need it!

---

### **Step 8: Restart Server**

```bash
pm2 restart all
```

---

### **Step 9: Test Teacher Connection**

1. Go to: https://exam.darelkubra.com
2. Login as teacher
3. Click "Connect Zoom Account"
4. Should open Zoom authorization page
5. Login with teacher's Zoom credentials
6. Click "Allow"
7. Redirected back ✅
8. Auto-create now works!

---

## 🆚 **The Key Difference:**

### **Server-to-Server OAuth** (What you created):

❌ No user login
❌ No redirect URLs
❌ App acts on behalf of ONE Zoom account
❌ Can't let teachers use their own Zoom

### **OAuth (User-Managed)** (What you NEED):

✅ Teachers login with their Zoom
✅ Has redirect URLs
✅ Each teacher uses their own Zoom account
✅ Multiple teachers can connect
✅ THIS IS WHAT WE NEED!

---

## 📋 **Quick Checklist:**

**Creating OAuth App:**

- [ ] Go to Zoom Marketplace
- [ ] Click "Build App" → Choose **"OAuth"** (not Server-to-Server!)
- [ ] Enter app details
- [ ] Add redirect URL: `https://exam.darelkubra.com/api/zoom/oauth/callback`
- [ ] Add 3 scopes: meeting:write, meeting:read, user:read
- [ ] Configure Event Subscriptions (webhook URL)
- [ ] Activate app
- [ ] Copy Client ID and Secret
- [ ] Update .env file
- [ ] Restart server

---

## 🎯 **Summary:**

**You need to:**

1. ✅ Create NEW app of type **"OAuth"** (not Server-to-Server)
2. ✅ Configure redirect URL in the new app
3. ✅ Update `.env` with new Client ID and Secret
4. ✅ Remove `ZOOM_ACCOUNT_ID` from `.env` (OAuth apps don't have this)
5. ✅ Restart server
6. ✅ Test teacher connection

---

**Go create the correct OAuth app now! It takes 10 minutes.** 🚀
