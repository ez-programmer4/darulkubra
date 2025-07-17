import React from "react";

export default function ReportsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="h-10 w-48 bg-gray-200 rounded-lg" />
        <div className="h-10 w-56 bg-blue-100 rounded-lg" />
      </div>

      {/* Report Configuration Skeleton */}
      <div className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-gray-50 to-white border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-6 bg-indigo-200 rounded-full" />
          <div className="h-6 w-48 bg-indigo-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="flex flex-wrap gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-28 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <div className="h-12 w-64 bg-indigo-200 rounded-xl" />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 shadow-lg flex flex-col gap-2"
          >
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-10 w-24 bg-gray-300 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4"
          >
            <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
            <div className="h-80 w-full bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Export Options Skeleton */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 w-full bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Data Table Skeleton */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-4 w-40 bg-gray-100 rounded" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {[...Array(5)].map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-5 w-full bg-gray-200 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
