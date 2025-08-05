# Active Students Filter Implementation Summary

## Overview

This document summarizes all the changes made to ensure that attendance tracking, analytics, and reports only include students with `status: "active"` in the database.

## Database Schema Context

- **Students Table**: `wpos_wpdatatable_23` contains a `status` field
- **Active Students**: Only students with `status: "active"` should be included in attendance functionality
- **Other Statuses**: Students may have other statuses like "inactive", "suspended", etc.

## Changes Made

### 1. Analytics API (`src/app/api/analytics/route.ts`)

**Purpose**: Provides dashboard statistics and analytics data

**Changes**:

- Modified `prisma.wpos_wpdatatable_23.findMany` queries to include `status: { equals: "active" }`
- Updated both main students query and nested teacher stats students query
- Ensures all analytics data (student counts, rankings, trends) only includes active students

**Code Example**:

```typescript
const students = await prisma.wpos_wpdatatable_23.findMany({
  where:
    session.role === "admin"
      ? { status: { equals: "active" } } // Admin can see all active students
      : {
          u_control: { equals: session.code },
          status: { equals: "active" }, // Controller only sees their active students
        },
  // ... rest of query
});
```

### 2. Attendance List API (`src/app/api/attendance-list/route.ts`)

**Purpose**: Fetches attendance data for the attendance list page

**Changes**:

- Modified main students query to include `status: { equals: "active" }`
- Updated count query to only count active students
- Ensures attendance list only shows active students

**Code Example**:

```typescript
const records = await prisma.wpos_wpdatatable_23.findMany({
  where: {
    u_control: { equals: session.code },
    status: { equals: "active" }, // Only active students
  },
  // ... rest of query
});

const total = await prisma.wpos_wpdatatable_23.count({
  where: {
    u_control: { equals: session.code },
    status: { equals: "active" }, // Only count active students
  },
});
```

### 3. Admin Attendance API (`src/app/api/admin/attendance/route.ts`)

**Purpose**: Provides attendance data for admin dashboard

**Changes**:

- Added `status: { equals: "active" }` to the where clause
- Ensures admin attendance analytics only include active students

**Code Example**:

```typescript
const where: any = {
  OR: dayPackageOr,
  status: { equals: "active" }, // Only active students
};
```

### 4. Reports API (`src/app/api/reports/route.ts`)

**Purpose**: Generates various reports for the system

**Changes**:

- Modified students query to include `status: { equals: "active" }`
- Updated teachers' students include query to filter for active students
- Ensures all reports only include active students

**Code Example**:

```typescript
const students = await prisma.wpos_wpdatatable_23.findMany({
  where: {
    u_control: { equals: session.code },
    status: { equals: "active" }, // Only active students
  },
  // ... rest of query
});

// In teachers include
students: {
  where: {
    u_control: { equals: session.code },
    status: { equals: "active" }, // Only active students
  },
  // ... rest of include
}
```

### 5. Controller Students API (`src/app/api/controller/students/route.ts`)

**Purpose**: Fetches student data for controllers

**Changes**:

- Added `status: { equals: "active" }` to the where clause
- Ensures controllers only see their active students

**Code Example**:

```typescript
const students = await prisma.wpos_wpdatatable_23.findMany({
  where: {
    u_control: session.code,
    status: { equals: "active" }, // Only active students
  },
  // ... rest of query
});
```

### 6. Attendance List UI (`src/app/attendance-list/page.tsx`)

**Purpose**: Displays attendance list to users

**Changes**:

- Added informational note in the "Attendance Analytics Section"
- Informs users that only active students are included in attendance tracking and analytics

**Code Example**:

```tsx
<p className="text-xs text-indigo-500 mt-1">
  📋 <strong>Note:</strong> Only active students are included in attendance
  tracking and analytics.
</p>
```

### 7. Ustaz Rating Calculator (`src/lib/ustazRatingCalculator.ts`)

