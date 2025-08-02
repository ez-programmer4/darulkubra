import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const permissions = await prisma.permissionrequest.findMany({
      where: whereClause,
      include: {
        wpos_wpdatatable_24: {
          select: {
            ustazname: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // Transform the data to match the dashboard expectations
    const transformedPermissions = permissions.map((permission: any) => ({
      id: permission.id,
      teacher: permission.wpos_wpdatatable_24?.ustazname || "Unknown",
      teacherId: permission.teacherId,
      status: permission.status,
      date: permission.createdAt?.toISOString().split("T")[0],
      createdAt: permission.createdAt?.toISOString(),
    }));

    return NextResponse.json(transformedPermissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
