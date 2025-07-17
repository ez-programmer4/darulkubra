"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserX,
} from "lucide-react";
import { DatePickerWithRange } from "./DateRangePicker";
import { DateRange } from "react-day-picker";

interface UstazRatingData {
  ustazid: string;
  ustazname: string;
  total_sessions: number;
  on_time_sessions: number;
  late_sessions: number;
  absence_sessions: number;
  three_minutes_late: number;
  five_minutes_late: number;
  seven_minutes_late: number;
  more_than_seven_minutes_late: number;
  total_students: number;
  average_attendance_rate: number;
  rating_score: number;
  recent_performance: {
    date: string;
    is_on_time: boolean;
    delay_minutes: number;
    attendance_rate: number;
    lateness_level: string;
  }[];
  lateness_details: {
    average_lateness_minutes: number;
    total_late_minutes: number;
    lateness_breakdown: {
      "0-3 minutes": number;
      "4-5 minutes": number;
      "6-7 minutes": number;
      "8+ minutes": number;
    };
  };
}

export default function UstazAttendanceRating() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [ratings, setRatings] = useState<UstazRatingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRatings = async () => {
    if (!dateRange.from || !dateRange.to) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString().split("T")[0],
        to: dateRange.to.toISOString().split("T")[0],
      });

      const response = await fetch(`/api/admin/ustaz-ratings?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch ustaz ratings");
      }

      const data = await response.json();
      setRatings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [dateRange]);

  const getRatingColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getRatingLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const getStatusIcon = (isOnTime: boolean) => {
    return isOnTime ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getLatenessColor = (level: string) => {
    if (level === "On Time") return "text-green-600";
    if (level.includes("3 Minutes")) return "text-yellow-600";
    if (level.includes("5 Minutes")) return "text-orange-600";
    if (level.includes("7 Minutes")) return "text-red-600";
    return "text-red-800";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Ustaz Attendance Ratings
          </h2>
          <p className="text-gray-600 mt-1">
            Track teacher attendance management, lateness levels, and absence
            patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={dateRange}
            setDate={(date) => date && setDateRange(date)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-3 sm:p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
          {ratings.map((ustaz) => (
            <div
              key={ustaz.ustazid}
              className="bg-white rounded-lg shadow-md p-3 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {ustaz.ustazname}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(
                    ustaz.rating_score
                  )}`}
                >
                  {getRatingLabel(ustaz.rating_score)}
                </span>
              </div>

              {/* Rating Score */}
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  {ustaz.rating_score.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Rating Score</div>
              </div>

              {/* Attendance Management */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Attendance Management
                </div>
                <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>On Time: {ustaz.on_time_sessions}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span>Late: {ustaz.late_sessions}</span>
                  </div>
                  {ustaz.absence_sessions > 0 && (
                    <div className="flex items-center space-x-1 col-span-2">
                      <UserX className="w-3 h-3 text-gray-500" />
                      <span>Absent: {ustaz.absence_sessions}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lateness Levels */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Lateness Breakdown
                </div>
                <div className="space-y-1 text-xs">
                  {ustaz.lateness_details.lateness_breakdown["0-3 minutes"] >
                    0 && (
                    <div className="flex justify-between">
                      <span className="text-yellow-600">0-3 Minutes Late:</span>
                      <span>
                        {
                          ustaz.lateness_details.lateness_breakdown[
                            "0-3 minutes"
                          ]
                        }
                      </span>
                    </div>
                  )}
                  {ustaz.lateness_details.lateness_breakdown["4-5 minutes"] >
                    0 && (
                    <div className="flex justify-between">
                      <span className="text-orange-600">4-5 Minutes Late:</span>
                      <span>
                        {
                          ustaz.lateness_details.lateness_breakdown[
                            "4-5 minutes"
                          ]
                        }
                      </span>
                    </div>
                  )}
                  {ustaz.lateness_details.lateness_breakdown["6-7 minutes"] >
                    0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">6-7 Minutes Late:</span>
                      <span>
                        {
                          ustaz.lateness_details.lateness_breakdown[
                            "6-7 minutes"
                          ]
                        }
                      </span>
                    </div>
                  )}
                  {ustaz.lateness_details.lateness_breakdown["8+ minutes"] >
                    0 && (
                    <div className="flex justify-between">
                      <span className="text-red-800">8+ Minutes Late:</span>
                      <span>
                        {
                          ustaz.lateness_details.lateness_breakdown[
                            "8+ minutes"
                          ]
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Average Lateness Summary */}
                {ustaz.late_sessions > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2">
                      <span className="text-gray-600">Average Lateness:</span>
                      <span
                        className={`font-medium ${
                          ustaz.lateness_details.average_lateness_minutes <= 3
                            ? "text-green-600"
                            : ustaz.lateness_details.average_lateness_minutes <=
                              5
                            ? "text-yellow-600"
                            : ustaz.lateness_details.average_lateness_minutes <=
                              7
                            ? "text-orange-600"
                            : "text-red-600"
                        }`}
                      >
                        {ustaz.lateness_details.average_lateness_minutes}{" "}
                        minutes
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2 mt-1">
                      <span className="text-gray-600">Total Late Time:</span>
                      <span className="text-gray-700 font-medium">
                        {ustaz.lateness_details.total_late_minutes} minutes
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="font-medium">
                      {(ustaz.average_attendance_rate * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-500">Attendance</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="font-medium">{ustaz.total_sessions}</div>
                    <div className="text-gray-500">Sessions</div>
                  </div>
                </div>
              </div>

              {/* Recent Performance */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Recent Sessions
                </div>
                <div className="space-y-1">
                  {ustaz.recent_performance
                    .slice(0, 3)
                    .map((session, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-1 sm:gap-0"
                      >
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(session.is_on_time)}
                          <span className="text-gray-600">
                            {new Date(session.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`text-xs ${getLatenessColor(
                            session.lateness_level
                          )}`}
                        >
                          {session.lateness_level}
                          {session.delay_minutes > 0 && (
                            <span className="ml-1 text-gray-500">
                              ({session.delay_minutes}m)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ratings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-500">
            No ustaz attendance data found for the selected date range.
          </p>
        </div>
      )}
    </div>
  );
}
