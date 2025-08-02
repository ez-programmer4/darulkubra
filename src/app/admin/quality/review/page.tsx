"use client";
import React, { useEffect, useState, ReactNode } from "react";
import {
  FiCheck,
  FiLoader,
  FiAlertTriangle,
  FiInfo,
  FiAward,
  FiChevronLeft,
  FiChevronRight,
  FiGift,
  FiX,
  FiClock,
} from "react-icons/fi";
import { startOfWeek, format, addWeeks } from "date-fns";
import { toast } from "@/components/ui/use-toast";

const apiUrl = "/api/admin/quality-review";
const qualityLevels = ["Bad", "Good", "Better", "Excellent", "Exceptional"];

function Badge({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-800 shadow-sm ${className}`}
    >
      {children}
    </span>
  );
}

export default function AdminQualityReviewPage() {
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [bonus, setBonus] = useState<{ [teacherId: string]: number }>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [managerOverrides, setManagerOverrides] = useState<{
    [teacherId: string]: string;
  }>({});
  const [managerNotes, setManagerNotes] = useState<{
    [teacherId: string]: string;
  }>({});
  const [bonusHistory, setBonusHistory] = useState<any[]>([]);
  const [bonusHistoryTeacher, setBonusHistoryTeacher] = useState<string | null>(
    null
  );
  const [showBonusHistory, setShowBonusHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const weekStartStr =
        weekStart.toISOString().split("T")[0] + "T00:00:00.000Z";
      const res = await fetch(`${apiUrl}?weekStart=${weekStartStr}`);
      if (!res.ok) throw new Error("Failed to fetch quality review data");
      const data = await res.json();
      setTeachers(data);
      const overrides: { [teacherId: string]: string } = {};
      const notes: { [teacherId: string]: string } = {};
      data.forEach((t: any) => {
        overrides[t.teacherId] = t.managerOverride ?? t.overallQuality;
        notes[t.teacherId] = t.overrideNotes || "";
      });
      setManagerOverrides(overrides);
      setManagerNotes(notes);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
      toast({
        title: "Error",
        description: e.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchBonusHistory(teacherId: string) {
    setBonusHistory([]);
    setBonusHistoryTeacher(teacherId);
    setShowBonusHistory(true);
    try {
      const res = await fetch(`/api/teachers/${teacherId}/bonuses`);
      if (!res.ok) throw new Error("Failed to fetch bonus history");
      const data = await res.json();
      setBonusHistory(data);
    } catch (e: any) {
      setBonusHistory([]);
      toast({
        title: "Error",
        description: e.message || "Failed to load bonus history",
        variant: "destructive",
      });
    }
  }

  async function handleApprove(teacherId: string) {
    setApproving(teacherId);
    setSuccess(null);
    setError(null);
    try {
      const weekStartStr =
        weekStart.toISOString().split("T")[0] + "T00:00:00.000Z";

      const requestBody = {
        override: managerOverrides[teacherId],
        notes: managerNotes[teacherId],
        bonus: bonus[teacherId] !== undefined ? bonus[teacherId] : 100,
      };

      console.log("Sending approval request:", {
        teacherId,
        weekStartStr,
        requestBody,
        bonusValue: bonus[teacherId],
        bonusType: typeof bonus[teacherId],
      });

      const res = await fetch(
        `${apiUrl}?teacherId=${teacherId}&weekStart=${weekStartStr}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );
      if (!res.ok) throw new Error("Failed to approve/override");
      setSuccess("Saved successfully!");
      toast({ title: "Success", description: "Saved and notified!" });
      await fetchData();
    } catch (e: any) {
      setError(e.message || "Failed to save");
      toast({
        title: "Error",
        description: e.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  }

  function changeWeek(offset: number) {
    setWeekStart((prev) => addWeeks(prev, offset));
  }

  const badTeachers = teachers.filter((t) => t.overallQuality === "Bad");
  const others = teachers.filter((t) => t.overallQuality !== "Bad");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12 relative">
          <div className="absolute left-0 top-0 w-2 h-full bg-blue-600 rounded-lg" />
          <div className="pl-6">
            <h1 className="text-4xl font-extrabold text-blue-900 flex items-center gap-3">
              <FiInfo className="text-blue-600 h-10 w-10" />
              Quality Review Dashboard
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-3xl">
              Review and manage teacher performance metrics for the selected
              week, including quality ratings and bonuses.
            </p>
          </div>
        </header>

        {/* Week Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 bg-white rounded-2xl shadow-lg p-6 border border-blue-200">
          <button
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all shadow-md"
            onClick={() => changeWeek(-1)}
            aria-label="Previous Week"
          >
            <FiChevronLeft /> Previous Week
          </button>
          <span className="text-xl font-semibold text-blue-800 my-2 sm:my-0">
            Week of {format(weekStart, "MMMM dd, yyyy")}
          </span>
          <button
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all shadow-md disabled:opacity-50"
            onClick={() => changeWeek(1)}
            disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 1 })}
            aria-label="Next Week"
          >
            Next Week <FiChevronRight />
          </button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-600 rounded-lg text-red-800 font-semibold flex items-center gap-3">
            <FiAlertTriangle className="text-red-600" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-8 p-4 bg-green-50 border-l-4 border-green-600 rounded-lg text-green-800 font-semibold flex items-center gap-3">
            <FiCheck className="text-green-600" /> {success}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16 animate-pulse">
            <FiLoader className="text-blue-600 text-4xl mr-3 animate-spin" />
            <span className="text-blue-700 text-lg font-semibold">
              Loading data...
            </span>
          </div>
        ) : (
          <>
            {/* Teachers Requiring Review */}
            {badTeachers.length > 0 && (
              <section className="mb-12 bg-white rounded-2xl shadow-xl p-8 border border-red-100">
                <h2 className="text-2xl font-bold text-red-800 flex items-center gap-3 mb-6">
                  <FiAlertTriangle className="text-red-600 h-8 w-8 animate-pulse" />
                  Teachers Requiring Review
                </h2>
                <ul className="space-y-4">
                  {badTeachers.map((t, idx) => (
                    <li
                      key={t.teacherId}
                      className="flex items-center gap-4 bg-red-50 rounded-lg px-5 py-3 shadow-sm hover:shadow-md hover:bg-red-100 transition-all"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-200 text-red-800 font-extrabold text-lg shadow">
                        {t.teacherName
                          ?.split(" ")
                          ?.map((n: string) => n[0])
                          ?.join("") || "N/A"}
                      </span>
                      <span className="text-red-900 font-semibold text-lg">
                        {t.teacherName || "Unknown Teacher"}
                      </span>
                      <Badge color="red" className="font-bold">
                        Bad
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* All Teachers Table */}
            <section className="bg-white rounded-2xl shadow-xl border border-blue-200">
              <h2 className="text-2xl font-bold text-blue-900 p-8">
                All Teachers
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-blue-50">
                    <tr>
                      {[
                        "Teacher",
                        "Controller Feedback",
                        "Control Rate",
                        "Exam Pass Rate",
                        "Examiner Rating",
                        "Overall Quality",
                        "Manager Approval",
                        "Bonus",
                      ].map((header, idx) => (
                        <th
                          key={idx}
                          className="px-6 py-4 text-left text-xs font-bold text-blue-800 uppercase tracking-wider"
                        >
                          {header}
                          {[
                            "Control Rate",
                            "Exam Pass Rate",
                            "Examiner Rating",
                            "Overall Quality",
                          ].includes(header) && (
                            <FiInfo
                              className="inline ml-2 text-blue-600"
                              title={
                                header === "Control Rate"
                                  ? "Average of all supervisor ratings (1–10) for this week."
                                  : header === "Exam Pass Rate"
                                  ? "% of students who passed exams."
                                  : header === "Examiner Rating"
                                  ? "Average examiner rating (1–10)."
                                  : "Final quality level set by manager or calculated."
                              }
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {others.map((t, idx) => (
                      <tr
                        key={t.teacherId}
                        className={`transition-all duration-200 ${
                          idx % 2 === 0 ? "bg-white" : "bg-blue-50"
                        } hover:bg-blue-100 hover:shadow-md`}
                      >
                        <td className="px-6 py-5 flex items-center gap-4">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-extrabold text-lg shadow-lg">
                            {t.teacherName
                              ?.split(" ")
                              ?.map((n: string) => n[0])
                              ?.join("") || "N/A"}
                          </span>
                          <span
                            className="font-semibold text-blue-900 truncate max-w-[180px] text-lg"
                            title={t.teacherName || "Unknown Teacher"}
                          >
                            {t.teacherName || "Unknown Teacher"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <Badge color="green" className="font-semibold">
                                +{t.positiveSum} ({t.positiveCount})
                              </Badge>
                              <span className="text-xs text-green-800">
                                Avg:{" "}
                                {t.positiveCount
                                  ? (t.positiveSum / t.positiveCount).toFixed(1)
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge color="red" className="font-semibold">
                                -{t.negativeSum} ({t.negativeCount})
                              </Badge>
                              <span className="text-xs text-red-800">
                                Avg:{" "}
                                {t.negativeCount
                                  ? (t.negativeSum / t.negativeCount).toFixed(1)
                                  : "-"}
                              </span>
                            </div>
                            <div className="mt-2">
                              {t.controllerFeedback?.positive?.length > 0 && (
                                <ul className="list-disc ml-5 text-green-900">
                                  {t.controllerFeedback.positive.map(
                                    (c: any, i: number) => (
                                      <li key={i} className="mb-1">
                                        {c.title}{" "}
                                        <span className="font-bold">
                                          ({c.rating})
                                        </span>
                                        {c.note && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            Note: {c.note}
                                          </span>
                                        )}
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}
                              {t.controllerFeedback?.negative?.length > 0 && (
                                <ul className="list-disc ml-5 text-red-900">
                                  {t.controllerFeedback.negative.map(
                                    (c: any, i: number) => (
                                      <li key={i} className="mb-1">
                                        {c.title}{" "}
                                        <span className="font-bold">
                                          ({c.rating})
                                        </span>
                                        {c.note && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            Note: {c.note}
                                          </span>
                                        )}
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {typeof t.controlRate === "number" ? (
                            <span
                              className={`inline-block px-4 py-1 rounded-full text-xs font-bold shadow-sm ${
                                t.controlRate <= 4
                                  ? "bg-red-100 text-red-800"
                                  : t.controlRate <= 6
                                  ? "bg-yellow-100 text-yellow-800"
                                  : t.controlRate <= 8
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-200 text-yellow-900 border border-yellow-600"
                              }`}
                            >
                              {t.controlRate.toFixed(1)}/10
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-block px-4 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 shadow-sm">
                            {t.examPassRate ?? "-"}%
                            {typeof t.examSampleSize === "number" && (
                              <span className="ml-2 text-xs text-gray-500">
                                (N={t.examSampleSize})
                              </span>
                            )}
                          </span>
                          {t.examSampleSize !== undefined &&
                            t.examSampleSize < 3 && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full animate-pulse">
                                <FiAlertTriangle /> Low sample
                              </span>
                            )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-block px-4 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 shadow-sm">
                            {t.examinerRating ?? "-"}/10
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span
                            className={`inline-block px-4 py-1 rounded-full text-xs font-bold shadow-sm ${
                              t.overallQuality === "Exceptional"
                                ? "bg-yellow-200 text-yellow-900 border border-yellow-600"
                                : t.overallQuality === "Excellent"
                                ? "bg-green-200 text-green-900"
                                : t.overallQuality === "Better"
                                ? "bg-green-100 text-green-800"
                                : t.overallQuality === "Good"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {t.overallQuality}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-3">
                            <select
                              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 shadow-sm"
                              value={managerOverrides[t.teacherId]}
                              onChange={(e) =>
                                setManagerOverrides((prev) => ({
                                  ...prev,
                                  [t.teacherId]: e.target.value,
                                }))
                              }
                              disabled={approving === t.teacherId}
                              aria-label={`Override quality for ${t.teacherName}`}
                              title="Override the calculated quality level"
                            >
                              {qualityLevels.map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                            <input
                              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 shadow-sm"
                              placeholder="Manager notes (optional)"
                              value={managerNotes[t.teacherId] || ""}
                              onChange={(e) =>
                                setManagerNotes((prev) => ({
                                  ...prev,
                                  [t.teacherId]: e.target.value,
                                }))
                              }
                              disabled={approving === t.teacherId}
                              aria-label={`Manager notes for ${t.teacherName}`}
                              title="Add notes for this override (optional)"
                            />
                            <button
                              className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all shadow-md disabled:opacity-50"
                              onClick={() => handleApprove(t.teacherId)}
                              disabled={approving === t.teacherId}
                              aria-label={`Save approval for ${t.teacherName}`}
                            >
                              {approving === t.teacherId ? (
                                <FiLoader className="animate-spin" />
                              ) : (
                                <FiCheck />
                              )}
                              Save
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col items-center gap-3">
                            {t.overallQuality === "Exceptional" ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="border border-gray-300 rounded-lg px-4 py-2 w-24 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm"
                                    value={
                                      bonus[t.teacherId] !== undefined
                                        ? bonus[t.teacherId]
                                        : ""
                                    }
                                    placeholder="100"
                                    onChange={(e) => {
                                      const inputValue = Number(e.target.value);
                                      const clampedValue = Math.min(
                                        100,
                                        Math.max(0, inputValue)
                                      );
                                      console.log("Bonus input change:", {
                                        teacherId: t.teacherId,
                                        inputValue,
                                        clampedValue,
                                        originalValue: e.target.value,
                                        currentBonusState: bonus[t.teacherId],
                                      });
                                      setBonus((prev) => {
                                        const newState = {
                                          ...prev,
                                          [t.teacherId]: clampedValue,
                                        };
                                        console.log(
                                          "New bonus state:",
                                          newState
                                        );
                                        return newState;
                                      });
                                    }}
                                    aria-label={`Bonus amount for ${t.teacherName}`}
                                    title="Exceptional Quality Bonus (max 100 ETB)"
                                  />
                                  <span className="text-yellow-800 font-semibold">
                                    ETB
                                  </span>
                                </div>
                                <button
                                  className="flex items-center gap-2 px-5 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 transition-all shadow-md disabled:opacity-50"
                                  onClick={() => handleApprove(t.teacherId)}
                                  disabled={approving === t.teacherId}
                                  aria-label={`Award bonus for ${t.teacherName}`}
                                >
                                  <FiAward /> Award
                                </button>
                              </>
                            ) : (
                              <span className="inline-block px-4 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold shadow-sm">
                                -
                              </span>
                            )}
                            {t.bonusAwarded && (
                              <span className="inline-block px-4 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold animate-slide-in">
                                Bonus: {t.bonusAwarded} ETB
                              </span>
                            )}
                            <button
                              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-all"
                              onClick={() => fetchBonusHistory(t.teacherId)}
                              aria-label={`View bonus history for ${t.teacherName}`}
                            >
                              <FiGift /> Bonus History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {others.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center text-gray-500 py-12"
                        >
                          No teacher data available for this week.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Bonus History Modal */}
        {showBonusHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8 border border-blue-200 animate-slide-up">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 rounded-full p-2 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
                onClick={() => setShowBonusHistory(false)}
                aria-label="Close bonus history modal"
              >
                <FiX size={24} />
              </button>
              <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-3">
                <FiGift className="text-yellow-600 h-8 w-8" />
                Bonus History
              </h2>
              {bonusHistory.length === 0 ? (
                <div className="text-gray-600 text-center py-8">
                  <FiClock className="mx-auto text-4xl mb-3 text-gray-500" />
                  No bonus records found.
                </div>
              ) : (
                <ul className="divide-y divide-blue-100">
                  {bonusHistory.map((b: any, i: number) => (
                    <li
                      key={i}
                      className="py-4 flex items-center gap-4 animate-slide-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <Badge color="yellow" className="font-semibold">
                        +{b.amount} ETB
                      </Badge>
                      <span className="text-gray-700 text-base">
                        {b.period}
                      </span>
                      <span className="text-gray-500 text-xs">{b.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(50px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-in {
            animation: slide-in 0.5s ease-out;
          }
          .animate-slide-up {
            animation: slide-up 0.4s ease-out;
          }
          .animate-fade-in {
            animation: slide-in 0.5s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
