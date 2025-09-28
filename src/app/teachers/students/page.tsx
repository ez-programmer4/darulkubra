"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiSend,
  FiUser,
  FiCheck,
  FiClock,
  FiLink2,
  FiAlertTriangle,
  FiX,
  FiRefreshCcw,
  FiFilter,
  FiSearch,
  FiCopy,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiBookOpen,
  FiTarget,
  FiUsers,
  FiActivity,
  FiPhone,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/use-toast";

// Types

type Group = {
  group: string;
  students: Array<{
    id: number;
    name: string | null;
    phone: string | null;
    subject: string | null;
    pack: string | null;
    daypackages: string | null;
    occupied: Array<{ time_slot: string; daypackage: string }>;
  }>;
};

type ModalType = "zoom" | "attendance" | null;

// Utils

function safeIncludes(haystack: unknown, needle: string): boolean {
  if (!needle) return true;
  const h = String(haystack ?? "").toLowerCase();
  const n = String(needle ?? "").toLowerCase();
  return h.indexOf(n) !== -1;
}

function packageIncludesToday(pkg?: string): boolean {
  if (!pkg) return false;
  const day = new Date().getDay();
  const key = pkg.trim().toUpperCase();
  const map: Record<string, number[]> = {
    MWF: [1, 3, 5],
    TTS: [2, 4, 6],
    SS: [0, 6],
    "ALL DAYS": [0, 1, 2, 3, 4, 5, 6],
  };
  if (map[key]) return map[key].indexOf(day) !== -1;
  const names = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  if (names.indexOf(key) !== -1) return names.indexOf(key) === day;
  const up = key.replace(/\./g, "").replace(/\s+/g, "");
  const parts = up.split(/[,+/\\-]/);
  if (parts.length) {
    return parts.some((p) => {
      const abbr = p.slice(0, 3).toUpperCase();
      const idx = names.indexOf(abbr);
      return idx === day;
    });
  }
  return false;
}

