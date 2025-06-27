// src/app/api/test-sms/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Replace with your actual values
  const identifierId = process.env.AFROMSG_IDENTIFIER_ID!;
  const sender = process.env.AFROMSG_SENDER!;
  const to = req.nextUrl.searchParams.get("to") || ""; // e.g. "+2519xxxxxxx"
  const message =
    req.nextUrl.searchParams.get("message") ||
    "Test message from AfroMessage API!";
  const callback = ""; // Optional

  if (!to) {
    return NextResponse.json(
      { error: "Missing 'to' phone number" },
      { status: 400 }
    );
  }

  const url = `https://api.afromessage.com/api/send?from=${encodeURIComponent(
    identifierId
  )}&sender=${encodeURIComponent(sender)}&to=${encodeURIComponent(
    to
  )}&message=${encodeURIComponent(message)}${
    callback ? `&callback=${encodeURIComponent(callback)}` : ""
  }`;

  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    return NextResponse.json({ status: res.status, response: text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
