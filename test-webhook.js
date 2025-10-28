// Test webhook by sending a message directly
const BOT_TOKEN = "8493303302:AAGU6N9F7WaXX7gMVVXd2jnZUMO72rL7wFU";

async function testWebhook() {
  console.log("🤖 Testing webhook by sending a test message...");

  // Send a test message to get updates
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "YOUR_CHAT_ID", // You need to replace this
          text: "Test message to check webhook",
        }),
      }
    );

    const result = await response.json();
    console.log("Message sent:", result.ok ? "Success" : "Failed");
    if (!result.ok) {
      console.log("Error:", result.description);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// First, let's try to get updates without sending a message
async function checkUpdates() {
  try {
    console.log("🔍 Checking for updates...");
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    const result = await response.json();

    console.log("Updates found:", result.result ? result.result.length : 0);
    if (result.result && result.result.length > 0) {
      console.log(
        "Latest update:",
        JSON.stringify(result.result[result.result.length - 1], null, 2)
      );
    }
  } catch (error) {
    console.error("Error checking updates:", error.message);
  }
}

checkUpdates();
