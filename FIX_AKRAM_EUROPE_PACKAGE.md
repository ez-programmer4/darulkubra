# Fix: Akram Khalid - Europe Package Salary Issue

## 🔍 Problem Identified

**Student:** Akram Khalid (ID: 9534)
**Teacher:** MUBAREK RAHMETO
**Package:** Europe
**Issue:** Package "Europe" has **NO SALARY CONFIGURED** → Earnings = ETB 0.00

Despite having:

- ✅ 13 zoom links
- ✅ 12 teaching days
- ✅ Correct daypackage (All days)
- ✅ Active status

The student earns **ETB 0.00** because the "Europe" package salary is not set in the system.

## 🔧 Solution: Configure Europe Package Salary

### Option 1: Via Admin Panel (Recommended)

1. **Navigate to Package Salaries:**

   ```
   Admin Panel → Package Salaries
   URL: /admin/package-salaries
   ```

2. **Find "Europe" Package:**

   - Look for "Europe" in the list
   - Check if "Salary Configured" shows "No" or 0 ETB

3. **Click "Edit" or "Set Salary"**

4. **Enter the Monthly Salary:**

   - Package Name: Europe (should be pre-filled)
   - Salary Per Student: [Enter the monthly salary for Europe package]
   - Example: If Europe package should earn 3000 ETB/month, enter 3000

5. **Click "Save"**

6. **Refresh Teacher Payments:**
   ```
   /admin/teacher-payments?clearCache=true
   ```

### Option 2: Via Database (Quick Fix)

Run this SQL query to check if Europe package has a salary:

```sql
-- Check current configuration
SELECT * FROM packageSalary WHERE packageName = 'Europe';

-- If no record exists, insert one (replace XXXX with actual monthly salary)
INSERT INTO packageSalary (packageName, salaryPerStudent, createdAt, updatedAt)
VALUES ('Europe', XXXX, NOW(), NOW());

-- If record exists but salary is 0, update it (replace XXXX with actual monthly salary)
UPDATE packageSalary
SET salaryPerStudent = XXXX, updatedAt = NOW()
WHERE packageName = 'Europe';
```

**Example:** If Europe package teachers should earn **3000 ETB per student per month:**

```sql
-- Insert (if doesn't exist)
INSERT INTO packageSalary (packageName, salaryPerStudent, createdAt, updatedAt)
VALUES ('Europe', 3000, NOW(), NOW());

-- Or Update (if exists)
UPDATE packageSalary
SET salaryPerStudent = 3000, updatedAt = NOW()
WHERE packageName = 'Europe';
```

### Option 3: Via API (for developers)

```bash
# Create package salary
curl -X POST http://localhost:3000/api/admin/package-salaries \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "Europe",
    "salaryPerStudent": 3000
  }'

# Or Update existing
curl -X PUT http://localhost:3000/api/admin/package-salaries/[ID] \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "Europe",
    "salaryPerStudent": 3000
  }'
```

## 📊 Verification Steps

After setting the Europe package salary:

1. **Clear Cache:**

   ```
   /admin/teacher-payments?clearCache=true
   ```

2. **Check Akram Khalid's Earnings:**

   - Should now show: `12 days × (Europe monthly salary ÷ working days)`
   - Example: If Europe = 3000 ETB/month and working days = 26
     - Daily rate = 3000 ÷ 26 = 115.38 ETB
     - 12 days × 115.38 = 1,384.56 ETB

3. **Check MUBAREK RAHMETO's Total:**
   - Akram Khalid should now appear in student breakdown
   - Total salary should increase by Akram's earnings

## 🎯 Expected Result After Fix

**Before Fix:**

```
akram khaild
Package: Europe
Earnings: ETB 0.00 ❌
Status: Not in breakdown
```

**After Fix:**

```
akram khaild
Package: Europe (3000 ETB/month)
Daily Rate: 115.38 ETB
Days Worked: 12
Earnings: ETB 1,384.56 ✅
Status: ✅ Included in breakdown
```

## 🔍 Check All Europe Package Students

This issue affects **ALL students with "Europe" package**. After fixing, check:

```sql
-- Find all students with Europe package
SELECT
    wdt_ID,
    name,
    package,
    ustaz as teacher,
    status
FROM wpos_wpdatatable_23
WHERE package = 'Europe'
AND status IN ('active', 'Active', 'Not yet');
```

All these students will now be calculated correctly in teacher payments.

## 📝 What's the Correct Salary for Europe Package?

You need to determine this based on your school's payment structure:

- **3 days package (MWF or TTS):** Usually lower salary
- **5 days package:** Medium salary
- **All days package:** Higher salary
- **Europe package:** ??? (You need to set this)

Common salary ranges (adjust based on your school):

- Basic packages: 1000-1500 ETB/month
- Standard packages: 1500-2500 ETB/month
- Premium packages: 2500-4000 ETB/month
- Special packages (like Europe): 3000-5000 ETB/month

## 🚨 Important Notes

1. **Other Packages:** Check if other packages also have this issue:

   ```sql
   -- Find all packages used by students
   SELECT DISTINCT package, COUNT(*) as student_count
   FROM wpos_wpdatatable_23
   WHERE status IN ('active', 'Active', 'Not yet')
   GROUP BY package;

   -- Check which packages have salaries configured
   SELECT packageName, salaryPerStudent
   FROM packageSalary
   ORDER BY packageName;

   -- Find packages WITHOUT salaries
   SELECT DISTINCT s.package
   FROM wpos_wpdatatable_23 s
   LEFT JOIN packageSalary ps ON s.package = ps.packageName
   WHERE s.status IN ('active', 'Active', 'Not yet')
   AND ps.id IS NULL
   AND s.package IS NOT NULL;
   ```

2. **Historical Data:** Setting the salary now will apply to:

   - Current month calculations ✅
   - Future months ✅
   - Past months (if you recalculate with clearCache) ✅

3. **No Retroactive Issues:** Teachers won't lose money - they just weren't getting paid for Europe package students before.

## 🔄 After Fix - Next Steps

1. Set Europe package salary in admin panel
2. Clear cache: `/admin/teacher-payments?clearCache=true`
3. Verify Akram Khalid now shows earnings
4. Check other students with Europe package
5. Review and configure any other missing package salaries
6. Notify affected teachers about corrected payments

## Files Referenced

- Admin Panel: `src/app/admin/package-salaries/page.tsx`
- API Routes: `src/app/api/admin/package-salaries/route.ts`
- Database Table: `packageSalary`
- Student Table: `wpos_wpdatatable_23`
