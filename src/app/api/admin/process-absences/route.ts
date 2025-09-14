import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Get config
    const deductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: { configType: "absence", key: "unpermitted_absence_deduction" },
    });
    const monthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "absence_deduction_effective_months",
      },
    });

    const deductionAmount = parseFloat(deductionConfig?.value || "50");
    const effectiveMonths = monthsConfig?.value?.split(",") || [];
    const currentMonth = new Date().getMonth() + 1;

    // Check if current month is effective
    if (
      effectiveMonths.length > 0 &&
      !effectiveMonths.includes(currentMonth.toString())
    ) {
      return NextResponse.json({
        message: "Current month not in effective months",
        processed: 0,
      });
    }

    let processed = 0;

    // Process last 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayName = checkDate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      // Get teachers with students
      const teachers = await prisma.wpos_wpdatatable_24.findMany({
        include: {
          students: {
            select: { wdt_ID: true, daypackages: true, status: true },
          },
        },
      });

      for (const teacher of teachers) {
        // Skip if already processed
        const existing = await prisma.absencerecord.findFirst({
          where: {
            teacherId: teacher.ustazid,
            classDate: {
              gte: new Date(dateStr + "T00:00:00.000Z"),
              lt: new Date(dateStr + "T23:59:59.999Z"),
            },
          },
        });
        if (existing) continue;

        // Skip Sundays if configured
        const sundayConfig = await prisma.setting.findUnique({
          where: { key: "include_sundays_in_salary" }
        });
        const includeSundays = sundayConfig?.value === "true" || false;
        if (!includeSundays && checkDate.getDay() === 0) continue;

        // Get teacher's scheduled time slots for this day
        const teacherTimeSlots = await prisma.wpos_ustaz_occupied_times.findMany({
          where: { ustaz_id: teacher.ustazid },
          include: {
            student: {
              select: { 
                wdt_ID: true, 
                name: true, 
                package: true, 
                daypackages: true, 
                status: true 
              }
            }
          }
        });

        // Filter for students scheduled on this day
        const dayScheduledSlots = teacherTimeSlots.filter(slot => {
          const student = slot.student;
          if (!student || student.status === "inactive" || !student.daypackages) return false;
          
          return (
            student.daypackages.includes("All days") ||
            student.daypackages.includes(dayName) ||
            (student.daypackages.includes("MWF") && ["Monday", "Wednesday", "Friday"].includes(dayName)) ||
            (student.daypackages.includes("TTS") && ["Tuesday", "Thursday", "Saturday"].includes(dayName))
          );
        });

        if (dayScheduledSlots.length === 0) continue;

        // Get all zoom links sent by this teacher on this day
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        const allZoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacher.ustazid,
            sent_time: { gte: dayStart, lt: dayEnd },
          },
          select: {
            studentid: true,
            sent_time: true
          }
        });

        // Group scheduled slots by time slot
        const timeSlotGroups = new Map<string, any[]>();
        dayScheduledSlots.forEach(slot => {
          const timeSlot = slot.time_slot;
          if (!timeSlotGroups.has(timeSlot)) {
            timeSlotGroups.set(timeSlot, []);
          }
          timeSlotGroups.get(timeSlot)!.push(slot);
        });

        // Check each time slot for absences
        const absentTimeSlots: string[] = [];
        const affectedStudents = new Map<number, any>();

        for (const [timeSlot, slotsInTime] of timeSlotGroups.entries()) {
          // Check if teacher sent zoom links for students in this time slot
          const studentsInSlot = slotsInTime.map(s => s.student.wdt_ID);
          const linksForSlot = allZoomLinks.filter(link => 
            studentsInSlot.includes(link.studentid)
          );

          // If no zoom links sent for this time slot = absent for this time slot
          if (linksForSlot.length === 0) {
            absentTimeSlots.push(timeSlot);
            // Add affected students
            slotsInTime.forEach(slot => {
              affectedStudents.set(slot.student.wdt_ID, slot.student);
            });
          }
        }

        // Determine absence type and calculate deduction
        if (absentTimeSlots.length > 0) {
          // Check for permissions (whole day or specific time slots)
          const permission = await prisma.permissionrequest.findFirst({
            where: {
              teacherId: teacher.ustazid,
              requestedDate: dateStr,
            },
          });

          let isPermitted = false;
          let permittedTimeSlots: string[] = [];

          if (permission?.status === "Approved") {
            if (permission.timeSlots) {
              try {
                const requestedSlots = JSON.parse(permission.timeSlots);
                if (requestedSlots.includes("Whole Day")) {
                  isPermitted = true; // Whole day permission
                } else {
                  // Check if absent time slots are covered by permission
                  permittedTimeSlots = requestedSlots.filter((slot: string) => 
                    absentTimeSlots.includes(slot)
                  );
                }
              } catch {
                // If can't parse, treat as whole day permission
                isPermitted = true;
              }
            } else {
              isPermitted = true; // Default to whole day permission
            }
          }

          // Calculate unpermitted absent time slots
          const unpermittedTimeSlots = absentTimeSlots.filter(slot => 
            !permittedTimeSlots.includes(slot)
          );

          // Only create absence record if there are unpermitted absences
          if (!isPermitted && unpermittedTimeSlots.length > 0) {
            // Get package deduction rates
            const packageDeductions = await prisma.packageDeduction.findMany();
            const packageRateMap = packageDeductions.reduce((acc, pd) => {
              acc[pd.packageName] = Number(pd.absenceBaseAmount) || 25;
              return acc;
            }, {} as Record<string, number>);

            // Calculate deduction based on affected students and time slots
            let totalDeduction = 0;
            const affectedStudentsList = Array.from(affectedStudents.values());

            // Determine if it's whole day absence or partial
            const isWholeDayAbsence = unpermittedTimeSlots.length === timeSlotGroups.size;
            
            if (isWholeDayAbsence) {
              // Whole day absence - deduct for each affected student once
              for (const student of affectedStudentsList) {
                const packageRate = packageRateMap[student.package || ''] || 25;
                totalDeduction += packageRate;
              }
            } else {
              // Partial absence - deduct per time slot per student
              for (const timeSlot of unpermittedTimeSlots) {
                const slotsInTime = timeSlotGroups.get(timeSlot) || [];
                for (const slot of slotsInTime) {
                  const packageRate = packageRateMap[slot.student.package || ''] || 25;
                  totalDeduction += packageRate;
                }
              }
            }

            // Create absence record
            await prisma.absencerecord.create({
              data: {
                teacherId: teacher.ustazid,
                classDate: checkDate,
                permitted: false,
                permissionRequestId: permission?.id || null,
                deductionApplied: totalDeduction,
                reviewedByManager: true, // Auto-detected
                adminId: (session.user as { id: string }).id,
                timeSlots: JSON.stringify(isWholeDayAbsence ? ['Whole Day'] : unpermittedTimeSlots),
              },
            });

            // Update salary
            const monthKey = `${checkDate.getFullYear()}-${String(
              checkDate.getMonth() + 1
            ).padStart(2, "0")}`;

            await prisma.teachersalarypayment.upsert({
              where: {
                teacherId_period: {
                  teacherId: teacher.ustazid,
                  period: monthKey,
                },
              },
              create: {
                teacherId: teacher.ustazid,
                period: monthKey,
                status: "pending",
                totalSalary: 0,
                latenessDeduction: 0,
                absenceDeduction: totalDeduction,
                bonuses: 0,
              },
              update: {
                absenceDeduction: { increment: totalDeduction },
              },
            });

            processed++;
          } else if (isPermitted) {
            // Create permitted absence record (no deduction)
            await prisma.absencerecord.create({
              data: {
                teacherId: teacher.ustazid,
                classDate: checkDate,
                permitted: true,
                permissionRequestId: permission?.id || null,
                deductionApplied: 0,
                reviewedByManager: true,
                adminId: (session.user as { id: string }).id,
                timeSlots: JSON.stringify(absentTimeSlots.length === timeSlotGroups.size ? ['Whole Day'] : absentTimeSlots),
              },
            });
          }


        }
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} new absences`,
      processed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
