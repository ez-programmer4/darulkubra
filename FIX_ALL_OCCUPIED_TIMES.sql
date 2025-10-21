-- ====================================================================
-- FIX ALL OCCUPIED_TIMES RECORDS WITH WRONG DATES
-- ====================================================================
-- Problem: Time slot updates changed occupied_at to update date
-- Solution: Reset occupied_at to match first zoom link date
-- ====================================================================

-- ====================================================================
-- STEP 1: IDENTIFY AFFECTED STUDENTS
-- ====================================================================

-- Query 1: Find students where occupied_at is AFTER their first zoom link
-- This shows ALL students with the problem
SELECT 
  ot.id as occupied_time_id,
  ot.student_id,
  s.name as student_name,
  ot.ustaz_id as teacher_id,
  t.ustazname as teacher_name,
  ot.occupied_at as current_assignment_date,
  MIN(zl.sent_time) as first_zoom_link_date,
  MAX(zl.sent_time) as last_zoom_link_date,
  COUNT(zl.id) as total_zoom_links,
  DATEDIFF(DAY, MIN(zl.sent_time), ot.occupied_at) as days_before_assignment,
  ot.time_slot,
  ot.daypackage,
  s.package as student_package
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_wpdatatable_24 t ON t.ustazid = ot.ustaz_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
  AND zl.ustazid = ot.ustaz_id
  AND zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
WHERE ot.end_at IS NULL  -- Only active assignments
GROUP BY 
  ot.id, ot.student_id, s.name, ot.ustaz_id, t.ustazname, 
  ot.occupied_at, ot.time_slot, ot.daypackage, s.package
HAVING MIN(zl.sent_time) < ot.occupied_at  -- Zoom links sent BEFORE assignment date
ORDER BY days_before_assignment DESC, teacher_name, student_name;

-- Expected output: List of all affected students with days lost

-- ====================================================================
-- STEP 2: PREVIEW THE FIX (Before Actually Updating)
-- ====================================================================

-- Query 2: Show what WILL change (preview before update)
SELECT 
  ot.id as occupied_time_id,
  s.name as student_name,
  t.ustazname as teacher_name,
  ot.occupied_at as OLD_occupied_at,
  MIN(zl.sent_time) as NEW_occupied_at,
  DATEDIFF(DAY, MIN(zl.sent_time), ot.occupied_at) as days_difference,
  COUNT(zl.id) as zoom_links_to_recover
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_wpdatatable_24 t ON t.ustazid = ot.ustaz_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
  AND zl.ustazid = ot.ustaz_id
  AND zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
WHERE ot.end_at IS NULL
GROUP BY ot.id, s.name, t.ustazname, ot.occupied_at
HAVING MIN(zl.sent_time) < ot.occupied_at
ORDER BY teacher_name, student_name;

-- ====================================================================
-- STEP 3: COUNT AFFECTED RECORDS
-- ====================================================================

-- Query 3: Count how many records need fixing
SELECT COUNT(*) as total_affected_students
FROM (
  SELECT ot.id
  FROM wpos_ustaz_occupied_times ot
  LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
    AND zl.ustazid = ot.ustaz_id
    AND zl.sent_time >= '2025-10-01'
    AND zl.sent_time <= '2025-10-31'
  WHERE ot.end_at IS NULL
  GROUP BY ot.id, ot.occupied_at
  HAVING MIN(zl.sent_time) < ot.occupied_at
) as affected;

-- ====================================================================
-- STEP 4: FIX ONE STUDENT (TEST FIRST)
-- ====================================================================

-- Query 4: Fix ONLY Abdulbasit Meki first (TEST)
UPDATE wpos_ustaz_occupied_times
SET occupied_at = '2025-10-01 00:00:00'
WHERE id = 8120;

-- Verify the fix for Abdulbasit Meki:
SELECT 
  id,
  student_id,
  ustaz_id,
  occupied_at,
  time_slot,
  daypackage
FROM wpos_ustaz_occupied_times
WHERE id = 8120;

-- Expected: occupied_at should now be 2025-10-01 00:00:00

-- ====================================================================
-- STEP 5: FIX ALL AFFECTED STUDENTS (BULK UPDATE)
-- ====================================================================

-- Query 5A: Update occupied_at to match FIRST zoom link date for October 2025
-- This is the SAFEST approach - uses actual first zoom link
UPDATE ot
SET occupied_at = first_zoom.earliest_date
FROM wpos_ustaz_occupied_times ot
INNER JOIN (
  SELECT 
    zl.studentid,
    zl.ustazid,
    MIN(zl.sent_time) as earliest_date
  FROM wpos_zoom_links zl
  WHERE zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
  GROUP BY zl.studentid, zl.ustazid
) first_zoom ON first_zoom.studentid = ot.student_id 
  AND first_zoom.ustazid = ot.ustaz_id
WHERE ot.end_at IS NULL  -- Only active assignments
AND first_zoom.earliest_date < ot.occupied_at;  -- Only fix if zoom link is before assignment

-- ====================================================================
-- ALTERNATIVE: Fix to beginning of month (more conservative)
-- ====================================================================

-- Query 5B: Set all active assignments to Oct 1 if they're after Oct 1
-- Use this if you want ALL October students to start from Oct 1
UPDATE wpos_ustaz_occupied_times
SET occupied_at = '2025-10-01 00:00:00'
WHERE end_at IS NULL  -- Only active assignments
AND occupied_at > '2025-10-01 00:00:00'
AND occupied_at <= '2025-10-31 23:59:59';  -- Only October assignments

-- ====================================================================
-- STEP 6: VERIFY THE FIX
-- ====================================================================

