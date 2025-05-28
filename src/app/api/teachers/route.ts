import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

interface Teacher {
  id: number;
  name: string;
}

export async function GET() {
  try {
    const ustazs = await prisma.wpos_wpdatatable_24.findMany({
      select: { ustazid: true, ustazname: true },
    });

    const teachers: Teacher[] = ustazs.map((ustaz, index) => ({
      id: index + 1,
      name: ustaz.ustazname,
    }));

    return NextResponse.json({ teachers }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error fetching teachers" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
