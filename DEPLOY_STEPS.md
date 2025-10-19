# 🚀 Production Deployment Steps

## ⚠️ BEFORE YOU START

**BACKUP YOUR DATABASE FIRST!**

```bash
# Connect to your production database server
mysqldump -u your_user -p your_database > backup_before_zoom_$(date +%Y%m%d).sql
```

**Download backup file to safe location!**

---

## 📋 DEPLOYMENT CHECKLIST

### **STEP 1: Database Migration** (5 min)

1. **Connect to production database:**

   ```bash
   mysql -u your_user -p your_database
   ```

2. **Run the migration SQL:**

   ```bash
   # Copy content from PRODUCTION_MIGRATION.sql
   # Or upload file and run:
   mysql -u your_user -p your_database < PRODUCTION_MIGRATION.sql
   ```

3. **Verify columns added:**

   ```sql
   DESCRIBE wpos_wpdatatable_24;
   DESCRIBE wpos_zoom_links;
   ```

4. **Check for errors:**
   - If any errors, restore backup immediately
   - If successful, continue

✅ **Database Updated!**

---

### **STEP 2: Deploy Application** (10 min)

1. **Build the application:**

   ```bash
   npm run build
   ```

2. **Upload to production server:**

   - Upload all files
   - Or use git pull on server
   - Or deploy via your hosting panel

3. **Install dependencies on server:**

   ```bash
   npm install --production
   ```

4. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

✅ **Application Deployed!**

---

### **STEP 3: Environment Variables** (5 min)

**Add to production `.env` file:**

```env
# Existing variables (keep these)
DATABASE_URL="your_production_database_url"
NEXTAUTH_SECRET="your_nextauth_secret"
TELEGRAM_BOT_TOKEN="your_telegram_token"

# NEW - Add these for Zoom integration:
ZOOM_CLIENT_ID="90mSlusxQYeE6XhZUEnXBQ"
ZOOM_CLIENT_SECRET="kFb4M5moYdhY4jYdbBWe1E7W2oiWEJbH"
ZOOM_ACCOUNT_ID="your_account_id_from_zoom_marketplace"
ZOOM_REDIRECT_URI="https://exam.darelkubra.com/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="EXR7JH5pR3S2I9Rdofqf1A"
NEXTAUTH_URL="https://exam.darelkubra.com"
```

⚠️ **Important:**

- Replace `exam.darelkubra.com` with your actual domain
- Get `ZOOM_ACCOUNT_ID` from Zoom Marketplace (you need to create app first)

✅ **Environment Configured!**

---

### **STEP 4: Restart Production Server** (2 min)

```bash
# If using PM2:
pm2 restart all

# If using systemd:
sudo systemctl restart your-app

# If using Docker:
docker-compose restart
```

✅ **Server Restarted!**

---

### **STEP 5: Zoom Marketplace Configuration** (20 min)

**Follow `SETUP_GUIDE.md` - Part 1**

Quick summary:

1. Go to https://marketplace.zoom.us/
2. Create "Server-to-Server OAuth" app
3. Get 3 credentials (Account ID, Client ID, Secret)
4. Add 3 scopes (meeting:write, meeting:read, user:read)
5. Configure Event Subscriptions:
   - URL: `https://exam.darelkubra.com/api/zoom/webhooks`
   - Add 4 events (started, ended, joined, left)
6. Activate app
7. Update `.env` with Account ID
8. Restart server

✅ **Zoom OAuth Configured!**

---

### **STEP 6: Test Manual Method** (5 min)

1. **Login as teacher:** https://exam.darelkubra.com/login

2. **Go to "My Students"**

3. **Click a student**

4. **Test manual link:**

   - Create Zoom meeting manually
   - Paste link
   - Click "Send"
   - Check student receives Telegram message

5. **Verify in database:**
   ```sql
   SELECT * FROM wpos_zoom_links ORDER BY sent_time DESC LIMIT 1;
   ```

