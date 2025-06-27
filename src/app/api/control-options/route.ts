import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const controllers = await prisma.wpos_wpdatatable_28.findMany({
      select: {
        username: true,
        name: true,
      },
      where: {
        username: {
          not: "",
        },
      },
    });

    console.log("Fetched controllers:", controllers);

    const controlOptions = controllers.map((controller) => ({
      id: controller.username,
      name: controller.name,
    }));

    return NextResponse.json(controlOptions);
  } catch (error) {
    console.error("Error fetching control options:", error);
    return NextResponse.json(
      { error: "Failed to fetch control options" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
