# Deduction Adjustments - Quick Reference Guide

## 🚀 Quick Start

### Access

Navigate to: **`/admin/deduction-adjustments`**

---

## 📋 Step-by-Step Process

### Step 1: Select Date Range

```
Start Date: [YYYY-MM-DD]
End Date:   [YYYY-MM-DD]
```

### Step 2: Choose Adjustment Type

- **Waive Absence Deductions** - For days teacher didn't send zoom links
- **Waive Lateness Deductions** - For late zoom link sending

### Step 3: Select Teachers

- Use search box to filter
- Check individual teachers OR
- Click "Select All" for all filtered teachers

### Step 4: (Optional) Filter Time Slots

For lateness adjustments only:

- Leave empty = all time slots
- Select specific slots to waive only those

### Step 5: Preview

Click **"🔍 Preview Adjustments"**

Review the results:

- Total records found
- Total amount to be waived
- Per-teacher breakdown
- Individual deduction details

### Step 6: Provide Reason

Enter detailed explanation, for example:

```
Server downtime on Oct 10-12, 2025 prevented normal zoom link sending.
System automatically marked teachers as absent/late incorrectly.
```

### Step 7: Apply

Click **"⚙️ Apply Adjustments"**

- Confirm the warning dialog
- Wait for success message

### Step 8: Verify

- Click **"📋 View History"** to see the waivers
- Check Teacher Payments page to confirm salary increase

---

## 💰 Financial Impact

### Example Calculation:

**Teacher: John Doe**

- Absence Days: 3 days
- Package Rate: 50 ETB/day
- Total Deduction: 150 ETB

**Before Waiver:**

- Base Salary: 3000 ETB
- Deductions: -150 ETB
- **Net Salary: 2850 ETB**

**After Waiver:**

- Base Salary: 3000 ETB
- Deductions: -0 ETB (waived)
- **Net Salary: 3000 ETB** ✅

**Amount Returned: +150 ETB**

---

## 🔍 Understanding the Preview

### Preview Table Columns:

| Column           | Description                                         |
| ---------------- | --------------------------------------------------- |
| **Teacher**      | Teacher name                                        |
| **Date**         | Date of deduction                                   |
| **Type**         | Lateness or Absence                                 |
| **Student/Info** | Student name (lateness) or affected count (absence) |
| **Time Details** | Minutes late or full day                            |
| **Package/Tier** | Student package and deduction tier                  |
| **Amount**       | ETB amount being waived                             |

### Summary Cards:

- **Total Records** - Number of deduction entries
- **Affected Teachers** - Number of teachers
- **Lateness ETB** - Total lateness amount
- **Absence ETB** - Total absence amount

---

## ⚠️ Important Notes

### ❌ CANNOT BE UNDONE

- Once applied, waivers are permanent
- No delete or undo function
- Only way to reverse: manual salary adjustment

### 📝 Reason Required

- Must provide detailed justification
- Stored permanently in audit log
- Visible in waiver history

### 👥 Multiple Teachers

- Can waive for multiple teachers at once
- Each gets individual waiver records
- Ensures accurate per-teacher tracking

### 📅 Date Precision

- Waivers apply to exact dates selected
- One day outside range = not waived
- Always double-check date range

---

## 📊 Waiver History

### Viewing History

Click **"📋 View History"** button (top right)

### History Table Shows:

- **Applied**: When waiver was created
- **Teacher**: Name and ID
- **Type**: Lateness or Absence
- **Deduction Date**: Original deduction date
- **Amount**: ETB waived
- **Admin**: Who applied the waiver
- **Reason**: Full justification

### Filtering:

Access via API:

```
GET /api/admin/deduction-adjustments/history?teacherId=ABC&deductionType=lateness&limit=100
```

---

## 🔧 Common Scenarios

### Scenario 1: System Downtime

**Problem**: Server was down, all teachers marked absent
**Solution**:

1. Select affected date range
2. Choose "Waive Absence Deductions"
3. Select all teachers
4. Reason: "Server downtime - technical issue"
5. Apply

### Scenario 2: Zoom Integration Failed

