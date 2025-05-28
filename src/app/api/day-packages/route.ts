import { NextResponse } from "next/server";

export async function GET() {
  try {
    const dayPackages = ["All days Package"];
    return NextResponse.json({ dayPackages }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error fetching day packages" },
      { status: 500 }
    );
  }
}
