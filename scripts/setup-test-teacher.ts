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

    console.log("Found teacher:", {
      id: teacher.ustazid,
      name: teacher.ustazname,
    });

    // Set a test password
    const testPassword = "test123";
    const hashedPassword = await hash(testPassword, 10);

    await prisma.wpos_wpdatatable_24.update({
      where: { ustazid: teacher.ustazid },
      data: { password: hashedPassword },
    });

    console.log("\nTest account set up successfully:");
    console.log("--------------------------------");
    console.log("Teacher ID:", teacher.ustazid);
    console.log("Teacher Name:", teacher.ustazname);
    console.log("Password:", testPassword);
    console.log("--------------------------------");
    console.log(
      "\nYou can now use these credentials to log in at /teachers/login"
    );
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
