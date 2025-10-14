# Teacher Salary & Payment System - Integration Plan

## Overview

This document outlines the complete integration plan for the teacher salary and payment system, ensuring all components (routes, APIs, pages, libs) work together dynamically.

## Current Architecture

### Files Structure

```
src/
├── app/
│   ├── admin/
│   │   └── teacher-payments/
│   │       ├── page.tsx (Server Component)
│   │       └── TeacherPaymentsClient.tsx (Client Component)
│   └── api/
│       └── admin/
│           └── teacher-payments/
│               ├── route.ts (GET, POST)
│               ├── analytics/route.ts
│               ├── financial/route.ts
│               ├── statistics/route.ts
│               └── pdf/route.ts
└── lib/
    ├── salary-calculator.ts (Core Calculation Logic)
    ├── teacher-payment-utils.ts (Helper Functions)
    └── calculator-cache.ts (Caching)
```

## Integration Issues Identified

### 1. **Daypackage Field Missing** ✅ FIXED

- **Problem**: `daypackages` field not loaded in database queries
- **Impact**: Incorrect calculations, "undefined" daypackages
- **Fix**: Added `daypackages: true` to all student queries

### 2. **Configuration Not Dynamic**

- **Problem**: Settings hardcoded or not properly loaded
- **Impact**: Changes to settings don't reflect immediately
- **Fix Needed**: Create centralized config loader

### 3. **API Routes Not Integrated**

- **Problem**: Multiple API routes with different patterns
- **Impact**: Inconsistent data flow
- **Fix Needed**: Standardize API responses

### 4. **Client-Server State Mismatch**

- **Problem**: Server and client components not properly synchronized
- **Impact**: Stale data, incorrect UI state
- **Fix Needed**: Better state management

### 5. **Error Handling Inconsistent**

- **Problem**: Different error handling patterns across files
- **Impact**: Poor user experience, hard to debug
- **Fix Needed**: Standardized error handling

## Integration Plan

### Phase 1: Core Configuration (Priority: HIGH)

#### 1.1 Create Centralized Configuration

**File**: `src/lib/salary-config.ts`

```typescript
// Centralized configuration loader
export async function getSalaryConfig() {
  const [sundaySetting, salarySetting, packageDeductions, latenessConfigs] =
    await Promise.all([
      prisma.setting.findUnique({ where: { key: "include_sundays" } }),
      prisma.setting.findUnique({
        where: { key: "teacher_salary_visibility" },
      }),
      prisma.packageDeduction.findMany(),
      prisma.latenessdeductionconfig.findMany({ orderBy: [{ tier: "asc" }] }),
    ]);

  return {
    includeSundays: sundaySetting?.value === "true",
    showTeacherSalary: salarySetting?.value
      ? JSON.parse(salarySetting.value).showTeacherSalary
      : true,
    packageDeductions: createPackageDeductionMap(packageDeductions),
    latenessConfig: createLatenessConfig(latenessConfigs),
    // ... other settings
  };
}
```

#### 1.2 Update Salary Calculator to Use Dynamic Config

**File**: `src/lib/salary-calculator.ts`

```typescript
// Update createSalaryCalculator to load config dynamically
export async function createSalaryCalculator(): Promise<SalaryCalculator> {
  const config = await getSalaryConfig();
  return new SalaryCalculator(config);
}
```

### Phase 2: API Integration (Priority: HIGH)

#### 2.1 Standardize API Responses

**File**: `src/app/api/admin/teacher-payments/route.ts`

```typescript
// Standard response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    // ... existing logic

    return NextResponse.json({
      success: true,
      data: salaries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

#### 2.2 Add Cache Invalidation

```typescript
// Clear cache when settings change
export async function clearSalaryCache(teacherId?: string) {
  const calculator = await getSalaryCalculator();
  if (teacherId) {
    calculator.clearTeacherCache(teacherId);
  } else {
    calculator.clearCache();
  }
}
```

### Phase 3: Client-Server Integration (Priority: MEDIUM)

#### 3.1 Update Server Component

**File**: `src/app/admin/teacher-payments/page.tsx`

```typescript
export default async function TeacherPaymentsPage({ searchParams }) {
  // Load config dynamically
  const config = await getSalaryConfig();

  // Calculate salaries with dynamic config
  const calculator = await createSalaryCalculator();
  const teachers = await calculator.calculateAllTeacherSalaries(
    fromDate,
    toDate
  );

  return (
    <TeacherPaymentsClient
      initialTeachers={teachers}
      initialConfig={config}
      // ... other props
    />
  );
}
```

#### 3.2 Update Client Component

**File**: `src/app/admin/teacher-payments/TeacherPaymentsClient.tsx`

```typescript
export default function TeacherPaymentsClient({
  initialTeachers,
  initialConfig,
}) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [config, setConfig] = useState(initialConfig);
  const [loading, setLoading] = useState(false);

  // Refresh data with cache clearing
  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/teacher-payments?clearCache=true&...`
      );
      const result = await response.json();
      if (result.success) {
        setTeachers(result.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

### Phase 4: Error Handling (Priority: MEDIUM)

#### 4.1 Create Error Handler

**File**: `src/lib/salary-error-handler.ts`

```typescript
export class SalaryCalculationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "SalaryCalculationError";
  }
}

