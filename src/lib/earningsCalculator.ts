import { prisma } from "./prisma";
import {
  startOfMonth,
  endOfMonth,
  isValid,
  subDays,
  addDays,
  format,
} from "date-fns";

export interface ControllerEarnings {
  controllerId: string;
  controllerName: string;
  teamId: number;
  teamName: string;
  teamLeader: string;
  month: string;
  activeStudents: number;
  activePayingStudents: number; // New field for clarity
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

      // Enhanced SQL query with proper 0 fee handling and referral logic
      const rawQuery = `
        SELECT
          'Default Team' AS Team_Name,
          1 AS Team_ID,
          'System' AS Team_Leader,
          uc_names.name AS U_Control_Name,
          a.u_control,
          
          -- Total active students (including 0 fee)
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Active'
            THEN a.wdt_ID 
          END) AS Active_Students,
          
          -- Active paying students (excluding 0 Fee, 0 Fee 6 days, 0 Fee 3 days)
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Active' 
              AND (a.package IS NULL OR a.package NOT IN ('0 Fee', '0 Fee 6 days', '0 Fee 3 days'))
            THEN a.wdt_ID 
          END) AS Active_Paying_Students,
          
          -- Not yet students
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Not Yet' 
            THEN a.wdt_ID 
          END) AS Not_Yet_Students,
          
          -- Leave students this month
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Leave' 
              AND a.exitdate IS NOT NULL
              AND DATE(a.exitdate) BETWEEN ? AND ?
            THEN a.wdt_ID 
          END) AS Leave_Students_This_Month,
          
          -- Ramadan leave students
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Ramadan Leave' 
            THEN a.wdt_ID 
          END) AS Ramadan_Leave,
          
          -- Paid students this month (excluding 0 Fee, 0 Fee 6 days, 0 Fee 3 days)
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Active' 
              AND (a.package IS NULL OR a.package NOT IN ('0 Fee', '0 Fee 6 days', '0 Fee 3 days'))
              AND EXISTS(
                SELECT 1 FROM months_table pm
                WHERE pm.studentid = a.wdt_ID 
                  AND pm.month = ? 
                  AND (
                    UPPER(pm.payment_status) IN ('PAID','COMPLETE','SUCCESS') 
                    OR pm.is_free_month = 1
                  )
              )
            THEN a.wdt_ID 
          END) AS Paid_This_Month,
          
          -- Unpaid active students this month (excluding 0 Fee, 0 Fee 6 days, 0 Fee 3 days)
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Active' 
              AND (a.package IS NULL OR a.package NOT IN ('0 Fee', '0 Fee 6 days', '0 Fee 3 days'))
              AND NOT EXISTS(
                SELECT 1 FROM months_table sm
                WHERE sm.studentid = a.wdt_ID 
                  AND sm.month = ? 
                  AND (
                    UPPER(sm.payment_status) IN ('PAID','COMPLETE','SUCCESS') 
                    OR sm.is_free_month = 1
                  )
              )
            THEN a.wdt_ID 
          END) AS Unpaid_Active_This_Month,
          
          -- Referenced active students (students referred by this controller who registered in current month)
          -- Only count students who registered THIS month, are active, and have paid (excluding 0 Fee variants)
          (
            SELECT COUNT(DISTINCT b.wdt_ID)
            FROM wpos_wpdatatable_23 b
            WHERE b.status = 'Active'
              AND b.refer = a.u_control
              AND b.refer IS NOT NULL
              AND TRIM(b.refer) != ''
              AND (b.package IS NULL OR b.package NOT IN ('0 Fee', '0 Fee 6 days', '0 Fee 3 days'))
              AND b.registrationdate IS NOT NULL
              AND DATE(b.registrationdate) BETWEEN ? AND ?
              AND EXISTS(
                SELECT 1 FROM months_table pm
                WHERE pm.studentid = b.wdt_ID 
                  AND pm.month = ? 
                  AND (
                    UPPER(pm.payment_status) IN ('PAID','COMPLETE','SUCCESS') 
                    OR pm.is_free_month = 1
                  )
              )
          ) AS Referenced_Active_Students,
          
          -- Linked students (students with chat_id)
          COUNT(DISTINCT CASE 
            WHEN a.status IN('Active','Not Yet')
              AND a.chat_id IS NOT NULL
              AND TRIM(a.chat_id) != ''
            THEN a.wdt_ID 
          END) AS Linked_Students
          
        FROM wpos_wpdatatable_23 a
        LEFT JOIN wpos_wpdatatable_28 uc_names ON a.u_control = uc_names.code
        WHERE a.u_control IS NOT NULL 
          AND TRIM(a.u_control) != ''
        ${
          params.controllerId
            ? "AND TRIM(LOWER(a.u_control)) = TRIM(LOWER(?))"
            : ""
        }
        GROUP BY a.u_control, uc_names.name
        ORDER BY uc_names.name
      `;

