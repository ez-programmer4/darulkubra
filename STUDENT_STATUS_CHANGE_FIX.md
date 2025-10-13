# Student Status Change Salary Fix

## Problem Statement

When a student's status changed mid-month (e.g., from "Active" to "Inactive", "Completed", or "Dropped"), the salary calculator was not including them in salary calculations, even though the teacher had taught them and sent zoom links before the status change.

### Example Scenario

**Before the fix:**

```
Sept 1-15: Student is "Active" → Teacher sends 15 zoom links
Sept 16: Student status changes to "Inactive" (dropped out, completed, etc.)
September salary calculation: Teacher gets ❌ NOTHING (student not included)
```

**What should happen:**

```
Sept 1-15: Student is "Active" → Teacher sends 15 zoom links
Sept 16: Student status changes to "Inactive"
September salary calculation: Teacher gets ✅ PAID for those 15 days
```

## Root Cause

The salary calculator was filtering students by current status `["active", "Active", "Not yet"]` in multiple places:

1. **`getTeacherStudents()` method** (line 525): Only fetched currently active students
2. **Historical students query** (line 582): Only included active students from history
3. **Zoom link fallback** (line 639): Only added students if currently active
4. **Absence deduction** (line 1458): Only checked currently active students

This meant that if a student's status changed after the teacher taught them, they were completely excluded from salary calculations.

## Solution

**Changed Philosophy:**

- **Old:** "Include students who are currently active"
- **New:** "Include students who were taught during the period (have zoom links), regardless of current status"

### Technical Changes

#### 1. Updated `getTeacherStudents()` Method

**Removed status filter from main query:**

```typescript
// OLD - Line 525
where: {
  ustaz: teacherId,
  status: { in: ["active", "Active", "Not yet"] },  // ❌ Filters by current status
  occupiedTimes: { ... }
}

// NEW - Line 523
where: {
  ustaz: teacherId,  // ✅ No status filter
  occupiedTimes: { ... }
}
```

**Added status field to selection:**

```typescript
select: {
  wdt_ID: true,
  name: true,
  package: true,
  status: true,  // ✅ Include status for reference
  zoom_links: { ... }
}
```

#### 2. Updated Historical Students Query

**Removed status filter:**

```typescript
// OLD - Line 582
where: {
  wdt_ID: { in: Array.from(historicalStudentIds) },
  status: { in: ["active", "Active", "Not yet"] },  // ❌ Filters by current status
}

// NEW - Line 581
where: {
  wdt_ID: { in: Array.from(historicalStudentIds) },  // ✅ No status filter
}
```

#### 3. Updated Zoom Link Fallback

**Removed status check:**

```typescript
// OLD - Line 636-640
if (
  student &&
  !existingStudentIds.has(student.wdt_ID) &&
  student.status &&
  ["active", "Active", "Not yet"].includes(student.status) // ❌ Filters by current status
) {
  // Add student
}

// NEW - Line 637
if (student && !existingStudentIds.has(student.wdt_ID)) {
  // ✅ No status filter
  // Add student
}
```

#### 4. Updated Absence Deduction Query

**Removed status filter:**

```typescript
// OLD - Line 1458
where: {
  status: { in: ["active", "Active", "Not yet"] },  // ❌ Filters by current status
  OR: [ ... ]
}

// NEW - Line 1458
where: {
  OR: [ ... ]  // ✅ No status filter
}
```

## How It Works Now

### Salary Calculation Flow

1. **Find Students**: Get ALL students who:

   - Have occupied_times assignments with this teacher during the period
   - OR have zoom links sent by this teacher during the period
   - **Regardless of current status**

2. **Calculate Base Salary**: For each zoom link sent:

   - Use the student's package rate at the time
   - Count the teaching day
   - Add to teacher's earnings

3. **Calculate Deductions**: For each scheduled day without a zoom link:
   - Check if student was assigned on that day
   - Apply absence deduction based on package rate
   - Respect teacher change periods

### Example Scenarios

#### Scenario 1: Student Completes Mid-Month

```
Student: Ahmed
Package: MWF (200 ETB/month)
Daily Rate: 200 / 30 = 6.67 ETB

Timeline:
- Sept 1-15: Status "Active" → Teacher sends 6 zoom links (Mon, Wed, Fri x2 weeks)
- Sept 16: Student completes course → Status changes to "Completed"
- Sept 18-30: No more zoom links (student not active)

Teacher's September Salary:
✅ Earnings: 6 days × 6.67 ETB = 40 ETB
✅ No absence deductions for Sept 18-30 (student not assigned anymore)
✅ Total: 40 ETB
```

#### Scenario 2: Student Drops Out Mid-Month

```
Student: Fatima
Package: TTS (150 ETB/month)
Daily Rate: 150 / 30 = 5 ETB

Timeline:
- Sept 1-10: Status "Active" → Teacher sends 4 zoom links (Tue, Thu, Sat, Tue)
- Sept 8 (Thu): No zoom link sent (teacher absent)
- Sept 11: Student drops out → Status changes to "Dropped"

Teacher's September Salary:
✅ Earnings: 4 days × 5 ETB = 20 ETB
❌ Absence deduction: 1 day × 25 ETB = -25 ETB (Sept 8)
✅ Total: 20 - 25 = -5 ETB (owes money for absence)
```

#### Scenario 3: Multiple Status Changes

```
Student: Omar
Package: ALL DAYS (300 ETB/month)
Daily Rate: 300 / 30 = 10 ETB

Timeline:
- Sept 1-10: Status "Not yet" → Teacher sends 10 zoom links
- Sept 11: Status changes to "Active" → Teacher continues teaching
- Sept 11-20: Sends 10 more zoom links
- Sept 21: Status changes to "Completed"
- Sept 22-30: No more zoom links

Teacher's September Salary:
✅ Earnings: 20 days × 10 ETB = 200 ETB
✅ No issues with status changes
✅ Total: 200 ETB
```