export function handleSalaryError(error: any) {
  if (error instanceof SalaryCalculationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred",
    details: error.message,
  };
}
```

### Phase 5: Logging & Debugging (Priority: LOW)

#### 5.1 Create Logger

**File**: `src/lib/salary-logger.ts`

```typescript
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export class SalaryLogger {
  static log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  static debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  static info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  static warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  static error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }
}
```

## Implementation Checklist

### Core Files to Update

- [x] `src/lib/salary-calculator.ts` - Add daypackages field
- [ ] `src/lib/salary-config.ts` - Create centralized config (NEW)
- [ ] `src/lib/salary-error-handler.ts` - Create error handler (NEW)
- [ ] `src/lib/salary-logger.ts` - Create logger (NEW)
- [ ] `src/lib/salary-types.ts` - Create unified types (NEW)

### API Routes to Update

- [ ] `src/app/api/admin/teacher-payments/route.ts` - Standardize responses
- [ ] `src/app/api/admin/teacher-payments/analytics/route.ts` - Add error handling
- [ ] `src/app/api/admin/teacher-payments/statistics/route.ts` - Add error handling
- [ ] `src/app/api/admin/teacher-payments/financial/route.ts` - Add error handling

### Pages to Update

- [ ] `src/app/admin/teacher-payments/page.tsx` - Use dynamic config
- [ ] `src/app/admin/teacher-payments/TeacherPaymentsClient.tsx` - Better state management

## Testing Plan

### Unit Tests

1. Test salary calculation with different configurations
2. Test daypackage parsing
3. Test absence deduction calculation
4. Test lateness deduction calculation

### Integration Tests

1. Test API endpoint with different parameters
2. Test cache invalidation
3. Test error handling
4. Test client-server data flow

### Manual Testing

1. Test with different month/year combinations
2. Test with teachers having different packages
3. Test with teacher changes
4. Test with various absence scenarios
5. Test with various lateness scenarios

## Performance Optimization

### Caching Strategy

```typescript
// Cache calculator instance
const calculatorCache = new Map<string, SalaryCalculator>();

export async function getCachedCalculator(
  key: string
): Promise<SalaryCalculator> {
  if (!calculatorCache.has(key)) {
    calculatorCache.set(key, await createSalaryCalculator());
  }
  return calculatorCache.get(key)!;
}

// Clear cache on config changes
export function clearCalculatorCache() {
  calculatorCache.clear();
}
```

### Query Optimization

```typescript
// Batch database queries
const [students, assignments, teacherChanges] = await Promise.all([
  getTeacherStudents(teacherId, fromDate, toDate),
  getTeacherAssignments(teacherId, fromDate, toDate),
  getTeacherChangePeriods(teacherId, fromDate, toDate),
]);
```

## Monitoring & Debugging

### Logging Points

1. **Config Loading**: Log when config is loaded/reloaded
2. **Calculation Start**: Log when calculation starts
3. **Calculation Progress**: Log major calculation steps
4. **Calculation Complete**: Log final results
5. **Errors**: Log all errors with context

### Debug Mode

```typescript
// Enable debug mode via environment variable
const DEBUG_MODE = process.env.DEBUG_SALARY === "true";

if (DEBUG_MODE) {
  SalaryLogger.debug("Starting salary calculation", {
    teacherId,
    fromDate,
    toDate,
  });
}
```

## Rollback Plan

If issues arise:

1. Revert to previous version of salary-calculator.ts
2. Remove new config files
3. Use hardcoded configuration
4. Clear all caches

## Success Criteria

- [ ] All daypackage fields properly loaded
- [ ] Configuration loads dynamically
- [ ] API responses standardized
- [ ] Client-server state synchronized
- [ ] Error handling consistent
- [ ] Logging comprehensive
- [ ] Performance optimized
- [ ] All tests passing

## Timeline

- **Phase 1**: 1-2 hours (Core Configuration)
- **Phase 2**: 1-2 hours (API Integration)
- **Phase 3**: 1-2 hours (Client-Server Integration)
- **Phase 4**: 1 hour (Error Handling)
- **Phase 5**: 1 hour (Logging & Debugging)
- **Testing**: 2-3 hours
- **Total**: 7-11 hours

## Next Steps

1. Create centralized configuration file
2. Update salary calculator to use dynamic config
3. Standardize API responses
4. Update client component
5. Add comprehensive logging
6. Test all integrations
7. Deploy and monitor
