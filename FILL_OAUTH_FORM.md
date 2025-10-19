# 📝 Fill Out OAuth App Form - Step by Step

## ✅ You're On The Right Screen!

You created a **"General App"** - this is correct! Now fill out the form:

---

## 📋 SECTION 1: App Credentials

### **Client ID** ✅ (Already Generated)

```
AcG3q1FUQDS67PquINDdyw
```

- ✅ **This is auto-generated - don't change it**
- 📋 **COPY THIS!** Write it down or take screenshot

### **Client Secret** ✅ (Hidden)

```
••••••••••••••••••••••••••••••••
```

- Click **"View"** or **"Copy"** to see the full secret
- 📋 **COPY THIS!** You'll need it for `.env` file
- ⚠️ **Keep it secret!** Don't share publicly

---

## 📋 SECTION 2: OAuth Information

### **OAuth Redirect URL** ⭐ IMPORTANT!

**Development Redirect URL:** (If testing on localhost)

```
http://localhost:3001/api/zoom/oauth/callback
```

⚠️ **Skip this if you're deploying directly to production**

**Then click "+ Add" for Production URL**

**Production Redirect URL:** (Your actual domain)

```
https://exam.darelkubra.com/api/zoom/oauth/callback
```

**Click "+ Add"** to save it

**You should now see TWO URLs:**

- ✅ `http://localhost:3001/api/zoom/oauth/callback` (for testing)
- ✅ `https://exam.darelkubra.com/api/zoom/oauth/callback` (for production)

---

### **Use Strict Mode for Redirect URLs**

**Toggle: ON** ✅

**Why?**

- Better security
- Prevents redirect attacks
- Recommended by Zoom

---

### **Subdomain Check**

**Toggle: OFF** ❌

**Why?**

- We're not using subdomains
- Not needed for our case
- Keep it simple

---

### **OAuth Allow Lists**

**Leave EMPTY** (don't add anything here)

**Why?**

- Not needed for basic setup
- Optional advanced feature
- Our redirect URLs are enough

---

## 📋 COMPLETE FORM SUMMARY:

```
App Credentials:
├── Client ID: AcG3q1FUQDS67PquINDdyw ✅ (copied!)
└── Client Secret: ******************* ✅ (copied!)

OAuth Information:
├── OAuth Redirect URL (Development):
│   └── http://localhost:3001/api/zoom/oauth/callback
│
├── OAuth Redirect URL (Production): ⭐ IMPORTANT!
│   └── https://exam.darelkubra.com/api/zoom/oauth/callback
│
├── Use Strict Mode: ON ✅
├── Subdomain Check: OFF ❌
└── OAuth Allow Lists: (empty) ✅
```

---

## 🎯 CLICK "CONTINUE" BUTTON

After filling everything, click **"Continue"** button at bottom!

---

## 📝 NEXT SCREEN: Scopes

After clicking Continue, you'll see **"Scopes"** page.

**Add these 3 scopes:**

1. Click **"+ Add Scopes"** button

2. **Search for and select:**

   - ☑️ `meeting:write` - Create meetings
   - ☑️ `meeting:read` - Read meeting info
   - ☑️ `user:read` - Get user info

3. Click **"Done"**

4. Click **"Continue"**

---

## 📝 NEXT SCREEN: Feature (Event Subscriptions)

**This is for webhooks (duration tracking)**

1. Find **"Event Subscriptions"** section

2. Toggle **"Enable Event Subscription"** to ON

3. **Event notification endpoint URL:**

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

4. Click **"Validate"**

   - If ❌ fails: See WEBHOOK_TROUBLESHOOTING.md
   - If ✅ passes: Continue!

5. Click **"+ Add Event Subscription"**

6. Click **"+ Add Events"**

7. **Select these 4 events:**

   - ☑️ Start Meeting (`meeting.started`)
   - ☑️ End Meeting (`meeting.ended`)
   - ☑️ Participant/Host joined meeting (`meeting.participant_joined`)
   - ☑️ Participant/Host left meeting (`meeting.participant_left`)

8. Click **"Done"**

9. Click **"Save"** or **"Continue"**

10. **Copy the Verification Token** - you'll need this for `.env`

---

## 📝 FINAL SCREEN: Activation

1. Click **"Activation"** tab

2. **Toggle "Activate your app"** to ON

3. Accept terms

4. ✅ **App is now LIVE!**

---

## ✅ WHAT TO COPY:

After completing all steps, you should have:

```
Client ID: AcG3q1FUQDS67PquINDdyw
Client Secret: [click View to see full secret]
Verification Token: [from Event Subscriptions]
```

---

## 🔧 UPDATE PRODUCTION .ENV:

**On your production server, update `.env`:**

```bash
nano .env
```

**Update/add these lines:**

```env
# Zoom OAuth (from General App)
ZOOM_CLIENT_ID="AcG3q1FUQDS67PquINDdyw"
ZOOM_CLIENT_SECRET="paste_client_secret_here"
ZOOM_REDIRECT_URI="https://exam.darelkubra.com/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="paste_verification_token_here"

# Your domain
NEXTAUTH_URL="https://exam.darelkubra.com"
```

**⚠️ REMOVE THIS LINE IF IT EXISTS:**

```env
# ZOOM_ACCOUNT_ID="..." ← DELETE THIS! OAuth apps don't have Account ID
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X)

---

## 🔄 RESTART SERVER:

```bash
pm2 restart all
```

---

## 🧪 TEST IT:

1. Go to: https://exam.darelkubra.com
2. Login as teacher
3. Go to "My Students"
4. Click "Connect Zoom Account"
5. Should open Zoom authorization page ✅
6. Login to Zoom
7. Click "Allow"
8. Redirected back ✅
9. Yellow banner disappears ✅
10. Auto-create now available! ✅

---

## ✅ CHECKLIST - FILLING OUT ZOOM FORM:

**App Credentials Page:**

- [x] Client ID: Copied ✅
- [x] Client Secret: Copied ✅

**OAuth Information Page:**

- [ ] Add production redirect URL: `https://exam.darelkubra.com/api/zoom/oauth/callback`
- [ ] Use Strict Mode: ON ✅
- [ ] Subdomain Check: OFF ❌
- [ ] OAuth Allow Lists: Leave empty ✅
- [ ] Click "Continue"

**Scopes Page:**

- [ ] Add `meeting:write` ✅
- [ ] Add `meeting:read` ✅
- [ ] Add `user:read` ✅
- [ ] Click "Continue"

**Feature Page (Event Subscriptions):**

- [ ] Enable Event Subscription: ON ✅
- [ ] Webhook URL: `https://exam.darelkubra.com/api/zoom/webhooks`
- [ ] Validate ✅
- [ ] Add 4 events (started, ended, joined, left) ✅
- [ ] Copy Verification Token ✅
- [ ] Click "Save"

**Activation Page:**

- [ ] Toggle "Activate": ON ✅
- [ ] Accept terms ✅

**Production Server:**

- [ ] Update `.env` with Client ID
- [ ] Update `.env` with Client Secret
- [ ] Update `.env` with Verification Token
- [ ] Remove `ZOOM_ACCOUNT_ID` line if exists
- [ ] Restart server: `pm2 restart all`

**Testing:**

- [ ] Teacher can click "Connect Zoom"
- [ ] Zoom authorization opens
- [ ] After allowing, redirected back
- [ ] Auto-create button appears
- [ ] Can create meeting successfully

---

**Now fill out the form following this guide!** 📝✨