## Key Benefits

1. **Fair Compensation**: Teachers are paid for all work done, regardless of later status changes
2. **Accurate Earnings**: Zoom links are the source of truth for teaching days
3. **No Data Loss**: Student status changes don't erase teaching history
4. **Proper Deductions**: Absences are still tracked when student was active
5. **Better Tracking**: Status field is included for reference/debugging

## Important Notes

### Zoom Links as Source of Truth

The salary calculator now relies primarily on **zoom links** to determine:

- Which students a teacher taught
- How many days they taught
- What package rate to use (from student's package field)

This is more reliable than status because:

- Zoom links prove actual teaching occurred
- Status can change for many reasons unrelated to the current month
- Package information is preserved in the student record

### Package Rate Determination

When calculating salary for a student with changed status:

1. Get student's current `package` field
2. Look up package rate from `packageSalary` table
3. Calculate daily rate: `monthlyRate / workingDays`
4. Pay for each zoom link sent: `dailyRate × numberOfZoomLinks`

**Note:** If the package changed when status changed, the NEW package rate is used. This might need adjustment if you want to use the historical package rate.

### Deduction Behavior

Absence/lateness deductions still respect:

- **Teacher change periods**: Only deduct from assigned teacher
- **Student assignment dates**: Only deduct during assignment period
- **Daypackage schedules**: Only deduct on scheduled days
- **Permission requests**: Skip permitted dates
- **Waived deductions**: Skip waived dates

## Edge Cases Handled

### 1. Student Never Had Active Status

```
Student created as "Dropped" by mistake, then corrected
Solution: If zoom links exist, teacher gets paid regardless of status
```

### 2. Status Changes Multiple Times

```
Active → Inactive → Active → Completed
Solution: All zoom links are counted, status changes are ignored
```

### 3. Package Changes with Status

```
Student downgrades package when pausing (Active → Inactive)
Concern: Uses current (downgraded) package rate
Future Enhancement: Store package rate in zoom_links table
```

### 4. Student Re-enrolls

```
Sept: Active → teacher taught → Completed
Oct: Re-enrolled as Active
Solution: Each month calculated independently based on zoom links
```

## Testing Recommendations

### Test Case 1: Mid-Month Completion

1. Create student with "Active" status
2. Have teacher send 10 zoom links in first half of month
3. Change student status to "Completed" mid-month
4. Calculate salary
5. **Verify**: Teacher is paid for those 10 days

### Test Case 2: Early Drop Out

1. Create student with "Active" status
2. Have teacher send 3 zoom links
3. Miss 2 scheduled days (no zoom links)
4. Change student status to "Dropped"
5. Calculate salary
6. **Verify**: Teacher is paid for 3 days AND charged for 2 absences

### Test Case 3: Status Never Active

1. Create student with "Dropped" status
2. Manually add zoom links from this teacher
3. Calculate salary
4. **Verify**: Teacher is paid for those zoom links

### Test Case 4: Multiple Teachers, Status Change

1. Student with Teacher A (first half of month)
2. Transfer to Teacher B (second half)
3. Student completes and status changes to "Completed"
4. Calculate both teachers' salaries
5. **Verify**: Both teachers paid for their respective periods

## Database Schema Notes

The fix relies on these tables:

- `wpos_wpdatatable_23` (students) - includes status and package
- `wpos_zoom_links` - proof of teaching
- `wpos_ustaz_occupied_times` - assignment periods
- `teacher_change_history` - teacher changes
- `packageSalary` - package rates

No schema changes required for this fix.

## Performance Considerations

**Impact:** Slightly increased query complexity

- Removed status filters → Potentially more students in result set
- Added status field to SELECT → Minimal overhead
- Same number of queries → No additional database hits

**Optimization:** The query still filters by:

- Teacher ID
- Assignment periods
- Date ranges

So performance impact is minimal.

## Related Files

- `src/lib/salary-calculator.ts` - Main salary calculation logic (lines 512-682, 1455-1517)
- `src/lib/teacher-change-utils.ts` - Teacher change period handling
- `TEACHER_CHANGE_SALARY_FIX.md` - Related fix for teacher changes

## Future Enhancements

1. **Historical Package Rates**: Store package rate at time of zoom link

   ```sql
   ALTER TABLE wpos_zoom_links ADD COLUMN package_rate DECIMAL(10,2);
   ```

2. **Status Change Audit**: Log when student status changes affect salary

   ```sql
   CREATE TABLE student_status_history (
     id INT PRIMARY KEY,
     student_id INT,
     old_status VARCHAR(50),
     new_status VARCHAR(50),
     changed_at DATETIME,
     affects_period VARCHAR(7)  -- e.g., "2024-09"
   );
   ```

3. **Package Change Tracking**: Separate package changes from status changes

   ```sql
   CREATE TABLE student_package_history (
     id INT PRIMARY KEY,
     student_id INT,
     old_package VARCHAR(100),
     new_package VARCHAR(100),
     changed_at DATETIME,
     reason TEXT
   );
   ```

4. **Pro-rated Package Rates**: If student downgrades mid-month, use both rates
   ```
   Sept 1-15: Premium package (300 ETB) → 15 days × 10 ETB = 150 ETB
   Sept 16-30: Basic package (150 ETB) → 15 days × 5 ETB = 75 ETB
   Total: 225 ETB (instead of all at one rate)
   ```
