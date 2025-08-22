import { prisma } from "./prisma";
import { startOfMonth, endOfMonth, isValid, subDays, addDays } from "date-fns";

export interface ControllerEarnings {
  controllerId: string;
  controllerName: string;
  teamId: number;
  teamName: string;
  teamLeader: string;
  month: string;
  activeStudents: number;
  notYetStudents: number;
  leaveStudentsThisMonth: number;
  ramadanLeaveStudents: number;
  paidThisMonth: number;
  unpaidActiveThisMonth: number;
  referencedActiveStudents: number;
  linkedStudents: number;
  baseEarnings: number;
  leavePenalty: number;
  unpaidPenalty: number;
  referencedBonus: number;
  totalEarnings: number;
  targetEarnings: number;
  achievementPercentage: number;
  growthRate: number;
  previousMonthEarnings: number;
  yearToDateEarnings: number;
}

export interface EarningsParams {
  yearMonth?: string;
  controllerId?: string;
  teamId?: number;
}

export interface EarningsConfig {
  mainBaseRate: number;
  referralBaseRate: number;
  leavePenaltyMultiplier: number;
  leaveThreshold: number;
  unpaidPenaltyMultiplier: number;
  referralBonusMultiplier: number;
  targetEarnings: number;
}

export class EarningsCalculator {
  private yearMonth: string;
  private startDate: Date;
  private endDate: Date;
  private config: EarningsConfig | null = null;

  constructor(yearMonth?: string) {
    this.yearMonth = yearMonth || new Date().toISOString().slice(0, 7);
    this.startDate = startOfMonth(new Date(`${this.yearMonth}-01`));
    this.endDate = endOfMonth(new Date(`${this.yearMonth}-01`));
  }

