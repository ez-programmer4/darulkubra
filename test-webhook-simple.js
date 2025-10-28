// Simple webhook test
const BOT_TOKEN = "8493303302:AAGU6N9F7WaXX7gMVVXd2jnZUMO72rL7wFU";

async function testWebhook() {
  const testData = {
    update_id: 1,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        first_name: "Test",
        is_bot: false,
      },
      chat: {
        id: 123456789,
        type: "private",
      },
      date: Math.floor(Date.now() / 1000),
      text: "/start",
    },
  };

  try {
    console.log(
      "🧪 Testing webhook with data:",
      JSON.stringify(testData, null, 2)
    );

    const response = await fetch(
      "https://presphenoid-mixable-minh.ngrok-free.dev/api/telegram/bot-webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      }
    );

    console.log("📊 Response status:", response.status);
    console.log(
      "📊 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("📊 Response body:", responseText);

    if (!response.ok) {
      console.error("❌ Webhook failed with status:", response.status);
    } else {
      console.log("✅ Webhook test successful!");
    }
  } catch (error) {
    console.error("❌ Error testing webhook:", error.message);
  }
}

testWebhook();
