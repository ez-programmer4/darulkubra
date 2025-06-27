// import { NextResponse } from "next/server";
// import { getAuthUser } from "@/lib/server-auth";
// import { prisma } from "@/lib/prisma";
// import { format, addMonths } from "date-fns";

// export async function POST(request: Request) {
//   try {
//     const user = await getAuthUser();
//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await request.json();
//     const { studentId, month, reason } = body;

//     if (!studentId || !month || !reason) {
//       return NextResponse.json(
//         { error: "Student ID, month, and reason are required" },
//         { status: 400 }
//       );
//     }

//     // Check if student exists
//     const student = await prisma.wpos_wpdatatable_23.findUnique({
//       where: { id: parseInt(studentId) },
//       select: {
//         id: true,
//         classfee: true,
//         control: true,
//       },
//     });

//     if (!student) {
//       return NextResponse.json({ error: "Student not found" }, { status: 404 });
//     }

//     // Check if the student belongs to this controller
//     if (student.control !== user.username) {
//       return NextResponse.json(
//         { error: "Unauthorized access" },
//         { status: 403 }
//       );
//     }

//     // Check if payment already exists for this month
//     const existingPayment = await prisma.months_table.findFirst({
//       where: {
//         studentid: parseInt(studentId),
//         month: month,
//       },
//     });

//     if (existingPayment) {
//       return NextResponse.json(
//         { error: "Payment already exists for this month" },
//         { status: 400 }
//       );
//     }

//     // Create free month payment
//     const freeMonth = await prisma.months_table.create({
//       data: {
//         studentid: parseInt(studentId),
//         month: month,
//         paid_amount: 0,
//         payment_status: "approved",
//         payment_type: "free",
//         free_month_reason: " ",
//         start_date: new Date(month),
//         end_date: addMonths(new Date(month), 1),
//       },
//     });

//     return NextResponse.json(freeMonth);
//   } catch (error) {
//     console.error("Error creating free month:", error);
//     return NextResponse.json(
//       { error: "Failed to create free month. Please try again later." },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request: Request) {
//   try {
//     const user = await getAuthUser();
//     if (!user) {
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

//     // Get all free months for the student
//     const freeMonths = await prisma.months_table.findMany({
//       where: {
//         studentid: parseInt(studentId),
//         payment_type: "free",
//       },
//       orderBy: {
//         month: "desc",
//       },
//     });

//     return NextResponse.json(freeMonths);
//   } catch (error) {
//     console.error("Error fetching free months:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch free months. Please try again later." },
//       { status: 500 }
//     );
//   }
// }
