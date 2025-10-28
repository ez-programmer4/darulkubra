// Test Telegram Bot Script
// Run with: node test-bot.js

const BOT_TOKEN = "8493303302:AAGU6N9F7WaXX7gMVVXd2jnZUMO72rL7wFU";
const CHAT_ID = "YOUR_CHAT_ID"; // Replace with your Telegram chat ID

async function testBot() {
  console.log("🤖 Testing Telegram Bot...");

  // Test 1: Send /start message
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: "🎓 **Assalamu Alaikum!**\n\nWelcome to Darulkubra Online Learning!\n\nI'm here to help you with your studies. Here's what you can do:\n\n📊 **View Your Progress**\nUse /myprogress to see your attendance, test results, and learning progress.\n\n📚 **Join Classes**\nYour teacher will send you zoom links for online classes.\n\n❓ **Need Help?**\nType /help anytime for assistance.\n\n*May Allah bless your learning journey*",
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await response.json();
    console.log("✅ /start message sent:", result.ok ? "Success" : "Failed");
  } catch (error) {
    console.error("❌ Error sending /start:", error.message);
  }

  // Test 2: Send /myprogress message with mini app button
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: "📊 **Your Progress Dashboard**\n\nHello Student!\n\nClick the button below to view your:\n• 📅 Attendance records\n• 📝 Test results\n• 🎓 Terbia learning progress\n• 📈 Performance statistics\n\n*Your data is always up-to-date*",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📱 Open My Progress",
                  web_app: {
                    url: "https://presphenoid-mixable-minh.ngrok-free.dev/student/mini-app/test",
                  },
                },
              ],
            ],
          },
        }),
      }
    );

    const result = await response.json();
    console.log(
      "✅ /myprogress message sent:",
      result.ok ? "Success" : "Failed"
    );
  } catch (error) {
    console.error("❌ Error sending /myprogress:", error.message);
  }
}

// Get your chat ID first
async function getChatId() {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    const result = await response.json();

    if (result.ok && result.result.length > 0) {
      const chatId = result.result[0].message.chat.id;
      console.log("📱 Your Chat ID:", chatId);
      console.log("Update the CHAT_ID variable in this script with:", chatId);
    } else {
      console.log("❌ No messages found. Send a message to your bot first!");
    }
  } catch (error) {
    console.error("❌ Error getting chat ID:", error.message);
  }
}

// Run the test
console.log("Choose an option:");
console.log("1. Get your chat ID");
console.log("2. Test bot messages (update CHAT_ID first)");
console.log("");

// For now, just get chat ID
getChatId();
