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
    console.log("🔍 Fetching permission reasons...");
    const reasons = await prisma.permissionreason.findMany({
      orderBy: { id: "asc" },
    });
    console.log("✅ Found permission reasons:", reasons);
    return NextResponse.json(reasons);
  } catch (error: any) {
    console.error("Error in GET permission-reasons:", error);
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
    console.log("➕ Adding permission reason:", reason);

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
      console.log("❌ Reason already exists:", reason);
      return NextResponse.json(
        { error: "Reason already exists." },
        { status: 409 }
      );
    }
    const created = await prisma.permissionreason.create({ data: { reason } });
    console.log("✅ Created permission reason:", created);
    return NextResponse.json(created);
  } catch (error: any) {
    console.error("❌ Error creating permission reason:", error);
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
    console.error("Error in PUT permission-reasons:", error);
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
    console.error("Error in DELETE permission-reasons:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
