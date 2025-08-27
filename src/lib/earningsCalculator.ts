import { prisma } from "./prisma";
import { startOfMonth, endOfMonth } from "date-fns";

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

    try {
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
    } catch {
      this.config = {
        mainBaseRate: 40,
        referralBaseRate: 40,
        leavePenaltyMultiplier: 3,
        leaveThreshold: 5,
        unpaidPenaltyMultiplier: 2,
        referralBonusMultiplier: 4,
        targetEarnings: 3000,
      };
    }

    return this.config;
  }

  async calculateControllerEarnings(params: EarningsParams = {}): Promise<ControllerEarnings[]> {
    try {
      const config = await this.getEarningsConfig();
      
      // Simplified query for now - can be enhanced later
      const controllers = await prisma.wpos_wpdatatable_28.findMany({
        where: params.controllerId ? { code: params.controllerId } : {},
      });

      const earnings = await Promise.all(
        controllers.map(async (controller) => {
          // Get active students
          const activeStudents = await prisma.wpos_wpdatatable_23.count({
            where: {
              u_control: controller.code,
              status: "Active",
            },
          });

          // Calculate basic earnings
          const baseEarnings = activeStudents * config.mainBaseRate;
          const totalEarnings = baseEarnings; // Simplified for now

          return {
            controllerId: controller.code || '',
            controllerName: controller.name || 'Unknown Controller',
            teamId: 1,
            teamName: "Default Team",
            teamLeader: "System",
            month: this.yearMonth,
            activeStudents,
            notYetStudents: 0,
            leaveStudentsThisMonth: 0,
            ramadanLeaveStudents: 0,
            paidThisMonth: 0,
            unpaidActiveThisMonth: 0,
            referencedActiveStudents: 0,
            linkedStudents: 0,
            baseEarnings,
            leavePenalty: 0,
            unpaidPenalty: 0,
            referencedBonus: 0,
            totalEarnings,
            targetEarnings: config.targetEarnings,
            achievementPercentage: (totalEarnings / config.targetEarnings) * 100,
            growthRate: 0,
            previousMonthEarnings: 0,
            yearToDateEarnings: totalEarnings,
          };
        })
      );

      return earnings;
    } catch (error) {
      console.error('Error calculating controller earnings:', error);
      return [];
    }
  }

  private async getPreviousMonthEarnings(controllerId: string, previousMonth: string): Promise<number> {
    try {
      const calculator = new EarningsCalculator(previousMonth);
      const earnings = await calculator.calculateControllerEarnings({ controllerId });
      return earnings[0]?.totalEarnings || 0;
    } catch {
      return 0;
    }
  }

  private async getYearToDateEarnings(controllerId: string): Promise<number> {
    try {
      const year = this.yearMonth.split('-')[0];
      const currentMonth = parseInt(this.yearMonth.split('-')[1]);
      let total = 0;

      for (let month = 1; month <= currentMonth; month++) {
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const calculator = new EarningsCalculator(monthStr);
        const earnings = await calculator.calculateControllerEarnings({ controllerId });
        total += earnings[0]?.totalEarnings || 0;
      }

      return total;
    } catch {
      return 0;
    }
  }

  async getTopPerformers(limit: number = 10): Promise<ControllerEarnings[]> {
    const earnings = await this.calculateControllerEarnings();
    return earnings
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  async getEarningsSummary(): Promise<{
    totalControllers: number;
    totalEarnings: number;
    averageEarnings: number;
    topPerformer: ControllerEarnings | null;
    achievementRate: number;
  }> {
    const earnings = await this.calculateControllerEarnings();
    const totalEarnings = earnings.reduce((sum, e) => sum + e.totalEarnings, 0);
    const averageEarnings = earnings.length > 0 ? totalEarnings / earnings.length : 0;
    const topPerformer = earnings.reduce((top, current) => 
      current.totalEarnings > (top?.totalEarnings || 0) ? current : top, null as ControllerEarnings | null
    );
    const achievementRate = earnings.length > 0 
      ? earnings.filter(e => e.totalEarnings >= e.targetEarnings).length / earnings.length * 100
      : 0;

    return {
      totalControllers: earnings.length,
      totalEarnings,
      averageEarnings,
      topPerformer,
      achievementRate,
    };
  }
}