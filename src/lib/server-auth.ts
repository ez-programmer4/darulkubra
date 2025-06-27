import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

export interface User {
  id: number;
  username: string;
  name: string;
  role: "controller" | "registral" | "admin";
  code?: string;
}

export async function generateToken(user: User) {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    code: user.code || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Validate required fields
    if (!payload.id || !payload.username || !payload.name || !payload.role) {
      console.error("Missing required fields in token payload");
      return null;
    }

    // Validate role
    if (
      payload.role !== "controller" &&
      payload.role !== "registral" &&
      payload.role !== "admin"
    ) {
      console.error("Invalid role in token payload");
      return null;
    }

    return {
      id: payload.id as number,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as "controller" | "registral" | "admin",
      code: payload.code as string | undefined,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function getAuthUser(): Promise<User | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  try {
    // Try to find user in controllers table
    let user: any = await prisma.wpos_wpdatatable_28.findFirst({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        name: true,
        code: true,
      },
    });
    let role: "controller" | "registral" | "admin" | null = null;
    let code = "";

    if (user) {
      role = "controller";
      code = typeof user.code === "string" ? user.code : "";
    } else {
      // Try to find user in registrals table
      const registralUser = await prisma.wpos_wpdatatable_33.findFirst({
        where: { username },
        select: { id: true, username: true, password: true, name: true },
      });
      if (registralUser) {
        user = { ...registralUser, code: "" };
        role = "registral";
        code = "";
      } else {
        // Try to find user in admins table
        const adminUser = await prisma.admin.findFirst({
          where: { username },
          select: { id: true, username: true, password: true, name: true },
        });
        if (adminUser) {
          user = { ...adminUser, code: "" };
          role = "admin";
          code = "";
        }
      }
    }

    if (!user || !role) {
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role,
      code,
    };
  } catch (error) {
    return null;
  }
}
