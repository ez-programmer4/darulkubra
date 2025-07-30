import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List all permission reasons
export async function GET() {
  const reasons = await prisma.permissionReason.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(reasons);
}

// POST: Add a new permission reason
export async function POST(req: NextRequest) {
  try {
    const { reason } = await req.json();
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Reason is required." },
        { status: 400 }
      );
    }
    // Check uniqueness
    const exists = await prisma.permissionReason.findFirst({
      where: { reason },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Reason already exists." },
        { status: 409 }
      );
    }
    const created = await prisma.permissionReason.create({ data: { reason } });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Edit an existing permission reason
export async function PUT(req: NextRequest) {
  try {
    const { id, reason } = await req.json();
    if (!id || !reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "ID and reason are required." },
        { status: 400 }
      );
    }
    // Check uniqueness
    const exists = await prisma.permissionReason.findFirst({
      where: { reason },
    });
    if (exists && exists.id !== id) {
      return NextResponse.json(
        { error: "Reason already exists." },
        { status: 409 }
      );
    }
    const updated = await prisma.permissionReason.update({
      where: { id },
      data: { reason },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Remove a permission reason
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }
    await prisma.permissionReason.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
