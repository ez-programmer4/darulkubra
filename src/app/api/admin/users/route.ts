import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUser } from "@/lib/server-auth";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        : prisma.admin.findMany({ where: { id: -1 } }),
      roleFilter === "controller" || !roleFilter
        ? prisma.wpos_wpdatatable_28.findMany({
            ...baseQueryArgs,
            where: whereClause,
          })
        : prisma.wpos_wpdatatable_28.findMany({ where: { id: -1 } }),
      roleFilter === "teacher" || !roleFilter
        ? prisma.wpos_wpdatatable_24.findMany({
            ...baseQueryArgs,
            where: whereClauseTeacher,
            select: { ustazid: true, ustazname: true },
          })
        : prisma.wpos_wpdatatable_24.findMany({ where: { ustazid: "-1" } }),
      roleFilter === "registral" || !roleFilter
        ? prisma.wpos_wpdatatable_33.findMany({
            ...baseQueryArgs,
            where: whereClause,
          })
        : prisma.wpos_wpdatatable_33.findMany({ where: { id: -1 } }),
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

    type Admin = { id: number; name: string; username: string };
    type Controller = { id: number; name: string; username: string };
    type Teacher = { ustazid: string; ustazname: string };
    type Registral = { id: number; name: string; username: string };

    const users = [
      ...(admins as Admin[]).map((u) => ({
        ...u,
        id: u.id.toString(),
        role: "admin" as const,
      })),
      ...(controllers as Controller[]).map((u) => ({
        ...u,
        id: u.id.toString(),
        role: "controller" as const,
      })),
      ...(teachers as Teacher[]).map((u) => ({
        id: u.ustazid,
        name: u.ustazname,
        role: "teacher" as const,
      })),
      ...(registrars as Registral[]).map((u) => ({
        ...u,
        id: u.id.toString(),
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
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { role, name, username, password } = await req.json();

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
          data: { name, username, password: hashedPassword },
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
        // Teachers have ustazid and ustazname, no username
        const ustazid = name.toLowerCase().replace(/\s+/g, "") + Date.now();
        newUser = await prisma.wpos_wpdatatable_24.create({
          data: { ustazid, ustazname: name, schedule: "", controlId: user.id },
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
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, role, name, username, password } = await req.json();

    if (!id || !role || !name || (role !== "teacher" && !username)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const data: { name: string; username?: string; password?: string } = {
      name,
    };
    if (username) data.username = username;
    if (password) data.password = await bcrypt.hash(password, 10);

    let updatedUser;

    switch (role) {
      case "admin":
        updatedUser = await prisma.admin.update({
          where: { id: Number(id) },
          data,
        });
        break;
      case "controller":
        updatedUser = await prisma.wpos_wpdatatable_28.update({
          where: { id: Number(id) },
          data,
        });
        break;
      case "teacher":
        updatedUser = await prisma.wpos_wpdatatable_24.update({
          where: { ustazid: String(id) },
          data: { ustazname: name },
        });
        break;
      case "registral":
        updatedUser = await prisma.wpos_wpdatatable_33.update({
          where: { id: Number(id) },
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
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "admin") {
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
        await prisma.admin.delete({ where: { id: Number(id) } });
        break;
      case "controller":
        await prisma.wpos_wpdatatable_28.delete({ where: { id: Number(id) } });
        break;
      case "teacher":
        await prisma.wpos_wpdatatable_24.delete({
          where: { ustazid: String(id) },
        });
        break;
      case "registral":
        await prisma.wpos_wpdatatable_33.delete({ where: { id: Number(id) } });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid user role" },
          { status: 400 }
        );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