  private async getEarningsConfig(): Promise<EarningsConfig> {
    if (this.config) return this.config;

    const config = await prisma.controllerearningsconfig.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });

    this.config = config
      ? {
          mainBaseRate: config.mainBaseRate,
          referralBaseRate: config.referralBaseRate,
          leavePenaltyMultiplier: config.leavePenaltyMultiplier,
          leaveThreshold: config.leaveThreshold,
          unpaidPenaltyMultiplier: config.unpaidPenaltyMultiplier,
          referralBonusMultiplier: config.referralBonusMultiplier,
          targetEarnings: config.targetEarnings,
        }
      : {
          mainBaseRate: 40,
          referralBaseRate: 40,
          leavePenaltyMultiplier: 3,
          leaveThreshold: 5,
          unpaidPenaltyMultiplier: 2,
          referralBonusMultiplier: 4,
          targetEarnings: 3000,
        };

    return this.config;
  }

  async calculateControllerEarnings(
    params: EarningsParams = {}
  ): Promise<ControllerEarnings[]> {
    try {
      const config = await this.getEarningsConfig();
      let controllerIds: string[] = [];

      if (params.controllerId) {
        const controllerExists = await prisma.wpos_wpdatatable_28.findFirst({
          where: { code: params.controllerId },
        });
        if (!controllerExists) {
          console.warn(`Controller ${params.controllerId} not found`);
          return [];
        }
        controllerIds = [params.controllerId];
      } else {
        const students = await prisma.wpos_wpdatatable_23.findMany({
          where: { u_control: { not: null } },
          select: { u_control: true },
          distinct: ["u_control"],
        });
        controllerIds = students
          .map((s) => s.u_control)
          .filter(Boolean) as string[];

        const validControllers = await prisma.wpos_wpdatatable_28.findMany({
          where: { code: { in: controllerIds } },
          select: { code: true },
        });
        const validControllerIds = new Set(validControllers.map((c) => c.code));
        controllerIds = controllerIds.filter((id) =>
          validControllerIds.has(id)
        );
        if (controllerIds.length === 0) {
          console.warn("No valid controllers found");
          return [];
        }
      }

      const earnings = await Promise.all(
        controllerIds.map(async (controllerId) => {
          const controller = await prisma.wpos_wpdatatable_28.findFirst({
            where: { code: controllerId },
            select: { name: true, username: true },
          });

          if (!controller) {
            console.warn(
              `Controller ${controllerId} not found in wpos_wpdatatable_28`
            );
            return null;
          }

          const students = await prisma.wpos_wpdatatable_23.findMany({
            where: {
              AND: [
                { u_control: controllerId },
                { u_control: { not: null } },
                { u_control: { not: "" } },
              ],
            },
            select: {
              wdt_ID: true,
              status: true,
              startdate: true,
              registrationdate: true,
              chatId: true,
              refer: true,
              name: true,
              u_control: true,
            },
          });

          // Filter students for this controller
          const actualStudents = students.filter(
            (s) => s.u_control === controllerId
          );
          const activeStudentsArr = actualStudents.filter(
            (s) => s.status === "Active"
          );
          const notYetStudentsArr = actualStudents.filter(
            (s) => s.status === "Not Yet"
          );

          // Filter leave students for the selected month using startdate
          const leaveStudentsArr = actualStudents.filter(
            (s) =>
              s.status === "Leave" &&
              s.startdate &&
              s.startdate >= this.startDate &&
              s.startdate <= this.endDate
          );

          // Debug logging for leave students
          console.log(`\n=== DEBUGGING CONTROLLER ${controllerId} ===`);
          console.log(`Month: ${this.yearMonth}`);
          console.log(`Total students queried: ${students.length}`);
          console.log(`Students matching controller: ${actualStudents.length}`);
          console.log(`Active students: ${activeStudentsArr.length}`);
          console.log(`Not Yet students: ${notYetStudentsArr.length}`);
          console.log(
            `Leave students in ${this.yearMonth}: ${leaveStudentsArr.length}`
          );
          if (leaveStudentsArr.length > 0) {
            console.log(`Leave students details:`);
            leaveStudentsArr.forEach((s) => {
              console.log(
                `  Student: ${s.name}, ID: ${s.wdt_ID}, Status: ${
                  s.status
                }, Start Date: ${s.startdate?.toISOString() || "N/A"}`
              );
            });
          }

          const ramadanLeaveStudentsArr = actualStudents.filter(
            (s) => s.status === "Ramadan Leave"
          );
          const linkedStudentsArr = actualStudents.filter(
            (s) =>
              (s.status === "Active" || s.status === "Not Yet") &&
              s.chatId &&
              s.chatId !== ""
          );

          // Payment calculations with buffer dates
          const paymentStartDate = subDays(this.startDate, 7);
          const paymentEndDate = addDays(this.endDate, 7);

          const monthPayments = await prisma.months_table.findMany({
            where: {
              studentid: { in: actualStudents.map((s) => s.wdt_ID) },
              OR: [
                {
                  month: this.yearMonth,
                  payment_status: { in: ["paid", "Paid"] },
                },
                { month: this.yearMonth, is_free_month: true },
              ],
            },
          });

          const paymentRecords = await prisma.payment.findMany({
            where: {
              studentid: { in: actualStudents.map((s) => s.wdt_ID) },
              paymentdate: { gte: paymentStartDate, lte: paymentEndDate },
              status: { in: ["completed", "Completed"] },
            },
          });

          const paidStudentIds = new Set([
            ...monthPayments.map((p) => p.studentid),
            ...paymentRecords.map((p) => p.studentid),
          ]);

          const paidThisMonthArr = activeStudentsArr.filter((s) =>
            paidStudentIds.has(s.wdt_ID)
          );
          const unpaidActiveArr = activeStudentsArr.filter(
            (s) => !paidStudentIds.has(s.wdt_ID)
          );

          // Log unpaid students
          if (unpaidActiveArr.length > 0) {
            console.log(`Unpaid active students: ${unpaidActiveArr.length}`);
            unpaidActiveArr.forEach((s) => {
              console.log(`  Unpaid Student: ${s.name}, ID: ${s.wdt_ID}`);
            });
          }

          const referencedStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: {
              refer: controllerId,
              status: "Active",
              startdate: { gte: this.startDate, lte: this.endDate },
              registrationdate: { gte: this.startDate, lte: this.endDate },
            },
            include: {
              months_table: {
                where: {
                  month: this.yearMonth,
                  OR: [
                    { payment_status: { in: ["paid", "Paid"] } },
                    { is_free_month: true },
                  ],
                },
              },
              payment: {
                where: {
                  paymentdate: { gte: paymentStartDate, lte: paymentEndDate },
                  status: { in: ["completed", "Completed"] },
                },
              },
            },
          });

          const referencedActiveArr = referencedStudents.filter(
            (s) =>
              (s.months_table.length > 0 || s.payment.length > 0) &&
              !s.rigistral
          );

          const baseEarnings = activeStudentsArr.length * config.mainBaseRate;
          const leavePenalty =
            Math.max(leaveStudentsArr.length - config.leaveThreshold, 0) *
            config.leavePenaltyMultiplier *
            config.mainBaseRate;
          const unpaidPenalty =
            unpaidActiveArr.length *
            config.unpaidPenaltyMultiplier *
            config.mainBaseRate;
          const referencedBonus =
            referencedActiveArr.length *
            config.referralBonusMultiplier *
            config.referralBaseRate;
          const totalEarnings =
            baseEarnings - leavePenalty - unpaidPenalty + referencedBonus;

          // Detailed earnings debug
          console.log(`\n=== EARNINGS FOR CONTROLLER ${controllerId} ===`);
          console.log(
            `Base Earnings: ${activeStudentsArr.length} * ${config.mainBaseRate} = ${baseEarnings}`
          );
          console.log(
            `Leave Penalty: max(${leaveStudentsArr.length} - ${config.leaveThreshold}, 0) * ${config.leavePenaltyMultiplier} * ${config.mainBaseRate} = ${leavePenalty}`
          );
          console.log(
            `Unpaid Penalty: ${unpaidActiveArr.length} * ${config.unpaidPenaltyMultiplier} * ${config.mainBaseRate} = ${unpaidPenalty}`
          );
          console.log(
            `Referenced Bonus: ${referencedActiveArr.length} * ${config.referralBonusMultiplier} * ${config.referralBaseRate} = ${referencedBonus}`
          );
          console.log(
            `Total Earnings: ${baseEarnings} - ${leavePenalty} - ${unpaidPenalty} + ${referencedBonus} = ${totalEarnings}`
          );
          console.log(`===============================\n`);

          const previousMonth = new Date(this.startDate);
          previousMonth.setMonth(previousMonth.getMonth() - 1);
          const previousMonthStr = previousMonth.toISOString().slice(0, 7);

          const previousEarnings = await this.getPreviousMonthEarnings(
            controllerId,
            previousMonthStr
          );
          const yearToDateEarnings = await this.getYearToDateEarnings(
            controllerId
          );

          const growthRate =
            previousEarnings > 0
              ? ((totalEarnings - previousEarnings) / previousEarnings) * 100
              : 0;

          return {
            controllerId,
            controllerName: controller.name || controllerId,
            teamId: 1,
            teamName: "Default Team",
            teamLeader: "System",
            month: this.yearMonth,
            activeStudents: activeStudentsArr.length,
            notYetStudents: notYetStudentsArr.length,
            leaveStudentsThisMonth: leaveStudentsArr.length,
            ramadanLeaveStudents: ramadanLeaveStudentsArr.length,
            paidThisMonth: paidThisMonthArr.length,
            unpaidActiveThisMonth: unpaidActiveArr.length,
            referencedActiveStudents: referencedActiveArr.length,
            linkedStudents: linkedStudentsArr.length,
            baseEarnings,
            leavePenalty,
            unpaidPenalty,
            referencedBonus,
            totalEarnings,
            targetEarnings: config.targetEarnings,
            achievementPercentage:
              (totalEarnings / config.targetEarnings) * 100,
            growthRate,
            previousMonthEarnings: previousEarnings,
            yearToDateEarnings,
          };
        })
      );

      return earnings.filter((e): e is ControllerEarnings => e !== null);
    } catch (error: any) {
      console.error(
        "Failed to calculate controller earnings:",
        error.message,
        error.stack
      );
      throw new Error(
        `Failed to calculate controller earnings: ${error.message}`
      );
    }
  }

  private async getPreviousMonthEarnings(
    controllerId: string,
    month: string
  ): Promise<number> {
    try {
      const config = await this.getEarningsConfig();
      const startDate = startOfMonth(new Date(`${month}-01`));
      const endDate = endOfMonth(new Date(`${month}-01`));
      const paymentStartDate = subDays(startDate, 7);
      const paymentEndDate = addDays(endDate, 7);

      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: { u_control: controllerId },
        select: { wdt_ID: true, status: true, startdate: true },
      });

      const activeStudents = students.filter(
        (s) => s.status === "Active"
      ).length;
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.startdate &&
          s.startdate >= startDate &&
          s.startdate <= endDate
      ).length;

      const monthPayments = await prisma.months_table.findMany({
        where: {
          studentid: { in: students.map((s) => s.wdt_ID) },
          month,
          OR: [
            { payment_status: { in: ["paid", "Paid"] } },
            { is_free_month: true },
          ],
        },
      });

      const paymentRecords = await prisma.payment.findMany({
        where: {
          studentid: { in: students.map((s) => s.wdt_ID) },
          paymentdate: { gte: paymentStartDate, lte: paymentEndDate },
          status: { in: ["completed", "Completed"] },
        },
      });

      const paidStudentIds = new Set([
        ...monthPayments.map((p) => p.studentid),
        ...paymentRecords.map((p) => p.studentid),
      ]);

      const unpaidStudents = students.filter(
        (s) => s.status === "Active" && !paidStudentIds.has(s.wdt_ID)
      ).length;

      return (
        activeStudents * config.mainBaseRate -
        Math.max(leaveStudents - config.leaveThreshold, 0) *
          config.leavePenaltyMultiplier *
          config.mainBaseRate -
        unpaidStudents * config.unpaidPenaltyMultiplier * config.mainBaseRate
      );
    } catch (error) {
      console.error(
        `Failed to calculate previous month earnings for ${controllerId}:`,
        error
      );
      return 0;
    }
  }

  private async getYearToDateEarnings(controllerId: string): Promise<number> {
    try {
      const config = await this.getEarningsConfig();
      const currentYear = new Date().getFullYear();
      const startDate = new Date(`${currentYear}-01-01`);
      const endDate = new Date(`${currentYear + 1}-01-01`);

      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          u_control: controllerId,
          registrationdate: { gte: startDate, lt: endDate },
        },
        select: { wdt_ID: true, status: true, startdate: true },
      });

      const activeStudents = students.filter(
        (s) => s.status === "Active"
      ).length;
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.startdate &&
          s.startdate >= startDate &&
          s.startdate <= endDate
      ).length;

      const monthPayments = await prisma.months_table.findMany({
        where: {
          studentid: { in: students.map((s) => s.wdt_ID) },
          month: { startsWith: `${currentYear}-` },
          OR: [
            { payment_status: { in: ["paid", "Paid"] } },
            { is_free_month: true },
          ],
        },
      });

      const paymentRecords = await prisma.payment.findMany({
        where: {
          studentid: { in: students.map((s) => s.wdt_ID) },
          paymentdate: { gte: startDate, lte: endDate },
          status: { in: ["completed", "Completed"] },
        },
      });

      const paidStudentIds = new Set([
        ...monthPayments.map((p) => p.studentid),
        ...paymentRecords.map((p) => p.studentid),
      ]);

      const unpaidStudents = students.filter(
        (s) => s.status === "Active" && !paidStudentIds.has(s.wdt_ID)
      ).length;

      return (
        activeStudents * config.mainBaseRate -
        Math.max(leaveStudents - config.leaveThreshold, 0) *
          config.leavePenaltyMultiplier *
          config.mainBaseRate -
        unpaidStudents * config.unpaidPenaltyMultiplier * config.mainBaseRate
      );
    } catch (error) {
      console.error(
        `Failed to calculate YTD earnings for ${controllerId}:`,
        error
      );
      return 0;
    }
  }
}
