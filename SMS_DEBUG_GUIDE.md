# SMS Notification Debugging Guide

## Problem

Admin SMS notifications were not being sent when teachers submitted permission requests. This guide explains the fixes and how to debug SMS issues.

## What Was Fixed

### 1. **Phone Number Normalization**

**Problem:** Ethiopian phone numbers come in different formats:

- `0911234567` (local format)
- `911234567` (missing leading zero)
- `+251911234567` (international format)
- `251911234567` (missing +)

**Solution:** Added `normalizePhoneNumber()` function that converts all formats to `+251911234567`

```typescript
normalizePhoneNumber("0911234567") → "+251911234567"
normalizePhoneNumber("911234567")  → "+251911234567"
normalizePhoneNumber("+251911234567") → "+251911234567"
```

### 2. **Enhanced Error Logging**

**Before:** Silent failures with no details
**After:** Detailed console logs showing:

- Which admins have phone numbers
- Phone number validation results
- SMS API request/response
- Success/failure for each admin

### 3. **Environment Variable Validation**

**Problem:** Missing env vars caused silent failures
**Solution:** Check and log missing configuration:

```
❌ SMS Configuration Error: Missing environment variables: AFROMSG_API_TOKEN
```

### 4. **Better Error Handling**

**Before:** Generic `return false`
**After:** Detailed error objects:

```typescript
{
  success: false,
  error: "Invalid phone format: 123",
  details: { ... }
}
```

### 5. **Admin Phone Validation**

**Problem:** Empty strings counted as valid phone numbers
**Solution:** Filter out empty/null values:

```typescript
where: {
  phoneno: {
    not: null,
    notIn: ["", " "]
  }
}
```

### 6. **Debug Response**

Added detailed debug information to API response:

```json
{
  "notifications": {
    "sms_sent": 2,
    "sms_failed": 1,
    "total_admins": 3,
    "sms_results": [
      {
        "admin": "Ahmed",
        "phone": "0911234567",
        "success": true
      },
      {
        "admin": "Fatima",
        "phone": "invalid",
        "success": false,
        "error": "Invalid phone format"
      }
    ]
  },
  "debug": {
    "sms_attempts": 3,
    "sms_success_rate": "67%"
  }
}
```

## How to Debug SMS Issues

### Step 1: Check Environment Variables

Ensure these are set in your `.env` file:

```bash
AFROMSG_API_TOKEN=your_token_here
AFROMSG_SENDER_UID=your_sender_uid
AFROMSG_SENDER_NAME=DarulKubra
```

**Test:**

```bash
# In terminal
echo $AFROMSG_API_TOKEN
echo $AFROMSG_SENDER_UID
echo $AFROMSG_SENDER_NAME
```

### Step 2: Use Test SMS Endpoint

**Check Configuration:**

```bash
GET http://localhost:3000/api/admin/test-sms
```

**Response:**

```json
{
  "status": "SMS Configuration Check",
  "configuration": {
    "api_token": "✅ Configured",
    "sender_uid": "✅ 12345",
    "sender_name": "✅ DarulKubra",
    "api_endpoint": "https://api.afromessage.com/api/send"
  },
  "is_configured": true,
  "admin_phones": [
    {
      "admin_name": "Ahmed",
      "original_phone": "0911234567",
      "normalized_phone": "+251911234567",
      "is_valid": true
    }
  ],
  "summary": {
    "total_admins": 3,
    "admins_with_phone": 2,
    "valid_phones": 2
  }
}
```

**Send Test SMS:**

```bash
POST http://localhost:3000/api/admin/test-sms
Content-Type: application/json

{
  "phone": "0911234567",
  "message": "Test SMS from DarulKubra"
}
```

### Step 3: Check Server Logs

When a teacher submits a permission request, look for these logs:

```
📞 === SMS NOTIFICATION DEBUG ===
📊 Found 3 admins with phone numbers:
  1. Ahmed - Phone: "0911234567"
  2. Fatima - Phone: "+251922222222"
  3. Omar - Phone: "invalid123"

📝 SMS Message (145 chars): "🔔 DarulKubra Alert: Mohamed requests permission..."

📤 Attempting to send SMS to Ahmed...
📱 Sending SMS to +251911234567 (original: 0911234567)
📝 Message: New absence request from Mohamed for...
✅ SMS sent successfully to +251911234567: { "status": "success" }
✅ SMS sent successfully to Ahmed

📤 Attempting to send SMS to Fatima...
📱 Sending SMS to +251922222222 (original: +251922222222)
✅ SMS sent successfully to Fatima

📤 Attempting to send SMS to Omar...
❌ Invalid phone number format: "invalid123"
❌ SMS failed for Omar: Invalid phone format: invalid123

📊 SMS Summary: 2/3 sent successfully
=== END SMS DEBUG ===
```

### Step 4: Common Issues and Solutions

#### Issue 1: "SMS not configured"

**Symptom:**

```
❌ SMS Configuration Error: Missing environment variables: AFROMSG_API_TOKEN
```

**Solution:**

1. Add missing variables to `.env`
2. Restart server: `npm run dev`
3. Verify with test endpoint

#### Issue 2: "Invalid phone format"

**Symptom:**

```
❌ Invalid phone number format: "123"
```

**Solution:**

1. Check admin phone numbers in database
2. Update to valid format: `0911234567` or `+251911234567`
3. Run migration to clean up bad data:

```sql
-- Find invalid phone numbers
SELECT id, name, phoneno FROM admin WHERE phoneno NOT LIKE '+251%' AND phoneno NOT LIKE '09%';

-- Update to valid format
UPDATE admin SET phoneno = CONCAT('+251', SUBSTRING(phoneno, 2)) WHERE phoneno LIKE '09%';
```

