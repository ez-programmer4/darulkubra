import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Correct way to fetch distinct non-null registral values
    const registralOptions = await prisma.wpos_wpdatatable_33.findMany({
      select: {
        registral: true,
      },
      distinct: ["registral"],
      where: {
        registral: {
          not: null, // Proper null check
          not: "", // Optional: also exclude empty strings if needed
        },
      },
    });

    // Additional client-side filtering for safety
    const options = registralOptions
      .map((item) => item.registral)
      .filter((registral): registral is string => !!registral); // Filters out null/undefined/empty

    return NextResponse.json({ registralOptions: options }, { status: 200 });
  } catch (error) {
    console.error("Error fetching registral options:", error);
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