**Purpose**: Calculates teacher attendance ratings and statistics

**Changes**:

- Modified student query to include `status: { equals: "active" }`
- Ensures attendance calculations only include active students
- Affects teacher rating calculations and attendance statistics

**Code Example**:

```typescript
const students = await prisma.wpos_wpdatatable_23.findMany({
  where: {
    ustaz: ustazId,
    daypackages: {
      contains: date.toLocaleDateString("en-US", { weekday: "long" }),
    },
    status: { equals: "active" }, // Only active students
  },
  // ... rest of query
});
```

### 8. Process Absences Script (`scripts/processAbsences.ts`)

**Purpose**: Processes teacher absences and creates absence records

**Changes**:

- Modified teacher query to only include active students in the `students` include
- Ensures absence processing only considers teachers with active students
- Prevents marking teachers absent when they only have inactive students

**Code Example**:

```typescript
const teachers = await prisma.wpos_wpdatatable_24.findMany({
  include: {
    students: {
      where: {
        status: { equals: "active" }, // Only consider active students
      },
    },
  },
});
```

### 9. Process Lateness Script (`scripts/processLateness.ts`)

**Purpose**: Processes student lateness and calculates deductions

**Changes**:

- Modified student query to include `status: { equals: "active" }`
- Ensures lateness processing only includes active students
- Prevents lateness calculations for inactive students

**Code Example**:

```typescript
const students = await prisma.wpos_wpdatatable_23.findMany({
  where: {
    status: { equals: "active" }, // Only active students
  },
  include: {
    teacher: true,
    occupiedTimes: {
      select: {
        time_slot: true,
      },
    },
  },
});
```

## Impact on System

### ✅ What's Now Filtered for Active Students:

1. **Analytics Dashboard** - All statistics and charts
2. **Attendance List** - Student attendance records
3. **Admin Attendance** - Admin dashboard attendance data
4. **Reports** - All generated reports
5. **Controller Views** - Student data for controllers
6. **Teacher Rating Calculations** - Attendance statistics and ratings
7. **Absence Processing** - Teacher absence detection
8. **Lateness Processing** - Student lateness calculations

### 🔍 What's NOT Affected:

- **Teacher Management** - Teachers can still see all their assigned students
- **Payment Records** - Payment history remains unchanged
- **User Management** - Admin user management functionality
- **System Settings** - Configuration and settings pages

## Benefits

1. **Data Accuracy**: Analytics and reports now reflect only active students
2. **Performance**: Reduced data processing by filtering inactive students
3. **User Experience**: Clear indication that only active students are tracked
4. **Consistency**: All attendance-related functionality now follows the same filter

## Testing Recommendations

1. **Verify Active Students**: Check that students with `status: "active"` appear in all views
2. **Verify Inactive Students**: Confirm that students with other statuses are excluded
3. **Test Analytics**: Ensure dashboard statistics only count active students
4. **Test Reports**: Verify generated reports only include active students
5. **Test Attendance**: Confirm attendance tracking only works for active students

## Future Considerations

1. **Status Management**: Consider adding UI for managing student status
2. **Audit Trail**: Track when students change status
3. **Notifications**: Alert when students become inactive
4. **Data Migration**: Consider historical data handling for status changes

## Files Modified

1. `src/app/api/analytics/route.ts`
2. `src/app/api/attendance-list/route.ts`
3. `src/app/api/admin/attendance/route.ts`
4. `src/app/api/reports/route.ts`
5. `src/app/api/controller/students/route.ts`
6. `src/app/attendance-list/page.tsx`
7. `src/lib/ustazRatingCalculator.ts`
8. `scripts/processAbsences.ts`
9. `scripts/processLateness.ts`

## Database Query Pattern

All modified queries follow this pattern:

```typescript
where: {
  // ... existing conditions
  status: { equals: "active" }, // Only active students
}
```

This ensures consistency across all attendance-related functionality while maintaining existing role-based access controls.
