# SMS Not Working - Troubleshooting Steps

## Current Status
You've reported that SMS notifications are not being sent and there are no debug console logs.

## What I Just Added

### 1. **Aggressive Console Logging**
- Added logs at the very START of the API call
- Added logs to BOTH `console.log()` and `console.error()` (stderr)
- Added environment variable checking with detailed output
- Every step of SMS sending now has logs

### 2. **Debug Information in API Response**
- The API now returns ALL debug information in the response
- You can see this in the browser console (F12)
- The toast message will show warnings if SMS fails

### 3. **Frontend Console Logging**
- Browser will log the full response
- Check browser DevTools → Console tab

## Step-by-Step Troubleshooting

### Step 1: Restart Your Dev Server ⚠️ IMPORTANT!
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

**Why?** Environment variables are only loaded when the server starts. Changes to code won't help if env vars aren't set!

### Step 2: Check Environment Variables

Open your `.env` file and verify you have:

```bash
AFROMSG_API_TOKEN=your_actual_token_here
AFROMSG_SENDER_UID=your_sender_uid
AFROMSG_SENDER_NAME=DarulKubra
```

**Test if they're loaded:**
```bash
# In a new terminal (same directory)
node -e "require('dotenv').config(); console.log('Token:', process.env.AFROMSG_API_TOKEN ? 'SET' : 'NOT SET'); console.log('UID:', process.env.AFROMSG_SENDER_UID); console.log('Name:', process.env.AFROMSG_SENDER_NAME);"
```

### Step 3: Submit a Test Permission Request

1. Go to the teacher permissions page
2. Fill out the form
3. Submit a request
4. **IMMEDIATELY** check:
   - Browser console (F12 → Console tab)
   - Server terminal output

### Step 4: What to Look For

#### In Browser Console (F12):
Look for these logs:
```
📱 SMS Debug Info: { ... }
📊 Full Response: { ... }
```

Check the `debug` object in the response:
```json
{
  "debug": {
    "sms_attempts": 3,
    "sms_sent": 2,
    "environment": {
      "api_token": "✅ SET",
      "sender_uid": "✅ 12345",
      "sender_name": "✅ DarulKubra"
    },
    "warning": "⚠️ SMS failed for all admins..."
  }
}
```

#### In Server Terminal:
Look for:
```
🚀 ======================================
🚀 PERMISSION REQUEST API CALLED
🚀 ======================================

📋 Permission Request Details:
   Teacher ID: ...
   Date: ...

📞 === SMS NOTIFICATION DEBUG ===
📊 Found X admins with phone numbers:
  1. Admin Name - Phone: "0912345678"

🔧 sendSMS function called with phone: "0912345678"
🔑 Environment check:
   API Token: ✅ SET (length: 45)
   Sender UID: ✅ 12345
   Sender Name: ✅ DarulKubra
```

### Step 5: Common Issues & Solutions

#### Issue A: No Console Output at All
**Problem:** Server terminal shows nothing
**Solution:** 
1. Make sure you restarted the server
2. Check you're looking at the right terminal window
3. Try submitting the form again

#### Issue B: Environment Variables Missing
**Console shows:**
```
🔑 Environment check:
   API Token: ❌ NOT SET
```

**Solution:**
1. Create/edit `.env` file in project root
2. Add the missing variables
3. **Restart the server** (this is crucial!)
4. Test again

#### Issue C: No Admins Found
**Console shows:**
```
📊 Found 0 admins with phone numbers
```

**Solution:**
Check database for admin phone numbers:
```sql
-- Run in Prisma Studio or database client
SELECT id, name, phoneno FROM admin;
```

If empty/null, add phone numbers:
```sql
UPDATE admin SET phoneno = '0911234567' WHERE id = 1;
UPDATE admin SET phoneno = '0922222222' WHERE id = 2;
```

#### Issue D: Invalid Phone Format
**Console shows:**
```
❌ Invalid phone number format: "123"
```

**Solution:**
Update admin phone numbers to valid format:
```sql
-- Valid formats:
-- 0911234567 (local)
-- +251911234567 (international)
-- 251911234567 (international without +)

UPDATE admin SET phoneno = '0911234567' WHERE phoneno = '123';
```

