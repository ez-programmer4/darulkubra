// Get your chat ID from Telegram bot
const BOT_TOKEN = "8493303302:AAGU6N9F7WaXX7gMVVXd2jnZUMO72rL7wFU";

async function getChatId() {
  try {
    console.log("🔍 Getting updates from bot...");
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    const result = await response.json();

    if (result.ok && result.result.length > 0) {
      console.log("📱 Found messages:");
      result.result.forEach((update, index) => {
        if (update.message) {
          console.log(`Message ${index + 1}:`);
          console.log(`  Chat ID: ${update.message.chat.id}`);
          console.log(
            `  From: ${update.message.from.first_name} ${
              update.message.from.last_name || ""
            }`
          );
          console.log(`  Text: ${update.message.text}`);
          console.log(
            `  Date: ${new Date(update.message.date * 1000).toLocaleString()}`
          );
          console.log("---");
        }
      });

      // Get the latest chat ID
      const latestMessage = result.result[result.result.length - 1];
      if (latestMessage.message) {
        const chatId = latestMessage.message.chat.id;
        console.log(`\n✅ Latest Chat ID: ${chatId}`);
        console.log(
          `Update your test script with: const CHAT_ID = "${chatId}";`
        );
      }
    } else {
      console.log("❌ No messages found. Send a message to your bot first!");
      console.log("Bot username: @darulkubra_test_bot");
    }
  } catch (error) {
    console.error("❌ Error getting chat ID:", error.message);
  }
}

getChatId();
