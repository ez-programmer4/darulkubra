"use client";

export default function UserTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </td>
          <td className="px-6 py-4 text-right">
            <div className="h-4 bg-gray-200 rounded w-1/4 ml-auto"></div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
