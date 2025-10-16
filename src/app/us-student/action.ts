"use server";

import { prisma } from "@/lib/prisma";

export async function getStudents() {
  const data = await prisma.user.findMany({
    where: { role: "student" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      wpos_wpdatatable_23: {
        select: {
          wdt_ID: true,
          registrationdate: true,
        },
      },
    },
  });

  return data.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    wpos_wpdatatable_23Wdt_ID: user.wpos_wpdatatable_23?.wdt_ID || null,
    registrationDate: user.wpos_wpdatatable_23?.registrationdate || null,
  }));
}
