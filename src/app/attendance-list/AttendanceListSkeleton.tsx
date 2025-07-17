import React from "react";

export default function AttendanceListSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen animate-pulse">
      {/* Top Buttons Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-40 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-10 w-56 bg-blue-100 rounded-lg" />
      </div>

      {/* Days of Week Skeleton */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 rounded-lg" />
        ))}
      </div>

      {/* Search and Actions Row Skeleton */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="h-10 w-full max-w-xs bg-gray-200 rounded-lg" />
        </div>
        <div className="flex gap-3 justify-end">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="mb-6 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 bg-indigo-200 rounded-full" />
          <div className="h-6 w-32 bg-indigo-100 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 bg-gray-100 rounded-xl p-3 min-w-[160px]"
            >
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-8 w-full bg-gray-200 rounded" />
              <div className="h-8 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Cards Skeleton */}
      <div className="mb-8">
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="h-4 w-48 bg-indigo-100 rounded mb-2" />
          <div className="h-3 w-32 bg-indigo-100 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow flex flex-col items-center"
            >
              <div className="h-8 w-12 bg-gray-300 rounded mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Analytics Insights Skeleton */}
      <div className="mb-6 p-4 rounded-xl shadow-lg bg-gradient-to-br from-indigo-50 to-white border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-64 bg-indigo-100 rounded" />
          <div className="h-8 w-32 bg-indigo-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-3 border border-indigo-100 flex flex-col gap-2"
            >
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-6 w-16 bg-gray-300 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-3 h-4 w-64 bg-indigo-100 rounded" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-indigo-100 to-white sticky top-0 z-10">
            <tr>
              {[...Array(10)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, i) => (
              <tr key={i}>
                {[...Array(10)].map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-5 w-full bg-gray-200 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-6 flex justify-between items-center">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-32 bg-gray-100 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