function convertTo12Hour(timeStr: string): string {
  if (!timeStr || !timeStr.includes(":")) return timeStr;
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function AssignedStudents() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: ModalType;
    studentId: number | null;
  }>({ type: null, studentId: null });
  const [forms, setForms] = useState<Record<number, { link: string }>>({});
  const [attend, setAttend] = useState<
    Record<
      number,
      {
        status: string;
        level?: string;
        surah?: string;
        pages?: string;
        lesson?: string;
        notes?: string;
      }
    >
  >({});
  const [sending, setSending] = useState<Record<number, boolean>>({});
  const [surahs, setSurahs] = useState<string[]>([]);
  const qaidahLessons = [
    "ክፍል 1",
    "ክፍል 2",
    "ክፍል 3",
    "ክፍል 4",
    "ክፍል 5",
    "ክፍል 6 [ exam ]",
    "ክፍል 7",
    "ክፍል 8",
    "ክፍል 9",
    "ክፍል 10",
    "ክፍል 11",
    "ክፍል 12",
    "ክፍል 13",
    "ክፍል 14",
    "ክፍል 15",
    "ክፍል 16",
    "ክፍል 17",
    "ክፍል 18",
    "ክፍል 19 ( exam )",
    "ክፍል 20",
    "ክፍል 21",
    "ክፍል 22",
    "ክፍል 23",
    "ክፍል 24",
    "ክፍል 25",
    "ክፍል 26",
    "ክፍል 27",
    "ክፍል 28",
    "ክፍል 29",
    "ክፍል 30",
    "ክፍል 31",
    "ክፍል 32",
    "ክፍል 33",
    "ክፍል 34",
    "ክፍል 35",
    "ክፍል 36",
    "ክፍል 37",
    "ክፍል 38 ( final exam )",
  ];
  const [zoomSent, setZoomSent] = useState<Record<number, boolean>>({});
  const [permissionStudents, setPermissionStudents] = useState<
    Record<number, boolean>
  >({});

  const checkZoomStatus = useCallback(async () => {
    if (groups.length === 0) return;

    try {
      const res = await fetch("/api/teachers/students/zoom-status", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const zoomStatus: Record<number, boolean> = {};

        // Initialize all students as false
        groups.forEach((group) => {
          group.students.forEach((student) => {
            zoomStatus[student.id] = false;
          });
        });

        // Set true for students who have zoom links sent today
        if (data.sentToday && Array.isArray(data.sentToday)) {
          data.sentToday.forEach((studentId: number) => {
            zoomStatus[studentId] = true;
          });
        }

        setZoomSent(zoomStatus);
      }
    } catch (error) {
      console.error("Failed to check zoom status:", error);
    }
  }, [groups.length]);

  // Check zoom status only once when groups are loaded
  useEffect(() => {
    if (groups.length > 0) {
      checkZoomStatus();
    }
  }, [groups.length]);
  const [query, setQuery] = useState("");
  const [pkgFilter, setPkgFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expAll, setExpAll] = useState(false);
  const [todayOnly, setTodayOnly] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  // Static time display to prevent reloads
  useEffect(() => {
    setNow(new Date());
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal({ type: null, studentId: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    refresh();
    loadSurahs();
  }, []);

  async function loadSurahs() {
    setSurahs([
      "Al-Fatiha",
      "Al-Baqarah",
      "Ali Imran",
      "An-Nisa",
      "Al-Maidah",
      "Al-Anam",
      "Al-Araf",
      "Al-Anfal",
      "At-Tawbah",
      "Yunus",
      "Hud",
      "Yusuf",
      "Ar-Rad",
      "Ibrahim",
      "Al-Hijr",
      "An-Nahl",
      "Al-Isra",
      "Al-Kahf",
      "Maryam",
      "Ta-Ha",
      "Al-Anbiya",
      "Al-Hajj",
      "Al-Muminun",
      "An-Nur",
      "Al-Furqan",
      "Ash-Shuara",
      "An-Naml",
      "Al-Qasas",
      "Al-Ankabut",
      "Ar-Rum",
      "Luqman",
      "As-Sajdah",
      "Al-Ahzab",
      "Saba",
      "Fatir",
      "Ya-Sin",
      "As-Saffat",
      "Sad",
      "Az-Zumar",
      "Ghafir",
      "Fussilat",
      "Ash-Shura",
      "Az-Zukhruf",
      "Ad-Dukhan",
      "Al-Jathiyah",
      "Al-Ahqaf",
      "Muhammad",
      "Al-Fath",
      "Al-Hujurat",
      "Qaf",
      "Adh-Dhariyat",
      "At-Tur",
      "An-Najm",
      "Al-Qamar",
      "Ar-Rahman",
      "Al-Waqiah",
      "Al-Hadid",
      "Al-Mujadila",
      "Al-Hashr",
      "Al-Mumtahanah",
      "As-Saff",
      "Al-Jumuah",
      "Al-Munafiqun",
      "At-Taghabun",
      "At-Talaq",
      "At-Tahrim",
      "Al-Mulk",
      "Al-Qalam",
      "Al-Haqqah",
      "Al-Maarij",
      "Nuh",
      "Al-Jinn",
      "Al-Muzzammil",
      "Al-Muddaththir",
      "Al-Qiyamah",
      "Al-Insan",
      "Al-Mursalat",
      "An-Naba",
      "An-Naziat",
      "Abasa",
      "At-Takwir",
      "Al-Infitar",
      "Al-Mutaffifin",
      "Al-Inshiqaq",
      "Al-Buruj",
      "At-Tariq",
      "Al-Ala",
      "Al-Ghashiyah",
      "Al-Fajr",
      "Al-Balad",
      "Ash-Shams",
      "Al-Layl",
      "Ad-Duha",
      "Ash-Sharh",
      "At-Tin",
      "Al-Alaq",
      "Al-Qadr",
      "Al-Bayyinah",
      "Az-Zalzalah",
      "Al-Adiyat",
      "Al-Qariah",
      "At-Takathur",
      "Al-Asr",
      "Al-Humazah",
      "Al-Fil",
      "Quraysh",
      "Al-Maun",
      "Al-Kawthar",
      "Al-Kafirun",
      "An-Nasr",
      "Al-Masad",
      "Al-Ikhlas",
      "Al-Falaq",
      "An-Nas",
    ]);
  }

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teachers/students/assigned", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to load students: ${errorText}`);
      }
      const data = await res.json();
      setGroups(data.groups || []);
      if (expAll) {
        const next: Record<string, boolean> = {};
        (data.groups || []).forEach((g: Group) => (next[g.group] = true));
        setExpanded(next);
      }
    } catch (e: any) {
      setError(e.message);
      toast({
        title: "Error",
        description: e.message || "Failed to load students.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const updateForm = useMemo(
    () => (id: number, patch: Partial<{ link: string }>) =>
      setForms((f) => ({
        ...f,
        [id]: {
          link: f[id]?.link || "",
          ...patch,
        },
      })),
    []
  );

  const updateAttend = useMemo(
    () =>
      (
        id: number,
        patch: Partial<{
          status: string;
          level?: string;
          surah?: string;
          pages?: string;
          lesson?: string;
          notes?: string;
        }>
      ) =>
        setAttend((a) => {
          const current = a[id] ?? { status: "present" };
          return {
            ...a,
            [id]: { ...current, ...patch },
          };
        }),
    []
  );

  async function sendZoom(studentId: number) {
    try {
      const form = forms[studentId];
      if (!form?.link) {
        toast({
          title: "Error",
          description: "Meeting link is required.",
          variant: "destructive",
        });
        return;
      }

      // Validate Zoom URL
      const zoomUrlPattern = /^https:\/\/(.*\.)?zoom\.us\//i;
      if (!zoomUrlPattern.test(form.link)) {
        toast({
          title: "Invalid Zoom Link",
          description:
            "Please enter a valid Zoom meeting link (https://zoom.us/...)",
          variant: "destructive",
        });
        return;
      }

      setSending((s) => ({ ...s, [studentId]: true }));

      const res = await fetch(`/api/teachers/students/${studentId}/zoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: form.link,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        let errorMessage = "Failed to send Zoom link";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
          console.error("Zoom API error:", errorData);
        } catch {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
          console.error("Zoom API error text:", errorText);
        }
        throw new Error(errorMessage);
      }

      const responseData = await res.json();

      const studentName =
        groups.flatMap((g) => g.students).find((s) => s.id === studentId)
          ?.name || "Student";

      toast({
        title: "🎉 Zoom Link Sent!",
        description: responseData.notification_sent
          ? `📱 ${studentName} has been notified via Telegram`
          : responseData.notification_error
          ? `⚠️ Link saved for ${studentName} but notification failed`
          : `✅ Zoom link sent to ${studentName}`,
        variant: "default",
      });

      setForms((f) => ({
        ...f,
        [studentId]: { link: "" },
      }));
      setZoomSent((z) => ({ ...z, [studentId]: true }));
      setModal({ type: null, studentId: null });
    } catch (e: any) {
      console.error("Zoom sending error:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to send Zoom link.",
        variant: "destructive",
      });
    } finally {
      setSending((s) => ({ ...s, [studentId]: false }));
    }
  }

  async function saveAttendance(studentId: number) {
    try {
      const rec = attend[studentId];
      if (!rec?.status) {
        toast({
          title: "Error",
          description: "Attendance status is required.",
          variant: "destructive",
        });
        return;
      }
      setSending((s) => ({ ...s, [studentId]: true }));
      const res = await fetch(
        `/api/teachers/students/${studentId}/attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendance_status:
              rec.status?.charAt(0)?.toUpperCase() + rec.status?.slice(1) ||
              "Unknown",
            surah: rec.surah || undefined,
            lesson: rec.lesson || undefined,
            notes: rec.notes || undefined,
          }),
          credentials: "include",
        }
      );
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save attendance: ${errorText}`);
      }

      const responseData = await res.json();
      const studentName =
        responseData.student_name ||
        groups.flatMap((g) => g.students).find((s) => s.id === studentId)
          ?.name ||
        "Student";

      const statusEmoji = rec.status === "present" ? "✅" : "❌";
      const statusText = `marked as ${rec.status}`;

      toast({
        title: `${statusEmoji} Attendance Saved!`,
        description: `📝 ${studentName} ${statusText} successfully`,
        variant: "default",
      });
      setAttend((a) => ({ ...a, [studentId]: { status: "present" } }));
      setModal({ type: null, studentId: null });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save attendance.",
        variant: "destructive",
      });
    } finally {
      setSending((s) => ({ ...s, [studentId]: false }));
    }
  }

  const filteredGroups = useMemo(() => {
    const q = String(query ?? "")
      .trim()
      .toLowerCase();
    const filterPkg = String(pkgFilter ?? "").toLowerCase();
    return groups
      .map((g) => {
        const filteredStudents = g.students
          .filter((s) => {
            const matchesQuery =
              !q || safeIncludes(s.name, q) || safeIncludes(s.subject, q);
            const matchesPkg =
              filterPkg === "all" || safeIncludes(s.daypackages, filterPkg);
            return matchesQuery && matchesPkg;
          })
          .map((s) => {
            const occ = Array.isArray(s.occupied) ? s.occupied : [];
            const occFiltered = todayOnly
              ? occ.filter((o) => packageIncludesToday(o.daypackage))
              : occ;
            return { ...s, occupied: occFiltered };
          })
          .filter((s) => !todayOnly || (s.occupied && s.occupied.length > 0));
        return { group: g.group, students: filteredStudents };
      })
      .filter((g) => g.students.length > 0);
  }, [groups, query, pkgFilter, todayOnly]);

  const toggleGroup = useCallback((name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const toggleAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => (next[g.group] = !expAll));
    setExpanded(next);
    setExpAll((v) => !v);
  }, [filteredGroups, expAll]);

  const handleCopy = useCallback(
    (text: string) => {
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: "Success", description: "Copied to clipboard!" });
        });
      }
    },
    [toast]
  );

  const totalStudents = filteredGroups.reduce(
    (acc, g) => acc + g.students.length,
    0
  );
  const todayStudents = filteredGroups.reduce(
    (acc, g) =>
      acc +
      g.students.filter((s) => s.occupied && s.occupied.length > 0).length,
    0
  );

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="space-y-4">
        {/* Header + Stats */}
        <div className="bg-white rounded-xl shadow-lg border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <FiUsers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">My Students</h1>
              <p className="text-gray-600 text-sm">
                Manage classes and attendance
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-black">
                {totalStudents}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-black">
                {todayStudents}
              </div>
              <div className="text-xs text-gray-600">Today</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-black">
                {filteredGroups.length}
              </div>
              <div className="text-xs text-gray-600">Groups</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-sm font-bold text-black">
                {now.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
              <div className="text-xs text-gray-600">Time</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <FiAlertTriangle className="text-red-600 h-5 w-5" />
            <div>
              <h3 className="font-medium text-red-800 text-sm">
                Error Loading Students
              </h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && filteredGroups.length === 0 && (
          <div className="p-8 text-center bg-white rounded-xl shadow-lg border">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <FiUser className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-black mb-2">
              No Students Found
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              No students match your search.
            </p>
            <Button
              onClick={refresh}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium"
            >
              Refresh
            </Button>
          </div>
        )}

        {/* Student Groups */}
        <div className="space-y-4">
          {filteredGroups.map((g) => (
            <div
              key={g.group}
              className="rounded-xl shadow-lg border bg-white overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                onClick={() => toggleGroup(g.group)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <FiBookOpen className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-black text-base">
                      {g.group || "Unknown Package"}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {g.students.length} student
                      {g.students.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 text-white px-2 py-1 rounded-full font-bold text-sm">
                    {g.students.length}
                  </div>
                  {expanded[g.group] ? (
                    <FiChevronUp className="text-gray-600 h-5 w-5" />
                  ) : (
                    <FiChevronDown className="text-gray-600 h-5 w-5" />
                  )}
                </div>
              </button>

              {expanded[g.group] && (
                <div className="p-3 space-y-3 bg-gray-50">
                  {g.students.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FiUser className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-black text-base">
                                  {s.name || "Unnamed Student"}
                                </div>
                                {zoomSent[s.id] && (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                    🔗 Zoom Sent
                                  </span>
                                )}
                                {permissionStudents[s.id] && (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                    📅 Permission
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {s.id}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2">
                              <FiBookOpen className="h-4 w-4 text-gray-500" />
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                                {s.subject || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FiClock className="h-4 w-4 text-gray-500" />
                              <span>
                                {s.occupied?.length
                                  ? s.occupied
                                      .map(
                                        (o) =>
                                          `${convertTo12Hour(o.time_slot)} (${
                                            o.daypackage
                                          })`
                                      )
                                      .join(", ")
                                  : "No schedule"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          onClick={() =>
                            setModal({ type: "zoom", studentId: s.id })
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium text-sm"
                        >
                          <FiLink2 className="h-4 w-4 mr-2" />
                          Send Zoom
                        </Button>
                        <Button
                          onClick={() => {
                            // Allow attendance if zoom sent OR student is on permission
                            if (!zoomSent[s.id] && !permissionStudents[s.id]) {
                              toast({
                                title: "🔗 Zoom Link Required",
                                description:
                                  "📋 Please send the Zoom link first or mark as permission",
                                variant: "destructive",
                              });
                              return;
                            }
                            setModal({ type: "attendance", studentId: s.id });
                          }}
                          disabled={
                            !zoomSent[s.id] && !permissionStudents[s.id]
                          }
                          className={`py-3 rounded-lg font-medium text-sm ${
                            zoomSent[s.id] || permissionStudents[s.id]
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <FiCheck className="h-4 w-4 mr-2" />
                          Attendance
                        </Button>
                        <Button
                          onClick={async () => {
                            // Mark student as on permission and save immediately
                            setPermissionStudents((prev) => ({
                              ...prev,
                              [s.id]: true,
                            }));

                            // Save permission attendance directly
                            try {
                              setSending((prev) => ({ ...prev, [s.id]: true }));
                              const res = await fetch(
                                `/api/teachers/students/${s.id}/attendance`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    attendance_status: "Permission",
                                  }),
                                  credentials: "include",
                                }
                              );

                              if (!res.ok) {
                                throw new Error("Failed to save permission");
                              }

                              const studentName = s.name || "Student";
                              toast({
                                title: "📅 Permission Granted!",
                                description: `📝 ${studentName} permission granted successfully`,
                                variant: "default",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to save permission status",
                                variant: "destructive",
                              });
                            } finally {
                              setSending((prev) => ({
                                ...prev,
                                [s.id]: false,
                              }));
                            }
                          }}
                          className={`py-3 rounded-lg font-medium text-sm ${
                            permissionStudents[s.id]
                              ? "bg-orange-600 hover:bg-orange-700 text-white"
                              : "bg-yellow-600 hover:bg-yellow-700 text-white"
                          }`}
                        >
                          <FiCalendar className="h-4 w-4 mr-2" />
                          {permissionStudents[s.id]
                            ? "On Permission"
                            : "Permission"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Slide Panel Modal */}
        {modal.type && modal.studentId !== null && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
              onClick={() => setModal({ type: null, studentId: null })}
            />
            <div className="fixed inset-x-0 top-[50%] -translate-y-[50%] z-50 animate-slide-up">
              <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 max-h-[90vh] overflow-hidden">
                <div className="flex justify-center py-3 border-b border-gray-100">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-2xl ${
                        modal.type === "zoom"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-700"
                          : "bg-gradient-to-br from-green-600 to-emerald-700"
                      }`}
                    >
                      {modal.type === "zoom" ? (
                        <FiLink2 className="h-6 w-6 text-white" />
                      ) : (
                        <FiCheck className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-black">
                        {modal.type === "zoom"
                          ? "Send Zoom Link"
                          : "Mark Attendance"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {modal.type === "zoom"
                          ? "Share meeting details with your student"
                          : "Record student progress and attendance"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModal({ type: null, studentId: null })}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    aria-label="Close"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  {modal.type === "zoom" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-3">
                          Meeting Link *
                        </label>
                        <div className="flex gap-3">
                          <input
                            placeholder="https://zoom.us/j/1234567890"
                            value={forms[modal.studentId]?.link || ""}
                            onChange={(e) =>
                              updateForm(modal.studentId!, {
                                link: e.target.value,
                              })
                            }
                            className="flex-1 p-4 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 text-base transition-all duration-200"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopy(forms[modal.studentId!]?.link || "")
                            }
                            className="px-4 border-2 border-blue-200 hover:bg-blue-50"
                            aria-label="Copy meeting link"
                          >
                            <FiCopy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Enter your Zoom meeting link only (must start with
                          https://zoom.us/)
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FiClock className="h-4 w-4 text-blue-600" />
                          <label className="text-sm font-bold text-blue-800">
                            Sending Time
                          </label>
                        </div>
                        <div className="text-lg font-mono text-blue-900">
                          {new Date().toLocaleString()}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          Link will be sent via Telegram immediately
                        </p>
                      </div>

                      <Button
                        disabled={
                          !!sending[modal.studentId] ||
                          !forms[modal.studentId]?.link?.trim()
                        }
                        onClick={() => sendZoom(modal.studentId!)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                      >
                        {sending[modal.studentId] ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            Sending Link...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FiSend className="h-5 w-5" />
                            Send Zoom Link
                          </span>
                        )}
                      </Button>
                    </div>
                  )}

                  {modal.type === "attendance" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-3">
                          Attendance Status *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {(["present", "absent"] as const).map((status) => {
                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case "present":
                                  return attend[modal.studentId!]?.status ===
                                    status
                                    ? "bg-green-600 text-white border-green-600"
                                    : "border-green-300 text-green-700 hover:bg-green-50";
                                case "absent":
                                  return attend[modal.studentId!]?.status ===
                                    status
                                    ? "bg-red-600 text-white border-red-600"
                                    : "border-red-300 text-red-700 hover:bg-red-50";
                                default:
                                  return "border-gray-300 text-gray-700 hover:bg-gray-50";
                              }
                            };

                            return (
                              <button
                                key={status}
                                onClick={() =>
                                  updateAttend(modal.studentId!, { status })
                                }
                                className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all ${getStatusColor(
                                  status
                                )}`}
                                aria-pressed={
                                  attend[modal.studentId!]?.status === status
                                }
                              >
                                {status?.charAt(0)?.toUpperCase() +
                                  status?.slice(1) || "Unknown"}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {(() => {
                        const currentStudent = groups
                          .flatMap((g) => g.students)
                          .find((s) => s.id === modal.studentId);
                        const isQaidah =
                          currentStudent?.subject?.toLowerCase() === "qaidah";

                        return (
                          <div>
                            {isQaidah ? (
                              <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                  Lesson Topic
                                </label>
                                <select
                                  value={attend[modal.studentId]?.lesson || ""}
                                  onChange={(e) =>
                                    updateAttend(modal.studentId!, {
                                      lesson: e.target.value,
                                    })
                                  }
                                  className="w-full p-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 text-base appearance-none"
                                >
                                  <option value="">Select Lesson</option>
                                  {qaidahLessons.map((lesson) => (
                                    <option key={lesson} value={lesson}>
                                      {lesson}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                  Surah
                                </label>
                                <select
                                  value={attend[modal.studentId]?.surah || ""}
                                  onChange={(e) =>
                                    updateAttend(modal.studentId!, {
                                      surah: e.target.value,
                                    })
                                  }
                                  className="w-full p-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 text-base appearance-none"
                                >
                                  <option value="">Select Surah</option>
                                  {surahs.map((surah) => (
                                    <option key={surah} value={surah}>
                                      {surah}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <Button
                        onClick={() => saveAttendance(modal.studentId!)}
                        disabled={
                          !!sending[modal.studentId] ||
                          !attend[modal.studentId]?.status
                        }
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                      >
                        {sending[modal.studentId] ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                            Saving Attendance...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FiCheck className="h-5 w-5" />
                            Save Attendance Record
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
