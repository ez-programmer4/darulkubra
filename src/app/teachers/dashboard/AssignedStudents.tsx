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

function genToken(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const array = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) out += chars[array[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++)
      out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

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

export default function AssignedStudents() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: ModalType;
    studentId: number | null;
  }>({ type: null, studentId: null });
  const [forms, setForms] = useState<
    Record<number, { link: string; token: string }>
  >({});
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
  const [query, setQuery] = useState("");
  const [pkgFilter, setPkgFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expAll, setExpAll] = useState(false);
  const [todayOnly, setTodayOnly] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [surahs, setSurahs] = useState<string[]>([]);
  const [loadingSurahs, setLoadingSurahs] = useState(false);
  const [zoomSent, setZoomSent] = useState<Record<number, boolean>>({});


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
    try {
      setLoadingSurahs(true);
      const res = await fetch('/api/surahs', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSurahs(data.surahs || []);
      } else {
        // Fallback to default Surahs
        setSurahs([
          'Al-Fatiha', 'Al-Baqarah', 'Ali Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam',
          'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf',
          'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf',
          'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur',
          'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum'
        ]);
      }
    } catch {
      // Fallback to default Surahs
      setSurahs([
        'Al-Fatiha', 'Al-Baqarah', 'Ali Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam',
        'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf',
        'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf',
        'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur',
        'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum'
      ]);
    } finally {
      setLoadingSurahs(false);
    }
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
    () =>
      (id: number, patch: Partial<{ link: string; token: string }>) =>
        setForms((f) => ({
          ...f,
          [id]: {
            link: f[id]?.link || "",
            token: f[id]?.token || "",
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
      if (!form?.link || !form?.token) {
        toast({
          title: "Error",
          description: "Link and token are required.",
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
          tracking_token: form.token,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to send Zoom link: ${errorText}`);
      }
      toast({ title: "Success", description: "Zoom link sent successfully!" });
      setForms((f) => ({
        ...f,
        [studentId]: { link: "", token: "" },
      }));
      setZoomSent((z) => ({ ...z, [studentId]: true }));
      setModal({ type: null, studentId: null });
    } catch (e: any) {
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
            attendance_status: rec.status,
            surah: rec.surah || undefined,
            pages_read: rec.pages ? Number(rec.pages) : undefined,
            level: rec.level || undefined,
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
      toast({
        title: "Success",
        description: "Attendance saved successfully!",
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

  const handleCopy = useCallback((text: string) => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Success", description: "Copied to clipboard!" });
      });
    }
  }, [toast]);

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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header + Stats */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-black rounded-2xl shadow-lg">
                <FiUsers className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-2">
                  Student Management
                </h1>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  Manage your assigned students, attendance, and class sessions
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-auto">
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiTarget className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Total
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {totalStudents}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiCalendar className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Today
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {todayStudents}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiActivity className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Groups
                  </span>
                </div>
                <div className="text-2xl font-bold text-black">
                  {filteredGroups.length}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FiClock className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">
                    Time
                  </span>
                </div>
                <div className="text-sm font-bold text-black">
                  {now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 sticky top-4 z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              {/* Search */}
              <div className="lg:col-span-4">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiSearch className="inline h-4 w-4 mr-2" />
                  Search Students
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                  <input
                    aria-label="Search students"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or subject..."
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 text-base"
                  />
                </div>
              </div>

              {/* Package Filter */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-bold text-black mb-3">
                  <FiFilter className="inline h-4 w-4 mr-2" />
                  Package Filter
                </label>
                <select
                  aria-label="Package filter"
                  value={pkgFilter}
                  onChange={(e) => setPkgFilter(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 shadow-sm transition-all duration-200 text-base appearance-none"
                >
                  <option value="all">All Packages</option>
                  <option value="mwf">Monday, Wednesday, Friday</option>
                  <option value="tts">Tuesday, Thursday, Saturday</option>
                  <option value="ss">Saturday, Sunday</option>
                  <option value="all days">All Days</option>
                </select>
              </div>

              {/* Today Only */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-bold text-black mb-3">
                  Quick Filter
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-black bg-white px-4 py-4 rounded-xl border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded"
                    checked={todayOnly}
                    onChange={(e) => setTodayOnly(e.target.checked)}
                    aria-label="Show today only"
                  />
                  <span>Today Only</span>
                </label>
              </div>

              {/* Actions */}
              <div className="lg:col-span-3 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl py-4 font-bold shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={toggleAll}
                  aria-label={expAll ? "Collapse all" : "Expand all"}
                >
                  {expAll ? (
                    <FiChevronUp className="mr-2 h-5 w-5" />
                  ) : (
                    <FiChevronDown className="mr-2 h-5 w-5" />
                  )}
                  {expAll ? "Collapse" : "Expand"}
                </Button>
                <Button
                  className="flex-1 bg-black hover:bg-gray-800 text-white rounded-xl py-4 font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={refresh}
                  disabled={loading}
                  aria-label="Refresh"
                >
                  <FiRefreshCcw
                    className={`mr-2 h-5 w-5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            <PageLoading />
            {/* Skeleton shimmer */}
            <div className="animate-pulse grid grid-cols-1 gap-4">
              <div className="h-24 bg-gray-100 rounded-2xl" />
              <div className="h-24 bg-gray-100 rounded-2xl" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 bg-white border border-red-200 rounded-3xl shadow-2xl flex items-center gap-6">
            <div className="p-4 bg-red-100 rounded-2xl">
              <FiAlertTriangle className="text-red-600 h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 text-xl mb-2">
                Error Loading Students
              </h3>
              <p className="text-red-600 text-lg">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && filteredGroups.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl shadow-2xl border border-gray-200">
            <div className="p-8 bg-gray-100 rounded-full w-fit mx-auto mb-8">
              <FiUser className="h-16 w-16 text-gray-500" />
            </div>
            <h3 className="text-3xl font-bold text-black mb-4">
              No Students Found
            </h3>
            <p className="text-gray-600 text-xl mb-6">
              No students match your current filters. Try adjusting your search
              criteria.
            </p>
            <Button
              onClick={refresh}
              className="bg-black text-white rounded-xl px-6 py-3 font-bold"
            >
              Refresh
            </Button>
          </div>
        )}

        {/* Desktop View */}
        <div className="hidden lg:block space-y-8">
          {filteredGroups.map((g) => (
            <div
              key={g.group}
              className="rounded-3xl shadow-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-3xl transition-all duration-300"
            >
              <div className="p-8 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-black rounded-2xl shadow-lg">
                    <FiBookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-2xl text-black mb-1">
                      {g.group || "Unknown Package"}
                    </h2>
                    <p className="text-gray-600 text-base">
                      {g.students.length} student
                      {g.students.length !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                  <div className="bg-black text-white px-4 py-2 rounded-full font-bold">
                    {g.students.length}
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b-2 border-gray-200">
                        <th className="py-6 text-left font-bold text-black uppercase tracking-wider">
                          Student Information
                        </th>
                        <th className="py-6 text-left font-bold text-black uppercase tracking-wider">
                          Subject & Contact
                        </th>
                        <th className="py-6 text-left font-bold text-black uppercase tracking-wider">
                          Schedule
                        </th>
                        <th className="py-6 text-right font-bold text-black uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.students.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 group"
                        >
                          <td className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-gray-100 rounded-xl">
                                <FiUser className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-bold text-black text-lg">
                                  {s.name || "Unnamed Student"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {s.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FiBookOpen className="h-4 w-4 text-gray-500" />
                                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {s.subject || "N/A"}
                                </span>
                              </div>
                              {s.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FiPhone className="h-4 w-4 text-gray-500" />
                                  <span>{s.phone}</span>
                                  <button
                                    className="ml-2 text-xs px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-100"
                                    onClick={() => handleCopy(s.phone || "")}
                                    aria-label="Copy phone"
                                  >
                                    <FiCopy className="inline h-3 w-3 mr-1" />
                                    Copy
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex flex-wrap items-center gap-2 text-gray-700">
                              <FiClock className="h-4 w-4 text-gray-500" />
                              {s.occupied?.length ? (
                                s.occupied.map((o, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-800"
                                  >
                                    {o.time_slot} ({o.daypackage})
                                  </span>
                                ))
                              ) : (
                                <span className="font-medium">No schedule</span>
                              )}
                            </div>
                          </td>
                          <td className="py-6 text-right">
                            <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                onClick={() =>
                                  setModal({ type: "zoom", studentId: s.id })
                                }
                                className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                              >
                                <FiLink2 className="h-4 w-4 mr-2" />
                                Send Zoom
                              </Button>
                              <Button
                                onClick={() =>
                                  setModal({
                                    type: "attendance",
                                    studentId: s.id,
                                  })
                                }
                                disabled={!zoomSent[s.id]}
                                className={`px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 ${
                                  zoomSent[s.id]
                                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                                title={!zoomSent[s.id] ? "Send Zoom link first" : ""}
                              >
                                <FiCheck className="h-4 w-4 mr-2" />
                                Attendance
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile & Tablet View */}
        <div className="lg:hidden space-y-6">
          {filteredGroups.map((g) => (
            <div
              key={g.group}
              className="rounded-2xl shadow-xl border border-gray-200 bg-white overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors touch-manipulation"
                onClick={() => toggleGroup(g.group)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black rounded-xl">
                    <FiBookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-black text-xl">
                      {g.group || "Unknown Package"}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {g.students.length} student
                      {g.students.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-sm">
                    {g.students.length}
                  </div>
                  {expanded[g.group] ? (
                    <FiChevronUp className="text-black h-6 w-6" />
                  ) : (
                    <FiChevronDown className="text-black h-6 w-6" />
                  )}
                </div>
              </button>

              {expanded[g.group] && (
                <div className="p-4 space-y-4 bg-gray-50">
                  {g.students.map((s) => (
                    <div
                      key={s.id}
                      className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FiUser className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-bold text-black text-lg">
                                {s.name || "Unnamed Student"}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {s.id}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                              <FiBookOpen className="h-4 w-4 text-gray-500" />
                              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                                {s.subject || "N/A"}
                              </span>
                            </div>
                            {s.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FiPhone className="h-4 w-4 text-gray-500" />
                                <span>{s.phone}</span>
                                <button
                                  className="ml-2 text-xs px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-100"
                                  onClick={() => handleCopy(s.phone || "")}
                                  aria-label="Copy phone"
                                >
                                  <FiCopy className="inline h-3 w-3 mr-1" />
                                  Copy
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FiClock className="h-4 w-4 text-gray-500" />
                              <span>
                                {s.occupied?.length
                                  ? s.occupied
                                      .map(
                                        (o) =>
                                          `${o.time_slot} (${o.daypackage})`
                                      )
                                      .join(", ")
                                  : "No schedule"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button
                            onClick={() =>
                              setModal({ type: "zoom", studentId: s.id })
                            }
                            className="bg-black hover:bg-gray-800 text-white py-4 rounded-xl font-bold shadow-lg touch-manipulation"
                          >
                            <FiLink2 className="h-4 w-4 mr-2" />
                            Send Zoom Link
                          </Button>
                        <Button
                          onClick={() =>
                            setModal({ type: "attendance", studentId: s.id })
                          }
                          disabled={!zoomSent[s.id]}
                          className={`py-4 rounded-xl font-bold shadow-lg touch-manipulation ${
                            zoomSent[s.id]
                              ? "bg-gray-600 hover:bg-gray-700 text-white"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                          title={!zoomSent[s.id] ? "Send Zoom link first" : ""}
                        >
                          <FiCheck className="h-4 w-4 mr-2" />
                          Mark Attendance
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
            <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
              <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 max-h-[90vh] overflow-hidden">
                <div className="flex justify-center py-3 border-b border-gray-100">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black rounded-2xl">
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
                          ? "Share meeting details"
                          : "Record student progress"}
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
                        <label className="block text-sm font-bold text-black mb-3">
                          Meeting Link
                        </label>
                        <div className="flex gap-3">
                          <input
                            placeholder="https://zoom.us/j/..."
                            value={forms[modal.studentId]?.link || ""}
                            onChange={(e) =>
                              updateForm(modal.studentId!, {
                                link: e.target.value,
                              })
                            }
                            className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 text-base"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopy(forms[modal.studentId!]?.link || "")
                            }
                            className="px-4"
                            aria-label="Copy meeting link"
                          >
                            <FiCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-black mb-3">
                          Token
                        </label>
                        <div className="flex gap-3">
                          <input
                            placeholder="Security token"
                            value={forms[modal.studentId]?.token || ""}
                            onChange={(e) =>
                              updateForm(modal.studentId!, {
                                token: e.target.value,
                              })
                            }
                            className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 text-base font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateForm(modal.studentId!, {
                                token: genToken(),
                              })
                            }
                            className="px-4"
                            aria-label="Generate token"
                          >
                            Gen
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-black mb-3">
                          Sending Time
                        </label>
                        <div className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 text-base font-mono">
                          {new Date().toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Zoom link will be sent at current time
                        </p>
                      </div>

                      <Button
                        disabled={
                          !!sending[modal.studentId] ||
                          !forms[modal.studentId]?.link ||
                          !forms[modal.studentId]?.token
                        }
                        onClick={() => sendZoom(modal.studentId!)}
                        className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
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
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FiSend className="h-5 w-5" />
                            Send Link
                          </span>
                        )}
                      </Button>
                    </div>
                  )}

                  {modal.type === "attendance" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-black mb-3">
                          Status
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["present", "absent", "late"] as const).map(
                            (status) => (
                              <button
                                key={status}
                                onClick={() =>
                                  updateAttend(modal.studentId!, { status })
                                }
                                className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all ${
                                  attend[modal.studentId!]?.status === status
                                    ? "bg-black text-white border-black"
                                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                                }`}
                                aria-pressed={
                                  attend[modal.studentId!]?.status === status
                                }
                              >
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-black mb-2">
                            Level
                          </label>
                          <input
                            placeholder="Juz 1, Grade 5, Beginner"
                            value={attend[modal.studentId]?.level || ""}
                            onChange={(e) =>
                              updateAttend(modal.studentId!, {
                                level: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-black mb-2">
                            Surah
                          </label>
                          <select
                            value={attend[modal.studentId]?.surah || ""}
                            onChange={(e) =>
                              updateAttend(modal.studentId!, {
                                surah: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 text-base appearance-none"
                            disabled={loadingSurahs}
                          >
                            <option value="">Select Surah</option>
                            {surahs.map((surah) => (
                              <option key={surah} value={surah}>
                                {surah}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-black mb-2">
                            Pages
                          </label>
                          <input
                            type="number"
                            placeholder="5"
                            value={attend[modal.studentId]?.pages || ""}
                            onChange={(e) =>
                              updateAttend(modal.studentId!, {
                                pages: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-black mb-2">
                            Lesson
                          </label>
                          <input
                            placeholder="Topic"
                            value={attend[modal.studentId]?.lesson || ""}
                            onChange={(e) =>
                              updateAttend(modal.studentId!, {
                                lesson: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 text-base"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-black mb-2">
                          Notes
                        </label>
                        <textarea
                          placeholder="Session notes..."
                          value={attend[modal.studentId]?.notes || ""}
                          onChange={(e) =>
                            updateAttend(modal.studentId!, {
                              notes: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white text-gray-900 placeholder-gray-500 resize-none h-24 text-base"
                        />
                      </div>

                      <Button
                        onClick={() => saveAttendance(modal.studentId!)}
                        disabled={
                          !!sending[modal.studentId] ||
                          !attend[modal.studentId]?.status
                        }
                        className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
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
                            Saving...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FiCheck className="h-5 w-5" />
                            Save Record
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

      {/* Slide Panel Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
