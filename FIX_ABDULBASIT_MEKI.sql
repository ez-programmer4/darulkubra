-- ✅ Fix for Abdulbasit Meki Salary Calculation Issue
-- Student ID: 11508
-- Teacher: SULTAN HASSEN (U401)
-- Issue: occupied_at date is 2025-10-20, but zoom links started from 2025-10-01

-- Step 1: Check current record
SELECT 
  id,
  student_id,
  ustaz_id,
  time_slot,
  daypackage,
  occupied_at,
  end_at
FROM wpos_ustaz_occupied_times
WHERE student_id = 11508;

-- Expected output:
-- id: 8120
-- occupied_at: 2025-10-20 06:44:41  ← WRONG! Should be 2025-10-01

-- Step 2: Fix the occupied_at date to match first zoom link
UPDATE wpos_ustaz_occupied_times
SET occupied_at = '2025-10-01 00:00:00'
WHERE id = 8120;

-- Step 3: Verify the fix
SELECT 
  id,
  student_id,
  ustaz_id,
  time_slot,
  daypackage,
  occupied_at,
  end_at
FROM wpos_ustaz_occupied_times
WHERE student_id = 11508;

-- Expected output after fix:
-- id: 8120
-- occupied_at: 2025-10-01 00:00:00  ← FIXED! Now matches first zoom link

-- Step 4: Clear salary cache (run this URL in browser or API client)
-- /api/admin/teacher-payments?clearCache=true&teacherId=U401&startDate=2025-10-01&endDate=2025-10-31

-- ✅ Result: Abdulbasit Meki should now show:
--    - Days Worked: 9
--    - Total Earned: [daily rate × 9] ETB
--    - Appears in SULTAN HASSEN's student breakdown

