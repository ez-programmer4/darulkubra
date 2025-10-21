# 🔧 Fix: Time Slot Updates Breaking Salary Calculation

## 🎯 Problem Description

**Current Behavior (WRONG):**
When a student's **time slot** is updated (e.g., changing from 8:00 AM to 9:00 AM), the system creates a **NEW** `occupied_times` record with `occupied_at` = current date, which:

- ❌ Makes the salary calculator think the teacher was only assigned from that date
- ❌ Excludes all zoom links sent before the time slot change
- ❌ Results in 0 earnings even though teaching happened

**Desired Behavior (CORRECT):**

- ✅ Time slot changes should **UPDATE** existing `occupied_times` record
- ✅ `occupied_at` should **ONLY** change when teacher actually changes
- ✅ Previous teaching days should still count toward salary

---

## 🔍 Root Cause

The student update logic is **creating new records** instead of **updating existing ones** when time slots change.

**Example:**

```
Oct 1: Student assigned to Teacher A at 8:00 AM
  → occupied_times: {occupied_at: Oct 1, time_slot: 08:00:00}

Oct 20: Admin changes time slot to 9:00 AM
  → NEW record: {occupied_at: Oct 20, time_slot: 09:00:00}  ❌ WRONG!
  → Old record deleted or end_at set to Oct 20

Result: Salary calculator only sees Oct 20-31, excludes Oct 1-19!
```

---

## ✅ Solution: Separate Time Slot Updates from Teacher Changes

### Approach 1: Update Logic (RECOMMENDED)

Modify the student update endpoint to:

1. Check if **only time slot** is changing
2. If yes: **UPDATE** existing record (preserve `occupied_at`)
3. If **teacher** is changing: Create new record with new `occupied_at`

### Approach 2: Database Constraint

Add a unique constraint or check to prevent multiple active `occupied_times` for same student+teacher.

---

## 🔧 Implementation

### Step 1: Create Update Helper Function

Create a new file: `src/lib/occupied-times-utils.ts`

```typescript
import { prisma } from "@/lib/prisma";

/**
 * Update student time slot WITHOUT changing occupied_at date
 * This preserves salary calculation history
 */
export async function updateStudentTimeSlot(
  studentId: number,
  newTimeSlot: string,
  newDayPackage?: string
) {
  // Find existing occupied_times for this student
  const existing = await prisma.wpos_ustaz_occupied_times.findFirst({
    where: {
      student_id: studentId,
      end_at: null, // Only active assignments
    },
    orderBy: {
      occupied_at: "desc",
    },
  });

  if (!existing) {
    throw new Error(`No active assignment found for student ${studentId}`);
  }

  // UPDATE existing record (preserve occupied_at!)
  await prisma.wpos_ustaz_occupied_times.update({
    where: { id: existing.id },
    data: {
      time_slot: newTimeSlot,
      ...(newDayPackage && { daypackage: newDayPackage }),
      // DO NOT update occupied_at!
    },
  });

  console.log(
    `✅ Updated time slot for student ${studentId}: ${newTimeSlot} (preserved occupied_at: ${existing.occupied_at})`
  );
}

/**
 * Change student's teacher (creates new occupied_times with current date)
 */
export async function changeStudentTeacher(
  studentId: number,
  oldTeacherId: string,
  newTeacherId: string,
  newTimeSlot: string,
  dayPackage: string
) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // End old teacher's assignment
    await tx.wpos_ustaz_occupied_times.updateMany({
      where: {
        student_id: studentId,
        ustaz_id: oldTeacherId,
        end_at: null,
      },
      data: {
        end_at: now,
      },
    });

    // Create new assignment with current date (CORRECT for teacher changes)
    await tx.wpos_ustaz_occupied_times.create({
      data: {
        student_id: studentId,
        ustaz_id: newTeacherId,
        time_slot: newTimeSlot,
        daypackage: dayPackage,
        occupied_at: now, // New assignment date
        end_at: null,
      },
    });

    // Log in teacher_change_history
    await tx.teacher_change_history.create({
      data: {
        student_id: studentId,
        old_teacher_id: oldTeacherId,
        new_teacher_id: newTeacherId,
        change_date: now,
      },
    });
  });

  console.log(
    `✅ Changed teacher for student ${studentId}: ${oldTeacherId} → ${newTeacherId}`
  );
}
```

### Step 2: Update Student Endpoint

Modify your student update endpoint (wherever it is - likely in admin or controller routes):

```typescript
// Example: In your student update endpoint
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const {
    ustaz: newTeacher,
    selectedTime: newTimeSlot,
    daypackages: newDayPackage,
    // ... other fields
  } = body;

  const studentId = parseInt(params.id);

  // Get current student data
  const currentStudent = await prisma.wpos_wpdatatable_23.findUnique({
    where: { wdt_ID: studentId },
    select: { ustaz: true },
  });

  if (!currentStudent) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Check if teacher is changing
  const isTeacherChanging = newTeacher && newTeacher !== currentStudent.ustaz;

  if (isTeacherChanging) {
    // TEACHER CHANGE - Create new occupied_times with current date
    await changeStudentTeacher(
      studentId,
      currentStudent.ustaz!,
      newTeacher,
      newTimeSlot,
      newDayPackage
    );
  } else if (newTimeSlot) {
    // ONLY TIME SLOT CHANGE - Update existing record
    await updateStudentTimeSlot(studentId, newTimeSlot, newDayPackage);
  }

  // Update student record
  await prisma.wpos_wpdatatable_23.update({
    where: { wdt_ID: studentId },
    data: {
      ustaz: newTeacher,
      // ... other fields
    },
  });

  return NextResponse.json({ success: true });
}
```

