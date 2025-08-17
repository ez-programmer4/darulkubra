// scripts/setup-test-teacher.ts
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  try {
    // Find a teacher to use for testing
    const teacher = await prisma.wpos_wpdatatable_24.findFirst({
      select: {
        ustazid: true,
        ustazname: true,
      },
    });

    if (!teacher) {
      console.error("No teachers found in the database.");
      return;
    }

    // Set a test password
    const testPassword = "test123";
    const hashedPassword = await hash(testPassword, 10);

    await prisma.wpos_wpdatatable_24.update({
      where: { ustazid: teacher.ustazid },
      data: { password: hashedPassword },
    });
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
