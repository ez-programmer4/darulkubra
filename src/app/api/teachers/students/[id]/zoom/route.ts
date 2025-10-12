import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 403 }
      );
    }
    const teacherId = token.id as string;
    const studentId = Number(params.id);

    if (!Number.isFinite(studentId)) {
      return NextResponse.json(
        { error: "Invalid student id" },
        { status: 400 }
      );
    }
    const { link, tracking_token, expiration_date } = await req.json();
    if (!link) {
      return NextResponse.json({ error: "link is required" }, { status: 400 });
    }

    // Verify ownership and collect student messaging info
    const student = await prisma.wpos_wpdatatable_23.findUnique({
      where: { wdt_ID: studentId },
      select: {
        wdt_ID: true,
        country: true,
        ustaz: true,
        chatId: true,
        name: true,
        phoneno: true,
        package: true, // Need package for rate calculation
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.ustaz !== teacherId) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 });
    }

    // Coerce/validate fields - adjust for local timezone (Ethiopia is UTC+3)
    const now = new Date();
    const localTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Add 3 hours for Ethiopia timezone

    // Get package salary rate for this student
    let packageRate = 0;
    let packageId = student.package || "";
    let workingDays = 0; // Declare in outer scope

    if (student.package) {
      const packageSalary = await prisma.packageSalary.findFirst({
        where: { packageName: student.package },
      });

      if (packageSalary) {
        // Get Sunday inclusion setting
        const workingDaysConfig = await prisma.setting.findUnique({
          where: { key: "include_sundays_in_salary" },
        });
        const includeSundays = workingDaysConfig?.value === "true" || false;

        // Calculate working days based on Sunday setting
        const daysInMonth = new Date(
          localTime.getFullYear(),
          localTime.getMonth() + 1,
          0
        ).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(
            localTime.getFullYear(),
            localTime.getMonth(),
            day
          );
          if (includeSundays || date.getDay() !== 0) {
            workingDays++;
          }
        }

        packageRate = Math.round(
          Number(packageSalary.salaryPerStudent) / workingDays
        );

        console.log(`📊 Package Rate Calculation:`);
        console.log(`  Student: ${student.name} (ID: ${studentId})`);
        console.log(`  Package: ${student.package}`);
        console.log(`  Monthly Salary: ${packageSalary.salaryPerStudent}`);
        console.log(`  Working Days: ${workingDays}`);
        console.log(`  Daily Rate: ${packageRate}`);
        console.log(`  Include Sundays: ${includeSundays}`);
      } else {
        console.log(`⚠️ Package salary not found for: ${student.package}`);
      }
    } else {
      console.log(`⚠️ Student has no package: ${student.name}`);
    }
    const expiry = expiration_date ? new Date(expiration_date) : null;

    // Format as 12-hour time string
    const timeString = localTime.toLocaleTimeString("en-US", { hour12: true });

    // Format time as 12-hour with AM/PM for display
    const formattedTime = localTime.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const tokenToUse: string =
      (tracking_token && String(tracking_token)) ||
      crypto.randomBytes(16).toString("hex").toUpperCase();

    // We need to create the record first to get the ID for leave_url
    // Then update the link with the leave_url parameter

    // Persist record
    let created;
    try {
      console.log(`💾 Creating zoom link with package data:`);
      console.log(`  packageId: ${packageId}`);
      console.log(`  packageRate: ${packageRate}`);

      created = await prisma.wpos_zoom_links.create({
        data: {
          studentid: studentId,
          ustazid: teacherId,
          link: link,
          tracking_token: tokenToUse,
          sent_time: localTime,
          expiration_date: expiry ?? undefined,
          packageId: packageId,
          packageRate: packageRate,
          session_status: "active",
          last_activity_at: null,
          session_ended_at: null,
          session_duration_minutes: null,
        },
      });

      console.log(`✅ Zoom link created with ID: ${created.id}`);

      // Add leave_url to Zoom link for automatic teacher leave detection
      const host = req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") ?? "http";
      const baseUrl = `${proto}://${host}`;
      const leaveUrl = `${baseUrl}/api/zoom/teacher-left?session=${created.id}`;

      // Append leave_url to the Zoom link
      const enhancedZoomLink = link.includes("?")
        ? `${link}&leave_url=${encodeURIComponent(leaveUrl)}`
        : `${link}?leave_url=${encodeURIComponent(leaveUrl)}`;

      // Update the link with leave_url parameter
      await prisma.wpos_zoom_links.update({
        where: { id: created.id },
        data: { link: enhancedZoomLink },
      });

      console.log(`🔗 Enhanced Zoom link with teacher leave tracking`);

      // Verify the data was stored correctly
      const verification = await prisma.wpos_zoom_links.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          packageId: true,
          packageRate: true,
          studentid: true,
        },
      });
      console.log(`🔍 Verification query result:`, verification);
    } catch (createError: any) {
      console.error("Zoom link creation error:", createError);

      // Try raw SQL as fallback
      try {
        console.log(`💾 Fallback: Creating zoom link via raw SQL`);
        console.log(`  packageId: ${packageId}`);
        console.log(`  packageRate: ${packageRate}`);

        await prisma.$executeRaw`
          INSERT INTO wpos_zoom_links (studentid, ustazid, link, tracking_token, sent_time, expiration_date, packageId, packageRate, clicked_at, report, session_status, last_activity_at, session_ended_at, session_duration_minutes)
          VALUES (${studentId}, ${teacherId}, ${link}, ${tokenToUse}, ${localTime}, ${expiry}, ${packageId}, ${packageRate}, NULL, 0, 'active', NULL, NULL, NULL)
        `;

        console.log(`✅ Raw SQL zoom link created`);

        // Verification skipped to avoid schema issues

        // Get the created record using raw SQL to avoid schema issues
        const createdRecord = (await prisma.$queryRaw`
          SELECT id, studentid, ustazid, link, tracking_token, sent_time, packageId, packageRate
          FROM wpos_zoom_links 
          WHERE studentid = ${studentId} AND tracking_token = ${tokenToUse}
          ORDER BY id DESC 
          LIMIT 1
        `) as any[];

        if (!createdRecord || createdRecord.length === 0) {
          throw new Error("Failed to retrieve created zoom link");
        }

        created = createdRecord[0];
      } catch (rawError: any) {
        console.error("Raw SQL zoom link creation failed:", {
          error: rawError,
          code: rawError.code,
          message: rawError.message,
          meta: rawError.meta,
        });

        // Return a response instead of throwing to avoid 500 error
        return NextResponse.json(
          {
            error: "Database error",
            details: rawError.message || "Failed to create zoom link",
            notification_sent: false,
            notification_method: "none",
          },
          { status: 500 }
        );
      }
    }

    // Build tracking URL from request headers
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const baseUrl = `${proto}://${host}`;
    const trackURL = `${baseUrl}/api/zoom/track?token=${tokenToUse}`;

    // Check if we're in development mode
    const isDevelopment =
      host?.includes("localhost") || host?.includes("127.0.0.1");

    // Use direct link in development (Telegram doesn't allow localhost)
    // Use tracking URL in production
    const finalURL = isDevelopment ? link : trackURL;

    let notificationSent = false;
    let notificationError = null;

    if (student.country === "USA") {
      // send email
      await fetch(`https://darulkubra.com/api/email`, {
        method: "POST",
        body: JSON.stringify({ id: student.wdt_ID, token: tokenToUse }),
      });
    } else {
      // Send Telegram notification
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        notificationError = "Telegram bot token not configured";
        console.error("TELEGRAM_BOT_TOKEN environment variable is missing");
      } else if (!student.chatId) {
        notificationError = "Student has no Telegram chat ID";
      } else {
        try {
          const message = `📚 **Darulkubra Online Class Invitation**

🎓 Assalamu Alaikum ${student.name ?? "dear student"},

📅 **Class Details:**
• **Date:** ${localTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
• **Time:** ${localTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
• **Platform:** Zoom Meeting

🔗 **Join Instructions:**
Click the button below to join your online class session.

⏰ **Please join on time**
📖 **Have your materials ready**

*May Allah bless your learning journey*`;

          const requestPayload: any = {
            chat_id: student.chatId,
            text: message,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔗 Join Zoom Class",
                    url: finalURL,
                  },
                ],
              ],
            },
          };

          // Add retry logic for Telegram API calls
          let telegramResponse;
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              telegramResponse = await fetch(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "ZoomLinkBot/1.0",
                  },
                  body: JSON.stringify(requestPayload),
                  // Note: timeout is not supported in fetch, using AbortController instead
                }
              );
              break; // Success, exit retry loop
            } catch (error: any) {
              retryCount++;
              console.log(
                `Telegram API attempt ${retryCount} failed:`,
                error.message
              );

              if (retryCount >= maxRetries) {
                throw error; // Re-throw after max retries
              }

              // Wait before retry (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retryCount)
              );
            }
          }

          const responseData = await telegramResponse!.json();

          if (telegramResponse!.ok && responseData.ok) {
            notificationSent = true;
          } else {
            notificationError =
              responseData.description || "Telegram API error";
            console.error("❌ Telegram API error:", {
              error_code: responseData.error_code,
              description: responseData.description,
              parameters: responseData.parameters,
            });
          }
        } catch (err) {
          notificationError =
            err instanceof Error ? err.message : "Unknown error";
          console.error("❌ Telegram request failed:", err);
        }
      }
    }
    return NextResponse.json(
      {
        id: created.id,
        tracking_token: tokenToUse,
        tracking_url: finalURL,
        notification_sent: notificationSent,
        notification_method: notificationSent ? "telegram" : "none",
        notification_error: notificationError,
        student_name: student.name,
        student_chat_id: student.chatId,
        sent_time_formatted: timeString,
        package: student.package,
        daily_rate: packageRate,
        debug_info: {
          packageId_stored: packageId,
          packageRate_stored: packageRate,
          working_days_calculated: workingDays,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Zoom API - Error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
