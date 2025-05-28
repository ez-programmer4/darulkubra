//api/auth/login/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { comparePassword, generateToken } from "../../../../../lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.wpos_wpdatatable_33.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      username: user.username,
    });

    const response = NextResponse.json(
      { message: "Login successful" },
      { status: 200 }
    );
    response.cookies.set("authToken", token, {
      httpOnly: true,
      path: "/",
      maxAge: 3600,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Error during login" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
