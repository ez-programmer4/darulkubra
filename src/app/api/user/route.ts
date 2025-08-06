import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Optionally define a local AuthUser type for type safety
type AuthUser = {
  id: string;
  role: string;
  name?: string;
  username?: string;
  [key: string]: any;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", debug: { session } },
      { status: 401 }
    );
  }

  try {
    const { id, role } = session.user as { id: string; role: string };
    let userDetails: any = null;

    switch (role) {
      case "teacher":
        // Always use ustazid as a string for lookup
        if (!id || typeof id !== "string" || id.trim() === "") {
          return NextResponse.json(
            {
              error: "Missing teacher id",
              debug: { id, sessionUser: session.user },
            },
            { status: 400 }
          );
        }
        let teacherQuery = { ustazid: id };
        userDetails = await prisma.wpos_wpdatatable_24.findUnique({
          where: teacherQuery,
          select: {
            ustazid: true,
            ustazname: true,
            phone: true,
            schedule: true,
            control: true,
          },
        });
        break;
      case "admin":
        userDetails = await prisma.admin.findUnique({
          where: { id: String(id) },
          select: { id: true, name: true, username: true, role: true },
        });
        break;
      case "controller":
      case "registral":
        userDetails = await prisma.wpos_wpdatatable_28.findUnique({
          where: { wdt_ID: parseInt(id) }, // Use String(id) if wdt_ID is string in your schema
          select: { wdt_ID: true, name: true, username: true, code: true },
        });
        break;
    }

    if (!userDetails) {
      return NextResponse.json(
        { error: "User not found", debug: { id, role, session, userDetails } },
        { status: 404 }
      );
    }

    // Construct final user object to ensure consistency
    const finalUser = {
      id,
      role,
      name: userDetails.name || userDetails.ustazname,
      username: userDetails.username || userDetails.ustazid,
      ...userDetails,
    };

    return NextResponse.json(finalUser);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        debug: { error: (error as Error).message },
      },
      { status: 500 }
    );
  }
}
