import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const currentMonth = new Date().getMonth() + 1;
    
    // Get absence deduction config
    const deductionConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence",
        key: "unpermitted_absence_deduction",
      },
    });

    const effectiveMonthsConfig = await prisma.deductionbonusconfig.findFirst({
      where: {
        configType: "absence", 
        key: "absence_deduction_effective_months",
      },
    });

    const deductionAmount = deductionConfig ? Number(deductionConfig.value) : 50;
    const effectiveMonths = effectiveMonthsConfig?.value?.split(",") || [];
    
    // Check if current month is in effective months
    const shouldProcessThisMonth = effectiveMonths.length === 0 || effectiveMonths.includes(currentMonth.toString());
    
    if (!shouldProcessThisMonth) {
      return NextResponse.json({
        message: "Current month not in effective months",
        currentMonth,
        effectiveMonths,
        processing: false
      });
    }

    // Get teachers with students
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      include: {
        students: {
          select: {
            wdt_ID: true,
            daypackages: true,
            status: true
          }
        }
      }
    });

    let processedCount = 0;

    // Process last 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });

      for (const teacher of teachers) {
        // Skip if already processed
        const existing = await prisma.absencerecord.findFirst({
          where: {
            teacherId: teacher.ustazid,
            classDate: {
              gte: new Date(dateStr + 'T00:00:00.000Z'),
              lt: new Date(dateStr + 'T23:59:59.999Z'),
            }
          }
        });

        if (existing) continue;

        // Check scheduled students
        const studentsForDay = teacher.students.filter(student => {
          if (!student.daypackages || student.status === 'inactive') return false;
          return student.daypackages.includes('All days') || student.daypackages.includes(dayName);
        });

        if (studentsForDay.length === 0) continue;

        // Check zoom links
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        const zoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacher.ustazid,
            studentid: { in: studentsForDay.map(s => s.wdt_ID) },
            sent_time: { gte: dayStart, lt: dayEnd }
          }
        });

        if (zoomLinks.length === 0) {
          // Get teacher's time slots for this day
          const occupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
            where: {
              ustaz_id: teacher.ustazid
            },
            include: {
              student: {
                select: {
                  daypackages: true
                }
              }
            }
          });

          // Filter for this specific day
          const dayTimeSlots = occupiedTimes.filter(ot => {
            const studentDayPackages = ot.student.daypackages;
            return studentDayPackages && (
              studentDayPackages.includes('All days') || 
              studentDayPackages.includes(dayName)
            );
          });

          if (dayTimeSlots.length === 0) {
            continue; // No classes scheduled for this day
          }

          // Get unique time slots
          const timeSlots = [...new Set(dayTimeSlots.map(ot => ot.time_slot))];
          
          // Check permission
          const permission = await prisma.permissionrequest.findFirst({
            where: {
              teacherId: teacher.ustazid,
              requestedDate: dateStr
            }
          });

          let isPermitted = false;
          let affectedSlots = timeSlots;
          
          if (permission?.status === "Approved" && permission.timeSlots) {
            try {
              const permissionSlots = JSON.parse(permission.timeSlots);
              if (permissionSlots.includes('Whole Day')) {
                isPermitted = true;
                affectedSlots = [];
              } else {
                // Only count slots not covered by permission
                affectedSlots = timeSlots.filter(slot => !permissionSlots.includes(slot));
                isPermitted = affectedSlots.length === 0;
              }
            } catch {}
          }

          if (affectedSlots.length > 0) {
            // Get per-time-slot deduction configuration
            const timeSlotDeductionConfig = await prisma.deductionbonusconfig.findFirst({
              where: {
                configType: "absence",
                key: "deduction_per_time_slot",
              },
            });
            const deductionPerTimeSlot = timeSlotDeductionConfig ? Number(timeSlotDeductionConfig.value) : 25;
            
            // Calculate deduction based on affected time slots
            const totalDeduction = deductionPerTimeSlot * affectedSlots.length;

            // Create absence record
            await prisma.absencerecord.create({
              data: {
                teacherId: teacher.ustazid,
                classDate: checkDate,
                timeSlots: JSON.stringify(affectedSlots),
                permitted: isPermitted,
                permissionRequestId: permission?.id || null,
                deductionApplied: totalDeduction,
                reviewedByManager: false
              }
            });

            // Update salary
            const monthKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
            
            await prisma.teachersalarypayment.upsert({
              where: {
                teacherId_period: {
                  teacherId: teacher.ustazid,
                  period: monthKey
                }
              },
              create: {
                teacherId: teacher.ustazid,
                period: monthKey,
                status: "pending",
                totalSalary: 0,
                latenessDeduction: 0,
                absenceDeduction: totalDeduction,
                bonuses: 0
              },
              update: {
                absenceDeduction: { increment: totalDeduction }
              }
            });

            processedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      message: `Auto-processed ${processedCount} absences`,
      currentMonth,
      effectiveMonths,
      processing: true,
      processedCount
    });

  } catch (error) {
    return NextResponse.json({
      error: "Auto-processing failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}