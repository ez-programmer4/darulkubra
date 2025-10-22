# Quick Fix Summary: Leave Student Payment

## Problem

When students leave, `wpos_ustaz_occupied_times` records are **DELETED** → Teachers not paid for days taught

## Root Cause

Aminat Yasin had 15 zoom links (Oct 1-17), but occupied_times was deleted → Period calculated as single day → 0 payment

## Solution

✅ Use **zoom links as source of truth** when occupied_times is missing

## Changes Made

**File**: `src/lib/salary-calculator.ts`

### 1. Special handling for Leave students (Line 1169-1210)

```typescript
if (student.status === "leave" && no periods && has zoom links) {
  // Create period from first to last zoom link
  periods = [{ start: firstZoom, end: lastZoom }];
}
```

### 2. Fallback for missing data (Line 1327-1334)

```typescript
// Use zoom link dates, not extended to month end
const periodStart = Math.max(firstZoomDate, fromDate);
const periodEnd = Math.min(lastZoomDate, toDate);
```

### 3. Skip if no evidence (Line 1361-1380)

```typescript
if (no periods && no zoom links) {
  continue; // Don't create false periods
}
```

## Expected Result

**Before**: Aminat Yasin → 0 ETB (period: Oct 17-17, 1 day)
**After**: Aminat Yasin → 450 ETB (period: Oct 1-17, 15 days)

## Test It

1. Open server console
2. Go to Teacher Payments → October 2025
3. Calculate MUBAREK RAHMETO's salary
4. Check console for: "🔄 LEAVE STUDENT - Using Zoom Links"
5. Verify: Period Oct 1-17, 15 days, 450 ETB

## Alternative Solutions

### Option A: Don't Delete occupied_times (Recommended)

Instead of deleting, set `end_at` date:

```sql
UPDATE wpos_ustaz_occupied_times
SET end_at = NOW()
WHERE student_id = [id];
```

**Benefit**: Simple salary calculations, complete history

### Option B: Archive Before Delete

Create archive table, copy before delete
**Benefit**: Clean main table, preserves history

### Option C: Current Fix (Implemented)

Use zoom links when occupied_times missing
**Benefit**: Works immediately, no schema changes

## Key Points

- ✅ Zoom links = proof of teaching = payment basis
- ✅ Works for ALL statuses (Leave, Active, Not Yet)
- ✅ Teachers paid for actual days taught
- ✅ No payment without zoom links (correct behavior)
- ✅ Debug logging for Aminat/MUBAREK shows details

## Files

- `src/lib/salary-calculator.ts` - Main fix
- `FIX_LEAVE_STUDENT_PAYMENT_COMPLETE.md` - Detailed docs

## Status

✅ **Ready to Test**
