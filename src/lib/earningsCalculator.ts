import { prisma } from "./prisma";

export interface ControllerEarnings {
  controllerId: string;
  controllerName: string;
  teamId: number;
  teamName: string;
  teamLeader: string;
  month: string;

  // Student Counts
  activeStudents: number;
  notYetStudents: number;
  leaveStudentsThisMonth: number;
  ramadanLeaveStudents: number;
  paidThisMonth: number;
  unpaidActiveThisMonth: number;
  referencedActiveStudents: number;
  linkedStudents: number;

  // Earnings Calculation
  baseEarnings: number;
  leavePenalty: number;
  unpaidPenalty: number;
  referencedBonus: number;
  totalEarnings: number;

  // Performance Metrics
  targetEarnings: number;
  achievementPercentage: number;
  growthRate: number;

  // Historical Data
  previousMonthEarnings: number;
  yearToDateEarnings: number;
}

export interface EarningsParams {
  yearMonth?: string; // Format: '2025-07'
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
  private startDate: string;
  private endDate: string;
  private config: EarningsConfig | null = null;

  constructor(yearMonth?: string) {
    this.yearMonth = yearMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
    this.startDate = `${this.yearMonth}-01`;
    this.endDate = new Date(
      new Date(this.startDate).setMonth(new Date(this.startDate).getMonth() + 1)
    )
      .toISOString()
      .slice(0, 10);
  }

