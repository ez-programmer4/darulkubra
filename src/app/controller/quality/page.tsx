"use client";
import React, { useEffect, useState } from "react";
import {
  FiCheck,
  FiLoader,
  FiPlus,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useSession } from "next-auth/react";
import { startOfWeek, format, subWeeks, addWeeks } from "date-fns";
import { useRouter } from "next/navigation";

const apiUrl = "/api/teachers";
const qualityDescUrl = "/api/admin/quality-descriptions";

export default function ControllerQualityPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{
    positive: any[];
    negative: any[];
  }>({ positive: [], negative: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastWeekFeedback, setLastWeekFeedback] = useState<any>({});
  const [fetchingLast, setFetchingLast] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  useEffect(() => {
    async function fetchTeachers() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/controller/teachers");
        if (!res.ok) throw new Error("Failed to fetch teachers");
        const data = await res.json();
        
        
        // Handle both array and object responses
        const teachersArray = Array.isArray(data) ? data : (data.teachers || []);
        setTeachers(Array.isArray(teachersArray) ? teachersArray : []);
      } catch (e: any) {
        console.error('Teachers fetch error:', e);
        setError(e.message || "Failed to load teachers");
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTeachers();
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const [posRes, negRes] = await Promise.all([
          fetch(qualityDescUrl + "?type=positive"),
          fetch(qualityDescUrl + "?type=negative"),
        ]);
        
        const pos = posRes.ok ? await posRes.json() : [];
        const neg = negRes.ok ? await negRes.json() : [];
        
        setCategories({
          positive: Array.isArray(pos) ? pos : [],
          negative: Array.isArray(neg) ? neg : [],
        });
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories({ positive: [], negative: [] });
      }
    }
    fetchCategories();
  }, []);

  async function fetchLastWeekFeedback(teacherId: string) {
    setFetchingLast(true);
    try {
      const lastWeekStart = new Date(
        startOfWeek(subWeeks(selectedWeek, 1), { weekStartsOn: 1 })
      );
      const lastWeekStartStr =
        lastWeekStart.toISOString().split("T")[0] + "T00:00:00.000Z";
      const res = await fetch(`${apiUrl}/${teacherId}/quality-assessments`);
      if (!res.ok) throw new Error("Failed to fetch last week feedback");
      const all = await res.json();
      
      // Ensure all is an array before using find
      const allArray = Array.isArray(all) ? all : [];
      const last = allArray.find(
        (r: any) => r.weekStart && r.weekStart.startsWith(lastWeekStartStr)
      );
      setLastWeekFeedback((prev: any) => ({ ...prev, [teacherId]: last }));
    } catch (error) {
      console.error('Fetch last week feedback error:', error);
      setLastWeekFeedback((prev: any) => ({ ...prev, [teacherId]: null }));
    } finally {
      setFetchingLast(false);
    }
  }

  function handleExpand(teacher: any) {
    setExpanded(expanded === teacher.ustazid ? null : teacher.ustazid);
    if (expanded !== teacher.ustazid) fetchLastWeekFeedback(teacher.ustazid);
  }

  function handleCategoryChange(
    teacherId: string,
    type: string,
    catId: number,
    checked: boolean
  ) {
    setForm((prev: any) => {
      const prevCats = prev[teacherId]?.[type] || [];
      const catList =
        type === "positive" ? categories.positive : categories.negative;
      const catObj = catList.find((c: any) => c.id === catId);
      const newCats = checked
        ? [
            ...prevCats,
            {
              id: catId,
              description: catObj?.description || "",
              note: "",
              rating: 5,
            },
          ]
        : prevCats.filter((c: any) => c.id !== catId);
      return { ...prev, [teacherId]: { ...prev[teacherId], [type]: newCats } };
    });
  }

  function handleNoteChange(
    teacherId: string,
    type: string,
    catId: number,
    note: string
  ) {
    setForm((prev: any) => {
      const cats = prev[teacherId]?.[type] || [];
      return {
        ...prev,
        [teacherId]: {
          ...prev[teacherId],
          [type]: cats.map((c: any) => (c.id === catId ? { ...c, note } : c)),
        },
      };
    });
  }

  function handleRatingChange(
    teacherId: string,
    type: string,
    catId: number,
    rating: number
  ) {
    setForm((prev: any) => {
      const cats = prev[teacherId]?.[type] || [];
      return {
        ...prev,
        [teacherId]: {
          ...prev[teacherId],
          [type]: cats.map((c: any) => (c.id === catId ? { ...c, rating } : c)),
        },
      };
    });
  }

  async function handleSubmit(teacher: any) {
    setSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      const weekStart = new Date(selectedWeek);
      const weekStartStr =
        weekStart.toISOString().split("T")[0] + "T00:00:00.000Z";
      const selected = form[teacher.ustazid] || {};
      if (!selected.positive?.length && !selected.negative?.length) {
        setError("Please select at least one feedback category.");
        setSubmitting(false);
        return;
      }
      const supervisorFeedback = JSON.stringify({
        positive: selected.positive || [],
        negative: selected.negative || [],
      });
      const res = await fetch(
        `${apiUrl}/${teacher.ustazid}/quality-assessments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekStart: weekStartStr,
            supervisorFeedback,
            overallQuality: "pending",
            managerApproved: false,
            managerOverride: false,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit feedback");
      setSuccess("Feedback submitted successfully!");
      setExpanded(null);
      setForm((prev: any) => ({ ...prev, [teacher.ustazid]: {} }));
    } catch (e: any) {
      setError(e.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  // Week selector UI
  function changeWeek(offset: number) {
    setSelectedWeek((prev) => addWeeks(prev, offset));
    setExpanded(null);
    setLastWeekFeedback({});
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <button
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow hover:bg-gray-100 transition-colors font-semibold"
          onClick={() => router.push("/controller")}
        >
          <FiChevronLeft /> Back to Dashboard
        </button>
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <FiCheck className="text-indigo-600" /> Weekly Teacher Quality
            Feedback
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Provide feedback for teachers you supervise for the week of{" "}
            {format(
              startOfWeek(new Date(), { weekStartsOn: 1 }),
              "MMMM dd, yyyy"
            )}
            .
          </p>
        </header>

        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-lg shadow-sm">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => changeWeek(-1)}
          >
            <FiChevronLeft /> Previous Week
          </button>
          <span className="text-lg font-semibold text-gray-700">
            Week of {format(selectedWeek, "MMMM dd, yyyy")}
          </span>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => changeWeek(1)}
            disabled={
              selectedWeek >= startOfWeek(new Date(), { weekStartsOn: 1 })
            }
          >
            Next Week <FiChevronRight />
          </button>
        </div>

        <div className="mb-8 p-6 bg-indigo-50 border-l-4 border-indigo-500 rounded-lg flex items-start gap-3">
          <FiInfo className="text-indigo-600 mt-1" />
          <div>
            <h3 className="font-semibold text-indigo-800 mb-2">How It Works</h3>
            <p className="text-sm text-indigo-900">
              Select positive and negative feedback categories for each teacher.
              Assign a rating (1–10) and add optional notes. Feedback can only
              be submitted once per teacher per week. Last week's feedback is
              displayed for reference.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
            <FiX /> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
            <FiCheck /> {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <FiLoader className="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading teachers...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-sm p-6">
            No teachers assigned to you. Please contact the administrator.
          </div>
        ) : categories.positive.length === 0 &&
          categories.negative.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-sm p-6">
            No quality categories available. Please ask the administrator to add
            categories.
          </div>
        ) : (
          <div className="space-y-6">
            {Array.isArray(teachers) && teachers.map((teacher: any) => (
              <div
                key={teacher.ustazid}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleExpand(teacher)}
                >
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg">
                      {teacher.ustazname
                        ? teacher.ustazname
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                        : "N/A"}
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {teacher.ustazname || "Unknown Teacher"}
                    </span>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 transition-colors">
                    {expanded === teacher.ustazid ? (
                      <FiChevronUp size={24} />
                    ) : (
                      <FiChevronDown size={24} />
                    )}
                  </button>
                </div>
                {expanded === teacher.ustazid && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    {fetchingLast ? (
                      <div className="text-indigo-600 text-sm mb-6 flex items-center gap-2">
                        <FiLoader className="animate-spin" /> Loading last
                        week's feedback...
                      </div>
                    ) : lastWeekFeedback[teacher.ustazid] ? (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <FiInfo className="text-indigo-500" /> Last Week's
                          Feedback
                        </h3>
                        {lastWeekFeedback[teacher.ustazid]
                          ?.supervisorFeedback ? (
                          <ul className="text-sm text-gray-700 space-y-2">
                            {(() => {
                              const fb = JSON.parse(
                                lastWeekFeedback[teacher.ustazid]
                                  .supervisorFeedback
                              );
                              return [
                                ...(fb.positive?.length
                                  ? [
                                      <li
                                        key="pos"
                                        className="text-green-700 font-semibold"
                                      >
                                        Positive:
                                        <ul className="ml-5 list-disc space-y-1">
                                          {Array.isArray(fb.positive) && fb.positive.map(
                                            (c: any, i: number) => (
                                              <li
                                                key={i}
                                                className="text-green-900"
                                              >
                                                {c.description}{" "}
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
                                      </li>,
                                    ]
                                  : []),
                                ...(fb.negative?.length
                                  ? [
                                      <li
                                        key="neg"
                                        className="text-red-700 font-semibold"
                                      >
                                        Negative:
                                        <ul className="ml-5 list-disc space-y-1">
                                          {Array.isArray(fb.negative) && fb.negative.map(
                                            (c: any, i: number) => (
                                              <li
                                                key={i}
                                                className="text-red-900"
                                              >
                                                {c.description}{" "}
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
                                      </li>,
                                    ]
                                  : []),
                              ];
                            })()}
                          </ul>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No detailed feedback available.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-6 text-gray-500 text-sm">
                        No feedback available for last week.
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                          <FiPlus /> Positive Feedback
                        </h3>
                        <ul className="space-y-4">
                          {Array.isArray(categories.positive) && categories.positive.map((cat) => {
                            const checked = (
                              form[teacher.ustazid]?.positive || []
                            ).some((c: any) => c.id === cat.id);
                            return (
                              <li key={cat.id} className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      handleCategoryChange(
                                        teacher.ustazid,
                                        "positive",
                                        cat.id,
                                        e.target.checked
                                      )
                                    }
                                    className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                  />
                                  <span className="text-green-900 font-medium">
                                    {cat.description}
                                  </span>
                                </div>
                                {checked && (
                                  <div className="ml-8 flex gap-3">
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={
                                        (
                                          form[teacher.ustazid]?.positive || []
                                        ).find((c: any) => c.id === cat.id)
                                          ?.rating || 5
                                      }
                                      onChange={(e) =>
                                        handleRatingChange(
                                          teacher.ustazid,
                                          "positive",
                                          cat.id,
                                          Number(e.target.value)
                                        )
                                      }
                                      className="border border-gray-300 rounded-lg px-3 py-2 w-20 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                      placeholder="Rating"
                                      title="Rate 1 (low) to 10 (high)"
                                      aria-label={`Rate ${cat.description} (1-10)`}
                                    />
                                    <input
                                      type="text"
                                      value={
                                        (
                                          form[teacher.ustazid]?.positive || []
                                        ).find((c: any) => c.id === cat.id)
                                          ?.note || ""
                                      }
                                      onChange={(e) =>
                                        handleNoteChange(
                                          teacher.ustazid,
                                          "positive",
                                          cat.id,
                                          e.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                      placeholder="Note (optional)"
                                      title="Add a note for this feedback (optional)"
                                      aria-label={`Add note for ${cat.description}`}
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                          <FiX /> Negative Feedback
                        </h3>
                        <ul className="space-y-4">
                          {Array.isArray(categories.negative) && categories.negative.map((cat) => {
                            const checked = (
                              form[teacher.ustazid]?.negative || []
                            ).some((c: any) => c.id === cat.id);
                            return (
                              <li key={cat.id} className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      handleCategoryChange(
                                        teacher.ustazid,
                                        "negative",
                                        cat.id,
                                        e.target.checked
                                      )
                                    }
                                    className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                  />
                                  <span className="text-red-900 font-medium">
                                    {cat.description}
                                  </span>
                                </div>
                                {checked && (
                                  <div className="ml-8 flex gap-3">
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={
                                        (
                                          form[teacher.ustazid]?.negative || []
                                        ).find((c: any) => c.id === cat.id)
                                          ?.rating || 5
                                      }
                                      onChange={(e) =>
                                        handleRatingChange(
                                          teacher.ustazid,
                                          "negative",
                                          cat.id,
                                          Number(e.target.value)
                                        )
                                      }
                                      className="border border-gray-300 rounded-lg px-3 py-2 w-20 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                      placeholder="Rating"
                                      title="Rate 1 (low) to 10 (high)"
                                      aria-label={`Rate ${cat.description} (1-10)`}
                                    />
                                    <input
                                      type="text"
                                      value={
                                        (
                                          form[teacher.ustazid]?.negative || []
                                        ).find((c: any) => c.id === cat.id)
                                          ?.note || ""
                                      }
                                      onChange={(e) =>
                                        handleNoteChange(
                                          teacher.ustazid,
                                          "negative",
                                          cat.id,
                                          e.target.value
                                        )
                                      }
                                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                      placeholder="Note (optional)"
                                      title="Add a note for this feedback (optional)"
                                      aria-label={`Add note for ${cat.description}`}
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-end mt-6">
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        onClick={() => handleSubmit(teacher)}
                        disabled={
                          submitting ||
                          selectedWeek <
                            startOfWeek(new Date(), { weekStartsOn: 1 })
                        }
                      >
                        {submitting ? (
                          <FiLoader className="animate-spin" />
                        ) : (
                          <FiCheck />
                        )}
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