#### Issue E: SMS API Error
**Console shows:**
```
❌ SMS API Error for +251911234567:
  Status: 401
  Response: { "error": "Unauthorized" }
```

**Solutions:**
- **401 Unauthorized:** Check if `AFROMSG_API_TOKEN` is correct
- **400 Bad Request:** Check if `AFROMSG_SENDER_UID` is valid
- **403 Forbidden:** Your sender might not be approved
- **429 Too Many Requests:** You've hit rate limit, wait a bit

Contact AfroMessage support with the error details.

### Step 6: Test with Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Submit permission request
4. Click on the `/api/teachers/permissions` request
5. Look at the **Response** tab
6. You'll see the full debug information:

```json
{
  "success": true,
  "notifications": {
    "sms_sent": 0,
    "sms_failed": 3,
    "total_admins": 3,
    "sms_results": [...]
  },
  "debug": {
    "environment": {
      "api_token": "❌ MISSING",
      "sender_uid": "❌ MISSING",
      "sender_name": "❌ MISSING"
    },
    "warning": "⚠️ SMS failed for all admins - check environment variables"
  }
}
```

This tells you EXACTLY what's wrong!

## Quick Checklist

Before asking for help, verify:

- [ ] Server has been restarted after adding env vars
- [ ] `.env` file exists in project root
- [ ] All three env vars are set: `AFROMSG_API_TOKEN`, `AFROMSG_SENDER_UID`, `AFROMSG_SENDER_NAME`
- [ ] At least one admin has a valid phone number in database
- [ ] You checked BOTH browser console AND server terminal
- [ ] You looked at the Network tab response

## What to Send Me

If it's still not working, send me:

1. **Browser Console Output:**
   - Screenshot or copy of the `📱 SMS Debug Info` log
   - The full `debug` object from the response

2. **Server Terminal Output:**
   - All lines from `🚀 PERMISSION REQUEST API CALLED` onwards
   - Environment check output
   - Any error messages

3. **Environment Check:**
   ```bash
   # Run this and send output (hide the actual token value):
   echo "API Token: $([ -n "$AFROMSG_API_TOKEN" ] && echo 'SET' || echo 'NOT SET')"
   echo "Sender UID: ${AFROMSG_SENDER_UID:-NOT SET}"
   echo "Sender Name: ${AFROMSG_SENDER_NAME:-NOT SET}"
   ```

4. **Database Check:**
   ```sql
   SELECT COUNT(*) as admin_count, 
          COUNT(phoneno) as admins_with_phone 
   FROM admin;
   ```

## Expected Working Output

When everything works correctly, you should see:

### Server Terminal:
```
🚀 PERMISSION REQUEST API CALLED
📋 Permission Request Details:
   Teacher ID: teacher123
   Date: 2024-10-14

📞 === SMS NOTIFICATION DEBUG ===
📊 Found 3 admins with phone numbers:
  1. Ahmed Ali - Phone: "0911234567"
  2. Fatima Hassan - Phone: "0922222222"

🔧 sendSMS function called with phone: "0911234567"
🔑 Environment check:
   API Token: ✅ SET (length: 48)
   Sender UID: ✅ DK-001
   Sender Name: ✅ DarulKubra

📱 Sending SMS to +251911234567 (original: 0911234567)
📝 Message: 🔔 DarulKubra Alert: Mohamed requests...
✅ SMS sent successfully to +251911234567: { "status": "sent" }
✅ SMS sent successfully to Ahmed Ali

📊 SMS Summary: 3/3 sent successfully
```

### Browser Console:
```javascript
📱 SMS Debug Info: {
  sms_attempts: 3,
  sms_success_rate: "100%",
  admins_with_phone: [...],
  environment: {
    api_token: "✅ SET",
    sender_uid: "✅ DK-001",
    sender_name: "✅ DarulKubra"
  },
  warning: null
}
```

### Toast Message:
```
✅ Request Submitted!
📱 Admin team notified via SMS (3/3 messages sent)
```

## Still Not Working?

If you've followed all steps and it's still not working:

1. Send me the 4 items listed above
2. Include screenshot of browser DevTools Network tab showing the response
3. Tell me which step failed and what you saw instead

I'll help you debug it!