---

## 🚀 Quick Fix for Existing Data

### Fix All Students with Wrong occupied_at Dates

Run this SQL to identify affected students:

```sql
-- Find students where occupied_at doesn't match first zoom link
SELECT
  ot.student_id,
  s.name,
  s.ustaz,
  ot.occupied_at as assignment_date,
  MIN(zl.sent_time) as first_zoom_link,
  DATEDIFF(day, MIN(zl.sent_time), ot.occupied_at) as days_diff
FROM wpos_ustaz_occupied_times ot
JOIN wpos_wpdatatable_23 s ON s.wdt_ID = ot.student_id
LEFT JOIN wpos_zoom_links zl ON zl.studentid = ot.student_id AND zl.ustazid = ot.ustaz_id
WHERE ot.end_at IS NULL  -- Active assignments only
GROUP BY ot.student_id, s.name, s.ustaz, ot.occupied_at
HAVING MIN(zl.sent_time) < ot.occupied_at  -- Zoom links BEFORE assignment date
ORDER BY days_diff DESC;
```

### Fix them in bulk:

```sql
-- For each affected student, update occupied_at to match first zoom link
UPDATE ot
SET ot.occupied_at = first_zoom.earliest_date
FROM wpos_ustaz_occupied_times ot
CROSS APPLY (
  SELECT MIN(sent_time) as earliest_date
  FROM wpos_zoom_links
  WHERE studentid = ot.student_id
  AND ustazid = ot.ustaz_id
) first_zoom
WHERE ot.end_at IS NULL
AND first_zoom.earliest_date < ot.occupied_at;
```

**Or more conservatively, set to beginning of month:**

```sql
-- Set occupied_at to first day of current month for all active assignments
UPDATE wpos_ustaz_occupied_times
SET occupied_at = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
WHERE end_at IS NULL
AND occupied_at > DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
```

---

## 📋 Migration Plan

### Phase 1: Immediate Fix (Today)

1. **Fix Abdulbasit Meki manually:**

   ```sql
   UPDATE wpos_ustaz_occupied_times
   SET occupied_at = '2025-10-01 00:00:00'
   WHERE id = 8120;
   ```

2. **Clear salary cache:**
   ```
   /api/admin/teacher-payments?clearCache=true
   ```

### Phase 2: Prevent Future Issues (This Week)

1. ✅ Create `occupied-times-utils.ts` with helper functions
2. ✅ Update student update endpoints to use helpers
3. ✅ Add validation: Prevent multiple active `occupied_times` for same student

### Phase 3: Fix Historical Data (This Week)

1. ✅ Run SQL query to find all affected students
2. ✅ Review and fix each case
3. ✅ Clear salary cache for affected teachers

### Phase 4: Add Monitoring (Next Week)

1. ✅ Add logging when `occupied_times` is created/updated
2. ✅ Alert if `occupied_at` is set to current date for non-teacher-changes
3. ✅ Add UI warning if student has multiple active `occupied_times`

---

## ✅ Validation Checklist

After implementing the fix:

- [ ] Time slot updates preserve `occupied_at` date
- [ ] Teacher changes create new records with current date
- [ ] No duplicate active `occupied_times` for same student
- [ ] Salary calculations include all zoom links from first assignment
- [ ] Teacher change history logged properly
- [ ] Cache cleared after occupied_times updates

---

## 🔍 How to Test

### Test Case 1: Time Slot Update

1. Create student assigned to Teacher A at 8:00 AM on Oct 1
2. Send 5 zoom links Oct 1-10
3. Change time slot to 9:00 AM on Oct 15
4. **Verify:**
   - `occupied_at` still shows Oct 1 ✅
   - Salary calculation includes all 5 zoom links ✅

### Test Case 2: Teacher Change

1. Create student assigned to Teacher A on Oct 1
2. Send 5 zoom links Oct 1-10
3. Change teacher to Teacher B on Oct 15
4. Send 3 zoom links Oct 16-20
5. **Verify:**
   - Teacher A: 5 zoom links, Oct 1-10 period ✅
   - Teacher B: 3 zoom links, Oct 15-31 period ✅

---

## 📞 Need Help?

If you need help implementing this:

1. Share your student update endpoint code
2. I'll modify it to use the helper functions
3. We'll test with Abdulbasit Meki case

---

**Status:** Solution designed, ready to implement
**Priority:** HIGH (affects salary calculations)
**Complexity:** Medium (requires endpoint modifications)
**Impact:** Fixes salary calculation for all teachers
