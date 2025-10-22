-- ================================================================
-- Fix: Europe Package Salary Configuration
-- Issue: Akram Khalid (and other Europe package students) earning 0
-- Reason: Package "Europe" has no salary configured
-- ================================================================

-- STEP 1: Check current Europe package configuration
-- ================================================================
SELECT 
    'Current Europe Package Salary' as check_type,
    packageName,
    salaryPerStudent,
    createdAt,
    updatedAt
FROM packageSalary
WHERE packageName = 'Europe';

-- Expected: Either no row, or salaryPerStudent = 0


-- STEP 2: Find all students using Europe package
-- ================================================================
SELECT 
    'Students with Europe Package' as check_type,
    wdt_ID,
    name,
    package,
    daypackages,
    ustaz as teacher_id,
    status
FROM wpos_wpdatatable_23
WHERE package = 'Europe'
AND status IN ('active', 'Active', 'Not yet', 'not yet')
ORDER BY ustaz, name;

-- This shows all affected students


-- STEP 3: Count zoom links for Europe package students (current month)
-- ================================================================
SELECT 
    'Zoom Links for Europe Students' as check_type,
    s.name as student_name,
    s.ustaz as teacher_id,
    COUNT(z.id) as zoom_link_count,
    MIN(DATE(z.sent_time)) as first_class,
    MAX(DATE(z.sent_time)) as last_class
FROM wpos_wpdatatable_23 s
INNER JOIN wpos_zoom_links z ON s.wdt_ID = z.studentid
WHERE s.package = 'Europe'
AND s.status IN ('active', 'Active', 'Not yet', 'not yet')
AND z.sent_time >= DATE_FORMAT(NOW(), '%Y-%m-01')  -- Current month
AND z.sent_time < DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH)
GROUP BY s.wdt_ID, s.name, s.ustaz
ORDER BY s.ustaz, s.name;


-- STEP 4: Check if other packages also missing salaries
-- ================================================================
SELECT 
    'Packages Without Salary Configuration' as check_type,
    s.package,
    COUNT(DISTINCT s.wdt_ID) as student_count,
    COUNT(DISTINCT s.ustaz) as teacher_count
FROM wpos_wpdatatable_23 s
LEFT JOIN packageSalary ps ON s.package = ps.packageName
WHERE s.status IN ('active', 'Active', 'Not yet', 'not yet')
AND s.package IS NOT NULL
AND s.package != ''
AND ps.id IS NULL
GROUP BY s.package
ORDER BY student_count DESC;


-- ================================================================
-- FIX: Set Europe Package Salary
-- ================================================================
-- IMPORTANT: Replace XXXX with the actual monthly salary amount
-- Common values: 2000, 2500, 3000, 3500, 4000 (adjust as needed)

-- Option A: If Europe package salary doesn't exist yet (INSERT)
INSERT INTO packageSalary (packageName, salaryPerStudent, createdAt, updatedAt)
SELECT 'Europe', 3000, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM packageSalary WHERE packageName = 'Europe'
);

-- Option B: If Europe package exists but salary is 0 or wrong (UPDATE)
UPDATE packageSalary 
SET 
    salaryPerStudent = 3000,  -- Replace 3000 with actual amount
    updatedAt = NOW()
WHERE packageName = 'Europe';


-- ================================================================
-- VERIFICATION: Check the fix worked
-- ================================================================
SELECT 
    'Verification - Europe Package Now Configured' as check_type,
    packageName,
    salaryPerStudent,
    CASE 
        WHEN salaryPerStudent > 0 THEN '✅ CONFIGURED'
        ELSE '❌ STILL MISSING'
    END as status,
    updatedAt
FROM packageSalary
WHERE packageName = 'Europe';


-- ================================================================
-- CALCULATE IMPACT: How much will teachers earn from Europe students
-- ================================================================
-- This shows the expected earnings for each teacher with Europe package students
-- Based on: (salary / working_days) × teaching_days

-- Assuming 26 working days in month (adjust if different)
SET @working_days = 26;
SET @europe_salary = (SELECT salaryPerStudent FROM packageSalary WHERE packageName = 'Europe');

SELECT 
    'Impact Analysis' as check_type,
    s.ustaz as teacher_id,
    t.ustazname as teacher_name,
    COUNT(DISTINCT s.wdt_ID) as europe_student_count,
    COUNT(z.id) as total_teaching_days,
    @europe_salary as monthly_salary_per_student,
    ROUND(@europe_salary / @working_days, 2) as daily_rate,
    ROUND((COUNT(z.id) * @europe_salary) / @working_days, 2) as estimated_earnings_etb
FROM wpos_wpdatatable_23 s
INNER JOIN wpos_wpdatatable_24 t ON s.ustaz = t.ustazid
LEFT JOIN wpos_zoom_links z ON s.wdt_ID = z.studentid 
    AND z.ustazid = s.ustaz
    AND z.sent_time >= DATE_FORMAT(NOW(), '%Y-%m-01')
    AND z.sent_time < DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH)
WHERE s.package = 'Europe'
AND s.status IN ('active', 'Active', 'Not yet', 'not yet')
GROUP BY s.ustaz, t.ustazname
ORDER BY estimated_earnings_etb DESC;


-- ================================================================
-- SPECIFIC: Akram Khalid Details
-- ================================================================
SELECT 
    'Akram Khalid - Detailed Analysis' as check_type,
    s.wdt_ID as student_id,
    s.name as student_name,
    s.package,
    s.daypackages as day_package,
    s.ustaz as teacher_id,
    t.ustazname as teacher_name,
    s.status,
    COUNT(z.id) as teaching_days_oct_2025,
    ps.salaryPerStudent as monthly_salary,
    ROUND(ps.salaryPerStudent / 26, 2) as daily_rate,
    ROUND((COUNT(z.id) * ps.salaryPerStudent) / 26, 2) as expected_earnings_etb
FROM wpos_wpdatatable_23 s
LEFT JOIN wpos_wpdatatable_24 t ON s.ustaz = t.ustazid
LEFT JOIN packageSalary ps ON s.package = ps.packageName
LEFT JOIN wpos_zoom_links z ON s.wdt_ID = z.studentid 
    AND z.ustazid = s.ustaz
    AND z.sent_time >= '2025-10-01'
    AND z.sent_time < '2025-11-01'
WHERE s.name LIKE '%akram%'
AND s.name LIKE '%kha%'
GROUP BY s.wdt_ID, s.name, s.package, s.daypackages, s.ustaz, t.ustazname, s.status, ps.salaryPerStudent;


-- ================================================================
-- ADMIN NOTES
-- ================================================================
-- After running this script:
-- 1. Go to: /admin/teacher-payments?clearCache=true
-- 2. Check MUBAREK RAHMETO's payment breakdown
-- 3. Akram Khalid should now show earnings
-- 4. Verify with teacher that amount is correct
-- 5. Check other teachers with Europe package students
-- ================================================================