      const queryParams = [
        // Leave students date range
        format(this.startDate, "yyyy-MM-dd"),
        format(this.endDate, "yyyy-MM-dd"),
        // Paid this month check
        this.yearMonth,
        // Unpaid this month check
        this.yearMonth,
        // Referenced students registration date range (current month only)
        format(this.startDate, "yyyy-MM-dd"),
        format(this.endDate, "yyyy-MM-dd"),
        // Referenced students payment check
        this.yearMonth,
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
          const activeStudents = Number(row.Active_Students) || 0;
          const activePayingStudents = Number(row.Active_Paying_Students) || 0;
          const leaveStudents = Number(row.Leave_Students_This_Month) || 0;
          const unpaidActive = Number(row.Unpaid_Active_This_Month) || 0;
          const referencedActive = Number(row.Referenced_Active_Students) || 0;
          const paidThisMonth = Number(row.Paid_This_Month) || 0;

          // Calculate earnings using ALL active students (including 0 fee)
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
          const previousMonthStr = format(previousMonth, "yyyy-MM");
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
              : totalEarnings > 0
              ? 100
              : 0; // If no previous earnings but current > 0, show 100% growth

          return {
            controllerId,
            controllerName: row.U_Control_Name || controllerId,
            teamId: Number(row.Team_ID) || 1,
            teamName: row.Team_Name || "Default Team",
            teamLeader: row.Team_Leader || "System",
            month: this.yearMonth,
            activeStudents,
            activePayingStudents, // New field for clarity
            notYetStudents: Number(row.Not_Yet_Students) || 0,
            leaveStudentsThisMonth: leaveStudents,
            ramadanLeaveStudents: Number(row.Ramadan_Leave) || 0,
            paidThisMonth,
            unpaidActiveThisMonth: unpaidActive,
            referencedActiveStudents: referencedActive,
            linkedStudents: Number(row.Linked_Students) || 0,
            baseEarnings,
            leavePenalty,
            unpaidPenalty,
            referencedBonus,
            totalEarnings,
            targetEarnings: config.targetEarnings,
            achievementPercentage:
              config.targetEarnings > 0
                ? (totalEarnings / config.targetEarnings) * 100
                : 0,
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

      // Get all students for this controller
      const students = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          u_control: controllerId,
        },
        select: {
          wdt_ID: true,
          status: true,
          exitdate: true,
          package: true,
        },
      });

      // Filter active students (including 0 fee for base earnings)
      const activeStudents = students.filter((s) => s.status === "Active");

      // Filter active paying students (exclude 0 Fee, 0 Fee 6 days, 0 Fee 3 days from unpaid penalty)
      const activePayingStudents = students.filter(
        (s) =>
          s.status === "Active" &&
          s.package !== "0 Fee" &&
          s.package !== "0 Fee 6 days" &&
          s.package !== "0 Fee 3 days"
      );

      // Count leave students for this month
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.exitdate &&
          s.exitdate >= startDate &&
          s.exitdate <= endDate
      ).length;

      // Get payment records for active paying students
      const monthPayments = await prisma.months_table.findMany({
        where: {
          studentid: { in: activePayingStudents.map((s) => s.wdt_ID) },
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
      const unpaidStudents = activePayingStudents.filter(
        (s) => !paidStudentIds.has(s.wdt_ID)
      ).length;

      // Calculate earnings using ALL active students for base earnings
      const baseEarnings = activeStudents.length * config.mainBaseRate;
      const leavePenalty =
        Math.max(leaveStudents - config.leaveThreshold, 0) *
        config.leavePenaltyMultiplier *
        config.mainBaseRate;
      const unpaidPenalty =
        unpaidStudents * config.unpaidPenaltyMultiplier * config.mainBaseRate;

      return baseEarnings - leavePenalty - unpaidPenalty;
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

      // Get all students for this controller
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

      // Filter active students (including 0 fee for base earnings)
      const activeStudents = students.filter((s) => s.status === "Active");

      // Filter active paying students (exclude 0 Fee, 0 Fee 6 days, 0 Fee 3 days from unpaid penalty)
      const activePayingStudents = students.filter(
        (s) =>
          s.status === "Active" &&
          s.package !== "0 Fee" &&
          s.package !== "0 Fee 6 days" &&
          s.package !== "0 Fee 3 days"
      );

      // Count leave students for the year
      const leaveStudents = students.filter(
        (s) =>
          s.status === "Leave" &&
          s.exitdate &&
          s.exitdate >= startDate &&
          s.exitdate <= endDate
      ).length;

      // Get all payments for the year for active paying students only
      const yearPayments = await prisma.months_table.findMany({
        where: {
          studentid: { in: activePayingStudents.map((s) => s.wdt_ID) },
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
      const paidStudentIds = new Set(yearPayments.map((p) => p.studentid));
      const unpaidStudents = activePayingStudents.filter(
        (s) => !paidStudentIds.has(s.wdt_ID)
      ).length;

      // Calculate earnings using ALL active students for base earnings
      const baseEarnings = activeStudents.length * config.mainBaseRate;
      const leavePenalty =
        Math.max(leaveStudents - config.leaveThreshold, 0) *
        config.leavePenaltyMultiplier *
        config.mainBaseRate;
      const unpaidPenalty =
        unpaidStudents * config.unpaidPenaltyMultiplier * config.mainBaseRate;

      return baseEarnings - leavePenalty - unpaidPenalty;
    } catch (error) {
      console.error(
        `Failed to calculate YTD earnings for ${controllerId}:`,
        error
      );
      return 0;
    }
  }
}
