import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    // Correct way to fetch distinct non-null registral values
    const registralOptions = await prisma.wpos_wpdatatable_33.findMany({
      select: {
        name: true,
      },
      distinct: ["name"],
      where: {
        name: {
          not: "",
        },
      },
    });

    // Additional client-side filtering for safety
    const options = registralOptions
      .map((item) => item.name)
      .filter((registral) => !!registral); // Filters out null/undefined/empty

    return NextResponse.json({ registralOptions: options }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error fetching registral options",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
