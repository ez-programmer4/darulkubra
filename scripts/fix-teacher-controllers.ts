import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const controllers = await prisma.wpos_wpdatatable_28.findMany({
    select: { code: true },
  });
  const validCodes = new Set(
    controllers.map((c) => (c.code ? c.code.trim().toUpperCase() : ""))
  );

  const teachers = await prisma.wpos_wpdatatable_24.findMany();
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const teacher of teachers) {
    if (!teacher.control) {
      notFound++;
      console.log(
        `Teacher ${teacher.ustazid} (${teacher.ustazname}) has no controller assigned.`
      );
      continue;
    }
    const original = teacher.control;
    const normalized = teacher.control.trim().toUpperCase();
    if (validCodes.has(normalized)) {
      if (teacher.control !== normalized) {
        await prisma.wpos_wpdatatable_24.update({
          where: { ustazid: teacher.ustazid },
          data: { control: normalized },
        });
        updated++;
        console.log(
          `Updated teacher ${teacher.ustazid} (${teacher.ustazname}): '${original}' -> '${normalized}'`
        );
      } else {
        skipped++;
      }
    } else {
      notFound++;
      console.log(
        `Teacher ${teacher.ustazid} (${teacher.ustazname}): controller code '${original}' does not match any valid controller.`
      );
    }
  }

  console.log("\nSummary:");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Not found or invalid: ${notFound}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
