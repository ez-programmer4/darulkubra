// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";

// export async function GET(request: Request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(request.url);
//     const studentId = searchParams.get("studentId");

//     if (!studentId) {
//       return NextResponse.json(
//         { error: "Student ID is required" },
//         { status: 400 }
//       );
//     }

//     const reminders = await prisma.paymentReminder.findMany({
//       where: {
//         studentId: parseInt(studentId),
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     return NextResponse.json(reminders);
//   } catch (error) {
//     console.error("Error fetching payment reminders:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
