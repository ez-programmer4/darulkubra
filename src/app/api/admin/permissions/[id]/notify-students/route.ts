import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

async function sendSMS(phone: string, message: string) {
  const apiToken = process.env.AFROMSG_API_TOKEN;
  const senderUid = process.env.AFROMSG_SENDER_UID;
  const senderName = process.env.AFROMSG_SENDER_NAME;

  if (apiToken && senderUid && senderName) {
    const payload = {
      from: senderUid,
      sender: senderName,
      to: phone,
      message,
    };

    const response = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  }
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teacherName, absenceDate, reason, timeSlots } = await req.json();
    const permissionId = parseInt(params.id);

    // Get permission request details
    const permission = await prisma.permissionrequest.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "Permission request not found" },
        { status: 404 }
      );
    }

    // Use actual date from permission request
    const actualDate = permission.requestedDate;
    const dateToUse = actualDate || absenceDate;
    const formattedDate = new Date(dateToUse).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get day name from date
    const dayName = new Date(dateToUse).toLocaleDateString('en-US', { weekday: 'long' });
    
    let studentsToNotify = [];
    
    // Check if it's whole day or specific time slots
    let isWholeDay = false;
    let selectedTimeSlots = [];
    
    if (timeSlots) {
      try {
        selectedTimeSlots = JSON.parse(timeSlots);
        isWholeDay = selectedTimeSlots.includes('Whole Day');
      } catch {}
    }
    
    if (isWholeDay) {
      // For whole day absence, notify all students assigned to this teacher for this day
      studentsToNotify = await prisma.wpos_wpdatatable_23.findMany({
        where: { 
          ustaz: permission.teacherId,
          OR: [
            { daypackages: { contains: 'All days' } },
            { daypackages: { contains: dayName } }
          ]
        },
        select: {
          wdt_ID: true,
          name: true,
          phoneno: true,
          chatId: true,
        },
      });
    } else if (selectedTimeSlots.length > 0) {
      // Helper function to normalize time formats for matching
      const normalizeTimeSlot = (slot: string) => {
        if (slot.includes('AM') || slot.includes('PM')) {
          return slot.replace(/(\d)(AM|PM)/g, '$1 $2');
        }
        if (slot.includes(' - ') && slot.includes(':')) {
          const [start, end] = slot.split(' - ');
          const formatTime = (time: string) => {
            const cleanTime = time.split(':').slice(0, 2).join(':');
            const [hour, minute] = cleanTime.split(':');
            const h = parseInt(hour);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${displayHour}:${minute} ${ampm}`;
          };
          return `${formatTime(start)} - ${formatTime(end)}`;
        }
        return slot;
      };
      
      // Get all occupied times for this teacher
      const allOccupiedTimes = await prisma.wpos_ustaz_occupied_times.findMany({
        where: {
          ustaz_id: permission.teacherId
        },
        include: {
          student: {
            select: {
              wdt_ID: true,
              name: true,
              phoneno: true,
              chatId: true,
              daypackages: true
            }
          }
        }
      });
      
      // Normalize selected time slots for comparison
      const normalizedSelectedSlots = selectedTimeSlots.map((slot: string) => normalizeTimeSlot(slot));
      
      // Filter students who have classes matching the selected time slots
      const affectedStudentIds = new Set();
      allOccupiedTimes.forEach(ot => {
        const normalizedDbSlot = normalizeTimeSlot(ot.time_slot);
        const studentDayPackages = ot.student.daypackages;
        
        // Check if this time slot matches any selected slot and student has class on this day
        const slotMatches = normalizedSelectedSlots.some((selectedSlot: string) => 
          normalizedDbSlot === selectedSlot || 
          normalizedDbSlot.includes(selectedSlot) ||
          selectedSlot.includes(normalizedDbSlot)
        );
        
        if (slotMatches && studentDayPackages && (
          studentDayPackages.includes('All days') || 
          studentDayPackages.includes(dayName)
        )) {
          affectedStudentIds.add(ot.student.wdt_ID);
        }
      });
      
      studentsToNotify = allOccupiedTimes
        .filter(ot => affectedStudentIds.has(ot.student.wdt_ID))
        .map(ot => ot.student)
        .filter((student, index, arr) => 
          arr.findIndex(s => s.wdt_ID === student.wdt_ID) === index
        ); // Remove duplicates
    } else {
      // Fallback: notify all students if no time slot info
      studentsToNotify = await prisma.wpos_wpdatatable_23.findMany({
        where: { ustaz: permission.teacherId },
        select: {
          wdt_ID: true,
          name: true,
          phoneno: true,
          chatId: true,
        },
      });
    }

    let smsCount = 0;
    let telegramCount = 0;
    const methods = [];

    // Enhanced message with time slot information
    let timeSlotInfo = "";
    if (timeSlots) {
      try {
        const slots = JSON.parse(timeSlots);
        if (slots.includes('Whole Day')) {
          timeSlotInfo = " for the entire day";
        } else if (slots.length > 0) {
          timeSlotInfo = ` during ${slots.length} class${slots.length > 1 ? 'es' : ''} (${slots.slice(0, 2).join(', ')}${slots.length > 2 ? '...' : ''})`;
        }
      } catch {}
    }
    
    const message = `Dear Student, your teacher ${
      teacherName || "your teacher"
    } will be absent on ${formattedDate}${timeSlotInfo} due to ${
      reason || "personal reasons"
    }. Please check for any schedule changes. - Darul Kubra`;

    // Send SMS notifications
    for (const student of studentsToNotify) {
      if (student.phoneno) {
        try {
          const smsSent = await sendSMS(student.phoneno, message);
          if (smsSent) {
            smsCount++;
          }
        } catch (error) {
          console.error(
            `Failed to send SMS to student ${student.wdt_ID}:`,
            error
          );
        }
      }
    }

    // Send Telegram notifications (if bot token is available)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      for (const student of studentsToNotify) {
        if (student.chatId) {
          try {
            const telegramResponse = await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: student.chatId,
                  text: `📚 ${message}`,
                  parse_mode: "Markdown",
                }),
              }
            );

            if (telegramResponse.ok) {
              telegramCount++;
            }
          } catch (error) {
            console.error(
              `Failed to send Telegram to student ${student.wdt_ID}:`,
              error
            );
          }
        }
      }
    }

    if (smsCount > 0) methods.push("SMS");
    if (telegramCount > 0) methods.push("Telegram");

    const totalSent = smsCount + telegramCount;

    return NextResponse.json({
      success: totalSent > 0,
      sentCount: totalSent,
      smsCount,
      telegramCount,
      methods,
      totalStudents: studentsToNotify.length,
      message: `Notified ${totalSent} students out of ${studentsToNotify.length} affected students`,
      notificationType: isWholeDay ? 'whole_day' : 'specific_time_slots',
      affectedTimeSlots: isWholeDay ? ['Whole Day'] : selectedTimeSlots,
    });
  } catch (error) {
    console.error("Notify students error:", error);
    return NextResponse.json(
      { error: "Failed to notify students" },
      { status: 500 }
    );
  }
}