-- Query 6: Verify no more students have zoom links before occupied_at
SELECT 
  ot.id,
  s.name as student_name,
  t.ustazname as teacher_name,
  ot.occupied_at,
  MIN(zl.sent_time) as first_zoom_link,
  COUNT(zl.id) as zoom_links
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_wpdatatable_24 t ON t.ustazid = ot.ustaz_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
  AND zl.ustazid = ot.ustaz_id
  AND zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
WHERE ot.end_at IS NULL
GROUP BY ot.id, s.name, t.ustazname, ot.occupied_at
HAVING MIN(zl.sent_time) < ot.occupied_at
ORDER BY teacher_name;

-- Expected: NO ROWS (if fix worked correctly)

-- ====================================================================
-- STEP 7: DETAILED ANALYSIS FOR SPECIFIC TEACHER
-- ====================================================================

-- Query 7: Check all students for SULTAN HASSEN (U401)
SELECT 
  ot.id,
  s.wdt_ID as student_id,
  s.name as student_name,
  s.package,
  s.daypackages,
  ot.occupied_at,
  ot.time_slot,
  COUNT(zl.id) as zoom_links_sent,
  MIN(zl.sent_time) as first_zoom,
  MAX(zl.sent_time) as last_zoom
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
  AND zl.ustazid = 'U401'
  AND zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
WHERE ot.ustaz_id = 'U401'
AND ot.end_at IS NULL
GROUP BY ot.id, s.wdt_ID, s.name, s.package, s.daypackages, ot.occupied_at, ot.time_slot
ORDER BY s.name;

-- ====================================================================
-- STEP 8: SUMMARY STATISTICS
-- ====================================================================

-- Query 8: Get summary of the fix impact
SELECT 
  t.ustazname as teacher_name,
  COUNT(DISTINCT ot.student_id) as affected_students,
  SUM(zoom_counts.zoom_count) as total_zoom_links_recovered,
  SUM(DATEDIFF(DAY, zoom_counts.first_zoom, ot.occupied_at)) as total_days_recovered
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_24 t ON t.ustazid = ot.ustaz_id
LEFT JOIN (
  SELECT 
    studentid,
    ustazid,
    MIN(sent_time) as first_zoom,
    COUNT(*) as zoom_count
  FROM wpos_zoom_links
  WHERE sent_time >= '2025-10-01'
  AND sent_time <= '2025-10-31'
  GROUP BY studentid, ustazid
) zoom_counts ON zoom_counts.studentid = ot.student_id 
  AND zoom_counts.ustazid = ot.ustaz_id
WHERE ot.end_at IS NULL
AND zoom_counts.first_zoom < ot.occupied_at
GROUP BY t.ustazname
ORDER BY affected_students DESC;

-- ====================================================================
-- STEP 9: AUDIT LOG (Optional - Track the fix)
-- ====================================================================

-- Query 9: Log the mass update for audit trail
INSERT INTO auditlog (actionType, adminId, targetId, details, createdAt)
SELECT 
  'occupied_times_mass_fix',
  'ADMIN_ID_HERE',  -- Replace with your admin ID
  ot.id,
  JSON_OBJECT(
    'student_id', ot.student_id,
    'student_name', s.name,
    'teacher_id', ot.ustaz_id,
    'old_occupied_at', ot.occupied_at,
    'new_occupied_at', MIN(zl.sent_time),
    'reason', 'Fix time slot update issue - preserve original assignment date'
  ),
  NOW()
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
  AND zl.ustazid = ot.ustaz_id
  AND zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
WHERE ot.end_at IS NULL
GROUP BY ot.id, ot.student_id, s.name, ot.ustaz_id, ot.occupied_at
HAVING MIN(zl.sent_time) < ot.occupied_at;

-- ====================================================================
-- RECOMMENDED EXECUTION ORDER
-- ====================================================================

/*
1. Run Query 1 (STEP 1) - See all affected students
2. Run Query 3 (STEP 3) - Count total affected
3. Run Query 4 (STEP 4) - Test fix on Abdulbasit Meki
4. Verify Abdulbasit shows correctly in teacher payments
5. Run Query 5A or 5B (STEP 5) - Fix ALL students
6. Run Query 6 (STEP 6) - Verify fix worked
7. Clear salary cache: /api/admin/teacher-payments?clearCache=true
8. Check teacher payment breakdowns
*/

-- ====================================================================
-- QUICK REFERENCE: Most Common Queries
-- ====================================================================

-- See all affected students:
/*
SELECT ot.id, s.name, t.ustazname, ot.occupied_at, MIN(zl.sent_time) as first_zoom
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_wpdatatable_24 t ON t.ustazid = ot.ustaz_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id AND zl.ustazid = ot.ustaz_id
WHERE ot.end_at IS NULL AND zl.sent_time >= '2025-10-01' AND zl.sent_time <= '2025-10-31'
GROUP BY ot.id, s.name, t.ustazname, ot.occupied_at
HAVING MIN(zl.sent_time) < ot.occupied_at;
*/

-- Fix all at once:
/*
UPDATE ot
SET occupied_at = first_zoom.earliest_date
FROM wpos_ustaz_occupied_times ot
INNER JOIN (
  SELECT studentid, ustazid, MIN(sent_time) as earliest_date
  FROM wpos_zoom_links
  WHERE sent_time >= '2025-10-01' AND sent_time <= '2025-10-31'
  GROUP BY studentid, ustazid
) first_zoom ON first_zoom.studentid = ot.student_id AND first_zoom.ustazid = ot.ustaz_id
WHERE ot.end_at IS NULL AND first_zoom.earliest_date < ot.occupied_at;
*/

