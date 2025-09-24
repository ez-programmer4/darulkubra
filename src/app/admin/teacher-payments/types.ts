export interface TeacherPayment {
  id: string;
  name: string;
  packageName?: string;
  packageSalary: number;
  baseSalary: number;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  totalSalary: number;
  status: string;
  error?: string;
  paymentData?: {
    latenessRecords: any[];
    absenceRecords: any[];
    bonusRecords: any[];
  };
}

export interface TeacherBreakdown {
  packageName?: string;
  baseSalary: number;
  totalLatenessDeduction: number;
  totalAbsenceDeduction: number;
  totalBonuses: number;
  netSalary: number;
  latenessRecords: any[];
  absenceRecords: any[];
  bonusRecords: any[];
  error?: string;
}

export type BulkAction = 'mark_paid' | 'mark_unpaid' | 'export';

export interface PackageSalary {
  package: string;
  amount: number;
}