**Problem**: Zoom link system failed for specific time slot
**Solution**:

1. Select affected dates
2. Choose "Waive Lateness Deductions"
3. Select affected time slot only
4. Select teachers who had that slot
5. Reason: "Zoom integration failure - [time slot]"
6. Apply

### Scenario 3: Internet Outage

**Problem**: Internet was down in teacher's area
**Solution**:

1. Select affected dates
2. Choose appropriate type
3. Select only the affected teacher
4. Reason: "Confirmed internet outage in [area]"
5. Apply

### Scenario 4: Holiday/Event

**Problem**: School event, teachers couldn't send links
**Solution**:

1. Select event dates
2. Choose "Waive Absence Deductions"
3. Select all teachers
4. Reason: "School event - [event name]"
5. Apply

---

## ❗ Troubleshooting

### Teachers Not Loading

**Symptoms**: Empty teacher list
**Cause**: API connection issue
**Fix**: Refresh page, check network connection

### Preview Shows No Records

**Symptoms**: "No records found" after preview
**Possible Causes**:

1. No deductions exist for selected period
2. Deductions already waived
3. Date range incorrect
   **Fix**: Adjust dates, verify teacher had deductions

### Apply Button Disabled

**Symptoms**: Can't click "Apply Adjustments"
**Causes**:

- Preview not completed
- No reason provided
- Reason is empty/whitespace
  **Fix**: Complete preview, enter valid reason

### Waiver Not Reflected in Salary

**Symptoms**: Teacher salary still shows deduction
**Check**:

1. Waiver record exists in history
2. Deduction date matches exactly
3. Teacher ID matches
4. Refresh salary calculator
   **Fix**: If persists, check database `deduction_waivers` table

---

## 🎯 Best Practices

### 1. Always Preview First

Never apply without reviewing the preview table

### 2. Be Specific in Reasons

Good: "Server maintenance Oct 10, 8-10 AM caused link send failures"
Bad: "System issue"

### 3. Document Everything

Include:

- What happened
- When it happened
- Why waiver is justified
- Any ticket/reference numbers

### 4. Verify Impact

After applying:

- Check history to confirm
- Review teacher payment totals
- Verify amount matches expectation

### 5. Communicate

- Inform affected teachers
- Document in teacher notes
- Keep record for audits

---

## 📞 Getting Help

### If You Need Assistance:

1. **Check This Guide First**
2. **Review System Logs**: Browser console for errors
3. **Check Database**: Verify records in `deduction_waivers`
4. **Contact System Admin**: Provide:
   - Date/time of issue
   - Teacher names affected
   - Error messages (if any)
   - Steps taken so far

---

## 🔐 Security & Compliance

### Who Can Use This?

- **Admins only** - Role-based access control
- Session must be valid
- Cannot be accessed by teachers or controllers

### Audit Trail

Every action creates:

1. **Waiver Record** - In `deduction_waivers` table
2. **Audit Log** - In `auditlog` table
3. **Permanent History** - Cannot be deleted

### Data Integrity

- All operations are transactional
- Either fully succeed or fully fail
- No partial updates possible

---

## 📈 Monitoring

### Check These Regularly:

- **Waiver History**: Review for unusual patterns
- **Audit Logs**: Monitor admin actions
- **Teacher Feedback**: Confirm waivers applied correctly
- **Financial Reports**: Verify salary totals accurate

### Red Flags:

- ⚠️ Excessive waivers for single teacher
- ⚠️ Frequent waivers without clear reason
- ⚠️ Large amounts waived regularly
- ⚠️ Waivers applied outside normal dates

---

## ✅ Success Checklist

Before considering waiver complete:

- [x] Preview reviewed and accurate
- [x] Reason documented thoroughly
- [x] Waiver applied successfully
- [x] Success message received
- [x] History entry confirmed
- [x] Teacher salary verified
- [x] Teacher notified (if applicable)
- [x] Documentation updated

---

**Last Updated**: October 13, 2025
**System Version**: 2.0 (Fully Rebuilt)
**Status**: Production Ready ✅
