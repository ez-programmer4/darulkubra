# 🔧 Fix: "Application Not Found" Error for Teachers

## ❌ Problem

Teachers get "Application not found" when trying to connect Zoom, but it works for the admin account.

## 🔍 Root Cause

You created a **"Server-to-Server OAuth"** app instead of a **"User-Managed OAuth"** app.

| App Type                      | Who Can Use It?                        |
| ----------------------------- | -------------------------------------- |
| **Server-to-Server OAuth** ❌ | Only the admin account that created it |
| **User-Managed OAuth** ✅     | ANY teacher can connect their own Zoom |

---

## ✅ Solution: Create User-Managed OAuth App

### **STEP 1: Create New Zoom App**

1. **Go to Zoom Marketplace:**

   - Visit: https://marketplace.zoom.us/
   - Login with your Zoom account

2. **Click "Develop" → "Build App"**

3. **Choose "OAuth" (NOT Server-to-Server)**

   - Look for: **"OAuth"** or **"User-Managed OAuth"**
   - Click **"Create"**

4. **Fill in Basic Information:**

   ```
   App Name: DarulKubra Teaching Platform
   App Type: User-managed app
   Would you like to publish this app? Choose "Account-level app" for internal use only
   ```

5. **Click "Create"**

---

### **STEP 2: Configure App Information**

1. **Basic Information Tab:**

   ```
   Short Description: Teaching platform for DarulKubra
   Long Description: Internal platform for managing Zoom meetings with students
   Developer Name: Your name
   Developer Email: Your email
   ```

2. **Click "Continue"**

---

### **STEP 3: Copy OAuth Credentials**

**IMPORTANT: Copy these 2 values:**

```
Client ID: _________________________________
Client Secret: _____________________________
```

⚠️ **Note:** User-Managed OAuth apps do NOT have an Account ID!

---

### **STEP 4: Add Redirect URL**

1. **In the "OAuth Redirect URL" field, add:**

   ```
   https://exam.darelkubra.com/api/zoom/oauth/callback
   ```

   _(Replace `exam.darelkubra.com` with your actual domain)_

2. **Add OAuth Allow List (Whitelist):**

   ```
   https://exam.darelkubra.com
   ```

3. **Click "Continue"**

---

### **STEP 5: Add Scopes**

1. **Click "+ Add Scopes" button**

2. **Search and select these scopes:**

   - ☑️ `meeting:write` - Create meetings
   - ☑️ `meeting:read` - Read meeting details
   - ☑️ `user:read` - Read user info

3. **Click "Done"**

4. **Click "Continue"**

---

### **STEP 6: Configure Event Subscriptions (Webhooks)**

1. **Toggle "Event Subscriptions" to ON**

2. **Add Event Subscription Endpoint:**

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

3. **Click "Validate"**

   - Should show ✅ green checkmark

4. **Subscribe to Events:**

   - ☑️ `meeting.started`
   - ☑️ `meeting.ended`
   - ☑️ `meeting.participant_joined`
   - ☑️ `meeting.participant_left`

5. **Click "Save"**

6. **Click "Continue"**

---

### **STEP 7: Activate App**

**IMPORTANT:** Since this is an **Account-level app**, it only works for users in **your Zoom organization**.

#### **Option A: For Internal Organization Use (Recommended)**

1. **Make sure all teachers use email addresses from your domain**

   - Example: `teacher1@darelkubra.com`
   - OR add them to your Zoom organization

2. **Go to "Activation" tab**

3. **Click "Activate" button**

4. **Done!** All teachers in your organization can now connect.

#### **Option B: For ANY Zoom User (Requires Zoom Approval)**

1. **Submit app for Zoom Marketplace review**

   - Takes 3-7 days for approval
   - Zoom will review your app
   - Once approved, ANY Zoom user can connect

2. **For now, use Option A** (faster and easier)

---

### **STEP 8: Update Production Environment Variables**

1. **SSH into production server**

2. **Edit `.env` file:**

   ```bash
   nano .env
   ```

3. **Update/Add these lines:**

   ```env
   # NEW (User-Managed OAuth):
   ZOOM_CLIENT_ID="paste_new_client_id_here"
   ZOOM_CLIENT_SECRET="paste_new_client_secret_here"
   ZOOM_REDIRECT_URI="https://exam.darelkubra.com/api/zoom/oauth/callback"
   ZOOM_WEBHOOK_SECRET_TOKEN="EXR7JH5pR3S2I9Rdofqf1A"
   ```

   **Remove this line if it exists:**

   ```env
   # ZOOM_ACCOUNT_ID="..."  ← DELETE THIS LINE
   ```

