// import { NextRequest, NextResponse } from "next/server";
// import { getToken } from "next-auth/jwt";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export async function POST(req: NextRequest) {
//   const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
//   if (!session || session.role !== "admin") {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const { days = 30 } = await req.json();

//     // Get all ustaz
//     const ustazList = await prisma.wpos_wpdatatable_24.findMany({
//       select: {
//         ustazid: true,
//         ustazname: true,
//       },
//     });

//     if (ustazList.length === 0) {
//       return NextResponse.json(
//         {
//           error: "No ustaz found in the database. Please add some ustaz first.",
//         },
//         { status: 400 }
//       );
//     }

//     let generatedCount = 0;
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);

//     const currentDate = new Date(startDate);

//     // Generate sample data for each day
//     while (currentDate <= endDate) {
//       for (const ustaz of ustazList) {
//         try {
//           // Check if rating already exists
//           const existingRating =
//             await prisma.ustaz_attendance_rating.findUnique({
//               where: {
//                 ustazid_date: {
//                   ustazid: ustaz.ustazid,
//                   date: new Date(currentDate),
//                 },
//               },
//             });

//           if (existingRating) {
//             continue;
//           }

//           // Generate random sample data
//           const scheduledTime = "14:30"; // Default time
//           const isOnTime = Math.random() > 0.3; // 70% chance of being on time
//           const delayMinutes = isOnTime
//             ? null
//             : Math.floor(Math.random() * 60) + 1;

//           const totalStudents = Math.floor(Math.random() * 10) + 1; // 1-10 students
//           const studentsPresent = Math.floor(Math.random() * totalStudents) + 1;
//           const studentsAbsent = totalStudents - studentsPresent;
//           const attendanceRate = (studentsPresent / totalStudents) * 100;

//           // Calculate sent time based on scheduled time and delay
//           const [hours, minutes] = scheduledTime.split(":");
//           const scheduledDateTime = new Date(currentDate);
//           scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

//           const expectedDeadline = new Date(scheduledDateTime);
//           expectedDeadline.setMinutes(expectedDeadline.getMinutes() + 15);

//           const sentTime = isOnTime
//             ? new Date(
//                 scheduledDateTime.getTime() + Math.random() * 15 * 60 * 1000
//               ) // Within 15 minutes
//             : new Date(
//                 expectedDeadline.getTime() + (delayMinutes || 0) * 60 * 1000
//               );

//           // Calculate rating score
//           let ratingScore = 0;
//           ratingScore += (attendanceRate / 100) * 60; // 60% from attendance
//           ratingScore += isOnTime ? 40 : Math.max(0, 40 - (delayMinutes || 0)); // 40% from timing

//           // Create the sample rating record
//           await prisma.ustaz_attendance_rating.create({
//             data: {
//               ustazid: ustaz.ustazid,
//               date: new Date(currentDate),
//               scheduled_time: scheduledTime,
//               sent_time: sentTime,
//               expected_deadline: expectedDeadline,
//               is_on_time: isOnTime,
//               delay_minutes: delayMinutes,
//               total_students: totalStudents,
//               students_present: studentsPresent,
//               students_absent: studentsAbsent,
//               attendance_rate: attendanceRate,
//               rating_score: ratingScore,
//             },
//           });

//           generatedCount++;
//         } catch (error) {
//           console.error(
//             `Error generating sample data for ${ustaz.ustazname}:`,
//             error
//           );
//         }
//       }

//       // Move to next day
//       currentDate.setDate(currentDate.getDate() + 1);
//     }

//     return NextResponse.json({
//       success: true,
//       message: `Successfully generated ${generatedCount} sample ustaz attendance ratings`,
//       generatedCount,
//       dateRange: {
//         startDate: startDate.toISOString(),
//         endDate: endDate.toISOString(),
//       },
//       totalUstaz: ustazList.length,
//       daysProcessed: days,
//     });
//   } catch (error) {
//     console.error("Failed to generate sample ustaz attendance ratings:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
