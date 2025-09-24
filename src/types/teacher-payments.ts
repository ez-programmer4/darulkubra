export interface TimeSlotBreakdown {
  date: string;
  timeSlot: string;
  status: 'attended' | 'missed' | 'waived' | 'excused';
  studentName: string;
  package: string;
  deduction: number;
  studentId?: string | number;
  isWaived?: boolean;
  deductionTier?: string;
}

export interface LatenessTimeSlot {
  date: string;
  timeSlot: string;
  studentName: string;
  studentId?: string | number;
  minutesLate: number;
  deduction: number;
  scheduledTime: Date;
  actualStartTime: Date;
  isWaived: boolean;
  deductionTier: string;
  package?: string;
}

export interface BonusRecord {
  id?: string;
  teacherId: string;
  amount: number;
  reason?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface AbsenceRecord {
  id?: string;
  teacherId: string;
  studentId?: string | number;
  studentName: string;
  classDate: Date | string;
  timeSlot: string;
  status: 'attended' | 'missed' | 'waived' | 'excused';
  package?: string;
  deduction: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AbsenceDetails {
  totalTimeSlots: number;
  missedTimeSlots: number;
  attendedTimeSlots: number;
  absenceRate: number;
  timeSlotBreakdown: TimeSlotBreakdown[];
}

export interface LatenessDetails {
  totalLateMinutes: number;
  lateOccurrences: number;
  lateTimeSlots: LatenessTimeSlot[];
}

export interface TeacherPayment {
  id: string;
  name: string;
  latenessDeduction: number;
  absenceDeduction: number;
  bonuses: number;
  baseSalary: number;
  totalSalary: number;
  status?: 'Paid' | 'Unpaid' | 'Error';
  numStudents?: number;
  teachingDays?: number;
  absenceDetails?: AbsenceDetails;
  latenessDetails?: LatenessDetails;
  paymentData?: {
    latenessRecords: LatenessTimeSlot[];
    absenceRecords: AbsenceRecord[];
    bonusRecords: BonusRecord[];
  };
  error?: string;
  breakdown?: {
    dailyEarnings: Array<{ date: string; amount: number }>;
    studentBreakdown: Array<{
      studentName: string;
      package: string;
      monthlyRate: number;
      dailyRate: number;
      daysWorked: number;
      totalEarned: number;
    }>;
    summary: {
      workingDaysInMonth: number;
      actualTeachingDays: number;
      averageDailyEarning: number;
      totalDeductions: number;
      netSalary: number;
    };
  };
}
