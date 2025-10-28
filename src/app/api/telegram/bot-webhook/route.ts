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
}

export async function POST(req: NextRequest) {
  try {
    console.log("🤖 Webhook received request");
    const update: TelegramUpdate = await req.json();
    console.log("📝 Update data:", JSON.stringify(update, null, 2));

    // Only handle messages (not callbacks, etc.)
    if (!update.message || !update.message.text) {
      console.log("❌ No message or text found");
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id.toString();
    const messageText = update.message.text.trim();
    const firstName = update.message.from.first_name;

    console.log(
      `🤖 Bot received message from ${firstName} (${chatId}): ${messageText}`
    );

    // Handle /myprogress command
    if (messageText === "/myprogress") {
      await handleMyProgressCommand(chatId, firstName);
    } else if (messageText === "/start") {
      await handleStartCommand(chatId, firstName);
    } else {
      // Unknown command - send help
      await sendHelpMessage(chatId, firstName);
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

I'm here to help you with your studies. Here's what you can do:

📊 **View Your Progress**
Use /myprogress to see your attendance, test results, and learning progress.

📚 **Join Classes**
Your teacher will send you zoom links for online classes.

❓ **Need Help?**
Type /help anytime for assistance.

*May Allah bless your learning journey*`;

  await sendTelegramMessage(botToken, chatId, message);
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
  const miniAppUrl = `https://presphenoid-mixable-minh.ngrok-free.dev/student/mini-app/${chatId}`;

  const message = `📊 **Your Progress Dashboard**

Hello ${student.name}! 

Click the button below to view your:
• 📅 Attendance records
• 📝 Test results  
• 🎓 Terbia learning progress
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
            text: "📱 Open My Progress",
            web_app: { url: miniAppUrl },
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

  const message = `❓ **Help - Available Commands**

Hello ${firstName}! Here are the commands you can use:

📊 **/myprogress** - View your learning progress
🎓 **/start** - Welcome message and instructions

**Need more help?**
Contact your teacher or the school administration.

*May Allah bless your learning journey*`;

  await sendTelegramMessage(botToken, chatId, message);
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
