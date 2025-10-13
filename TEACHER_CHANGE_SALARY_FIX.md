# Teacher Change Salary Calculation Fix

## Problem Statement

When a teacher change occurred mid-month, the salary calculator was not properly splitting the salary period between the old and new teachers. This caused:

1. **Former teachers** were being charged for deductions (lateness/absence) that occurred after they were transferred
2. **New teachers** were receiving earnings for periods before they were assigned
3. Both teachers could be charged for the same student's issues on the same date

## Solution Overview

Added comprehensive teacher change period handling to ensure:

- ✅ Former teachers only get paid and deducted for dates **before** the change
- ✅ New teachers only get paid and deducted for dates **on or after** the change
- ✅ Each teacher is only responsible for their own period
- ✅ Multiple teacher changes for the same student are handled correctly

## Technical Changes

### 1. Added Helper Method: `isTeacherAssignedOnDate()`

**Location:** `src/lib/salary-calculator.ts` (lines 358-420)

This method determines if a teacher was assigned to a student on a specific date by:

- Checking all teacher changes for the student
- Finding the most recent change before the date in question
- Determining which teacher was responsible at that time
- Handling multiple teacher changes chronologically

```typescript
private isTeacherAssignedOnDate(
  teacherId: string,
  studentId: number,
  date: Date,
  teacherChanges: Array<{...}>,
  occupiedTimes: Array<{...}>
): boolean
```

**Logic:**

- If teacher changes exist: Walk through changes chronologically to find who was assigned on the date
- If no teacher changes: Use regular occupied_times assignment period
- Handles edge case where student has been transferred multiple times

### 2. Updated Lateness Deduction Calculation

**Location:** `src/lib/salary-calculator.ts` (lines 1087-1379)

**Changes:**

1. Fetches teacher change history at the start of the method
2. For each zoom link (lateness check), verifies the teacher was assigned on that date
3. Uses `isTeacherAssignedOnDate()` helper to check assignment
4. Skips lateness deductions for dates outside the teacher's assignment period

**Example:**

```
Teacher A → Student transferred on Sept 15th → Teacher B

Zoom link sent late on Sept 10: Deducted from Teacher A ✅
Zoom link sent late on Sept 20: Deducted from Teacher B ✅
```

### 3. Updated Absence Deduction Calculation

**Location:** `src/lib/salary-calculator.ts` (lines 1381-1857)

**Changes:**

1. Fetches teacher change history at the start of the method
2. For each day without a zoom link (absence check), verifies the teacher was assigned on that date
3. Uses `isTeacherAssignedOnDate()` helper to check assignment
4. Skips absence deductions for dates outside the teacher's assignment period

**Example:**

```
Teacher A → Student transferred on Sept 15th → Teacher B

No zoom link on Sept 12: Deducted from Teacher A ✅
No zoom link on Sept 18: Deducted from Teacher B ✅
```

### 4. Base Salary Calculation (Already Handled)

The base salary calculation already had teacher change period handling through `getTeacherChangePeriods()` which:

- Splits earnings by period
- Tracks zoom links per period
- Calculates daily rate for each period
- Labels periods as "old_teacher" or "new_teacher"

## How It Works

### Data Flow

1. **Fetch Teacher Change History**

   ```sql
   SELECT * FROM teacher_change_history
   WHERE (old_teacher_id = ? OR new_teacher_id = ?)
   AND change_date BETWEEN fromDate AND toDate
   ```

2. **For Each Day/Event**

   - Check if there's a teacher change for this student
   - Determine which teacher was assigned on this specific date
   - Only process if current teacher was assigned

3. **Calculate Deductions**
   - Lateness: Only for zoom links sent during teacher's assignment period
   - Absence: Only for missing zoom links during teacher's assignment period

### Example Scenario

**Setup:**

- Student: Ahmed
- Package: MWF (Mon, Wed, Fri)
- Teacher A assigned: Sept 1-14
- Teacher B assigned: Sept 15-30
- Teacher change date: Sept 15

