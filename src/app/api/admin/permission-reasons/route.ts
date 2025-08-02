import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET: List all permission reasons
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const reasons = await prisma.permissionreason.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(reasons);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Add a new permission reason
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { reason } = await req.json();
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Reason is required." },
        { status: 400 }
      );
    }
    // Check uniqueness
    const exists = await prisma.permissionreason.findFirst({
      where: { reason },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Reason already exists." },
        { status: 409 }
      );
    }
    const created = await prisma.permissionreason.create({ data: { reason } });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Edit an existing permission reason
export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, reason } = await req.json();
    if (!id || !reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "ID and reason are required." },
        { status: 400 }
      );
    }
    // Check uniqueness
    const exists = await prisma.permissionreason.findFirst({
      where: { reason },
    });
    if (exists && exists.id !== id) {
      return NextResponse.json(
        { error: "Reason already exists." },
        { status: 409 }
      );
    }
    const updated = await prisma.permissionreason.update({
      where: { id },
      data: { reason },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a permission reason
export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }
    await prisma.permissionreason.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