4. **Save file** (Ctrl+X, Y, Enter)

5. **Restart server:**
   ```bash
   pm2 restart all
   ```

---

### **STEP 9: Test with Teachers**

1. **As a teacher, login to your platform**

2. **Go to dashboard - should see "Connect Your Zoom Account" button**

3. **Click "Connect Zoom Account"**

4. **Zoom login page appears**

5. **Teacher logs in with their Zoom account**

6. **Zoom asks: "Allow DarulKubra Teaching Platform to access your account?"**

7. **Click "Allow"**

8. **Redirects back to your platform**

9. **Should see: "✅ Zoom Connected Successfully"**

10. **Teacher can now create meetings with one click!**

---

## 🔍 Troubleshooting

### Problem: "Application not found" error

**Possible Causes:**

1. **App not activated**

   - Go to Zoom Marketplace → Your App → Activation
   - Click "Activate"

2. **Teacher not in your Zoom organization**

   - For Account-level apps, teachers must be in your org
   - Add teachers to your Zoom organization
   - OR submit app for public approval

3. **Wrong Client ID in `.env`**
   - Make sure you copied the NEW app's Client ID
   - Not the old Server-to-Server app's Client ID

---

### Problem: "Invalid redirect URI" error

**Fix:**

1. Go to Zoom Marketplace → Your App → OAuth
2. Make sure redirect URI matches exactly:
   ```
   https://exam.darelkubra.com/api/zoom/oauth/callback
   ```
3. Check allowlist includes your domain

---

### Problem: Teacher connects successfully but can't create meetings

**Possible Causes:**

1. **Missing scopes**

   - Go to Zoom Marketplace → Your App → Scopes
   - Make sure `meeting:write` is added

2. **Token expired**
   - Your code auto-refreshes tokens, but check logs for errors

---

## ✅ Verification Checklist

After completing all steps:

- [ ] Created new OAuth app (NOT Server-to-Server)
- [ ] Added redirect URI in Zoom
- [ ] Added required scopes
- [ ] Configured webhooks
- [ ] Activated app
- [ ] Updated `.env` with new Client ID/Secret
- [ ] Removed `ZOOM_ACCOUNT_ID` from `.env`
- [ ] Restarted production server
- [ ] Tested with at least one teacher
- [ ] Teacher can connect their Zoom account
- [ ] Teacher can create meetings
- [ ] Student receives Telegram notification
- [ ] Webhooks track meeting duration

---

## 📊 App Type Comparison

| Feature                        | Server-to-Server OAuth | User-Managed OAuth    |
| ------------------------------ | ---------------------- | --------------------- |
| Each teacher connects own Zoom | ❌ No                  | ✅ Yes                |
| Works for any Zoom account     | ❌ No                  | ✅ Yes (if published) |
| Uses Account ID                | ✅ Yes                 | ❌ No                 |
| Requires OAuth flow            | ❌ No                  | ✅ Yes                |
| Teachers see "Allow" screen    | ❌ No                  | ✅ Yes                |
| Best for                       | Single admin use       | Multiple teachers     |

**Your system needs:** User-Managed OAuth ✅

---

## 🎯 Quick Summary

**What you need to do:**

1. ✅ Create OAuth app in Zoom (NOT Server-to-Server)
2. ✅ Copy Client ID and Secret
3. ✅ Add redirect URI: `https://exam.darelkubra.com/api/zoom/oauth/callback`
4. ✅ Add scopes: `meeting:write`, `meeting:read`, `user:read`
5. ✅ Configure webhooks: `https://exam.darelkubra.com/api/zoom/webhooks`
6. ✅ Activate app
7. ✅ Update `.env` file with new credentials
8. ✅ Remove `ZOOM_ACCOUNT_ID` from `.env`
9. ✅ Restart server
10. ✅ Test with teacher

**Time required:** 15-20 minutes

---

**Created:** October 21, 2024  
**Issue:** Teachers getting "Application not found"  
**Root Cause:** Wrong Zoom app type  
**Solution:** Create User-Managed OAuth app
