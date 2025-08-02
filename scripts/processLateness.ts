import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(dateArg?: string) {
  const today = dateArg ? new Date(dateArg) : new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split("T")[0];

  // 1. Get lateness config
  const latenessConfigs = await prisma.deductionbonusconfig.findMany({
    where: { configType: "lateness" },
  });
  let excusedThreshold = 0;
  const tiers: Array<{ start: number; end: number; percent: number }> = [];
  let maxTierEnd = 0;
  latenessConfigs.forEach((cfg) => {
    if (cfg.key === "excusedThreshold") {
      excusedThreshold = parseInt(cfg.value, 10);
    } else if (cfg.key.startsWith("tier")) {
      const [, tierNum, field] = cfg.key.match(/tier(\d+)_(\w+)/) || [];
      if (!tierNum || !field) return;
      const idx = parseInt(tierNum, 10) - 1;
      if (!tiers[idx]) tiers[idx] = { start: 0, end: 0, percent: 0 };
      if (field === "start") tiers[idx].start = parseInt(cfg.value, 10);
      if (field === "end") tiers[idx].end = parseInt(cfg.value, 10);
      if (field === "percent") tiers[idx].percent = parseFloat(cfg.value);
      if (field === "end" && parseInt(cfg.value, 10) > maxTierEnd)
        maxTierEnd = parseInt(cfg.value, 10);
    }
  });

  // 2. Get all students with their teacher and scheduled time
  const students = await prisma.wpos_wpdatatable_23.findMany({
    include: {
      teacher: true,
    },
  });

  for (const student of students) {
    if (!student.selectedTime || !student.ustaz) continue;
    // Only process for today
    const scheduledTime = (() => {
      // Convert selectedTime (12h or 24h) to Date for today
      function to24Hour(time12h: string) {
        if (!time12h) return "00:00";
        if (
          time12h.includes(":") &&
          (time12h.includes("AM") || time12h.includes("PM"))
        ) {
          const [time, modifier] = time12h.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") hours = modifier === "AM" ? "00" : "12";
          else if (modifier === "PM") hours = String(parseInt(hours, 10) + 12);
          return `${hours.padStart(2, "0")}:${minutes}`;
        }
        return time12h; // already 24h
      }
      const time24 = to24Hour(student.selectedTime);
      return new Date(`${dateStr}T${time24}:00.000Z`);
    })();

    // 3. Find earliest zoom link sent time for this student/teacher/date
    const zoomLinks = await prisma.wpos_zoom_links.findMany({
      where: {
        studentid: student.wdt_ID,
        ustazid: student.ustaz,
        sent_time: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
      orderBy: { sent_time: "asc" },
    });
    const actualStartTime =
      zoomLinks.length > 0 ? zoomLinks[0].sent_time : null;
    if (!actualStartTime) continue;

    // 4. Calculate lateness
    const latenessMinutes = Math.max(
      0,
      Math.round((actualStartTime.getTime() - scheduledTime.getTime()) / 60000)
    );
    // 5. Determine deduction and tier
    let deductionApplied = 0;
    let deductionTier = "Excused";
    if (latenessMinutes > excusedThreshold) {
      let foundTier = false;
      for (const [i, tier] of tiers.entries()) {
        if (latenessMinutes >= tier.start && latenessMinutes <= tier.end) {
          deductionApplied = 30 * (tier.percent / 100); // 30 ETB daily rate
          deductionTier = `Tier ${i + 1}`;
          foundTier = true;
          break;
        }
      }
      if (!foundTier && latenessMinutes > maxTierEnd) {
        deductionApplied = 30; // Full daily rate
        deductionTier = "> Max Tier";
      }
    }

    // 6. Insert into LatenessRecord if not already present
    const exists = await prisma.latenessrecord.findFirst({
      where: {
        teacherId: student.ustaz,
        classDate: scheduledTime,
      },
    });
    if (!exists) {
      await prisma.latenessrecord.create({
        data: {
          teacherId: student.ustaz,
          classDate: scheduledTime,
          scheduledTime,
          actualStartTime,
          latenessMinutes,
          deductionApplied,
          deductionTier,
        },
      });
      console.log(
        `Inserted lateness for teacher ${student.ustaz} student ${student.wdt_ID} on ${dateStr}`
      );
    }
  }

  await prisma.$disconnect();
  console.log("Lateness processing complete.");
}

// Run for today or a provided date (YYYY-MM-DD)
main(process.argv[2]).catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
