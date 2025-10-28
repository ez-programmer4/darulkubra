# Telegram Bot Setup Guide

## 🤖 Bot Integration Implementation

This implementation adds interactive bot commands to the existing zoom link functionality.

### ✅ What's Implemented:

1. **Bot Webhook Endpoint**: `/api/telegram/bot-webhook`
2. **Student Mini App API**: `/api/student/mini-app/[chatId]`
3. **Student Mini App Page**: `/student/mini-app/[chatId]`
4. **Bot Commands**: `/start`, `/myprogress`, `/help`

### 🔧 Setup Instructions:

#### 1. Set Environment Variables:

```bash
# Add to your .env file
TELEGRAM_BOT_TOKEN=your_bot_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

#### 2. Set Bot Webhook:

```bash
# Replace YOUR_BOT_TOKEN with your actual bot token
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000/api/telegram/bot-webhook"}'
```

#### 3. Verify Webhook:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

### 📱 How It Works:

1. **Student sends `/myprogress`** in Telegram
2. **Bot checks** if student exists and is active
3. **Bot sends** mini app button with progress data
4. **Student clicks** button to open web app
5. **Web app shows** attendance, tests, terbia progress

### 🎯 Bot Commands:

- **`/start`** - Welcome message and instructions
- **`/myprogress`** - Opens student progress mini app
- **`/help`** - Shows available commands
- **Any other message** - Shows help

### 🔒 Security:

- **Chat ID Authentication**: Only works with registered student chat IDs
- **Active Status Check**: Only active students can access data
- **No Sensitive Data**: Only shows essential progress information

### 📊 Data Shown in Mini App:

- **Quick Stats**: Attendance %, Zoom sessions, Tests, Terbia progress
- **Attendance**: Present/absent days, recent attendance history
- **Test Results**: Recent test scores and pass/fail status
- **Terbia Progress**: Course completion percentage and chapters
- **Zoom Sessions**: Recent class sessions with teachers

### 🚀 Testing:

1. **Test Bot Commands**:

   - Send `/start` to bot
   - Send `/myprogress` to bot
   - Send random message to bot

2. **Test Mini App**:
   - Click "Open My Progress" button
   - Verify data loads correctly
   - Test on mobile device

### 🔄 Existing Functionality Preserved:

- ✅ **Zoom Link Sending**: Teachers can still send zoom links
- ✅ **Meeting Notifications**: Students still get class notifications
- ✅ **All Current Features**: Nothing is broken or changed

### 📝 Notes:

- **Mobile Optimized**: Mini app works perfectly on mobile
- **Offline Capable**: Can be enhanced with service worker
- **Real-time Data**: Always shows latest information
- **Simple Interface**: Easy for students to understand

The bot now provides a complete student experience while maintaining all existing teacher functionality!
