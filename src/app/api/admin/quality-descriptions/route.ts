import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const QualityDescriptionSchema = z.object({
  type: z.enum(["positive", "negative"]),
  description: z.string().min(2),
});

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || (session.role !== "admin" && session.role !== "controller")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const where = type ? { type } : {};
  const descriptions = await prisma.qualitydescription.findMany({
    where,
    orderBy: { updatedAt: "asc" },
  });
  return NextResponse.json(descriptions);
}

export async function POST(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parse = QualityDescriptionSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parse.error.issues },
      { status: 400 }
    );
  }
  const { type, description } = parse.data;
  // Do NOT set createdBy at all
  const created = await prisma.qualitydescription.create({
    data: {
      type,
      description,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, type, description } = body;
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  const parse = QualityDescriptionSchema.safeParse({ type, description });
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parse.error.issues },
      { status: 400 }
    );
  }
  const updated = await prisma.qualitydescription.update({
    where: { id: Number(id) },
    data: { type, description },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  await prisma.qualitydescription.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
