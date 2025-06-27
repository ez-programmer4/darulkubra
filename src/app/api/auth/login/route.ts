import { NextResponse } from "next/server";
import { authenticateUser, generateToken } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const { username, password, role } = await request.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: "Username, password, and role are required" },
        { status: 400 }
      );
    }

    if (role !== "controller" && role !== "registral" && role !== "admin") {
      return NextResponse.json(
        {
          error: "Invalid role. Must be 'controller', 'registral', or 'admin'",
        },
        { status: 400 }
      );
    }

    const user = await authenticateUser(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.role !== role) {
      return NextResponse.json(
        { error: "Invalid role for this user" },
        { status: 403 }
      );
    }

    const token = await generateToken(user);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          code: user.code,
        },
      },
      { status: 200 }
    );

    // Set the auth token cookie
    response.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
