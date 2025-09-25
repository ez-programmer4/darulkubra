import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { format, parseISO } from "date-fns";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter for POST endpoint (10 requests per minute per IP)
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Helper function to check if a student is scheduled for a specific day
async function checkIfStudentScheduledForDay(
  studentId: number,
  dayOfWeek: number,
  dayPackage: string
): Promise<boolean> {
  const dayMap: Record<string, number[]> = {
    MWF: [1, 3, 5], // Monday, Wednesday, Friday
    TTS: [2, 4, 6], // Tuesday, Thursday, Saturday
    // Add other day packages as needed
  };

  const days = dayMap[dayPackage];
  return days ? days.includes(dayOfWeek) : false;
}

// Payment integration function with retry logic
async function processPayment(
  teacherId: string,
  amount: number,
  period: string,
  retries = 3
): Promise<{
  success: boolean;
  transactionId?: string;
  status?: string;
  error?: string;
}> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const teacher = await prisma.wpos_wpdatatable_24.findUnique({
        where: { ustazid: teacherId },
        select: { ustazname: true, phone: true },
      });

      if (!teacher) throw new Error("Teacher not found");

      const paymentResponse = await fetch(process.env.PAYMENT_API_URL || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
        },
        body: JSON.stringify({
          recipient: {
            id: teacherId,
            name: teacher.ustazname,
            phone: teacher.phone,
            email: teacher.phone
              ? `${teacher.phone}@darulkubra.com`
              : `teacher_${teacherId}@darulkubra.com`,
          },
          amount: amount,
          currency: "ETB",
          reference: `salary_${teacherId}_${period}`,
          description: `Teacher salary payment for ${period}`,
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.message || "Payment failed");
      }

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
      };
    } catch (error) {
      if (attempt === retries) {
        console.error(
          `Payment processing failed after ${retries} attempts:`,
          error
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : "Payment failed",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { success: false, error: "Payment failed after retries" };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const teacherId = url.searchParams.get("teacherId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    const from = parseISO(startDate);
    const to = parseISO(endDate);

    // Validate date range and UTC
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range. Use UTC ISO format (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // Cache package deductions and lateness configs
    const packageDeductions = await prisma.packageDeduction.findMany();
    const packageDeductionMap: Record<
      string,
      { lateness: number; absence: number }
    > = {};
    packageDeductions.forEach((pkg) => {
      packageDeductionMap[pkg.packageName] = {
        lateness: Number(pkg.latenessBaseAmount),
        absence: Number(pkg.absenceBaseAmount),
      };
    });
    const defaultBaseDeductionAmount = 30;

    const latenessConfigs = await prisma.latenessdeductionconfig.findMany({
      orderBy: [{ tier: "asc" }, { startMinute: "asc" }],
    });

    // Handle detailed view for a specific teacher
    if (url.pathname.endsWith("/details") || teacherId) {
      if (!teacherId) {
        return NextResponse.json(
          { error: "Missing teacherId for details" },
          { status: 400 }
        );
      }

      if (latenessConfigs.length === 0) {
        return NextResponse.json({
          latenessRecords: [],
          absenceRecords: [],
          bonusRecords: [],
          warnings: ["No lateness configurations found"],
        });
      }

      const excusedThreshold = Math.min(
        ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
      );
      const tiers = latenessConfigs.map((c) => ({
        start: c.startMinute,
        end: c.endMinute,
        percent: c.deductionPercent,
      }));
      const maxTierEnd = Math.max(...latenessConfigs.map((c) => c.endMinute));

      // Fetch active assignments
      const assignments = await prisma.wpos_ustaz_occupied_times.findMany({
        where: {
          ustaz_id: teacherId,
          occupied_at: { lte: to },
          OR: [{ end_at: null }, { end_at: { gte: from } }],
        },
        include: {
          student: {
            select: { wdt_ID: true, name: true, package: true },
          },
        },
      });

      // Fetch historical assignments from auditlog
      const auditLogs = await prisma.auditlog.findMany({
        where: {
          actionType: "assignment_update",
          createdAt: { gte: from, lte: to },
        },
        select: {
          targetId: true,
          details: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const historicalAssignments: {
        student_id: number;
        ustaz_id: string;
        time_slot: string;
        daypackage: string;
        occupied_at: Date;
        end_at: Date;
        student?: { wdt_ID: number; name: string; package: string };
        id?: number;
      }[] = auditLogs
        .map((log) => {
          try {
            const details = JSON.parse(log.details);
            if (details.oldTeacher === teacherId && log.targetId) {
              return {
                student_id: log.targetId,
                ustaz_id: String(details.oldTeacher || ""),
                time_slot: String(details.oldTime || "09:00 AM"),
                daypackage: String(details.newDayPackage || "MWF"),
                occupied_at: new Date(details.occupied_at || log.createdAt),
                end_at: log.createdAt,
              };
            }
            return null;
          } catch (e) {
            console.warn(`Failed to parse audit log details:`, e);
            return null;
          }
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      // Fetch student details for historical assignments
      const historicalStudentIds = [
        ...new Set(historicalAssignments.map((a) => a.student_id)),
      ];
      const historicalStudents = await prisma.wpos_wpdatatable_23.findMany({
        where: { wdt_ID: { in: historicalStudentIds } },
        select: { wdt_ID: true, name: true, package: true },
      });

      historicalAssignments.forEach((assignment) => {
        const student = historicalStudents.find(
          (s) => s.wdt_ID === assignment.student_id
        );
        if (student && student.name && student.package) {
          assignment.student = {
            wdt_ID: student.wdt_ID,
            name: student.name,
            package: student.package,
          };
        }
      });

      // Combine active and historical assignments
      const allAssignments = [
        ...assignments,
        ...historicalAssignments.filter((a) => a.student),
      ];

      if (allAssignments.length === 0) {
        console.warn(
          `No active or historical assignments for teacher ${teacherId} in range ${from} to ${to}`
        );
      }

      const latenessRecords = [];
      const unmatchedZoomLinks = [];

      // Process all assignments
      for (const assignment of allAssignments) {
        const student = assignment.student;
        if (!student) {
          console.warn(
            `No student data for assignment with student_id ${assignment.student_id}`
          );
          continue;
        }
        const timeSlot = assignment.time_slot;
        if (!timeSlot) {
          console.warn(
            `Missing time_slot for assignment with student_id ${assignment.student_id}`
          );
          continue;
        }

        const zoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: teacherId,
            studentid: student.wdt_ID,
            sent_time: {
              gte: assignment.occupied_at || from,
              lte: assignment.end_at || to,
            },
          },
          select: { id: true, sent_time: true },
        });

        const startDate =
          assignment.occupied_at && assignment.occupied_at > from
            ? assignment.occupied_at
            : from;
        const endDate =
          assignment.end_at && assignment.end_at < to ? assignment.end_at : to;

        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const dateStr = format(d, "yyyy-MM-dd");
          const time24 =
            timeSlot.includes("AM") || timeSlot.includes("PM")
              ? timeSlot.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
                ? (() => {
                    const [, hour, minute, period] = timeSlot.match(
                      /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i
                    )!;
                    let h = parseInt(hour);
                    if (period.toUpperCase() === "PM" && h !== 12) h += 12;
                    if (period.toUpperCase() === "AM" && h === 12) h = 0;
                    return `${h.toString().padStart(2, "0")}:${minute}`;
                  })()
                : "00:00"
              : timeSlot.split(":").slice(0, 2).join(":");
          const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);

          const sentTimes = zoomLinks
            .filter(
              (zl) =>
                zl.sent_time && format(zl.sent_time, "yyyy-MM-dd") === dateStr
            )
            .sort((a, b) => a.sent_time!.getTime() - b.sent_time!.getTime());

          const actualStartTime = sentTimes[0]?.sent_time || null;
          if (!actualStartTime) continue;

          const latenessMinutes = Math.max(
            0,
            Math.round(
              (actualStartTime.getTime() - scheduledTime.getTime()) / 60000
            )
          );

          let deductionApplied = 0;
          let deductionTier = "Excused";
          let isWaived = false;

          if (latenessMinutes > excusedThreshold) {
            const baseDeductionAmount =
              packageDeductionMap[student.package || ""]?.lateness ||
              defaultBaseDeductionAmount;

            let foundTier = false;
            for (const [i, tier] of tiers.entries()) {
              if (
                latenessMinutes >= tier.start &&
                latenessMinutes <= tier.end
              ) {
                deductionApplied = baseDeductionAmount * (tier.percent / 100);
                deductionTier = `Tier ${i + 1} (${tier.percent}%) - ${
                  student.package || "Unknown"
                }`;
                foundTier = true;
                break;
              }
            }
            if (!foundTier && latenessMinutes > maxTierEnd) {
              deductionApplied = baseDeductionAmount;
              deductionTier = `> Max Tier - ${student.package || "Unknown"}`;
            }

            const { isDeductionWaived } = await import(
              "@/lib/deduction-waivers"
            ).catch(() => ({ isDeductionWaived: () => false }));
            isWaived = await isDeductionWaived(
              teacherId,
              scheduledTime,
              "lateness"
            );
            if (isWaived) {
              deductionApplied = 0;
              deductionTier = `${deductionTier} (WAIVED)`;
            }
          }

          latenessRecords.push({
            studentId: student.wdt_ID,
            studentName: student.name,
            classDate: scheduledTime,
            scheduledTime,
            actualStartTime,
            latenessMinutes,
            deductionApplied,
            deductionTier,
            isWaived,
            source: assignment.id ? "Active Assignment" : "Audit Log",
          });
        }
      }

      // Fetch unmatched Zoom links
      const allZoomLinks = await prisma.wpos_zoom_links.findMany({
        where: {
          ustazid: teacherId,
          sent_time: { gte: from, lte: to },
        },
        select: { id: true, sent_time: true, studentid: true },
      });

      for (const link of allZoomLinks) {
        const isMatched = latenessRecords.some(
          (record) =>
            record.studentId === link.studentid &&
            format(record.classDate, "yyyy-MM-dd") ===
              (link.sent_time ? format(link.sent_time, "yyyy-MM-dd") : "")
        );
        if (!isMatched) {
          const student = await prisma.wpos_wpdatatable_23.findUnique({
            where: { wdt_ID: link.studentid },
            select: { name: true },
          });
          unmatchedZoomLinks.push({
            zoomLinkId: link.id,
            sent_time: link.sent_time,
            studentName: student?.name || "Unknown",
            reason: "No matching assignment (active or historical)",
          });
        }
      }

      const bonusRecords = await prisma.bonusrecord.findMany({
        where: { teacherId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "asc" },
      });

      const absenceWaivers = await prisma.deduction_waivers.findMany({
        where: {
          teacherId,
          deductionType: "absence",
          deductionDate: { gte: from, lte: to },
        },
      });
      const waivedDates = new Set(
        absenceWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
      );

      const computedAbsences = [];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      const endProcessDate = new Date(
        Math.min(to.getTime(), yesterday.getTime())
      );

      for (const assignment of allAssignments) {
        const student = assignment.student;
        if (!student) continue;
        const absenceStartDate =
          assignment.occupied_at && assignment.occupied_at > from
            ? assignment.occupied_at
            : from;
        const absenceEndDate =
          assignment.end_at && assignment.end_at < endProcessDate
            ? assignment.end_at
            : endProcessDate;

        for (
          let d = new Date(absenceStartDate);
          d <= absenceEndDate;
          d.setDate(d.getDate() + 1)
        ) {
          const workingDaysConfig = await prisma.setting.findUnique({
            where: { key: "include_sundays_in_salary" },
          });
          const includeSundays = workingDaysConfig?.value === "true" || false;
          if (!includeSundays && d.getDay() === 0) continue;
          const dateStr = format(d, "yyyy-MM-dd");
          if (waivedDates.has(dateStr)) continue;

          const studentScheduled = await checkIfStudentScheduledForDay(
            student.wdt_ID,
            d.getDay(),
            assignment.daypackage
          );
          if (!studentScheduled) continue;

          const hasZoomLink = await prisma.wpos_zoom_links.count({
            where: {
              ustazid: teacherId,
              studentid: student.wdt_ID,
              sent_time: {
                gte: new Date(`${dateStr}T00:00:00.000Z`),
                lte: new Date(`${dateStr}T23:59:59.999Z`),
              },
            },
          });

          if (!hasZoomLink) {
            const packageRate =
              packageDeductionMap[student.package || ""]?.absence || 25;
            computedAbsences.push({
              id: 0,
              teacherId,
              classDate: new Date(d),
              timeSlots: [`${student.name} (${student.package})`],
              packageBreakdown: [
                {
                  studentId: student.wdt_ID,
                  studentName: student.name,
                  package: student.package || "Unknown",
                  ratePerSlot: packageRate,
                  timeSlots: 1,
                  total: packageRate,
                },
              ],
              uniqueTimeSlots: [`${student.name} (${student.package})`],
              permitted: false,
              permissionRequestId: null,
              deductionApplied: packageRate,
              reviewedByManager: true,
              reviewNotes: `Absence for ${student.name} (${student.package}): ${packageRate}ETB`,
              source: assignment.id ? "Active Assignment" : "Audit Log",
            });
          }
        }
      }

      return NextResponse.json({
        latenessRecords,
        absenceRecords: computedAbsences,
        bonusRecords,
        unmatchedZoomLinks:
          unmatchedZoomLinks.length > 0 ? unmatchedZoomLinks : undefined,
      });
    }

    // Main table view: Calculate salaries for all teachers
    const teachers = await prisma.wpos_wpdatatable_24.findMany({
      select: { ustazid: true, ustazname: true },
    });

    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach((pkg) => {
      salaryMap[pkg.packageName] = Number(pkg.salaryPerStudent);
    });

    const workingDaysConfig = await prisma.setting.findUnique({
      where: { key: "include_sundays_in_salary" },
    });
    const includeSundays = workingDaysConfig?.value === "true" || false;

    const results = await Promise.all(
      teachers.map(async (t) => {
        // Fetch active assignments
        const assignments = await prisma.wpos_ustaz_occupied_times.findMany({
          where: {
            ustaz_id: t.ustazid,
            occupied_at: { lte: to },
            OR: [{ end_at: null }, { end_at: { gte: from } }],
          },
          include: {
            student: {
              select: { wdt_ID: true, name: true, package: true },
            },
          },
        });

        // Fetch historical assignments from auditlog
        const auditLogs = await prisma.auditlog.findMany({
          where: {
            actionType: "assignment_update",
            createdAt: { gte: from, lte: to },
          },
          select: {
            targetId: true,
            details: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        });

        const historicalAssignments: {
          student_id: number;
          ustaz_id: string;
          time_slot: string;
          daypackage: string;
          occupied_at: Date;
          end_at: Date;
          student?: { wdt_ID: number; name: string; package: string };
          id?: number;
        }[] = auditLogs
          .map((log) => {
            try {
              const details = JSON.parse(log.details);
              if (details.oldTeacher === t.ustazid && log.targetId) {
                return {
                  student_id: log.targetId,
                  ustaz_id: details.oldTeacher,
                  time_slot: details.oldTime || "09:00 AM",
                  daypackage: details.newDayPackage || "MWF",
                  occupied_at: new Date(details.occupied_at || log.createdAt),
                  end_at: log.createdAt,
                };
              }
              return null;
            } catch (e) {
              return null;
            }
          })
          .filter((a): a is NonNullable<typeof a> => a !== null);

        const historicalStudentIds = [
          ...new Set(historicalAssignments.map((a) => a.student_id)),
        ];
        const historicalStudents = await prisma.wpos_wpdatatable_23.findMany({
          where: { wdt_ID: { in: historicalStudentIds } },
          select: { wdt_ID: true, name: true, package: true },
        });

        historicalAssignments.forEach((assignment) => {
          const student = historicalStudents.find(
            (s) => s.wdt_ID === assignment.student_id
          );
          if (student && student.name && student.package) {
            assignment.student = {
              wdt_ID: student.wdt_ID,
              name: student.name,
              package: student.package,
            };
          }
        });

        const allAssignments = [
          ...assignments,
          ...historicalAssignments.filter((a) => a.student),
        ];

        if (allAssignments.length === 0) {
          console.warn(
            `No active or historical assignments for teacher ${t.ustazid} in range ${from} to ${to}`
          );
          return null;
        }

        // Calculate base salary
        let baseSalary = 0;
        const dailyBreakdown = [];
        const unmatchedZoomLinks = [];

        for (const assignment of allAssignments) {
          const assignmentStart =
            assignment.occupied_at && assignment.occupied_at > from
              ? assignment.occupied_at
              : from;
          const assignmentEnd =
            assignment.end_at && assignment.end_at < to
              ? assignment.end_at
              : to;
          const student = assignment.student;
          if (!student?.package || !salaryMap[student.package]) continue;

          const monthlyPackageSalary = Math.round(
            salaryMap[student.package] || 0
          );
          const workingDays = 26;
          const dailyRate = Math.round(monthlyPackageSalary / workingDays);

          const zoomLinks = await prisma.wpos_zoom_links.findMany({
            where: {
              ustazid: t.ustazid,
              studentid: assignment.student_id,
              sent_time: { gte: assignmentStart, lte: assignmentEnd },
            },
            select: { sent_time: true, packageRate: true },
          });

          const studentEarnings = zoomLinks.reduce((sum, link) => {
            return sum + Number(link.packageRate || dailyRate);
          }, 0);
          baseSalary += studentEarnings;

          if (zoomLinks.length > 0) {
            dailyBreakdown.push({
              studentName: student.name || "Unknown",
              package: student.package || "Unknown",
              monthlyRate: monthlyPackageSalary,
              dailyRate: dailyRate,
              daysWorked: zoomLinks.length,
              totalEarned: studentEarnings,
              source: assignment.id ? "Active Assignment" : "Audit Log",
            });
          }
        }

        // Check for unmatched Zoom links
        const allZoomLinks = await prisma.wpos_zoom_links.findMany({
          where: {
            ustazid: t.ustazid,
            sent_time: { gte: from, lte: to },
          },
          select: {
            id: true,
            sent_time: true,
            studentid: true,
            packageRate: true,
          },
        });

        for (const link of allZoomLinks) {
          const isMatched = dailyBreakdown.some(
            (b) =>
              b.studentName === "Unknown" &&
              b.daysWorked > 0 &&
              link.sent_time && format(link.sent_time, "yyyy-MM-dd") ===
                format(from, "yyyy-MM-dd")
          );
          if (!isMatched) {
            const student = await prisma.wpos_wpdatatable_23.findUnique({
              where: { wdt_ID: link.studentid },
              select: { name: true, package: true },
            });
            unmatchedZoomLinks.push({
              zoomLinkId: link.id,
              sent_time: link.sent_time,
              studentName: student?.name || "Unknown",
              reason: "No matching assignment (active or historical)",
            });
            // Include unmatched Zoom link in salary if valid
            if (student?.package && salaryMap[student.package]) {
              const monthlyPackageSalary = Math.round(
                salaryMap[student.package] || 0
              );
              const dailyRate = Math.round(monthlyPackageSalary / 26);
              const studentEarnings = Number(link.packageRate || dailyRate);
              baseSalary += studentEarnings;
              dailyBreakdown.push({
                studentName: student.name || "Unknown",
                package: student.package || "Unknown",
                monthlyRate: monthlyPackageSalary,
                dailyRate: dailyRate,
                daysWorked: 1,
                totalEarned: studentEarnings,
                source: "Unmatched Zoom Link",
              });
            }
          }
        }

        baseSalary = Math.round(baseSalary);

        // Calculate lateness deductions
        let latenessDeduction = 0;
        const latenessBreakdown = [];

        if (latenessConfigs.length > 0) {
          const excusedThreshold = Math.min(
            ...latenessConfigs.map((c) => c.excusedThreshold ?? 0)
          );
          const tiers = latenessConfigs.map((c) => ({
            start: c.startMinute,
            end: c.endMinute,
            percent: c.deductionPercent,
          }));
          const maxTierEnd = Math.max(
            ...latenessConfigs.map((c) => c.endMinute)
          );

          const latenessWaivers = await prisma.deduction_waivers.findMany({
            where: {
              teacherId: t.ustazid,
              deductionType: "lateness",
              deductionDate: { gte: from, lte: to },
            },
          });
          const waivedLatenessDates = new Set(
            latenessWaivers.map(
              (w) => w.deductionDate.toISOString().split("T")[0]
            )
          );

          const activeAssignments = allAssignments.filter(
            (a) => !a.end_at || a.end_at > from
          );
          const activeStudentIds = activeAssignments.map((a) => a.student_id);

          const allStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: {
              ustaz: t.ustazid,
              wdt_ID: { in: activeStudentIds },
            },
            select: {
              wdt_ID: true,
              name: true,
              package: true,
              zoom_links: {
                where: { sent_time: { gte: from, lte: to } },
              },
              occupiedTimes: {
                where: { end_at: null },
                select: { time_slot: true },
              },
            },
          });

          const dailyZoomLinks = new Map();
          for (const student of allStudents) {
            student.zoom_links.forEach((link) => {
              if (link.sent_time) {
                const dateStr = format(link.sent_time, "yyyy-MM-dd");
                if (!dailyZoomLinks.has(dateStr)) {
                  dailyZoomLinks.set(dateStr, []);
                }
                dailyZoomLinks.get(dateStr).push({
                  ...link,
                  studentId: student.wdt_ID,
                  studentName: student.name,
                  timeSlot: student.occupiedTimes?.[0]?.time_slot,
                });
              }
            });
          }

          for (const [dateStr, links] of dailyZoomLinks.entries()) {
            const date = new Date(dateStr);
            if (date < from || date > to) continue;

            const studentLinks = new Map<number, any>();
            links.forEach((link: any) => {
              const key = link.studentId;
              if (
                !studentLinks.has(key) ||
                link.sent_time < studentLinks.get(key).sent_time
              ) {
                studentLinks.set(key, link);
              }
            });

            for (const link of studentLinks.values()) {
              if (!link.timeSlot) continue;

              const time24 =
                link.timeSlot.includes("AM") || link.timeSlot.includes("PM")
                  ? link.timeSlot.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
                    ? (() => {
                        const [, hour, minute, period] = link.timeSlot.match(
                          /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i
                        )!;
                        let h = parseInt(hour);
                        if (period.toUpperCase() === "PM" && h !== 12) h += 12;
                        if (period.toUpperCase() === "AM" && h === 12) h = 0;
                        return `${h.toString().padStart(2, "0")}:${minute}`;
                      })()
                    : "00:00"
                  : link.timeSlot.split(":").slice(0, 2).join(":");

              const scheduledTime = new Date(`${dateStr}T${time24}:00.000Z`);
              const latenessMinutes = Math.max(
                0,
                Math.round(
                  (link.sent_time.getTime() - scheduledTime.getTime()) / 60000
                )
              );

              if (latenessMinutes > excusedThreshold) {
                let deduction = 0;
                let tier = "No Tier";
                const student = allStudents.find(
                  (s) => s.wdt_ID === link.studentId
                );
                const studentPackage = student?.package || "";
                const baseDeductionAmount =
                  packageDeductionMap[studentPackage]?.lateness ||
                  defaultBaseDeductionAmount;

                for (const [i, t] of tiers.entries()) {
                  if (latenessMinutes >= t.start && latenessMinutes <= t.end) {
                    deduction = Math.round(
                      baseDeductionAmount * (t.percent / 100)
                    );
                    tier = `Tier ${i + 1} (${t.percent}%) - ${studentPackage}`;
                    break;
                  }
                }
                if (latenessMinutes > maxTierEnd) {
                  deduction = baseDeductionAmount;
                  tier = `> Max Tier - ${studentPackage}`;
                }

                const { isDeductionWaived } = await import(
                  "@/lib/deduction-waivers"
                ).catch(() => ({ isDeductionWaived: () => false }));
                const isWaived = await isDeductionWaived(
                  t.ustazid,
                  scheduledTime,
                  "lateness"
                );
                if (isWaived || waivedLatenessDates.has(dateStr)) {
                  deduction = 0;
                  tier = `${tier} (WAIVED)`;
                }

                if (deduction > 0) {
                  latenessDeduction += deduction;
                  latenessBreakdown.push({
                    date: dateStr,
                    studentName: link.studentName,
                    scheduledTime: link.timeSlot,
                    actualTime: format(link.sent_time, "HH:mm"),
                    latenessMinutes,
                    tier,
                    deduction,
                  });
                }
              }
            }
          }
        }

        // Calculate absence deductions
        let absenceDeduction = 0;
        const absenceBreakdown = [];
        const absenceWaivers = await prisma.deduction_waivers.findMany({
          where: {
            teacherId: t.ustazid,
            deductionType: "absence",
            deductionDate: { gte: from, lte: to },
          },
        });
        const waivedDates = new Set(
          absenceWaivers.map((w) => w.deductionDate.toISOString().split("T")[0])
        );

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        const endProcessDate = new Date(
          Math.min(to.getTime(), yesterday.getTime())
        );

        for (const assignment of allAssignments) {
          const student = assignment.student;
          if (!student) continue;
          const absenceStartDate =
            assignment.occupied_at && assignment.occupied_at > from
              ? assignment.occupied_at
              : from;
          const absenceEndDate =
            assignment.end_at && assignment.end_at < endProcessDate
              ? assignment.end_at
              : endProcessDate;

          for (
            let d = new Date(absenceStartDate);
            d <= absenceEndDate;
            d.setDate(d.getDate() + 1)
          ) {
            if (!includeSundays && d.getDay() === 0) continue;
            const dateStr = format(d, "yyyy-MM-dd");
            if (waivedDates.has(dateStr)) continue;

            const studentScheduled = await checkIfStudentScheduledForDay(
              student.wdt_ID,
              d.getDay(),
              assignment.daypackage
            );
            if (!studentScheduled) continue;

            const hasZoomLink = await prisma.wpos_zoom_links.count({
              where: {
                ustazid: t.ustazid,
                studentid: student.wdt_ID,
                sent_time: {
                  gte: new Date(`${dateStr}T00:00:00.000Z`),
                  lte: new Date(`${dateStr}T23:59:59.999Z`),
                },
              },
            });

            if (!hasZoomLink) {
              const packageRate =
                packageDeductionMap[student.package || ""]?.absence || 25;
              absenceDeduction += packageRate;
              absenceBreakdown.push({
                date: dateStr,
                reason: `Absence for ${student.name} (${student.package})`,
                deduction: packageRate,
                timeSlots: [`${student.name} (${student.package})`],
                uniqueTimeSlots: [`${student.name} (${student.package})`],
                permitted: false,
                reviewNotes: `Absence for ${student.name} (${student.package}): ${packageRate}ETB`,
                source: assignment.id ? "Active Assignment" : "Audit Log",
              });
            }
          }
        }

        // Calculate bonuses
        const bonuses = await prisma.qualityassessment.aggregate({
          where: {
            teacherId: t.ustazid,
            weekStart: { gte: from, lte: to },
            managerApproved: true,
          },
          _sum: { bonusAwarded: true },
        });
        const bonusAmount = Math.round(bonuses._sum?.bonusAwarded ?? 0);

        // Final calculations
        const finalBaseSalary = Math.round(baseSalary);
        const finalLatenessDeduction = Math.round(latenessDeduction);
        const finalAbsenceDeduction = Math.round(absenceDeduction);
        const finalBonusAmount = Math.round(bonusAmount);
        const totalSalary = Math.round(
          finalBaseSalary - finalLatenessDeduction + finalBonusAmount
        );

        // Log teacher salary calculation
        console.log(
          `💼 ${t.ustazname}: Salary calculated with ${assignments.length} active assignments, ${historicalAssignments.length} historical assignments, ${unmatchedZoomLinks.length} unmatched Zoom links`
        );

        const period = `${from.getFullYear()}-${String(
          from.getMonth() + 1
        ).padStart(2, "0")}`;
        const payment = await prisma.teachersalarypayment.findUnique({
          where: { teacherId_period: { teacherId: t.ustazid, period } },
          select: { status: true },
        });

        return {
          id: t.ustazid,
          name: t.ustazname,
          baseSalary: finalBaseSalary,
          latenessDeduction: finalLatenessDeduction,
          absenceDeduction: finalAbsenceDeduction,
          bonuses: finalBonusAmount,
          totalSalary,
          numStudents: allAssignments.length,
          teachingDays: dailyBreakdown.length,
          status: payment?.status || "Unpaid",
          breakdown: {
            dailyEarnings: dailyBreakdown.map((b, index) => ({
              date: `Day ${index + 1}`,
              amount: b.totalEarned,
              source: b.source,
            })),
            studentBreakdown: dailyBreakdown,
            latenessBreakdown,
            absenceBreakdown,
            summary: {
              workingDaysInMonth: dailyBreakdown.length,
              actualTeachingDays: dailyBreakdown.length,
              averageDailyEarning:
                dailyBreakdown.length > 0
                  ? Math.round(finalBaseSalary / dailyBreakdown.length)
                  : 0,
              totalDeductions: finalLatenessDeduction,
              netSalary: totalSalary,
            },
            unmatchedZoomLinks:
              unmatchedZoomLinks.length > 0 ? unmatchedZoomLinks : undefined,
          },
        };
      })
    );

    return NextResponse.json(results.filter(Boolean));
  } catch (error: any) {
    console.error("Error fetching teacher payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await rateLimiter.consume(ip).catch(() => {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    });

    const body = await req.json();
    const {
      teacherId,
      period,
      status,
      totalSalary,
      latenessDeduction,
      absenceDeduction,
      bonuses,
      processPaymentNow = false,
    } = body;

    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (
      !session ||
      (session.role !== "admin" && session.role !== "controller")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.id || undefined;
    if (!teacherId || !period || !status) {
      return NextResponse.json(
        { error: "Missing required fields: teacherId, period, status" },
        { status: 400 }
      );
    }

    if (processPaymentNow && status !== "Paid") {
      return NextResponse.json(
        { error: "Cannot process payment unless status is 'Paid'" },
        { status: 400 }
      );
    }
    if (processPaymentNow && totalSalary <= 0) {
      return NextResponse.json(
        { error: "Cannot process payment with non-positive totalSalary" },
        { status: 400 }
      );
    }

    let paymentResult = null;
    let transactionId = null;

    if (processPaymentNow && status === "Paid" && totalSalary > 0) {
      paymentResult = await processPayment(teacherId, totalSalary, period);
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: `Payment failed: ${paymentResult.error}` },
          { status: 400 }
        );
      }
      transactionId = paymentResult.transactionId;
    }

    const payment = await prisma.teachersalarypayment.upsert({
      where: {
        teacherId_period: { teacherId, period },
      },
      update: {
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
      create: {
        teacherId,
        period,
        status,
        paidAt: status === "Paid" ? new Date() : null,
        adminId,
        totalSalary,
        latenessDeduction,
        absenceDeduction,
        bonuses,
      },
    });

    await prisma.auditlog.create({
      data: {
        actionType: "teacher_salary_status_update",
        adminId: adminId || null,
        targetId: payment.id,
        details: JSON.stringify({
          teacherId,
          period,
          status,
          paymentProcessed: !!paymentResult?.success,
          transactionId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      paymentResult: paymentResult?.success
        ? { transactionId, status: paymentResult.status }
        : null,
    });
  } catch (err) {
    console.error("Error updating salary status:", err);
    return NextResponse.json(
      { error: "Failed to update salary status" },
      { status: 500 }
    );
  }
}
