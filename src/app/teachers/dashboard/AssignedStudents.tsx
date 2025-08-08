"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/LoadingSpinner";

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

function genToken(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const array = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) out += chars[array[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function AssignedStudents() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: ModalType; studentId: number | null }>({ type: null, studentId: null });
  const [forms, setForms] = useState<Record<number, { link: string; token: string; expiry: string }>>({});
  const [attend, setAttend] = useState<Record<number, { status: string; level?: string; surah?: string; pages?: string; lesson?: string; notes?: string }>>({});
  const [sending, setSending] = useState<Record<number, boolean>>({});

  // UX state
  const [query, setQuery] = useState("");
  const [pkgFilter, setPkgFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expAll, setExpAll] = useState(false);
  const [todayOnly, setTodayOnly] = useState(true);

  function packageIncludesToday(pkg?: string): boolean {
    if (!pkg) return false;
    const day = new Date().getDay(); // 0=Sun
    const key = pkg.trim().toUpperCase();
    const map: Record<string, number[]> = {
      MWF: [1, 3, 5],
      TTS: [2, 4, 6],
      SS: [0, 6],
      "ALL DAYS": [0, 1, 2, 3, 4, 5, 6],
    };
    if (map[key]) return map[key].includes(day);
    const names = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    if (names.includes(key)) return names.indexOf(key) === day;
    const up = key.replaceAll(".", "").replaceAll(" ", "");
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

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch("/api/teachers/students/assigned", { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      setGroups(data.groups || []);
      // default expand groups when expAll is true
      if (expAll) {
        const next: Record<string, boolean> = {};
        (data.groups || []).forEach((g: Group) => (next[g.group] = true));
        setExpanded(next);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const updateForm = (id: number, patch: Partial<{ link: string; token: string; expiry: string }>) =>
    setForms((f) => ({ ...f, [id]: { link: f[id]?.link || "", token: f[id]?.token || "", expiry: f[id]?.expiry || "", ...patch } }));

  const updateAttend = (
    id: number,
    patch: Partial<{ status: string; level?: string; surah?: string; pages?: string; lesson?: string; notes?: string }>
  ) => setAttend((a) => ({ ...a, [id]: { status: a[id]?.status || "present", ...a[id], ...patch } }));

  async function sendZoom(studentId: number) {
    try {
      const form = forms[studentId];
      if (!form?.link || !form?.token) {
        alert("Link and token are required");
        return;
      }
      setSending((s) => ({ ...s, [studentId]: true }));
      const res = await fetch(`/api/teachers/students/${studentId}/zoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: form.link, tracking_token: form.token, expiration_date: form.expiry || undefined }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send zoom link");
      alert("Zoom link sent successfully!");
      setForms((f) => ({ ...f, [studentId]: { link: "", token: "", expiry: "" } }));
      setModal({ type: null, studentId: null });
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSending((s) => ({ ...s, [studentId]: false }));
    }
  }

  async function saveAttendance(studentId: number) {
    try {
      const rec = attend[studentId];
      if (!rec?.status) {
        alert("Attendance status is required");
        return;
      }
      const res = await fetch(`/api/teachers/students/${studentId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance_status: rec.status, surah: rec.surah || undefined, pages_read: rec.pages ? Number(rec.pages) : undefined, level: rec.level || undefined, lesson: rec.lesson || undefined, notes: rec.notes || undefined }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save attendance");
      alert("Attendance saved successfully!");
      setAttend((a) => ({ ...a, [studentId]: { status: "present" } }));
      setModal({ type: null, studentId: null });
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  }

  // Derived filtered groups
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterPkg = pkgFilter.toLowerCase();
    return groups
      .map((g) => {
        const filteredStudents = g.students
          .filter((s) => {
            const matchesQuery = !q || (s.name || "").toLowerCase().includes(q) || (s.subject || "").toLowerCase().includes(q);
            const matchesPkg = filterPkg === "all" || (s.daypackages || "").toLowerCase().includes(filterPkg);
            return matchesQuery && matchesPkg;
          })
          .map((s) => {
            const occ = Array.isArray(s.occupied) ? s.occupied : [];
            const occFiltered = todayOnly ? occ.filter((o) => packageIncludesToday(o.daypackage)) : occ;
            return { ...s, occupied: occFiltered };
          })
          .filter((s) => !todayOnly || (s.occupied && s.occupied.length > 0));
        return { group: g.group, students: filteredStudents };
      })
      .filter((g) => g.students.length > 0);
  }, [groups, query, pkgFilter, todayOnly]);

  function toggleGroup(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function toggleAll() {
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => (next[g.group] = !expAll));
    setExpanded(next);
    setExpAll((v) => !v);
  }

  function handleCopy(text: string) {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard"));
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="bg-white/95 rounded-2xl shadow-md border border-indigo-100 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center flex-1">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or subject..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="text-slate-400" />
            <select
              value={pkgFilter}
              onChange={(e) => setPkgFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All packages</option>
              <option value="mwf">MWF</option>
              <option value="tts">TTS</option>
              <option value="ss">SS</option>
              <option value="all days">All days</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
            <span>Today only</span>
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />
          </label>
          <Button variant="outline" className="border-indigo-200" onClick={toggleAll}>
            {expAll ? <FiChevronUp className="mr-2" /> : <FiChevronDown className="mr-2" />} {expAll ? "Collapse" : "Expand"} All
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={refresh}>
            <FiRefreshCcw className="mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {loading && <PageLoading />}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-lg flex items-center gap-3 animate-slide-in">
          <FiAlertTriangle className="text-red-600 h-6 w-6 animate-pulse" />
          <span className="text-red-700 font-medium">{error}</span>
        </div>
      )}
      {!loading && !error && filteredGroups.length === 0 && (
        <div className="p-6 text-center text-slate-500 bg-white/95 rounded-2xl shadow-lg border border-indigo-100 animate-slide-in">
          No students match your filters.
        </div>
      )}

      {/* Desktop Table per group */}
      <div className="hidden md:grid md:grid-cols-1 gap-6">
        {filteredGroups.map((g, idx) => (
          <div key={g.group} className="rounded-2xl shadow-xl border border-indigo-200 bg-white/95 backdrop-blur-sm overflow-hidden animate-slide-in" style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiUser className="h-5 w-5 text-indigo-600" />
                <h2 className="font-bold text-lg text-indigo-900">{g.group || "Unknown Package"}</h2>
                <span className="text-xs text-white bg-indigo-500 px-2 py-1 rounded-full">{g.students.length} student{g.students.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="p-4">
              <table className="w-full text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-indigo-100">
                    <th className="py-2 text-left font-semibold text-indigo-800">Name</th>
                    <th className="py-2 text-left font-semibold text-indigo-800">Subject</th>
                    <th className="py-2 text-left font-semibold text-indigo-800">Schedule</th>
                    <th className="py-2 text-right font-semibold text-indigo-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {g.students.map((s, sIdx) => (
                    <tr key={s.id} className="border-b border-indigo-100 hover:bg-indigo-50/50 transition-colors" style={{ animationDelay: `${sIdx * 50}ms` }}>
                      <td className="py-3">{s.name || "Unnamed Student"}</td>
                      <td className="py-3">{s.subject || "N/A"}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <FiClock className="h-4 w-4 text-indigo-500" />
                          {s.occupied?.length ? s.occupied.map((o) => `${o.time_slot} (${o.daypackage})`).join(", ") : "N/A"}
                        </div>
                      </td>
                      <td className="py-3 text-right flex gap-2 justify-end">
                        <Button onClick={() => setModal({ type: "zoom", studentId: s.id })} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1 px-2 rounded-md">
                          <FiLink2 className="h-4 w-4 mr-1" /> Zoom
                        </Button>
                        <Button onClick={() => setModal({ type: "attendance", studentId: s.id })} className="bg-sky-600 hover:bg-sky-700 text-white text-xs py-1 px-2 rounded-md">
                          <FiCheck className="h-4 w-4 mr-1" /> Attendance
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="grid md:hidden grid-cols-1 gap-4">
        {filteredGroups.map((g) => (
          <div key={g.group} className="rounded-2xl shadow-lg border border-indigo-100 overflow-hidden bg-white/95">
            <button className="w-full flex items-center justify-between p-4" onClick={() => toggleGroup(g.group)}>
              <div className="flex items-center gap-2 font-bold text-indigo-800">
                <FiUser />
                {g.group || "Unknown Package"}
                <span className="ml-2 text-xs text-white bg-indigo-500 px-2 py-0.5 rounded-full">{g.students.length}</span>
              </div>
              {expanded[g.group] ? <FiChevronUp className="text-indigo-700" /> : <FiChevronDown className="text-indigo-700" />}
            </button>
            {expanded[g.group] && (
              <div className="p-3 space-y-3">
                {g.students.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-indigo-900">{s.name || "Unnamed Student"}</div>
                        <div className="text-xs text-slate-500">{s.subject || "N/A"}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <FiClock className="h-4 w-4 text-indigo-500" />
                          {s.occupied?.length ? s.occupied.map((o) => `${o.time_slot} (${o.daypackage})`).join(", ") : "N/A"}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">ID: {s.id}</div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => setModal({ type: "zoom", studentId: s.id })} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                        <FiLink2 className="h-4 w-4 mr-1" /> Zoom
                      </Button>
                      <Button onClick={() => setModal({ type: "attendance", studentId: s.id })} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-xs">
                        <FiCheck className="h-4 w-4 mr-1" /> Attendance
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal for Zoom and Attendance Forms */}
      {modal.type && modal.studentId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-slide-in">
            <button onClick={() => setModal({ type: null, studentId: null })} className="absolute top-4 right-4 text-slate-500 hover:text-slate-700" aria-label="Close modal">
              <FiX className="h-5 w-5" />
            </button>
            {modal.type === "zoom" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <FiLink2 className="h-5 w-5 text-indigo-600" /> Send Zoom Link
                </h3>
                <div className="flex gap-2">
                  <input className="w-full p-3 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Enter Zoom link" value={forms[modal.studentId]?.link || ""} onChange={(e) => updateForm(modal.studentId!, { link: e.target.value })} />
                  <Button variant="outline" className="border-indigo-200" onClick={() => handleCopy(forms[modal.studentId!]?.link || "")}> <FiCopy /> </Button>
                </div>
                <div className="flex gap-2">
                  <input className="w-full p-3 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Enter tracking token" value={forms[modal.studentId]?.token || ""} onChange={(e) => updateForm(modal.studentId!, { token: e.target.value })} />
                  <Button variant="outline" className="border-indigo-200" onClick={() => updateForm(modal.studentId!, { token: genToken() })}> Generate </Button>
                </div>
                <input type="datetime-local" className="w-full p-3 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Expiration (optional)" value={forms[modal.studentId]?.expiry || ""} onChange={(e) => updateForm(modal.studentId!, { expiry: e.target.value })} />
                <Button disabled={!!sending[modal.studentId]} onClick={() => sendZoom(modal.studentId!)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  {sending[modal.studentId] ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FiSend className="h-5 w-5" /> Send Link
                    </span>
                  )}
                </Button>
              </div>
            )}
            {modal.type === "attendance" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-violet-900 flex items-center gap-2">
                  <FiCheck className="h-5 w-5 text-violet-600" /> Attendance & Progress
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["present", "absent", "late"] as const).map((s) => (
                    <button key={s} onClick={() => updateAttend(modal.studentId!, { status: s })} className={`px-3 py-2 rounded-lg border ${attend[modal.studentId!]?.status === s ? "bg-violet-600 text-white border-violet-600" : "border-violet-200 text-violet-700"`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <input className="w-full p-3 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Level (e.g., Juz, Grade)" value={attend[modal.studentId]?.level || ""} onChange={(e) => updateAttend(modal.studentId!, { level: e.target.value })} />
                <input className="w-full p-3 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Surah" value={attend[modal.studentId]?.surah || ""} onChange={(e) => updateAttend(modal.studentId!, { surah: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="w-full p-3 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Pages" value={attend[modal.studentId]?.pages || ""} onChange={(e) => updateAttend(modal.studentId!, { pages: e.target.value })} />
                  <input className="w-full p-3 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700 placeholder-slate-400 transition-all" placeholder="Lesson" value={attend[modal.studentId]?.lesson || ""} onChange={(e) => updateAttend(modal.studentId!, { lesson: e.target.value })} />
                </div>
                <textarea className="w-full p-3 border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700 placeholder-slate-400 transition-all resize-none h-24" placeholder="Additional notes" value={attend[modal.studentId]?.notes || ""} onChange={(e) => updateAttend(modal.studentId!, { notes: e.target.value })} />
                <Button onClick={() => saveAttendance(modal.studentId!)} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <FiCheck className="h-5 w-5" /> Save Attendance
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tailwind Animations */}
      <style jsx>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.5s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}