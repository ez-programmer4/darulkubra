# Teacher Salary & Payment System - Quick Reference Guide

## 🚀 Quick Start

### 1. Restart Server

```bash
npm run dev
```

### 2. Visit Page

```
http://localhost:3000/admin/teacher-payments?clearCache=true
```

### 3. Check Logs

Look for these in console:

- `🔧 Loading salary configuration...`
- `💰 === CALCULATING BASE SALARY ===`
- `📊 Daypackage: "MWF"` (NOT "undefined"!)

---

## 🔧 Key Files

### Core Files

- **`src/lib/salary-calculator.ts`** - Main calculation logic
- **`src/lib/salary-config.ts`** - Centralized configuration
- **`src/lib/teacher-payment-utils.ts`** - Helper functions

### Pages

- **`src/app/admin/teacher-payments/page.tsx`** - Server component
- **`src/app/admin/teacher-payments/TeacherPaymentsClient.tsx`** - Client component

### APIs

- **`src/app/api/admin/teacher-payments/route.ts`** - Main API
- **`src/app/api/admin/clear-salary-cache/route.ts`** - Cache clearing

---

## 🎯 Common Actions

### Clear Cache

```typescript
// Via API
await fetch("/api/admin/clear-salary-cache", {
  method: "POST",
  body: JSON.stringify({ action: "clear_all" })
});

// Via URL
?clearCache=true
```

### Update Settings

```typescript
// Sunday inclusion
await fetch("/api/admin/settings/include-sundays", {
  method: "POST",
  body: JSON.stringify({ includeSundays: true }),
});

// Teacher salary visibility
await fetch("/api/admin/settings/teacher-salary-visibility", {
  method: "POST",
  body: JSON.stringify({
    showTeacherSalary: true,
    customMessage: "...",
    adminContact: "...",
  }),
});
```

---

## 📊 Configuration Keys

### Database Settings

- `include_sundays` - Include Sundays in calculations
- `teacher_salary_visibility` - Show/hide teacher salary

### Package Deductions

- `packageDeduction` table - Lateness and absence rates

### Lateness Config

- `latenessdeductionconfig` table - Tier-based deductions

### Package Salaries

- `packageSalary` table - Monthly rates per package

---

## 🔍 Debugging

### Enable Debug Mode

```bash
# In .env file
DEBUG_SALARY=true
```

### Check Logs

Look for:

- `🔧` - Configuration
- `💰` - Salary calculation
- `📅` - Working days
- `👤` - Student processing
- `✅` - Success
- `❌` - Error/Skip

### Common Issues

**Daypackage "undefined"**

- Check if `daypackages` field exists in database
- Verify field is included in queries
- Restart server

**Wrong working days**

- Check `include_sundays` setting
- Verify date range
- Check timezone settings

**Incorrect deductions**

- Check package deduction rates
- Verify lateness config tiers
- Check waiver records

---

## 🎨 UI Components

### Main Components

- **SalaryTable** - Displays teacher salaries
- **TeacherChangeValidator** - Validates teacher changes
- **Settings Dialog** - Configuration UI

### Key Features

- Month/Year selector
- Quick actions
- Bulk operations
- Teacher details modal
- Settings management

---

## 📈 Performance Tips

### Caching

- Use cache for repeated calculations
- Clear cache when data changes
- Use `clearCache=true` in URL

### Optimization

- Parallel database queries
- Batch operations
- Efficient state management

### Monitoring

- Check console logs
- Monitor API response times
- Track database query performance

---

## 🆘 Quick Fixes

### Issue: Calculations wrong

1. Clear cache
2. Check logs
3. Verify configuration
4. Restart server

### Issue: Settings not updating

1. Click "Clear Cache"
2. Refresh page
3. Check API response
4. Verify database

### Issue: Slow performance

1. Check database indexes
2. Verify caching is working
3. Check query optimization
4. Monitor resource usage

---

## 📞 Support

### Logs to Check

- Server console logs
- Browser console logs
- Database query logs

### Information to Provide

- Error message
- Steps to reproduce
- Relevant logs
- Date/time of issue

---

## ✨ Success Checklist

- [ ] Server running
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Configuration loads correctly
- [ ] Calculations are accurate
- [ ] Cache clearing works
- [ ] Settings update correctly
- [ ] UI displays correctly
- [ ] Logs show expected output

---

## 🎉 You're All Set!

The system is fully integrated and ready to use. Just restart your server and start testing!
