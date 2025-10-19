# 🧪 Testing on Localhost

## ✅ What Works on Localhost (No Setup Needed)

### **Manual Link Method** - Test This Now!

**Steps:**

1. Login as teacher (http://localhost:3000/login)
2. Go to "My Students" page
3. Click any student's name
4. Modal opens: "Send Zoom Link"
5. **Ignore** the auto-create section (won't work yet)
6. **Use** the "Manual Link Option" section:
   - Open Zoom app on your computer
   - Click "New Meeting" or "Schedule"
   - Copy the link
   - Paste in the text box
   - Click "Send Zoom Link"
7. ✅ **Check:** Student receives Telegram message?
8. ✅ **Check:** Link appears in database?

---

## ❌ What DOESN'T Work on Localhost (Needs Setup)

### **Auto-Create Method** - Needs OAuth Setup

**Error you'll see:**

```
Failed to create meeting via API: Error: Invalid access token
```

**Why?**

- Needs ZOOM_CLIENT_ID in `.env`
- Needs ZOOM_CLIENT_SECRET in `.env`
- Teacher needs to connect Zoom account
- Requires OAuth setup (see SETUP_GUIDE.md)

**To fix:**

1. Follow `SETUP_GUIDE.md` - Part 1 (Admin Setup)
2. Add credentials to `.env`
3. Restart dev server
4. Teacher connects Zoom
5. Then test auto-create

---

### **Event Subscriptions (Webhooks)** - Won't Work on Localhost

**Error you'll see:**

```
URL validation failed
```

**Why?**

- Zoom can't reach localhost
- Needs public URL (https://yourdomain.com)
- Only works after deployment

**What this means:**

- Duration tracking won't work
- Meeting started/ended events won't fire
- Everything else works fine!

---

## 📋 Localhost Testing Checklist

### **Test Manual Method:**

- [ ] Teacher can login
- [ ] Teacher sees students list
- [ ] Click student opens modal
- [ ] Can paste Zoom link
- [ ] Click "Send" works
- [ ] Student receives Telegram message
- [ ] Link saved in database
- [ ] No errors in console

### **Test UI:**

- [ ] Students list loads
- [ ] Search works
- [ ] Filter by day works
- [ ] Modal opens/closes smoothly
- [ ] Forms look correct
- [ ] Buttons work
- [ ] Colors/styling correct

### **Test Attendance:**

- [ ] Can mark attendance
- [ ] Can select status (Present/Absent/Permission)
- [ ] Can add notes
- [ ] Saves correctly

---

## 🚀 After Testing Locally

### **Deploy to Production:**

1. **Build and deploy:**

   ```bash
   npm run build
   # Deploy to your hosting
   ```

2. **Set up OAuth** (follow SETUP_GUIDE.md)

3. **Configure webhooks** (in production only)

4. **Test auto-create** (in production)

---

## 💡 Quick Summary

**Works on Localhost:**

- ✅ Manual link method
- ✅ UI testing
- ✅ Student management
- ✅ Attendance marking
- ✅ Telegram notifications (if TELEGRAM_BOT_TOKEN set)

**Needs Production:**

- ❌ Auto-create meetings (needs OAuth)
- ❌ Webhooks (needs public URL)
- ❌ Duration tracking (needs webhooks)

---

## 🎯 Focus on Testing This Now:

1. **Manual Method** - Paste link, send to student
2. **UI/UX** - Does everything look good?
3. **Student List** - All features working?
4. **Telegram** - Do notifications arrive?

**Save OAuth and webhooks for production deployment!**

---

**For questions, see:**

- `SETUP_GUIDE.md` - Full OAuth setup
- `WEBHOOK_TROUBLESHOOTING.md` - Webhook issues