✅ **Manual Method Working!**

---

### **STEP 7: Test OAuth Connection** (5 min)

1. **Login as teacher**

2. **Look for yellow banner:** "Connect Your Zoom Account"

3. **Click "Connect Zoom Account"**

4. **Login to Zoom and authorize**

5. **Verify in database:**
   ```sql
   SELECT ustazid, zoom_user_id, zoom_connected_at
   FROM wpos_wpdatatable_24
   WHERE ustazid = 'TEST_TEACHER_ID';
   ```
   Should show populated values

✅ **OAuth Working!**

---

### **STEP 8: Test Auto-Create** (5 min)

1. **Login as connected teacher**

2. **Click student**

3. **Click "🤖 Auto-Create Zoom"**

4. **Should see:** "✅ Auto-Created Meeting Ready!"

5. **Click "Start Class"**

6. **Verify:**
   - Zoom app opens for teacher
   - Student receives Telegram notification

✅ **Auto-Create Working!**

---

### **STEP 9: Test Duration Tracking** (10 min)

1. **Create auto-meeting**

2. **Teacher and student join Zoom**

3. **Stay for 2-3 minutes**

4. **Both leave meeting**

5. **Check database:**

   ```sql
   SELECT
     zoom_meeting_id,
     teacher_duration_minutes,
     student_duration_minutes,
     session_status
   FROM wpos_zoom_links
   WHERE zoom_meeting_id IS NOT NULL
   ORDER BY sent_time DESC
   LIMIT 1;
   ```

6. **Check admin dashboard:**
   - Go to Admin → Teaching Durations
   - Should show meeting with durations

✅ **Duration Tracking Working!**

---

## ✅ DEPLOYMENT COMPLETE VERIFICATION

**Check all these:**

- [ ] Database migration successful (no errors)
- [ ] Application deployed and running
- [ ] Environment variables set correctly
- [ ] Server restarted
- [ ] Manual method works (teacher can send links)
- [ ] Students receive Telegram notifications
- [ ] OAuth connection available (yellow banner shows)
- [ ] Teachers can connect Zoom
- [ ] Auto-create creates meetings
- [ ] Teacher's Zoom opens on "Start Class"
- [ ] Duration tracking records data
- [ ] Admin can view teaching durations
- [ ] No errors in server logs

---

## 🚨 IF SOMETHING FAILS

### Database Migration Failed?

**Restore backup immediately:**

```bash
mysql -u your_user -p your_database < backup_before_zoom_migration.sql
```

Then troubleshoot the error and try again.

### Application Won't Start?

**Check logs:**

```bash
pm2 logs --lines 100
```

Look for errors related to:

- Database connection
- Missing environment variables
- Prisma client errors

### Manual Method Not Working?

**Check:**

- Telegram bot token correct
- Student has chatId in database
- No errors in logs

### OAuth Not Working?

**Check:**

- All environment variables set
- Server restarted after adding variables
- Zoom Marketplace app is activated

---

## 📊 POST-DEPLOYMENT MONITORING

### Day 1:

- [ ] Monitor server logs for errors
- [ ] Test with 2-3 teachers
- [ ] Verify Telegram notifications working
- [ ] Check database for new zoom_links records

### Week 1:

- [ ] Monitor duration tracking accuracy
- [ ] Check webhook events firing
- [ ] Verify teaching hours dashboard
- [ ] Gather teacher feedback

---

## 🎯 DEPLOYMENT ORDER

```
1. Backup database ✅
2. Run SQL migration ✅
3. Deploy application code ✅
4. Update .env file ✅
5. Restart server ✅
6. Configure Zoom OAuth ✅
7. Test manual method ✅
8. Test OAuth connection ✅
9. Test auto-create ✅
10. Monitor for 24 hours ✅
```

---

**Time Required:** 1-2 hours total  
**Difficulty:** Medium  
**Risk:** Low (manual method always works as fallback)

---

**Ready to deploy? Start with database backup!** 🚀
