const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  // --- Clean up old test data first ---
  await prisma.student_attendance_progress.deleteMany({});
  await prisma.wpos_zoom_links.deleteMany({});
  await prisma.testResult.deleteMany({});
  await prisma.testAppointment.deleteMany({});
  await prisma.wpos_ustaz_occupied_times.deleteMany({});
  await prisma.Payment.deleteMany({});
  await prisma.ControllerEarning.deleteMany({});
  await prisma.AttendanceSubmissionLog.deleteMany({});
  await prisma.QualityAssessment.deleteMany({});
  await prisma.BonusRecord.deleteMany({});
  await prisma.LatenessRecord.deleteMany({});
  await prisma.AbsenceRecord.deleteMany({});
  await prisma.PermissionRequest.deleteMany({});
  await prisma.months_table.deleteMany({});
  await prisma.wpos_wpdatatable_23.deleteMany({
    where: { control: "control1" },
  });
  await prisma.wpos_wpdatatable_23.deleteMany({ where: { refer: "control1" } });
  await prisma.wpos_wpdatatable_28.deleteMany({
    where: { username: "control1" },
  });

  // --- Controller Earnings Test Data for "control1" (July 2025) ---

  // 1. Create a controller user (in wpos_wpdatatable_28)
  const controller = await prisma.wpos_wpdatatable_28.upsert({
    where: { username: "control1" },
    update: {},
    create: {
      username: "control1",
      name: "Test Controller",
      code: "CTRL001",
      password: await bcrypt.hash("testpassword", 10),
    },
  });

  // 2. Create students for this controller
  const testMonth = "2025-07";
  const testMonthDate = new Date("2025-07-01");
  let phonenoCounter = 10001;
  const studentsForControl1 = await Promise.all([
    // 10 Active students (7 paid, 3 unpaid)
    ...Array.from({ length: 7 }).map((_, i) =>
      prisma.wpos_wpdatatable_23.create({
        data: {
          name: `Active Paid Student ${i + 1}`,
          status: "Active",
          control: "control1",
          startdate: testMonthDate,
          registrationdate: testMonthDate,
          chatId: `chat${i + 1}`,
          phoneno: `0911${phonenoCounter + i}`,
        },
      })
    ),
    ...Array.from({ length: 3 }).map((_, i) =>
      prisma.wpos_wpdatatable_23.create({
        data: {
          name: `Active Unpaid Student ${i + 1}`,
          status: "Active",
          control: "control1",
          startdate: testMonthDate,
          registrationdate: testMonthDate,
          chatId: `chat${i + 8}`,
          phoneno: `0911${phonenoCounter + 7 + i}`,
        },
      })
    ),
    // 2 Not Yet students
    ...Array.from({ length: 2 }).map((_, i) =>
      prisma.wpos_wpdatatable_23.create({
        data: {
          name: `Not Yet Student ${i + 1}`,
          status: "Not Yet",
          control: "control1",
          startdate: testMonthDate,
          registrationdate: testMonthDate,
          chatId: `chatNY${i + 1}`,
          phoneno: `0911${phonenoCounter + 10 + i}`,
        },
      })
    ),
    // 6 Leave students (all start leave in July)
    ...Array.from({ length: 6 }).map((_, i) =>
      prisma.wpos_wpdatatable_23.create({
        data: {
          name: `Leave Student ${i + 1}`,
          status: "Leave",
          control: "control1",
          startdate: new Date("2025-07-05"),
          registrationdate: testMonthDate,
          phoneno: `0911${phonenoCounter + 12 + i}`,
        },
      })
    ),
    // 1 Ramadan Leave student
    prisma.wpos_wpdatatable_23.create({
      data: {
        name: "Ramadan Leave Student",
        status: "Ramadan Leave",
        control: "control1",
        startdate: testMonthDate,
        registrationdate: testMonthDate,
        phoneno: `0911${phonenoCounter + 18}`,
      },
    }),
  ]);

  // 3. Add payments for the 7 paid active students
  const paidActiveStudents = studentsForControl1.slice(0, 7);
  await Promise.all(
    paidActiveStudents.map((student) =>
      prisma.months_table.create({
        data: {
          studentid: student.wdt_ID,
          month: testMonth,
          payment_status: "approved",
          paid_amount: 100,
        },
      })
    )
  );

  // 4. Add 2 referenced students (became active and paid in July)
  const referencedStudents = await Promise.all([
    prisma.wpos_wpdatatable_23.create({
      data: {
        name: "Referenced Student 1",
        status: "Active",
        refer: "control1",
        startdate: testMonthDate,
        registrationdate: testMonthDate,
        phoneno: `0911${phonenoCounter + 19}`,
      },
    }),
    prisma.wpos_wpdatatable_23.create({
      data: {
        name: "Referenced Student 2",
        status: "Active",
        refer: "control1",
        startdate: testMonthDate,
        registrationdate: testMonthDate,
        phoneno: `0911${phonenoCounter + 20}`,
      },
    }),
  ]);
  await Promise.all(
    referencedStudents.map((student) =>
      prisma.months_table.create({
        data: {
          studentid: student.wdt_ID,
          month: testMonth,
          payment_status: "approved",
          paid_amount: 100,
        },
      })
    )
  );

  console.log("Seeded controller earnings test data for control1 (July 2025).");
  console.log("data seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
