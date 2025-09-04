import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";

// TODO: Add real authentication/authorization middleware

// GET: Fetch all permission requests for a teacher
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role === "teacher" && user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const teacherId = params.id;
    const records = await prisma.permissionrequest.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const PermissionRequestSchema = z.object({
  requestedDate: z.string().min(1),
  timeSlots: z.array(z.string()).optional(),
  reasonCategory: z.string().min(1),
  reasonDetails: z.string().min(1),
  supportingDocs: z.string().nullable().optional(),
  status: z.string().optional(),
});

// POST: Create a new permission request for a teacher
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (user.role === "teacher" && user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const teacherId = params.id;
    const body = await req.json();
    const parseResult = PermissionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const {
      requestedDate,
      timeSlots,
      reasonCategory,
      reasonDetails,
      supportingDocs,
      status,
    } = parseResult.data;
    const record = await prisma.permissionrequest.create({
      data: {
        teacherId,
        requestedDate,
        timeSlots: timeSlots ? JSON.stringify(timeSlots) : JSON.stringify([]),

        reasonCategory,
        reasonDetails,
        supportingDocs,
        status: status || "Pending",
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create permission request." },
      { status: 500 }
    );
  }
}
