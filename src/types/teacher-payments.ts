export interface TimeSlotBreakdown {
  date: string;
  timeSlot: string;
  status: 'attended' | 'missed' | 'waived';
  studentName: string;
  package: string;
  deduction: number;
}

export interface LatenessTimeSlot {
  date: string;
  timeSlot: string;
  studentName: string;
  minutesLate: number;
  deduction: number;
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
  status?: 'Paid' | 'Unpaid';
  numStudents?: number;
  teachingDays?: number;
  absenceDetails?: AbsenceDetails;
  latenessDetails?: LatenessDetails;
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
