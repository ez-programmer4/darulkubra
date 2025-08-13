import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAbsenceDeductionConfig } from "@/lib/absence-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const cfg = await getAbsenceDeductionConfig();
    return NextResponse.json({ deductionAmount: cfg.deductionAmount, effectiveMonths: cfg.effectiveMonths });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}