  private async getEarningsConfig(): Promise<EarningsConfig> {
    if (this.config) return this.config;

    // Get the current active configuration
    const config = await prisma.controllerearningsconfig.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });

    if (!config) {
      // Return default values if no configuration exists
      this.config = {
        mainBaseRate: 40,
        referralBaseRate: 40,
        leavePenaltyMultiplier: 3,
        leaveThreshold: 5,
        unpaidPenaltyMultiplier: 2,
        referralBonusMultiplier: 4,
        targetEarnings: 3000,
      };
    } else {
      this.config = {
        mainBaseRate: config.mainBaseRate,
        referralBaseRate: config.referralBaseRate,
        leavePenaltyMultiplier: config.leavePenaltyMultiplier,
        leaveThreshold: config.leaveThreshold,
        unpaidPenaltyMultiplier: config.unpaidPenaltyMultiplier,
        referralBonusMultiplier: config.referralBonusMultiplier,
        targetEarnings: config.targetEarnings,
      };
    }

    return this.config;
  }

  async calculateControllerEarnings(
    params: EarningsParams = {}
  ): Promise<ControllerEarnings[]> {
    try {
      // Get the current earnings configuration
      const config = await this.getEarningsConfig();
      // Get controllers based on parameters
      let controllerIds: string[] = [];

      console.log("EarningsCalculator: params:", params);

      if (params.controllerId) {
        // If specific controller is requested, use only that one
        controllerIds = [params.controllerId];
        console.log(
          "EarningsCalculator: Using specific controller:",
          params.controllerId
        );
      } else {
        // Get all controllers from students table
        const students = await prisma.wpos_wpdatatable_23.findMany({
          where: {
            u_control: {
              not: null,
            },
          },
          select: {
            u_control: true,
          },
          distinct: ["u_control"],
        });

        controllerIds = students
          .map((s) => s.u_control)
          .filter(Boolean) as string[];
      }
      // For each controller, calculate earnings
      const earnings = await Promise.all(
        controllerIds.map(async (controllerId) => {
          // Get controller info
          const controller = await prisma.wpos_wpdatatable_28.findFirst({
            where: {
              code: controllerId,
            },
            select: {
              name: true,
              username: true,
            },
          });

          // Get student counts using Prisma's findMany instead of raw SQL
          const students = await prisma.wpos_wpdatatable_23.findMany({
            where: {
              u_control: controllerId,
            },
            select: {
              wdt_ID: true,
              status: true,
              startdate: true,
              registrationdate: true,
              chatId: true,
              refer: true,
              name: true,
            },
          });

          const activeStudentsArr = students.filter(
            (s) => s.status === "Active"
          );
          const notYetStudentsArr = students.filter(
            (s) => s.status === "Not Yet"
          );
          const leaveStudentsArr = students.filter(
            (s) =>
              s.status === "Leave" &&
              s.startdate &&
              s.startdate >= new Date(this.startDate) &&
              s.startdate <= new Date(this.endDate)
          );
          const ramadanLeaveStudentsArr = students.filter(
            (s) => s.status === "Ramadan Leave"
          );
          const linkedStudentsArr = students.filter(
            (s) =>
              (s.status === "Active" || s.status === "Not Yet") &&
              s.chatId &&
              s.chatId !== ""
          );

          // Get payment data
          const payments = await prisma.months_table.findMany({
            where: {
              studentid: {
                in: students.map((s) => s.wdt_ID),
              },
              month: this.yearMonth,
              payment_status: "paid",
            },
          });

          const paidThisMonthArr = students.filter((s) =>
            payments.some(
              (p) => p.studentid === s.wdt_ID && p.payment_status === "paid"
            )
          );
          const unpaidActiveArr = activeStudentsArr.filter(
            (s) =>
              !payments.some(
                (p) => p.studentid === s.wdt_ID && p.payment_status === "paid"
              )
          );

          // Get referenced students
          const referencedStudents = await prisma.wpos_wpdatatable_23.findMany({
            where: {
              refer: controllerId,
              status: "Active",
              startdate: {
                gte: new Date(this.startDate),
                lte: new Date(this.endDate),
              },
              registrationdate: {
                gte: new Date(`${this.yearMonth}-01`),
                lt: new Date(
                  new Date(`${this.yearMonth}-01`).setMonth(
                    new Date(`${this.yearMonth}-01`).getMonth() + 1
                  )
                ),
              },
            },
            include: {
              months_table: {
                where: {
                  month: this.yearMonth,
                  payment_status: "paid",
                },
              },
            },
          });

          const referencedActiveArr = referencedStudents.filter(
            (s) => s.months_table.length > 0 && !s.rigistral
          );

          // Calculate earnings using configurable rates
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

          // Get previous month earnings
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
            controllerId: controllerId,
            controllerName: controller?.name || controllerId,
            teamId: 1, // Default team ID since we don't have team relationships
            teamName: "Default Team",
            teamLeader: "System",
            month: this.yearMonth,

            // Student Counts
            activeStudents: activeStudentsArr.length,
            notYetStudents: notYetStudentsArr.length,
            leaveStudentsThisMonth: leaveStudentsArr.length,
            ramadanLeaveStudents: ramadanLeaveStudentsArr.length,
            paidThisMonth: paidThisMonthArr.length,
            unpaidActiveThisMonth: unpaidActiveArr.length,
            referencedActiveStudents: referencedActiveArr.length,
            linkedStudents: linkedStudentsArr.length,

            // Earnings Calculation
            baseEarnings,
            leavePenalty,
            unpaidPenalty,
            referencedBonus,
            totalEarnings,

            // Performance Metrics
            targetEarnings: config.targetEarnings,
            achievementPercentage:
              (totalEarnings / config.targetEarnings) * 100,
            growthRate,

            // Historical Data
            previousMonthEarnings: previousEarnings,
            yearToDateEarnings,
          };
        })
      );

      return earnings;
    } catch (error) {
      throw new Error("Failed to calculate controller earnings");
    }
  }

  private async getPreviousMonthEarnings(
    controllerId: string,
    month: string
  ): Promise<number> {
    try {
      const config = await this.getEarningsConfig();

      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          u_control: controllerId,
        },
        select: {
          wdt_ID: true,
          status: true,
          startdate: true,
        },
      });

      const activeStudents = students.filter(
        (s) => s.status === "Active"
      ).length;
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.startdate &&
          s.startdate >= new Date(`${month}-01`) &&
          s.startdate <= new Date(`${month}-31`)
      ).length;

      const payments = await prisma.months_table.findMany({
        where: {
          studentid: {
            in: students.map((s) => s.wdt_ID),
          },
          month: month,
        },
      });

      const unpaidStudents = students.filter(
        (s) =>
          s.status === "Active" &&
          !payments.some((p) => p.studentid === s.wdt_ID)
      ).length;

      return (
        activeStudents * config.mainBaseRate -
        Math.max(leaveStudents - config.leaveThreshold, 0) *
          config.leavePenaltyMultiplier *
          config.mainBaseRate -
        unpaidStudents * config.unpaidPenaltyMultiplier * config.mainBaseRate
      );
    } catch (error) {
      return 0;
    }
  }

  private async getYearToDateEarnings(controllerId: string): Promise<number> {
    try {
      const config = await this.getEarningsConfig();

      const currentYear = new Date().getFullYear();
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          u_control: controllerId,
          registrationdate: {
            gte: new Date(`${currentYear}-01-01`),
            lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
        select: {
          wdt_ID: true,
          status: true,
        },
      });

      const activeStudents = students.filter(
        (s) => s.status === "Active"
      ).length;
      const leaveStudents = students.filter((s) => s.status === "Leave").length;

      const payments = await prisma.months_table.findMany({
        where: {
          studentid: {
            in: students.map((s) => s.wdt_ID),
          },
          month: {
            startsWith: `${currentYear}-`,
          },
        },
      });

      const unpaidStudents = students.filter(
        (s) =>
          s.status === "Active" &&
          !payments.some((p) => p.studentid === s.wdt_ID)
      ).length;

      return (
        activeStudents * config.mainBaseRate -
        Math.max(leaveStudents - config.leaveThreshold, 0) *
          config.leavePenaltyMultiplier *
          config.mainBaseRate -
        unpaidStudents * config.unpaidPenaltyMultiplier * config.mainBaseRate
      );
    } catch (error) {
      return 0;
    }
  }
}
