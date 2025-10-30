"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Lang = "en" | "am";

type Dict = Record<string, string>;

const en: Dict = {
  studentDashboard: "Student Dashboard",
  overview: "Overview",
  attendance: "Attendance",
  tests: "Tests",
  terbia: "Terbia",
  payments: "Payments",
  schedule: "Schedule",
  scheduledTimes: "Scheduled Times",
  paymentSummary: "Payment Summary",
  totalDeposits: "Total Deposits",
  monthlyPayments: "Monthly Payments",
  remainingBalance: "Remaining Balance",
  paidMonths: "Paid Months",
  recentDeposits: "Recent Deposits",
  loadingProgress: "Loading your progress...",
  totalChapters: "Total Chapters",
  freeMonth: "Free Month",
  noDataTitle: "No Data Found",
  noDataSubtitle: "Unable to load your progress data.",
  teacher: "Teacher",
  until: "Until",
  noPayments: "No payment data available",
  noSchedule: "No scheduled times found",
};

const am: Dict = {
  studentDashboard: "የተማሪ ዳሽቦርድ",
  overview: "አጠቃላይ",
  attendance: "አቴንዳንስ",
  tests: "ፈተናዎች",
  terbia: "ተርቢያ",
  payments: "ክፍያዎች",
  schedule: "ክፍለ ጊዜ",
  scheduledTimes: "የታቀዱ ሰዓቶች",
  paymentSummary: "የክፍያ ማጠቃለያ",
  totalDeposits: "አጠቃላይ ተቀማጭ",
  monthlyPayments: "ወርሃዊ ክፍያዎች",
  remainingBalance: "የሚቀር መመዝገብ",
  paidMonths: "የተከፈሉ ወራት",
  recentDeposits: "የቅርብ ተቀማጭ",
  loadingProgress: "እድገትዎን በመጫን ላይ...",
  totalChapters: "አጠቃላይ ጥንታዎች",
  freeMonth: "ነፃ ወር",
  noDataTitle: "መረጃ አልተገኘም",
  noDataSubtitle: "የእድገት መረጃዎን መጫን አልተቻለም።",
  teacher: "መምህር",
  until: "እስከ",
  noPayments: "የክፍያ መረጃ አልተገኘም",
  noSchedule: "የታቀዱ ሰዓቶች አልተገኙም",
};

const dicts: Record<Lang, Dict> = { en, am };

type I18nCtx = {
  lang: Lang;
  t: (key: string) => string;
  setLang: (l: Lang) => void;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("dk_lang") : null;
    if (saved === "en" || saved === "am") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("dk_lang", l);
    } catch {}
  };

  const t = useMemo(() => {
    const d = dicts[lang] || en;
    return (key: string) => d[key] || en[key] || key;
  }, [lang]);

  const value = useMemo(() => ({ lang, t, setLang }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
