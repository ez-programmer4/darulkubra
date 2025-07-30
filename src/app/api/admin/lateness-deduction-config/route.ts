import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const configs = await prisma.latenessDeductionConfig.findMany({
    orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
  });
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const config = await prisma.latenessDeductionConfig.create({ data: body });
  return NextResponse.json(config, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.id)
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  const config = await prisma.latenessDeductionConfig.update({
    where: { id: body.id },
    data: body,
  });
  return NextResponse.json(config);
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.latenessDeductionConfig.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
