"use client";

import { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
dayjs.extend(weekday);
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiAward,
  FiDownload,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import JSConfetti from "js-confetti";

type QualityData = {
  rating: string;
  ratingColor: string;
  strengths: { title: string; note: string; rating?: number }[];
  focuses: { title: string; note: string; rating?: number }[];
  studentsPassed: number;
  studentsTotal: number;
  avgExaminerRating: number;
  bonusAmount?: number;
  advice: string;
  examinerNotes?: string;
};

export default function TeacherDashboard() {
  const { user, isLoading: authLoading } = useAuth({
    requiredRole: "teacher",
    redirectTo: "/teachers/login",
  });
  const confettiRef = useRef<JSConfetti | null>(null);

  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [positiveFeedbackOpen, setPositiveFeedbackOpen] = useState(false);
  const [negativeFeedbackOpen, setNegativeFeedbackOpen] = useState(false);
  const [todayClasses, setTodayClasses] = useState<
    {
      time: string;
      daypackage: string;
      studentId: number;
      studentName: string;
      subject: string;
    }[]
  >([]);
  const [monthWeeks, setMonthWeeks] = useState<string[]>([]);

  useEffect(() => {
    confettiRef.current = new JSConfetti();
    return () => {
      confettiRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function loadToday() {
      try {
        const res = await fetch("/api/teachers/today-classes", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setTodayClasses(data.classes || []);
      } catch {}
    }
    loadToday();
  }, []);

  useEffect(() => {
    // Calculate all Mondays (or week starts) in the current month
    const now = dayjs();
    const startOfMonth = now.startOf("month");
    const endOfMonth = now.endOf("month");
    let weekStart = startOfMonth.startOf("week").add(1, "day"); // Monday
    const weeks: string[] = [];
    while (weekStart.isBefore(endOfMonth)) {
      if (weekStart.month() === now.month()) {
        weeks.push(weekStart.format("YYYY-MM-DD"));
      }
      weekStart = weekStart.add(1, "week");
    }
    setMonthWeeks(weeks);
  }, []);

  useEffect(() => {
    // Set the current week as default when monthWeeks are calculated
    if (monthWeeks.length > 0) {
      const currentWeekStart = dayjs()
        .startOf("week")
        .add(1, "day")
        .format("YYYY-MM-DD");
      const currentWeekIndex = monthWeeks.findIndex(
        (w) => w === currentWeekStart
      );
      if (currentWeekIndex !== -1) {
        setSelectedWeek(monthWeeks[currentWeekIndex]);
      } else {
        // If current week not found, select the last week of the month
        setSelectedWeek(monthWeeks[monthWeeks.length - 1]);
      }
    }
  }, [monthWeeks]);

  useEffect(() => {
    if (!selectedWeek || !user?.id) return;
    async function fetchQuality() {
      try {
        setQualityLoading(true);
        setError(null);
        let res = await fetch(
          `/api/teachers/quality?weekStart=${selectedWeek}`
        );
        if (res.status === 404) {
          const sundayStart = dayjs(selectedWeek)
            .subtract(1, "day")
            .format("YYYY-MM-DD");
          res = await fetch(`/api/teachers/quality?weekStart=${sundayStart}`);
        }

        if (res.status === 404) {
          setQuality(null);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch quality data");
        }

        const data = await res.json();
        const assessment = data.teachers.find(
          (t: any) => t.teacherId === user?.id
        );
        if (assessment) {
          const strengths = (assessment.controllerFeedback?.positive || []).map(
            (item: any) => ({
              title: item.description || item.title || "Strength",
              note: item.note || "",
              rating: item.rating,
            })
          );
          const focuses = (assessment.controllerFeedback?.negative || []).map(
            (item: any) => ({
              title: item.description || item.title || "Focus",
              note: item.note || "",
              rating: item.rating,
            })
          );
          const ratingColorMap: Record<string, string> = {
            Bad: "red",
            Good: "yellow",
            Better: "blue",
            Excellent: "green",
            Exceptional: "teal",
          };
          const qualityData = {
            rating: assessment.overallQuality || "N/A",
            ratingColor: ratingColorMap[assessment.overallQuality] || "gray",
            strengths,
            focuses,
            studentsPassed: assessment.examPassRate ?? 0,
            studentsTotal: assessment.studentsTotal ?? 0,
            avgExaminerRating: assessment.examinerRating || 0,
            bonusAmount: assessment.bonusAwarded,
            advice: assessment.overrideNotes || "",
            examinerNotes: assessment.examinerNotes || "",
          };
          setQuality(qualityData);
          setError(null);

          if (assessment.bonusAwarded) {
            confettiRef.current?.addConfetti({
              emojis: ["🎉", "🏆", "💰"],
              emojiSize: 30,
              confettiNumber: 100,
            });
          }
        } else {
          setQuality(null);
        }
      } catch (err) {
        setQuality(null);
        setError("Unable to load quality data. Please try again later.");
      } finally {
        setQualityLoading(false);
      }
    }
    fetchQuality();
  }, [selectedWeek, user?.id]);

  useEffect(() => {
    async function fetchStudentCount() {
      try {
        const res = await fetch("/api/teachers/students");
        if (!res.ok) throw new Error("Failed to fetch student count");
        const data = await res.json();
        setStudentCount(data.count || 0);
      } catch (err) {
        setError("Unable to load student count. Please try again later.");
      }
    }
    fetchStudentCount();
  }, []);

  const downloadReport = () => {
    if (!quality) return;
    const reportContent = `
Teacher Quality Report
Week: ${dayjs(selectedWeek).format("MMM D, YYYY")}
Teacher: ${user?.name} (ID: ${user?.id})

Quality Rating: ${quality.rating}
Students Passed: ${quality.studentsPassed}/${quality.studentsTotal}
Average Examiner Rating: ${quality.avgExaminerRating}/10
Bonus: ${quality.bonusAmount ? `${quality.bonusAmount} ETB` : "None"}

Strengths:
${quality.strengths.map((s) => `- ${s.title}: ${s.note}`).join("\n")}

Focuses:
${quality.focuses.map((f) => `- ${f.title}: ${f.note}`).join("\n")}

Advice:
${quality.advice || "No advice provided."}

Examiner Notes:
${quality.examinerNotes || "No notes provided."}
    `;
    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Teacher_Quality_Report_${selectedWeek}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-600 font-bold animate-slide-in">
        <FiAlertTriangle className="inline-block mr-2 h-6 w-6" />
        User not found or not authorized. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded-lg flex items-center gap-2">
          <FiAlertTriangle className="text-red-600 h-4 w-4" />
          <span className="text-red-700 text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Today Classes */}
      <div className="bg-white rounded-xl shadow-lg border p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Today's Classes
        </h2>
        {todayClasses.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            No classes scheduled for today.
          </div>
        ) : (
          <div className="space-y-2">
            {todayClasses.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {c.studentName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {c.subject || "-"} • {c.daypackage}
                  </div>
                </div>
                <div className="text-blue-600 font-bold text-sm flex-shrink-0 ml-2">
                  {(() => {
                    const [hours, minutes] = c.time.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    return `${displayHour}:${minutes} ${ampm}`;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week Selector */}
      <div className="bg-white rounded-xl shadow-lg border p-4">
        <div className="space-y-3">
          <label className="font-medium text-gray-900 text-base">
            Select Week:
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {monthWeeks.map((week, idx) => {
              const isCurrentWeek =
                week ===
                dayjs()
                  .startOf("week")
                  .add(1, "day")
                  .format("YYYY-MM-DD");
              const isSelected = selectedWeek === week;
              return (
                <Button
                  key={week}
                  variant={isSelected ? "default" : "outline"}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-all flex-shrink-0 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md"
                      : isCurrentWeek
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedWeek(week)}
                >
                  W{idx + 1}
                  {isCurrentWeek && " (Now)"}
                </Button>
              );
            })}
          </div>
          {quality && (
            <Button
              onClick={downloadReport}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-lg w-full justify-center py-2"
            >
              <FiDownload className="w-4 h-4" />
              Download Report
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          icon={<FiUsers size={20} className="text-blue-600" />}
          label="Students"
          value={studentCount}
          color="blue"
        />
        <StatsCard
          icon={<FiCheckCircle size={20} className="text-green-600" />}
          label="Pass Rate"
          value={quality?.studentsPassed || 0}
          color="green"
          unit="%"
        />
        <StatsCard
          icon={<FiAward size={20} className="text-yellow-600" />}
          label="Rating"
          value={quality?.avgExaminerRating || 0}
          color="yellow"
          unit="/10"
        />
        <StatsCard
          icon={<FiAward size={20} className="text-purple-600" />}
          label="Bonus"
          value={quality?.bonusAmount || 0}
          color="purple"
          unit=" ETB"
        />
      </div>

      {/* Quality Overview */}
      <div className="bg-white rounded-xl shadow-lg border p-4">
        {qualityLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : quality ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiCheckCircle className="text-blue-600 h-5 w-5" />
              Quality: <span className="text-blue-600">{quality.rating}</span>
            </h2>
            
            {/* Bonus Section */}
            {quality.bonusAmount ? (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-xl text-center text-white">
                <h3 className="text-lg font-bold mb-2 flex items-center justify-center gap-2">
                  <FiAward className="w-5 h-5" />
                  Bonus Awarded!
                </h3>
                <p className="text-2xl font-bold mb-2">
                  {quality.bonusAmount} ETB
                </p>
                <p className="text-sm opacity-90">
                  Congratulations on your performance!
                </p>
                <Button
                  onClick={() =>
                    confettiRef.current?.addConfetti({
                      emojis: ["🎉", "🏆", "💰"],
                      emojiSize: 30,
                      confettiNumber: 100,
                    })
                  }
                  className="mt-3 bg-white text-purple-600 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg text-sm"
                >
                  Celebrate!
                </Button>
              </div>
            ) : (
              <div className="bg-gray-100 text-gray-600 p-4 rounded-lg text-center">
                <p className="text-sm font-medium">No bonus this week.</p>
              </div>
            )}
            
            {/* Strengths */}
            <div className="bg-white border rounded-lg">
              <button
                onClick={() => setPositiveFeedbackOpen(!positiveFeedbackOpen)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-600 h-4 w-4" />
                  <h3 className="text-base font-medium text-gray-900">
                    Strengths ({quality.strengths.length})
                  </h3>
                </div>
                {positiveFeedbackOpen ? (
                  <FiChevronUp className="text-gray-400 h-4 w-4" />
                ) : (
                  <FiChevronDown className="text-gray-400 h-4 w-4" />
                )}
              </button>
              {positiveFeedbackOpen && (
                <div className="px-3 pb-3">
                  {quality.strengths.length > 0 ? (
                    <div className="space-y-2">
                      {quality.strengths.map((s, i) => (
                        <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="font-medium text-green-800 text-sm">
                            {s.title}
                            {typeof s.rating === "number" && (
                              <span className="ml-2 text-xs text-green-600">
                                ({s.rating}/10)
                              </span>
                            )}
                          </div>
                          {s.note && (
                            <div className="text-xs text-gray-600 mt-1">
                              {s.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-3 text-sm">
                      No positive feedback recorded.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Areas for Improvement */}
            <div className="bg-white border rounded-lg">
              <button
                onClick={() => setNegativeFeedbackOpen(!negativeFeedbackOpen)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FiAlertTriangle className="text-red-600 h-4 w-4" />
                  <h3 className="text-base font-medium text-gray-900">
                    Areas for Improvement ({quality.focuses.length})
                  </h3>
                </div>
                {negativeFeedbackOpen ? (
                  <FiChevronUp className="text-gray-400 h-4 w-4" />
                ) : (
                  <FiChevronDown className="text-gray-400 h-4 w-4" />
                )}
              </button>
              {negativeFeedbackOpen && (
                <div className="px-3 pb-3">
                  {quality.focuses.length > 0 ? (
                    <div className="space-y-2">
                      {quality.focuses.map((f, i) => (
                        <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="font-medium text-red-800 text-sm">
                            {f.title}
                            {typeof f.rating === "number" && (
                              <span className="ml-2 text-xs text-red-600">
                                ({f.rating}/10)
                              </span>
                            )}
                          </div>
                          {f.note && (
                            <div className="text-xs text-gray-600 mt-1">
                              {f.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-3 text-sm">
                      No negative feedback recorded.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Examiner Notes */}
            {quality.examinerNotes && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="font-medium text-blue-900 text-sm mb-2">
                  Examiner Notes:
                </p>
                <p className="text-gray-700 text-sm">
                  {quality.examinerNotes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6 text-sm">
            No quality data available for this week.
          </p>
        )}
      </div>
    </div>ify-between p-3 sm:p-4 rounded-lg border border-indigo-100 hover:bg-indigo-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-indigo-800 text-sm sm:text-base truncate">
                    {c.studentName}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 truncate">
                    {c.subject || "-"} • {c.daypackage}
                  </div>
                </div>
                <div className="text-indigo-700 font-bold text-sm sm:text-base flex-shrink-0 ml-2">
                  {(() => {
                    const [hours, minutes] = c.time.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    return `${displayHour}:${minutes} ${ampm}`;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week Selector */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6 animate-slide-in">
        <div className="flex flex-col gap-3 sm:gap-4">
          <label className="font-semibold text-indigo-900 text-base sm:text-lg">
            Select Week:
          </label>
          <div className="flex gap-2 flex-wrap">
            {monthWeeks.map((week, idx) => {
              const isCurrentWeek =
                week ===
                dayjs()
                  .startOf("week")
                  .add(1, "day")
                  .format("YYYY-MM-DD");
              const isSelected = selectedWeek === week;
              return (
                <Button
                  key={week}
                  variant={isSelected ? "default" : "outline"}
                  className={`rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md"
                      : isCurrentWeek
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                  }`}
                  onClick={() => {
                    setSelectedWeek(week);
                  }}
                >
                  <span className="hidden sm:inline">Week {idx + 1}</span>
                  <span className="sm:hidden">W{idx + 1}</span>
                  {isCurrentWeek && <span className="hidden sm:inline"> (Current)</span>}
                </Button>
              );
            })}
          </div>
          {quality && (
            <Button
              onClick={downloadReport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-lg shadow-md hover:scale-105 transition-all w-fit"
              aria-label="Download quality report"
            >
              <FiDownload className="w-5 h-5" />
              Download Report
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          icon={<FiUsers size={24} className="text-indigo-600" />}
          label="Total Students"
          value={studentCount}
          color="indigo"
        />
        <StatsCard
          icon={<FiCheckCircle size={24} className="text-violet-600" />}
          label="Pass Rate (Adjusted)"
          value={quality?.studentsPassed || 0}
          color="violet"
          unit="%"
          tooltip={`Adjusted pass rate using school average (75%) with 8 imaginary students for fairer evaluation. Sample size: ${quality?.studentsTotal || 0} students.`}
        />
        <StatsCard
          icon={<FiAward size={24} className="text-yellow-600" />}
          label="Examiner Rating"
          value={quality?.avgExaminerRating || 0}
          color="yellow"
          unit="/10"
        />
        <StatsCard
          icon={<FiAward size={24} className="text-purple-600" />}
          label="Bonus Earned"
          value={quality?.bonusAmount || 0}
          color="purple"
          unit=" ETB"
        />
      </div>

      {/* Quality Overview */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6 lg:p-8 animate-slide-in">
        {qualityLoading ? (
          <PageLoading />
        ) : quality ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6 lg:space-y-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-indigo-900 mb-4 flex items-center gap-3 animate-slide-in">
                <FiCheckCircle className="text-indigo-600 h-6 w-6 sm:h-8 sm:w-8" />
                Quality:{" "}
                <span className="text-indigo-600">
                  {quality.rating}
                </span>
              </h2>
              
              {/* Positive Feedback Dropdown */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200 shadow-sm">
                <button
                  onClick={() =>
                    setPositiveFeedbackOpen(!positiveFeedbackOpen)
                  }
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-indigo-50/50 transition-colors rounded-xl"
                  aria-expanded={positiveFeedbackOpen}
                  aria-label="Toggle positive feedback"
                >
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="text-indigo-600 h-5 w-5 sm:h-6 sm:w-6" />
                    <h3 className="text-lg sm:text-xl font-bold text-indigo-700">
                      Strengths ({quality.strengths.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {positiveFeedbackOpen ? (
                      <FiChevronUp className="text-indigo-600 h-5 w-5" />
                    ) : (
                      <FiChevronDown className="text-indigo-600 h-5 w-5" />
                    )}
                  </div>
                </button>
                {positiveFeedbackOpen && (
                  <div className="px-4 pb-4 animate-slide-in">
                    {quality.strengths.length > 0 ? (
                      <ul className="space-y-3">
                        {quality.strengths.map((s, i) => (
                          <li
                            key={i}
                            className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] animate-slide-in"
                            style={{ animationDelay: `${i * 50}ms` }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <span className="font-semibold text-indigo-800 text-base sm:text-lg">
                                {s.title}
                                {typeof s.rating === "number" && (
                                  <span className="ml-2 text-sm text-indigo-600 font-medium">
                                    ({s.rating}/10)
                                  </span>
                                )}
                              </span>
                              {s.note && (
                                <span className="text-sm text-gray-600">
                                  {s.note}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No positive feedback recorded for this week.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Negative Feedback Dropdown */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm">
                <button
                  onClick={() =>
                    setNegativeFeedbackOpen(!negativeFeedbackOpen)
                  }
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-red-50/50 transition-colors rounded-xl"
                  aria-expanded={negativeFeedbackOpen}
                  aria-label="Toggle negative feedback"
                >
                  <div className="flex items-center gap-3">
                    <FiAlertTriangle className="text-red-600 h-5 w-5 sm:h-6 sm:w-6" />
                    <h3 className="text-lg sm:text-xl font-bold text-red-700">
                      Areas for Improvement ({quality.focuses.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {negativeFeedbackOpen ? (
                      <FiChevronUp className="text-red-600 h-5 w-5" />
                    ) : (
                      <FiChevronDown className="text-red-600 h-5 w-5" />
                    )}
                  </div>
                </button>
                {negativeFeedbackOpen && (
                  <div className="px-4 pb-4 animate-slide-in">
                    {quality.focuses.length > 0 ? (
                      <ul className="space-y-3">
                        {quality.focuses.map((f, i) => (
                          <li
                            key={i}
                            className="bg-red-50/50 border border-red-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] animate-slide-in"
                            style={{ animationDelay: `${i * 50}ms` }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <span className="font-semibold text-red-800 text-base sm:text-lg">
                                {f.title}
                                {typeof f.rating === "number" && (
                                  <span className="ml-2 text-sm text-red-600 font-medium">
                                    ({f.rating}/10)
                                  </span>
                                )}
                              </span>
                              {f.note && (
                                <span className="text-sm text-gray-600">
                                  {f.note}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No negative feedback recorded for this week.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {quality.bonusAmount ? (
                <div className="relative bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 p-6 sm:p-8 rounded-2xl text-center text-white shadow-2xl border border-indigo-300 overflow-hidden animate-slide-in">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500 animate-gradient-bg"></div>
                  <div className="relative z-10">
                    <h3 className="text-xl sm:text-2xl font-extrabold mb-3 flex items-center justify-center gap-3">
                      <FiAward className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
                      Bonus Awarded!
                    </h3>
                    <p className="text-3xl sm:text-4xl font-extrabold mb-3">
                      {quality.bonusAmount} ETB
                    </p>
                    <p className="text-base sm:text-lg">
                      Congratulations on your exceptional performance!
                    </p>
                    <Button
                      onClick={() =>
                        confettiRef.current?.addConfetti({
                          emojis: ["🎉", "🏆", "💰"],
                          emojiSize: 30,
                          confettiNumber: 100,
                        })
                      }
                      className="mt-4 bg-white text-indigo-600 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg shadow-md hover:scale-105 transition-all"
                      aria-label="Celebrate bonus"
                    >
                      Celebrate Again!
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 text-gray-600 p-6 rounded-lg text-center animate-slide-in">
                  <p className="text-lg font-semibold">
                    No bonus this week.
                  </p>
                </div>
              )}
              {quality.examinerNotes && (
                <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-lg shadow-lg border border-indigo-100 animate-slide-in">
                  <p className="font-semibold text-indigo-900 text-base sm:text-lg">
                    Examiner Notes:
                  </p>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    {quality.examinerNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">
            No quality data available for this week.
          </p>
        )}
      </div>

      {/* Styles */}
      <style jsx>{`
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
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
        .animate-gradient-bg {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  color,
  unit = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  unit?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
  };
  const classes = colorMap[color] || colorMap.blue;
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border flex items-center gap-3 hover:shadow-xl transition-all">
      <div className={`rounded-lg ${classes.bg} p-2 flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-medium text-gray-600 truncate">
          {label}
        </h3>
        <p className={`text-lg font-bold ${classes.text} truncate`}>
          {value}{unit}
        </p>
      </div>
    </div>
  );
}