import { NextRequest, NextResponse } from "next/server";

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

    // All bot functionality is handled by BotFather mini app configuration
    // No message handling needed - start message is handled by another system

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
