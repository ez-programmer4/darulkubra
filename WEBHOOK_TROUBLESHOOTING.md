# 🔧 Webhook Validation Failed - Fix It Now!

## ❌ Error: "URL validation failed. Try again later."

---

## ✅ QUICK FIX - Follow These Steps:

### Step 1: Test If Your Webhook URL is Accessible

**Open your browser and go to:**

```
https://exam.darelkubra.com/api/zoom/webhooks
```

**What you should see:**

```json
{
  "status": "ok",
  "message": "Zoom webhook endpoint is ready",
  "timestamp": "2024-10-19T..."
}
```

**If you DON'T see this:**

- ❌ Your server is not running
- ❌ The URL is wrong
- ❌ SSL certificate issue

**What to do:**

1. Make sure your application is deployed and running
2. Check the URL is exactly: `https://exam.darelkubra.com/api/zoom/webhooks`
3. Must be HTTPS (not HTTP)

---

### Step 2: Check Environment Variable

**Make sure `.env` has this line:**

```env
ZOOM_WEBHOOK_SECRET_TOKEN=any_random_string_here
```

**Example:**

```env
ZOOM_WEBHOOK_SECRET_TOKEN=my_super_secret_token_12345
```

⚠️ **Can be ANY random string - doesn't need to match anything yet**

---

### Step 3: Restart Your Server

After adding the environment variable:

```bash
pm2 restart all
```

Or if using different setup:

```bash
# Stop and start your application
```

---

### Step 4: Try Zoom Validation Again

1. Go back to Zoom Marketplace
2. Go to your app → **"Feature"** tab
3. Toggle **"Event Subscriptions"** ON
4. Enter URL: `https://exam.darelkubra.com/api/zoom/webhooks`
5. Click **"Validate"**

**Should see:** ✅ Green checkmark!

---

## 🔍 DETAILED TROUBLESHOOTING

### Problem: "Connection Refused" or "Cannot Reach URL"

**Cause:** Server not running or not accessible

**Solutions:**

1. **Check if server is running:**

   ```bash
   pm2 list
   # Should show your app as "online"
   ```

2. **Check application logs:**

   ```bash
   pm2 logs
   # Look for errors
   ```

3. **Test URL manually:**
   ```bash
   curl https://exam.darelkubra.com/api/zoom/webhooks
   ```
   Should return: `{"status":"ok",...}`

---

### Problem: "SSL Certificate Error"

**Cause:** HTTPS certificate issue

**Solutions:**

1. **Check SSL certificate is valid:**

   - Visit: https://exam.darelkubra.com in browser
   - Should show 🔒 padlock icon
   - Should NOT show "Not Secure" warning

2. **If certificate expired:**
   - Renew SSL certificate
   - Contact hosting provider

---

### Problem: "404 Not Found"

**Cause:** Route doesn't exist or wrong URL

**Solutions:**

1. **Check the exact URL in Zoom Marketplace:**

   ```
   https://exam.darelkubra.com/api/zoom/webhooks
   ```

   ⚠️ **NOT** `/webhook` (no 's')
   ⚠️ **NOT** `/zoom/webhook` (singular)

2. **Verify file exists:**

   ```
   src/app/api/zoom/webhooks/route.ts
   ```

3. **Rebuild application:**
   ```bash
   npm run build
   pm2 restart all
   ```

---

### Problem: "Validation Token Mismatch"

**Cause:** ZOOM_WEBHOOK_SECRET_TOKEN not set

**Solutions:**

1. **Add to `.env` file:**

   ```env
   ZOOM_WEBHOOK_SECRET_TOKEN=create_any_random_string_here_123
   ```

2. **Can use this generator:**

   ```bash
   # Generate random string
   openssl rand -hex 32
   ```

3. **Restart server:**
   ```bash
   pm2 restart all
   ```

---

## 🎯 ALTERNATIVE: Skip Webhooks for Now

**If webhooks keep failing, you can skip this step:**

### What You Lose:

- ❌ Automatic duration tracking
- ❌ Real-time meeting notifications

### What Still Works:

- ✅ Manual link method
- ✅ Auto-create meetings
- ✅ Teachers can connect Zoom
- ✅ Students receive links
- ✅ Everything except duration tracking

### To Skip:

1. In Zoom Marketplace, **don't enable Event Subscriptions**
2. Skip to **"Activation"** tab
3. Activate the app
4. Continue with setup

**Duration tracking will be added later when server is ready**

---

## 📝 CHECKLIST - Test Each One:

- [ ] Server is running (`pm2 list` shows online)
- [ ] URL accessible in browser: https://exam.darelkubra.com/api/zoom/webhooks
- [ ] Shows `{"status":"ok"...}` message
- [ ] HTTPS (not HTTP)
- [ ] SSL certificate valid (🔒 in browser)
- [ ] `.env` has `ZOOM_WEBHOOK_SECRET_TOKEN` line
- [ ] Server restarted after adding token
- [ ] URL in Zoom matches exactly (with /s at end: webhook**s**)

---

## 🚀 NEXT STEPS

### Once Validated Successfully:

1. **Add Event Types** (in Zoom Marketplace):

   - ☑️ Meeting started
   - ☑️ Meeting ended
   - ☑️ Participant joined
   - ☑️ Participant left

2. **Save Configuration**

3. **Continue with Setup** (Activation tab)

---

## 💡 PRO TIP

**Test webhook is working:**

After validation succeeds, create a test meeting:

1. Teacher creates auto-meeting
2. Teacher joins Zoom
3. Check application logs:
   ```bash
   pm2 logs
   ```
4. Should see: "Zoom webhook event received: meeting.started"

---

## 📞 Still Not Working?

**Quick Tests:**

1. **Test basic connectivity:**

   ```bash
   curl -I https://exam.darelkubra.com
   ```

   Should return: `HTTP/2 200`

2. **Test webhook endpoint:**

   ```bash
   curl https://exam.darelkubra.com/api/zoom/webhooks
   ```

   Should return: `{"status":"ok"...}`

3. **Check DNS:**
   ```bash
   ping exam.darelkubra.com
   ```
   Should respond with IP address

**If all tests pass but Zoom still fails:**

- Wait 5 minutes and try again (Zoom sometimes has delays)
- Try from different browser
- Clear browser cache
- Contact Zoom support

---

**Updated:** October 19, 2024  
**Issue:** Webhook URL Validation Failed  
**Solution:** Follow steps above in order
