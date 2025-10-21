-- ====================================================================
-- FIX ALL OCCUPIED_TIMES - MySQL/MariaDB Compatible
-- ====================================================================
-- For use with MySQL, MariaDB, or phpMyAdmin
-- ====================================================================

-- ====================================================================
-- STEP 1: SEE ALL AFFECTED STUDENTS (READ ONLY)
-- ====================================================================

SELECT 
  ot.id as record_id,
  ot.student_id,
  s.name as student_name,
  ot.ustaz_id as teacher_id,
  t.ustazname as teacher_name,
  ot.occupied_at as current_assignment_date,
  MIN(zl.sent_time) as first_zoom_link_date,
  MAX(zl.sent_time) as last_zoom_link_date,
  COUNT(zl.id) as total_zoom_links,
  DATEDIFF(ot.occupied_at, MIN(zl.sent_time)) as days_lost,
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
WHERE ot.end_at IS NULL
GROUP BY 
  ot.id, ot.student_id, s.name, ot.ustaz_id, t.ustazname, 
  ot.occupied_at, ot.time_slot, ot.daypackage, s.package
HAVING MIN(zl.sent_time) < ot.occupied_at
ORDER BY days_lost DESC, teacher_name, student_name;


-- ====================================================================
-- STEP 2: COUNT TOTAL AFFECTED (READ ONLY)
-- ====================================================================

SELECT 
  COUNT(*) as total_students_affected,
  SUM(zoom_count) as total_zoom_links_affected
FROM (
  SELECT 
    ot.id,
    COUNT(zl.id) as zoom_count
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
-- STEP 3: PREVIEW WHAT WILL CHANGE (READ ONLY)
-- ====================================================================

SELECT 
  ot.id,
  s.name as student_name,
  t.ustazname as teacher_name,
  DATE(ot.occupied_at) as OLD_date,
  DATE(MIN(zl.sent_time)) as NEW_date,
  DATEDIFF(ot.occupied_at, MIN(zl.sent_time)) as days_recovered,
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
ORDER BY teacher_name, student_name;


-- ====================================================================
-- STEP 4: FIX ABDULBASIT MEKI ONLY (TEST FIRST)
-- ====================================================================

-- Test with one student first
UPDATE wpos_ustaz_occupied_times
SET occupied_at = '2025-10-01 00:00:00'
WHERE id = 8120;

-- Verify:
SELECT * FROM wpos_ustaz_occupied_times WHERE id = 8120;


-- ====================================================================
-- STEP 5: FIX ALL AFFECTED STUDENTS (USE AFTER TESTING)
-- ====================================================================

-- METHOD A: Update to first zoom link date (RECOMMENDED)
UPDATE wpos_ustaz_occupied_times ot
JOIN (
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
SET ot.occupied_at = first_zoom.earliest_date
WHERE ot.end_at IS NULL
  AND first_zoom.earliest_date < ot.occupied_at;


-- METHOD B: Update all to Oct 1 (SIMPLE, SAFE)
UPDATE wpos_ustaz_occupied_times
SET occupied_at = '2025-10-01 00:00:00'
WHERE end_at IS NULL
  AND occupied_at > '2025-10-01 00:00:00'
  AND occupied_at <= '2025-10-31 23:59:59';


-- ====================================================================
-- STEP 6: VERIFY ALL FIXED
-- ====================================================================

-- Should return NO rows after fix
SELECT 
  ot.id,
  s.name,
  ot.occupied_at,
  MIN(zl.sent_time) as first_zoom
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id 
  AND zl.ustazid = ot.ustaz_id
  AND zl.sent_time >= '2025-10-01'
  AND zl.sent_time <= '2025-10-31'
WHERE ot.end_at IS NULL
GROUP BY ot.id, s.name, ot.occupied_at
HAVING MIN(zl.sent_time) < ot.occupied_at;


-- ====================================================================
-- STEP 7: GET SUMMARY BY TEACHER
-- ====================================================================

SELECT 
  t.ustazname as teacher_name,
  COUNT(DISTINCT s.wdt_ID) as total_students,
  SUM(zoom_counts.zoom_count) as total_zoom_links
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_24 t ON t.ustazid = ot.ustaz_id
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN (
  SELECT 
    studentid,
    ustazid,
    COUNT(*) as zoom_count
  FROM wpos_zoom_links
  WHERE sent_time >= '2025-10-01'
    AND sent_time <= '2025-10-31'
  GROUP BY studentid, ustazid
) zoom_counts ON zoom_counts.studentid = ot.student_id 
  AND zoom_counts.ustazid = ot.ustaz_id
WHERE ot.end_at IS NULL
GROUP BY t.ustazname
HAVING SUM(zoom_counts.zoom_count) > 0
ORDER BY total_students DESC;


-- ====================================================================
-- QUICK COMMANDS (Copy-Paste Ready)
-- ====================================================================

-- 1. See problem:
-- SELECT ot.id, s.name, ot.occupied_at, MIN(zl.sent_time) as first_zoom FROM wpos_ustaz_occupied_times ot JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id AND zl.ustazid = ot.ustaz_id WHERE ot.end_at IS NULL AND zl.sent_time >= '2025-10-01' GROUP BY ot.id, s.name, ot.occupied_at HAVING MIN(zl.sent_time) < ot.occupied_at;

-- 2. Fix Abdulbasit Meki:
-- UPDATE wpos_ustaz_occupied_times SET occupied_at = '2025-10-01 00:00:00' WHERE id = 8120;

-- 3. Fix all (Method A - to first zoom link):
-- UPDATE wpos_ustaz_occupied_times ot JOIN (SELECT studentid, ustazid, MIN(sent_time) as earliest_date FROM wpos_zoom_links WHERE sent_time >= '2025-10-01' AND sent_time <= '2025-10-31' GROUP BY studentid, ustazid) first_zoom ON first_zoom.studentid = ot.student_id AND first_zoom.ustazid = ot.ustaz_id SET ot.occupied_at = first_zoom.earliest_date WHERE ot.end_at IS NULL AND first_zoom.earliest_date < ot.occupied_at;

-- 4. Fix all (Method B - to Oct 1):
-- UPDATE wpos_ustaz_occupied_times SET occupied_at = '2025-10-01 00:00:00' WHERE end_at IS NULL AND occupied_at > '2025-10-01 00:00:00' AND occupied_at <= '2025-10-31 23:59:59';

-- 5. Verify (should return 0 rows):
-- SELECT COUNT(*) as remaining_issues FROM (SELECT ot.id FROM wpos_ustaz_occupied_times ot LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id AND zl.ustazid = ot.ustaz_id WHERE ot.end_at IS NULL AND zl.sent_time >= '2025-10-01' GROUP BY ot.id, ot.occupied_at HAVING MIN(zl.sent_time) < ot.occupied_at) as check_fix;

