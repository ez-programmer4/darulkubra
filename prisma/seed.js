const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Seed wpos_wpdatatable_24 (Ustaz)
  await prisma.wpos_wpdatatable_24.createMany({
    data: [
      {
        ustazid: "U1",
        ustazname: "FATUMA AHMED",
        schedule: "01:00,01:30,02:00,13:00,13:30,14:00",
        control: "Control1",
      },
      {
        ustazid: "U2",
        ustazname: "SEMIRA SHAFI",
        schedule: "03:00,03:30,04:00,18:00,18:30,19:00",
        control: "Control2",
      },
      {
        ustazid: "U3",
        ustazname: "KAFI YUSUF ABDULKADER",
        schedule: "05:00,05:30,06:00",
        control: "Control3",
      },
    ],
  });

  // Seed wpos_wpdatatable_33 (Registrals)
  await prisma.wpos_wpdatatable_33.createMany({
    data: [{ registral: "Registrar A" }, { registral: "Registrar B" }],
  });

  // Seed wpos_wpdatatable_28 (Referrals/Controls)
  await prisma.wpos_wpdatatable_28.createMany({
    data: [
      { name: "Ahmed", code: "REF001" },
      { name: "Marketing Team", code: "REF002" },
      { name: "Control1" },
      { name: "Control2" },
      { name: "Control3" },
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