#### Issue 3: "API returned 401"

**Symptom:**

```
❌ SMS API Error for +251911234567:
  Status: 401
  Response: { "error": "Unauthorized" }
```

**Solution:**

1. Check if `AFROMSG_API_TOKEN` is correct
2. Verify token hasn't expired
3. Contact AfroMessage support

#### Issue 4: "API returned 400"

**Symptom:**

```
❌ SMS API Error for +251911234567:
  Status: 400
  Response: { "error": "Invalid sender" }
```

**Solution:**

1. Verify `AFROMSG_SENDER_UID` is correct
2. Check `AFROMSG_SENDER_NAME` is registered
3. Ensure sender is approved by AfroMessage

#### Issue 5: No admins with phone numbers

**Symptom:**

```
📊 Found 0 admins with phone numbers
```

**Solution:**

1. Add phone numbers to admin accounts
2. Check database: `SELECT * FROM admin;`
3. Update via admin panel or SQL:

```sql
UPDATE admin SET phoneno = '+251911234567' WHERE id = 1;
```

## Phone Number Format Requirements

### Valid Formats

✅ `0911234567` (Ethiopian local)
✅ `+251911234567` (International)
✅ `251911234567` (International without +)
✅ `911234567` (9 digits, missing leading 0)

### Invalid Formats

❌ `123` (too short)
❌ `1234567890123` (too long)
❌ `abc123` (contains letters)
❌ Empty string or null

### Supported Prefixes

- `091` (Ethio Telecom)
- `092` (Safaricom)
- `093` (other carriers)
- `094`, `095`, etc.

## Testing Checklist

Before deploying, verify:

- [ ] Environment variables are set correctly
- [ ] Test SMS endpoint returns "configured: true"
- [ ] At least one admin has a valid phone number
- [ ] Test SMS can be sent successfully
- [ ] Teacher permission request triggers SMS
- [ ] Server logs show SMS debug output
- [ ] Response includes SMS results

## API Response Examples

### Success (All SMS Sent)

```json
{
  "success": true,
  "notifications": {
    "sms_sent": 3,
    "sms_failed": 0,
    "total_admins": 3,
    "sms_results": [
      { "admin": "Ahmed", "phone": "0911234567", "success": true },
      { "admin": "Fatima", "phone": "+251922222222", "success": true },
      { "admin": "Omar", "phone": "+251933333333", "success": true }
    ]
  },
  "debug": {
    "sms_attempts": 3,
    "sms_success_rate": "100%"
  }
}
```

### Partial Success

```json
{
  "success": true,
  "notifications": {
    "sms_sent": 2,
    "sms_failed": 1,
    "total_admins": 3,
    "sms_results": [
      { "admin": "Ahmed", "phone": "0911234567", "success": true },
      {
        "admin": "Fatima",
        "phone": "invalid",
        "success": false,
        "error": "Invalid phone format"
      },
      { "admin": "Omar", "phone": "+251933333333", "success": true }
    ]
  },
  "debug": {
    "sms_attempts": 3,
    "sms_success_rate": "67%"
  }
}
```

### SMS Not Configured

```json
{
  "success": true,
  "notifications": {
    "sms_sent": 0,
    "sms_failed": 3,
    "total_admins": 3,
    "sms_results": [
      {
        "admin": "Ahmed",
        "phone": "0911234567",
        "success": false,
        "error": "SMS not configured. Missing: AFROMSG_API_TOKEN"
      }
    ]
  }
}
```

## Frontend Display

The teacher permission page shows SMS status:

```typescript
// Success message
toast({
  title: "✅ Request Submitted!",
  description:
    responseData.notifications?.sms_sent > 0
      ? `📱 Admin team notified via SMS (${responseData.notifications.sms_sent} messages sent)`
      : "📧 Request submitted successfully. Admin team will be notified.",
});
```

## Troubleshooting Commands

```bash
# Check if environment variables are loaded
npm run dev | grep AFROMSG

# Test SMS configuration
curl http://localhost:3000/api/admin/test-sms

# Send test SMS
curl -X POST http://localhost:3000/api/admin/test-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"0911234567","message":"Test"}'

# Check admin phone numbers in database
npx prisma studio
# Navigate to: admin table → phoneno column

# View server logs with SMS debug info
npm run dev | grep "SMS"
```

## Production Checklist

Before going live:

1. **Environment Variables**

   - [ ] `AFROMSG_API_TOKEN` is set in production
   - [ ] `AFROMSG_SENDER_UID` is set in production
   - [ ] `AFROMSG_SENDER_NAME` is set in production

2. **Database**

   - [ ] All admins have valid phone numbers
   - [ ] Phone numbers are in correct format
   - [ ] Test with real admin phone number

3. **Testing**

   - [ ] Test endpoint works: `/api/admin/test-sms`
   - [ ] Test SMS sends successfully
   - [ ] Teacher permission triggers SMS
   - [ ] SMS is received by admin

4. **Monitoring**
   - [ ] Check logs for SMS errors
   - [ ] Monitor SMS success rate
   - [ ] Set up alerts for SMS failures

## Support

If SMS is still not working after following this guide:

1. Check server logs for error messages
2. Use test endpoint to diagnose issue
3. Verify AfroMessage account is active
4. Contact AfroMessage support with error details
5. Review this documentation for common issues

## Files Modified

- `src/app/api/teachers/permissions/route.ts` - Enhanced SMS with debugging
- `src/app/api/admin/test-sms/route.ts` - New test endpoint
- `src/app/teachers/permissions/page.tsx` - Updated response handling

## Related Documentation

- AfroMessage API Docs: https://api.afromessage.com/docs
- Phone Number Formats: https://en.wikipedia.org/wiki/Telephone_numbers_in_Ethiopia
