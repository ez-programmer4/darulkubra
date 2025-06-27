import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/server-auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      console.log("No auth token found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Verifying token...");
    const user = await verifyToken(token);
    if (!user) {
      console.log("Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("Token verified, user:", user);
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
