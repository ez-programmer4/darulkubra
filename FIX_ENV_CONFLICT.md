# 🔧 Fix .env Merge Conflict

## ❌ The Problem:

`.env` file has merge conflict when pulling from git

## ✅ QUICK FIX (Copy Your Values):

### **Step 1: Save Your Current .env Values**

**In Putty, run:**

```bash
cat .env > .env.backup
```

This saves your current environment variables!

---

### **Step 2: Abort the Merge**

```bash
git merge --abort
```

This cancels the conflicted merge.

---

### **Step 3: Ignore .env File** (Important!)

**Make sure .env is in .gitignore:**

```bash
# Check if .env is ignored
grep "^\.env$" .gitignore

# If not there, add it:
echo ".env" >> .gitignore
```

---

### **Step 4: Remove .env from Git Tracking**

```bash
git rm --cached .env
git commit -m "Remove .env from git tracking"
git push
```

This removes .env from git while keeping the file on your server.

---

### **Step 5: Pull Changes Again**

```bash
git pull origin main
```

Should work now!

---

### **Step 6: Update Your .env File**

**Open your backed up values:**

```bash
cat .env.backup
```

**Merge with new values needed. Your production .env should have:**

```env
# Database
DATABASE_URL="your_production_database_url"

# NextAuth
NEXTAUTH_SECRET="your_production_secret"
NEXTAUTH_URL="https://exam.darelkubra.com"

# Telegram
TELEGRAM_BOT_TOKEN="your_telegram_token"

# Zoom OAuth (NEW - add these)
ZOOM_CLIENT_ID="90mSlusxQYeE6XhZUEnXBQ"
ZOOM_CLIENT_SECRET="kFb4M5moYdhY4jYdbBWe1E7W2oiWEJbH"
ZOOM_ACCOUNT_ID="your_account_id_from_marketplace"
ZOOM_REDIRECT_URI="https://exam.darelkubra.com/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="EXR7JH5pR3S2I9Rdofqf1A"
```

**Edit .env file:**

```bash
nano .env
# or
vim .env
```

Paste the complete configuration above (with your actual values).

Save and exit.

---

### **Step 7: Restart Your Application**

```bash
pm2 restart all
```

✅ **Done!**

---

## 🎯 ALTERNATIVE: Manual Conflict Resolution

**If you prefer to resolve the conflict manually:**

### **Step 1: See the conflict**

```bash
cat .env
```

**You'll see something like:**

```
<<<<<<< HEAD
YOUR_LOCAL_VALUES=xxx
=======
REMOTE_VALUES=yyy
>>>>>>> origin/main
```

### **Step 2: Edit the file**

```bash
nano .env
```

### **Step 3: Remove conflict markers**

- Delete `<<<<<<< HEAD`
- Delete `=======`
- Delete `>>>>>>> origin/main`
- Keep BOTH sets of values (merge them manually)

### **Step 4: Save and commit**

```bash
git add .env
git commit -m "Resolve .env conflict"
```

**But this is NOT recommended! .env should not be in git!**

---

## ✅ RECOMMENDED APPROACH:

```bash
# 1. Save current .env
cp .env .env.backup

# 2. Abort merge
git merge --abort

# 3. Add .env to .gitignore
echo ".env" >> .gitignore

# 4. Remove from git
git rm --cached .env
git commit -m "Stop tracking .env file"
git push

# 5. Pull changes
git pull origin main

# 6. Restore your .env (with new Zoom vars added)
cp .env.backup .env
nano .env  # Add new ZOOM_* variables

# 7. Restart
pm2 restart all
```

---

## 🎯 What You Need in Production .env:

**Copy this template and fill in your values:**

```env
# ===========================================
# PRODUCTION ENVIRONMENT VARIABLES
# ===========================================

# Database Connection
DATABASE_URL="mysql://user:password@localhost:3306/database_name"

# Authentication
NEXTAUTH_SECRET="your_long_random_secret_string"
NEXTAUTH_URL="https://exam.darelkubra.com"

# Telegram Bot
TELEGRAM_BOT_TOKEN="123456:ABCdefGHIjklMNOpqrsTUVwxyz"

# Zoom Integration (NEW)
ZOOM_CLIENT_ID="90mSlusxQYeE6XhZUEnXBQ"
ZOOM_CLIENT_SECRET="kFb4M5moYdhY4jYdbBWe1E7W2oiWEJbH"
ZOOM_ACCOUNT_ID="____________________________"  # Get from Zoom Marketplace
ZOOM_REDIRECT_URI="https://exam.darelkubra.com/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="EXR7JH5pR3S2I9Rdofqf1A"
```

---

**Need help with any step? Let me know!**
