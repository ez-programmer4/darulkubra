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

      // Use raw SQL query similar to PHP implementation
      const rawQuery = `
        SELECT
          'Default Team' AS Team_Name,
          1 AS Team_ID,
          'System' AS Team_Leader,
          uc_names.name AS U_Control_Name,
          a.u_control,
          COUNT(DISTINCT CASE 
            WHEN a.status='Active'
              AND (a.exitdate IS NULL OR a.exitdate >= ?)
              AND (a.registrationdate IS NULL OR a.registrationdate <= ?)
            THEN a.wdt_ID 
          END) AS Active_Students,
          COUNT(DISTINCT CASE WHEN a.status='Not Yet' THEN a.wdt_ID END) AS Not_Yet_Students,
          COUNT(DISTINCT CASE WHEN a.status='Leave' AND a.exitdate BETWEEN ? AND ? THEN a.wdt_ID END) AS Leave_Students_This_Month,
          COUNT(DISTINCT CASE WHEN a.status='Ramadan Leave' THEN a.wdt_ID END) AS Ramadan_Leave,
          COUNT(DISTINCT CASE 
            WHEN m.month = ? AND (
              UPPER(m.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR m.is_free_month = 1
            )
            THEN m.studentid 
          END) AS Paid_This_Month,
          COUNT(DISTINCT CASE 
            WHEN a.status='Active'
            AND NOT EXISTS(
              SELECT 1 FROM months_table sm
              WHERE sm.studentid=a.wdt_ID 
                AND sm.month=? 
                AND (UPPER(sm.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR sm.is_free_month = 1)
            )
            THEN a.wdt_ID 
          END) AS Unpaid_Active_This_Month,
          (
            SELECT COUNT(DISTINCT b.wdt_ID)
            FROM wpos_wpdatatable_23 b
            JOIN months_table pm ON pm.studentid = b.wdt_ID 
              AND pm.month = ? 
              AND (UPPER(pm.payment_status) IN ('PAID','COMPLETE','SUCCESS') OR pm.is_free_month = 1)
            WHERE b.status = 'Active'
              AND b.refer = a.u_control
              AND b.startdate BETWEEN ? AND ?
              AND DATE_FORMAT(b.registrationdate,'%Y-%m') = ?
              AND b.rigistral IS NULL
          ) AS Referenced_Active_Students,
          COUNT(DISTINCT CASE 
            WHEN a.status IN('Active','Not Yet')
            AND a.chat_id IS NOT NULL
            AND a.chat_id!=''
            THEN a.wdt_ID 
          END) AS Linked_Students
        FROM wpos_wpdatatable_23 a
        LEFT JOIN months_table m ON a.wdt_ID = m.studentid
        LEFT JOIN wpos_wpdatatable_28 uc_names ON a.u_control = uc_names.code
        WHERE a.u_control != '' AND a.u_control IS NOT NULL
        ${
          params.controllerId
            ? "AND TRIM(LOWER(a.u_control)) = TRIM(LOWER(?))"
            : ""
        }
        GROUP BY a.u_control, uc_names.name
      `;

      const queryParams = [
        // Active window bounds
        this.startDate.toISOString().split("T")[0], // Active: exitdate >= start of month
        this.endDate.toISOString().split("T")[0], // Active: registrationdate <= end of month
        // Leave students window
        this.startDate.toISOString().split("T")[0], // start date for leave students
        this.endDate.toISOString().split("T")[0], // end date for leave students
        // Paid this month
        this.yearMonth, // month for paid students
        // Unpaid check month
        this.yearMonth, // month for unpaid check
        // Referenced students month and window
        this.yearMonth, // month for referenced students (paid)
        this.startDate.toISOString().split("T")[0], // start date for referenced students
        this.endDate.toISOString().split("T")[0], // end date for referenced students
        this.yearMonth, // registration month for referenced students
      ];

      if (params.controllerId) {
        queryParams.push(params.controllerId);
      }

      const results = (await prisma.$queryRawUnsafe(
        rawQuery,
        ...queryParams
      )) as any[];

      const earnings = await Promise.all(
        results.map(async (row: any) => {
          const controllerId = row.u_control;
          const activeStudents = Number(row.Active_Students);
          const leaveStudents = Number(row.Leave_Students_This_Month);
          const unpaidActive = Number(row.Unpaid_Active_This_Month);
          const referencedActive = Number(row.Referenced_Active_Students);
          const paidThisMonth = Number(row.Paid_This_Month);

          // Calculate earnings using the exact PHP formula
          const baseEarnings = activeStudents * config.mainBaseRate;
          const leavePenalty =
            Math.max(leaveStudents - config.leaveThreshold, 0) *
            config.leavePenaltyMultiplier *
            config.mainBaseRate;
          const unpaidPenalty =
            unpaidActive * config.unpaidPenaltyMultiplier * config.mainBaseRate;
          const referencedBonus =
            referencedActive *
            config.referralBonusMultiplier *
            config.referralBaseRate;
          const totalEarnings =
            baseEarnings - leavePenalty - unpaidPenalty + referencedBonus;

          // Get previous month earnings for growth calculation
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
            controllerName: row.U_Control_Name || controllerId,
            teamId: Number(row.Team_ID),
            teamName: row.Team_Name,
            teamLeader: row.Team_Leader,
            month: this.yearMonth,
            activeStudents,
            notYetStudents: Number(row.Not_Yet_Students),
            leaveStudentsThisMonth: leaveStudents,
            ramadanLeaveStudents: Number(row.Ramadan_Leave),
            paidThisMonth,
            unpaidActiveThisMonth: unpaidActive,
            referencedActiveStudents: referencedActive,
            linkedStudents: Number(row.Linked_Students),
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

      return earnings;
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

      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: { u_control: controllerId },
        select: {
          wdt_ID: true,
          status: true,
          exitdate: true,
          package: true, // Added package field
        },
      });

      const activeStudentsArr = students.filter(
        (s) => s.status === "Active" && s.package !== "0 fee"
      );
      const activeStudents = activeStudentsArr.length;
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.exitdate &&
          s.exitdate >= startDate &&
          s.exitdate <= endDate
      ).length;

      const monthPayments = await prisma.months_table.findMany({
        where: {
          studentid: { in: activeStudentsArr.map((s) => s.wdt_ID) },
          month,
          OR: [
            {
              payment_status: {
                in: [
                  "paid",
                  "Paid",
                  "PAID",
                  "complete",
                  "Complete",
                  "COMPLETE",
                  "success",
                  "Success",
                  "SUCCESS",
                ],
              },
            },
            { is_free_month: true },
          ],
        },
        select: { studentid: true },
        distinct: ["studentid"],
      });

      const paidStudentIds = new Set(monthPayments.map((p) => p.studentid));
      const unpaidStudents = activeStudentsArr.filter(
        (s) => !paidStudentIds.has(s.wdt_ID)
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
        },
        select: {
          wdt_ID: true,
          status: true,
          exitdate: true,
          package: true,
          registrationdate: true,
        },
      });

      const activeStudentsArr = students.filter(
        (s) => s.status === "Active" && s.package !== "0 fee"
      );
      const activeStudents = activeStudentsArr.length;
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.exitdate &&
          s.exitdate >= startDate &&
          s.exitdate <= endDate
      ).length;

      // Get all payments for the year for active students only
      const monthPayments = await prisma.months_table.findMany({
        where: {
          studentid: { in: activeStudentsArr.map((s) => s.wdt_ID) },
          month: { startsWith: `${currentYear}-` },
          OR: [
            {
              payment_status: {
                in: [
                  "paid",
                  "Paid",
                  "PAID",
                  "complete",
                  "Complete",
                  "COMPLETE",
                  "success",
                  "Success",
                  "SUCCESS",
                ],
              },
            },
            { is_free_month: true },
          ],
        },
        select: { studentid: true, month: true },
      });

      // Calculate unique paid students across all months
      const paidStudentIds = new Set(monthPayments.map((p) => p.studentid));
      const unpaidStudents = activeStudentsArr.filter(
        (s) => !paidStudentIds.has(s.wdt_ID)
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