**Results:**

| Date          | Event          | Teacher A   | Teacher B   |
| ------------- | -------------- | ----------- | ----------- |
| Sept 8 (Mon)  | Late zoom link | ❌ Deducted | -           |
| Sept 10 (Wed) | No zoom link   | ❌ Deducted | -           |
| Sept 13 (Fri) | On time        | ✅ Earned   | -           |
| Sept 15 (Mon) | No zoom link   | -           | ❌ Deducted |
| Sept 18 (Wed) | Late zoom link | -           | ❌ Deducted |
| Sept 20 (Fri) | On time        | -           | ✅ Earned   |

**Teacher A Summary:**

- Earnings: Sept 1-14 (days with zoom links)
- Lateness: Sept 8 only
- Absence: Sept 10 only
- **No charges for Sept 15+ (after transfer)**

**Teacher B Summary:**

- Earnings: Sept 15-30 (days with zoom links)
- Lateness: Sept 18 only
- Absence: Sept 15 only
- **No charges for Sept 1-14 (before transfer)**

## Edge Cases Handled

### 1. Multiple Teacher Changes

If a student is transferred multiple times:

```
Teacher A (Sept 1-10) → Teacher B (Sept 11-20) → Teacher C (Sept 21-30)
```

Each teacher only gets their respective period.

### 2. Teacher Change on First Day

```
Change date: Sept 1
Old teacher: No charges for September
New teacher: Full month charges
```

### 3. Teacher Change on Last Day

```
Change date: Sept 30
Old teacher: Full month charges
New teacher: Only Sept 30
```

### 4. Same Student, Different Days

If a teacher is assigned MWF and then transferred:

- Old teacher: Only deducted for MWF days before change
- New teacher: Only deducted for MWF days after change
- No deductions on TTS days for either teacher ✅

## Testing Recommendations

1. **Test Case: Mid-Month Transfer**

   - Create teacher change on 15th
   - Add zoom links before and after change
   - Verify old teacher not charged after 15th
   - Verify new teacher not charged before 15th

2. **Test Case: Multiple Transfers**

   - Transfer same student twice in one month
   - Verify each teacher only charged for their period

3. **Test Case: Lateness Before Transfer**

   - Old teacher sends late zoom link
   - Student transferred
   - New teacher sends on-time zoom link
   - Verify only old teacher gets lateness deduction

4. **Test Case: Absence After Transfer**
   - Student transferred mid-month
   - New teacher doesn't send zoom link
   - Verify only new teacher gets absence deduction

## Database Requirements

This solution relies on the `teacher_change_history` table:

```sql
CREATE TABLE teacher_change_history (
  id INT PRIMARY KEY,
  student_id INT,
  old_teacher_id VARCHAR(255),
  new_teacher_id VARCHAR(255),
  change_date DATETIME,
  time_slot VARCHAR(50),
  daypackage VARCHAR(100),
  student_package VARCHAR(100),
  monthly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  change_reason TEXT,
  created_by VARCHAR(255),
  created_at DATETIME
);
```

## Benefits

1. **Fair Compensation**: Each teacher only responsible for their period
2. **Accurate Deductions**: No cross-period charges
3. **Clear Audit Trail**: Teacher change history tracked
4. **Handles Complexity**: Multiple changes, edge cases covered
5. **Performance**: Efficient queries with proper indexing

## Related Files

- `src/lib/salary-calculator.ts` - Main salary calculation logic
- `src/lib/teacher-change-utils.ts` - Teacher change utilities
- `src/lib/teacher-change-validation.ts` - Validation logic

## Future Enhancements

1. **Prorated Daily Rates**: Split daily rate if change occurs mid-day
2. **Change Date Validation**: Ensure change dates align with schedule
3. **Retroactive Changes**: Handle backdated teacher changes
4. **Notification System**: Alert teachers when students are transferred
