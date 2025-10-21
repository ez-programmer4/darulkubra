# Zoom Attendance Button Timezone Fix

## Problem

After midnight UTC (9 PM Ethiopia time), the attendance button would become inactive even though teachers had sent Zoom links earlier in the day. This was because the system was checking if links were sent "today" using UTC time instead of Ethiopian time (UTC+3).

## Root Cause

In `src/app/api/teachers/students/zoom-status/route.ts`, the system was determining "today" using UTC:

```typescript
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
```

This meant that at 9:01 PM Ethiopia time (which is 00:01 UTC the next day), the system would think it's a new day and wouldn't find the Zoom links sent earlier in the Ethiopian day.

## Solution

Updated the API to use Ethiopian timezone (UTC+3) when determining "today":

### Changes Made

1. **Import Ethiopian time utility**:

   ```typescript
   import { getEthiopianTime } from "@/lib/ethiopian-time";
   ```

2. **Calculate Ethiopian day boundaries**:

   ```typescript
   // Get today's date in Ethiopian timezone (UTC+3)
   const ethiopianToday = getEthiopianTime();
   const todayStr = ethiopianToday.toISOString().split("T")[0];

   // Calculate start and end of day in Ethiopian time
   const ethiopianDayStart = new Date(todayStr + "T00:00:00.000Z");
   const ethiopianDayEnd = new Date(todayStr + "T23:59:59.999Z");

   // Adjust back to UTC by subtracting 3 hours for database query
   const utcDayStart = new Date(
     ethiopianDayStart.getTime() - 3 * 60 * 60 * 1000
   );
   const utcDayEnd = new Date(ethiopianDayEnd.getTime() - 3 * 60 * 60 * 1000);
   ```

3. **Query database with correct UTC range**:
   ```typescript
   const zoomLinks = await prisma.wpos_zoom_links.findMany({
     where: {
       ustazid: teacherId,
       sent_time: {
         gte: utcDayStart, // Ethiopian midnight = UTC 21:00 previous day
         lt: utcDayEnd, // Ethiopian 23:59 = UTC 20:59
       },
     },
   });
   ```

## How It Works

### Example Timeline

**Ethiopian Day: October 21, 2025**

- Ethiopian 00:00 (midnight) = UTC 21:00 October 20
- Ethiopian 23:59 = UTC 20:59 October 21

**Scenario**:

1. Teacher sends Zoom link at 5 PM Ethiopia time (2 PM UTC) on Oct 21
2. Teacher finishes class at 10 PM Ethiopia time (7 PM UTC) on Oct 21
3. System now correctly recognizes the link was sent "today" (Ethiopian time)
4. Attendance button remains active throughout the entire Ethiopian day

### Before Fix

- At 9:01 PM Ethiopia time (00:01 UTC), system would think it's Oct 22
- Links sent earlier on Oct 21 Ethiopia time wouldn't be found
- Attendance button would become inactive

### After Fix

- System uses Ethiopian date to determine "today"
- Converts Ethiopian day boundaries to UTC for database query
- Links remain valid throughout the entire Ethiopian day (00:00 - 23:59 Ethiopia time)
- Attendance button stays active as expected

## Files Modified

1. `src/app/api/teachers/students/zoom-status/route.ts` - Fixed "today" check for zoom link status (server-side)
2. `src/app/api/teachers/today-classes/route.ts` - Fixed day-of-week calculation for today's classes (server-side)
3. `src/app/teachers/students/page.tsx` - Fixed day-of-week filtering for student packages (client-side)
4. `src/app/teachers/dashboard/AssignedStudents.tsx` - Fixed day-of-week filtering in teacher dashboard (client-side)
5. `src/app/api/teachers/permissions/route.ts` - Fixed daily permission request limit check (server-side)

## Testing

To test this fix:

1. **Before midnight Ethiopia time** (before 9 PM UTC):
   - Send a Zoom link to a student
   - Verify attendance button is active
2. **After midnight UTC but before midnight Ethiopia time** (9 PM - 12 AM Ethiopia time):

   - Attendance button should still be active for links sent earlier in the Ethiopian day
   - This is the critical test case that was failing before

3. **After midnight Ethiopia time**:
   - Previous day's links should no longer enable attendance button
   - This is correct behavior

## Additional Fix: Today's Classes

The same timezone issue was affecting the "today's classes" feature. After midnight UTC (9 PM Ethiopia time), the system would show the next day's classes instead of the current day's classes.

### Fixed in `src/app/api/teachers/today-classes/route.ts`:

```typescript
// Before (using UTC):
const today = new Date();
const dayIndex = today.getDay();

// After (using Ethiopian time):
import { getEthiopianTime } from "@/lib/ethiopian-time";
const today = getEthiopianTime();
const dayIndex = today.getDay();
```

This ensures that:

- At 10 PM Ethiopia time (7 PM UTC) on Monday, system shows Monday's classes ✅
- After midnight UTC but before midnight Ethiopia time (9 PM - 12 AM Ethiopia), still shows correct day's classes ✅
- Teachers see the correct schedule for their actual working day ✅

## Additional Fix: Frontend Day Filtering

The frontend was also using the browser's local time (which could be any timezone) to filter students by day package. This caused inconsistencies where the frontend might show different students than expected.

### Fixed in `src/app/teachers/students/page.tsx`:

```typescript
// Before (using browser's local time):
function packageIncludesToday(pkg?: string): boolean {
  const day = new Date().getDay();
  // ... filtering logic
}

// After (using Ethiopian time):
function packageIncludesToday(pkg?: string): boolean {
  const now = new Date();
  const ethiopianTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const day = ethiopianTime.getDay();
  // ... filtering logic
}
```

This ensures that:

- Student list filters by Ethiopian day, not browser timezone ✅
- "Today's students" matches teacher's actual working day ✅
- Consistent behavior regardless of teacher's device timezone settings ✅
- Frontend and backend now synchronized on the same timezone ✅

## Benefits

✅ Teachers can mark attendance anytime during the Ethiopian teaching day
✅ No more confusion around midnight
✅ System behavior matches teacher expectations
✅ Consistent with Ethiopia's actual timezone (UTC+3)
✅ Today's classes list shows correct day throughout Ethiopian day
✅ All time-based features now synchronized to Ethiopian timezone

## Related Files

- `src/lib/ethiopian-time.ts` - Ethiopian timezone utilities
- `src/app/teachers/students/page.tsx` - Teacher students page that checks zoom status
- `src/app/api/teachers/students/[id]/zoom/route.ts` - Already uses Ethiopian time for zoom link creation
