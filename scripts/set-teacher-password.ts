// scripts/set-teacher-password.ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import prompts from "prompts";

const prisma = new PrismaClient();

async function main() {
  const { ustazid, password } = await prompts([
    {
      type: "text",
      name: "ustazid",
      message: "Enter the Ustaz ID (teacher ID) to set the password for:",
    },
    {
      type: "password",
      name: "password",
      message: "Enter the new password:",
    },
  ]);

  if (!ustazid || !password) {
    console.error("Ustaz ID and password are required.");
    return;
  }

  try {
    const teacher = await prisma.wpos_wpdatatable_24.findUnique({
      where: { ustazid },
    });

    if (!teacher) {
      console.error(`Teacher with ID "${ustazid}" not found.`);
      return;
    }

    const hashedPassword = await hash(password, 10);

    await prisma.wpos_wpdatatable_24.update({
      where: { ustazid },
      data: { password: hashedPassword },
    });

    console.log(`Successfully set password for teacher ${ustazid}.`);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
