# Testing Session Tracking on Localhost

## The Issue

Telegram Bot API doesn't allow `localhost` URLs in inline keyboard buttons.

Error: `"Bad Request: inline keyboard button URL 'http://localhost:3000/...' is invalid"`

## Solution

### Development Mode (localhost)

When running on localhost:

- ✅ Telegram sends **direct Zoom link** (works!)
- ✅ Message includes wrapper URL for manual testing
- 🔧 Copy wrapper URL and test it manually

### Production Mode

When deployed (e.g., `https://exam.darelkubra.com`):

- ✅ Telegram sends **wrapper URL** automatically
- ✅ Full tracking works seamlessly
- ✅ Students click → wrapper → join → tracking

## How to Test Locally

1. **Send link as teacher**
   - Telegram will send direct Zoom link (because localhost)
2. **Check the message**
   - You'll see: "🔧 Development Mode: To test wrapper, visit: http://localhost:3000/join-session/TOKEN123"
3. **Copy the wrapper URL**
   - Copy: `http://localhost:3000/join-session/TOKEN123`
4. **Open in browser**
   - Visit the URL manually
   - You should see the wrapper page
5. **Click "Join Meeting"**
   - Zoom opens in new tab
   - Join time logged
6. **Close the wrapper page**
   - Exit time logged
   - Duration calculated
7. **Check admin dashboard**
   - Visit: `http://localhost:3000/admin/session-durations`
   - Should see the session with duration

## Summary

**Localhost:** Direct Zoom link (manual wrapper testing via copied URL)

**Production:** Wrapper URL (automatic tracking for all students)

This is normal - Telegram's security restriction! 🔒
