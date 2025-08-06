import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Fallback secret for development if NEXTAUTH_SECRET is not set
    const secret =
      process.env.NEXTAUTH_SECRET || "fallback-secret-for-development";

    const session = await getToken({
      req,
      secret,
    });

    if (!session) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Session error" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const searchQuery = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";

    const offset = (page - 1) * limit;

    const baseQueryArgs = {
      skip: offset,
      take: limit,
    };

    const whereClause = searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery } },
            { username: { contains: searchQuery } },
          ],
        }
      : {};

    const whereClauseTeacher = searchQuery
      ? {
          ustazname: { contains: searchQuery },
        }
      : {};

    const userQueries = [
      roleFilter === "admin" || !roleFilter
        ? prisma.admin.findMany({ ...baseQueryArgs, where: whereClause })
        : prisma.admin.findMany({ where: { id: "nonexistent" } }),
      roleFilter === "controller" || !roleFilter
        ? prisma.wpos_wpdatatable_28.findMany({
            ...baseQueryArgs,
            where: whereClause,
            select: {
              wdt_ID: true,
              name: true,
              username: true,
              code: true,
            },
          })
        : prisma.wpos_wpdatatable_28.findMany({ where: { wdt_ID: -1 } }),
      roleFilter === "teacher" || !roleFilter
        ? prisma.wpos_wpdatatable_24.findMany({
            ...baseQueryArgs,
            where: whereClauseTeacher,
            select: {
              ustazid: true,
              ustazname: true,
              phone: true,
              control: true,
              schedule: true,
            },
          })
        : prisma.wpos_wpdatatable_24.findMany({ where: { ustazid: "-1" } }),
      roleFilter === "registral" || !roleFilter
        ? prisma.wpos_wpdatatable_33.findMany({
            ...baseQueryArgs,
            where: whereClause,
          })
        : prisma.wpos_wpdatatable_33.findMany({ where: { wdt_ID: -1 } }),
    ];

    const countQueries = [
      roleFilter === "admin" || !roleFilter
        ? prisma.admin.count({ where: whereClause })
        : Promise.resolve(0),
      roleFilter === "controller" || !roleFilter
        ? prisma.wpos_wpdatatable_28.count({ where: whereClause })
        : Promise.resolve(0),
      roleFilter === "teacher" || !roleFilter
        ? prisma.wpos_wpdatatable_24.count({ where: whereClauseTeacher })
        : Promise.resolve(0),
      roleFilter === "registral" || !roleFilter
        ? prisma.wpos_wpdatatable_33.count({ where: whereClause })
        : Promise.resolve(0),
    ];

    const [admins, controllers, teachers, registrars] =
      await prisma.$transaction(userQueries);

    const [adminCount, controllerCount, teacherCount, registralCount] =
      await Promise.all(countQueries);

    type Admin = { id: string; name: string; username: string | null };
    type Controller = {
      wdt_ID: number;
      name: string;
      username: string;
      code: string;
    };
    type Teacher = { ustazid: string; ustazname: string; phone?: string };
    type Registral = { wdt_ID: number; name: string; username: string };

    const users = [
      ...(admins as Admin[]).map((u) => ({
        ...u,
        id: u.id.toString(),
        role: "admin" as const,
      })),
      ...(controllers as Controller[]).map((u) => ({
        ...u,
        id: u.code || u.wdt_ID.toString(),
        role: "controller" as const,
      })),
      ...(teachers as any[]).map((u) => ({
        id: u.ustazid,
        name: u.ustazname,
        phone: u.phone || "",
        controlId: u.control || "",
        schedule: u.schedule || "",
        role: "teacher" as const,
      })),
      ...(registrars as Registral[]).map((u) => ({
        ...u,
        id: u.wdt_ID.toString(),
        role: "registral" as const,
      })),
    ];

    const total = adminCount + controllerCount + teacherCount + registralCount;

    return NextResponse.json({
      users,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Admin users API error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reqBody = await req.json();
    const {
      role,
      name,
      username,
      password,
      controlId,
      schedule = "",
      phone = "",
    } = reqBody;

    if (!role || !name || (role !== "teacher" && !username) || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser;

    switch (role) {
      case "admin":
        newUser = await prisma.admin.create({
          data: { name, username, passcode: hashedPassword },
        });
        break;
      case "controller":
        // Note: 'code' is a required field for controllers
        const code = username.toUpperCase() + "CODE";
        newUser = await prisma.wpos_wpdatatable_28.create({
          data: { name, username, password: hashedPassword, code },
        });
        break;
      case "teacher":
        // Validate controlId is not empty, "0", or 0
        if (
          !controlId ||
          controlId === "0" ||
          controlId === 0 ||
          controlId === ""
        ) {
          return NextResponse.json(
            { error: "Controller is required" },
            { status: 400 }
          );
        }

        // Convert controlId to string and validate it's not just whitespace
        const controlIdStr = String(controlId).trim();
        if (!controlIdStr) {
          return NextResponse.json(
            { error: "Controller is required" },
            { status: 400 }
          );
        }

        // Validate controller exists by code and get its ID
        const controller = await prisma.wpos_wpdatatable_28.findUnique({
          where: { code: controlIdStr },
        });
        if (!controller) {
          return NextResponse.json(
            { error: "Controller not found" },
            { status: 404 }
          );
        }
        const ustazid = name.toLowerCase().replace(/\s+/g, "") + Date.now();

        newUser = await prisma.wpos_wpdatatable_24.create({
          data: {
            ustazid,
            ustazname: name,
            schedule,
            control: controlIdStr,
            phone,
            password: hashedPassword,
          },
        });
        break;
      case "registral":
        newUser = await prisma.wpos_wpdatatable_33.create({
          data: { name, username, password: hashedPassword },
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid user role" },
          { status: 400 }
        );
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("Admin users POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reqBody = await req.json();
    const {
      id,
      role,
      name,
      username,
      password,
      controlId,
      schedule = "",
      phone = "",
    } = reqBody;

    if (!id || !role || !name || (role !== "teacher" && !username)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const data: {
      name: string;
      username?: string;
      passcode?: string;
      password?: string;
      schedule?: string;
      control?: string;
      phone?: string;
    } = {
      name,
    };
    if (username) data.username = username;
    if (password) {
      if (role === "admin") {
        data.passcode = await bcrypt.hash(password, 10);
      } else {
        data.password = await bcrypt.hash(password, 10);
      }
    }

    let updatedUser;

    switch (role) {
      case "admin":
        updatedUser = await prisma.admin.update({
          where: { id: String(id) },
          data,
        });
        break;
      case "controller":
        updatedUser = await prisma.wpos_wpdatatable_28.update({
          where: { wdt_ID: Number(id) },
          data,
        });
        break;
      case "teacher":
        // Validate controlId is not empty, "0", or 0
        if (
          !controlId ||
          controlId === "0" ||
          controlId === 0 ||
          controlId === ""
        ) {
          return NextResponse.json(
            { error: "Controller is required" },
            { status: 400 }
          );
        }

        // Convert controlId to string and validate it's not just whitespace
        const controlIdStr = String(controlId).trim();
        if (!controlIdStr) {
          return NextResponse.json(
            { error: "Controller is required" },
            { status: 400 }
          );
        }

        // Validate controller exists by code and get its ID
        const controller = await prisma.wpos_wpdatatable_28.findUnique({
          where: { code: controlIdStr },
        });
        if (!controller) {
          return NextResponse.json(
            { error: "Controller not found" },
            { status: 404 }
          );
        }
        updatedUser = await prisma.wpos_wpdatatable_24.update({
          where: { ustazid: String(id) },
          data: {
            ustazname: name,
            schedule,
            control: controlIdStr,
            phone,
          },
        });
        break;
      case "registral":
        updatedUser = await prisma.wpos_wpdatatable_33.update({
          where: { wdt_ID: Number(id) },
          data,
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid user role" },
          { status: 400 }
        );
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, role } = await req.json();

    if (!id || !role) {
      return NextResponse.json(
        { error: "Missing ID or role" },
        { status: 400 }
      );
    }

    switch (role) {
      case "admin":
        await prisma.admin.delete({ where: { id: String(id) } });
        break;
      case "controller":
        await prisma.wpos_wpdatatable_28.delete({
          where: { wdt_ID: Number(id) },
        });
        break;
      case "teacher":
        await prisma.wpos_wpdatatable_24.delete({
          where: { ustazid: String(id) },
        });
        break;
      case "registral":
        await prisma.wpos_wpdatatable_33.delete({
          where: { wdt_ID: Number(id) },
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid user role" },
          { status: 400 }
        );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
