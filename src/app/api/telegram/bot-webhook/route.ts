import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log("🤖 Webhook received request");
    const update: TelegramUpdate = await req.json();
    console.log("📝 Update data:", JSON.stringify(update, null, 2));

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Handle messages
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id.toString();
      const messageText = update.message.text.trim();
      const firstName = update.message.from.first_name;

      console.log(
        `🤖 Bot received message from ${firstName} (${chatId}): ${messageText}`
      );

      // Handle commands and menu options
      if (messageText === "/start") {
        await handleStartCommand(chatId, firstName);
      } else if (
        messageText === "/myprogress" ||
        messageText === "📊 My Progress"
      ) {
        await handleMyProgressCommand(chatId, firstName);
      } else if (messageText === "/help" || messageText === "❓ Help") {
        await sendHelpMessage(chatId, firstName);
      } else if (messageText === "🏠 Main Menu") {
        await handleStartCommand(chatId, firstName);
      } else if (messageText === "📱 Open Dashboard") {
        await handleMyProgressCommand(chatId, firstName);
      } else {
        // Unknown command - send help with menu
        await sendHelpMessage(chatId, firstName);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Bot webhook error:", error);
    console.error(
      "❌ Error details:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return NextResponse.json({ ok: true }); // Always return ok to prevent retries
  }
}

async function handleStartCommand(chatId: string, firstName: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const message = `🎓 **Assalamu Alaikum ${firstName}!**

Welcome to Darulkubra Online Learning!

I'm here to help you with your studies. Use the menu below to navigate:

📊 **View Your Progress** - See attendance, tests, and learning progress
📚 **Join Classes** - Your teacher will send zoom links
❓ **Get Help** - Need assistance? I'm here to help!

*May Allah bless your learning journey*`;

  const keyboard = {
    keyboard: [
      [{ text: "📊 My Progress" }, { text: "❓ Help" }],
      [{ text: "🏠 Main Menu" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true,
  };

  const requestPayload = {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      }
    );

    if (!response.ok) {
      console.error("Failed to send start message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending start message:", error);
  }
}

async function handleMyProgressCommand(chatId: string, firstName: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  // Check if student exists
  const student = await prisma.wpos_wpdatatable_23.findFirst({
    where: { chatId: chatId },
    select: {
      wdt_ID: true,
      name: true,
      status: true,
      package: true,
      daypackages: true,
    },
  });

  if (!student) {
    const message = `❌ **Student Not Found**

Sorry ${firstName}, I couldn't find your student record.

Please make sure:
• You're using the correct Telegram account
• Your account is linked to your student profile
• Contact your teacher if you need help

Type /help for more assistance.`;

    await sendTelegramMessage(botToken, chatId, message);
    return;
  }

  // Status check removed - allow all students to access mini app

  // Student found and active - send mini app button
  const miniAppUrl = `https://exam.darelkubra.com/student/mini-app/${chatId}`;

  const message = `📊 **Your Progress Dashboard**

Hello ${student.name}! 

Click the button below to view your:
• 📅 Attendance records
• 📝 Test results  
• 🎓 Terbia learning progress
• 💰 Payment details
• ⏰ Schedule times
• 📈 Performance statistics

*Your data is always up-to-date*`;

  const requestPayload = {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📱 Open Dashboard",
            web_app: { url: miniAppUrl },
          },
        ],
        [
          {
            text: "🔄 Refresh Data",
            callback_data: "refresh_progress",
          },
          {
            text: "❓ Help",
            callback_data: "help_progress",
          },
        ],
        [
          {
            text: "🏠 Main Menu",
            callback_data: "main_menu",
          },
        ],
      ],
    },
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      }
    );

    if (!response.ok) {
      console.error("Failed to send mini app message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending mini app message:", error);
  }
}

async function sendHelpMessage(chatId: string, firstName: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const message = `❓ **Help - How to Use the Bot**

Hello ${firstName}! Here's how to use your learning bot:

**📱 Quick Access:**
• Use the menu buttons below for instant access
• No need to type commands - just tap buttons!

**🎯 Main Features:**
• **📊 My Progress** - View your complete dashboard
• **❓ Help** - Get assistance anytime
• **🏠 Main Menu** - Return to main menu

**💡 Tips:**
• The menu stays visible for easy navigation
• Your dashboard shows real-time data
• Contact your teacher for account issues

**Need more help?**
Contact your teacher or the school administration.

*May Allah bless your learning journey*`;

  const keyboard = {
    keyboard: [
      [{ text: "📊 My Progress" }, { text: "❓ Help" }],
      [{ text: "🏠 Main Menu" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: true,
  };

  const requestPayload = {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      }
    );

    if (!response.ok) {
      console.error("Failed to send help message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending help message:", error);
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const chatId = callbackQuery.message?.chat.id.toString();
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;
  const firstName = callbackQuery.from.first_name;

  console.log(`🔄 Callback query from ${firstName}: ${data}`);

  // Answer the callback query to remove loading state
  await answerCallbackQuery(botToken, callbackQuery.id);

  if (!chatId) return;

  switch (data) {
    case "refresh_progress":
      await handleMyProgressCommand(chatId, firstName);
      break;
    case "help_progress":
      await sendHelpMessage(chatId, firstName);
      break;
    case "main_menu":
      await handleStartCommand(chatId, firstName);
      break;
    default:
      console.log(`Unknown callback data: ${data}`);
  }
}

async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string
) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || "✅ Done!",
          show_alert: false,
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to answer callback query:", await response.text());
    }
  } catch (error) {
    console.error("Error answering callback query:", error);
  }
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to send Telegram message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}
