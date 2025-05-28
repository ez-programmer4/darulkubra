import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch distinct control values from wpos_wpdatatable_30
    const controls = await prisma.wpos_wpdatatable_30.findMany({
      select: {
        control: true,
      },
      distinct: ["control"],
      where: {
        control: {
          not: null, // Ensure only non-null values
        },
      },
    });

    // Extract control values and filter out nulls
    const controlOptions = controls
      .map((item) => item.control)
      .filter((control): control is string => control !== null);

    return NextResponse.json({ controlOptions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching control options:", error);
    return NextResponse.json(
      { message: "Error fetching control options" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
