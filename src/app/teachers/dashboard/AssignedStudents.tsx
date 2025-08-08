"use client";

import React, { useEffect, useState } from "react";
import { FiSend, FiUser, FiChevronDown, FiChevronUp, FiCheck } from "react-icons/fi";
import { Button } from "@/components/ui/button";

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

export default function AssignedStudents() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<Record<number, boolean>>({});
  const [forms, setForms] = useState<Record<number, { link: string; token: string; expiry: string }>>({});
  const [attend, setAttend] = useState<Record<number, { status: string; level?: string; surah?: string; pages?: string; lesson?: string; notes?: string }>>({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/teachers/students/assigned", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load students");
        const data = await res.json();
        setGroups(data.groups || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggle = (k: string) => setExpanded((s) => ({ ...s, [k]: !s[k] }));

  const updateForm = (id: number, patch: Partial<{ link: string; token: string; expiry: string }>) =>
    setForms((f) => ({ ...f, [id]: { link: f[id]?.link || "", token: f[id]?.token || "", expiry: f[id]?.expiry || "", ...patch } }));

  const updateAttend = (id: number, patch: Partial<{ status: string; level?: string; surah?: string; pages?: string; lesson?: string; notes?: string }>) =>
    setAttend((a) => ({ ...a, [id]: { status: a[id]?.status || "present", ...a[id], ...patch } }));

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
      });
      if (!res.ok) throw new Error("Failed to send zoom link");
      alert("Zoom link sent");
      setForms((f) => ({ ...f, [studentId]: { link: "", token: "", expiry: "" } }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending((s) => ({ ...s, [studentId]: false }));
    }
  }

  async function saveAttendance(studentId: number) {
    try {
      const rec = attend[studentId];
      if (!rec?.status) {
        alert("Status required");
        return;
      }
      const res = await fetch(`/api/teachers/students/${studentId}/attendance`, {
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
      });
      if (!res.ok) throw new Error("Failed to save attendance");
      alert("Attendance saved");
      setAttend((a) => ({ ...a, [studentId]: { status: "present" } }));
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {loading && <div className="p-4 text-center">Loading...</div>}
      {error && <div className="p-4 text-red-600 text-center">{error}</div>}
      {!loading && !error && groups.length === 0 && (
        <div className="p-4 text-center text-gray-500">No assigned students</div>
      )}
      {groups.map((g) => (
        <div key={g.group} className="bg-white rounded-xl shadow border border-green-100 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4" onClick={() => toggle(g.group)}>
            <div className="flex items-center gap-2 font-bold text-green-800">
              <FiUser />
              {g.group || "Unknown Package"}
            </div>
            {expanded[g.group] ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {expanded[g.group] && (
            <div className="divide-y">
              {g.students.map((s) => (
                <div key={s.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-green-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.subject || "-"}</div>
                      <div className="text-xs text-gray-400">{s.occupied?.map((o) => `${o.time_slot} (${o.daypackage})`).join(", ")}</div>
                    </div>
                    <div className="text-xs text-gray-500">ID: {s.id}</div>
                  </div>
                  {/* Zoom form */}
                  <div className="bg-green-50 rounded-lg p-3 space-y-2">
                    <div className="text-sm font-semibold text-green-700">Send Zoom Link</div>
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Zoom link"
                      value={forms[s.id]?.link || ""}
                      onChange={(e) => updateForm(s.id, { link: e.target.value })}
                    />
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Tracking token"
                      value={forms[s.id]?.token || ""}
                      onChange={(e) => updateForm(s.id, { token: e.target.value })}
                    />
                    <input
                      type="datetime-local"
                      className="w-full p-2 border rounded"
                      placeholder="Expiration (optional)"
                      value={forms[s.id]?.expiry || ""}
                      onChange={(e) => updateForm(s.id, { expiry: e.target.value })}
                    />
                    <Button disabled={!!sending[s.id]} onClick={() => sendZoom(s.id)} className="w-full bg-green-600 hover:bg-green-700 text-white">
                      {sending[s.id] ? "Sending..." : <span className="flex items-center gap-2"><FiSend /> Send</span>}
                    </Button>
                  </div>
                  {/* Attendance form */}
                  <div className="bg-teal-50 rounded-lg p-3 space-y-2">
                    <div className="text-sm font-semibold text-teal-700">Attendance & Progress</div>
                    <select className="w-full p-2 border rounded" value={attend[s.id]?.status || "present"} onChange={(e) => updateAttend(s.id, { status: e.target.value })}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                    <input className="w-full p-2 border rounded" placeholder="Level (e.g., Juz, Grade)" value={attend[s.id]?.level || ""} onChange={(e) => updateAttend(s.id, { level: e.target.value })} />
                    <input className="w-full p-2 border rounded" placeholder="Surah" value={attend[s.id]?.surah || ""} onChange={(e) => updateAttend(s.id, { surah: e.target.value })} />
                    <input className="w-full p-2 border rounded" placeholder="Pages read" value={attend[s.id]?.pages || ""} onChange={(e) => updateAttend(s.id, { pages: e.target.value })} />
                    <input className="w-full p-2 border rounded" placeholder="Lesson" value={attend[s.id]?.lesson || ""} onChange={(e) => updateAttend(s.id, { lesson: e.target.value })} />
                    <textarea className="w-full p-2 border rounded" placeholder="Notes" value={attend[s.id]?.notes || ""} onChange={(e) => updateAttend(s.id, { notes: e.target.value })} />
                    <Button onClick={() => saveAttendance(s.id)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      <span className="flex items-center gap-2"><FiCheck /> Save</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}