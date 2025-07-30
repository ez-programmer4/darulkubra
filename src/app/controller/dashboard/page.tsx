"use client";
import { useEffect, useState } from "react";

export default function ControllerDashboard() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [teachersRes, permissionsRes] = await Promise.all([
        fetch("/api/controller/teachers"),
        fetch("/api/controller/permissions?status=Pending"),
      ]);
      setTeachers(teachersRes.ok ? await teachersRes.json() : []);
      setPendingPermissions(
        permissionsRes.ok ? await permissionsRes.json() : []
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Controller Dashboard
      </h1>
      {loading ? (
        <div className="text-center py-8 text-blue-600">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 shadow">
              <div className="text-sm text-blue-700">Assigned Teachers</div>
              <div className="text-2xl font-bold text-blue-900">
                {teachers.length}
              </div>
            </div>
            <div className="bg-teal-50 rounded-lg p-4 shadow">
              <div className="text-sm text-teal-700">Pending Permissions</div>
              <div className="text-2xl font-bold text-teal-900">
                {pendingPermissions.length}
              </div>
            </div>
            {/* Add more summary cards as needed */}
          </div>
          <div className="mb-8">
            <h2 className="text-lg font-bold text-blue-700 mb-2">
              Assigned Teachers
            </h2>
            <div className="overflow-x-auto rounded-lg shadow">
              <table className="min-w-full bg-white">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Phone
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-gray-500 py-8"
                      >
                        No teachers assigned.
                      </td>
                    </tr>
                  ) : (
                    teachers.map((t) => (
                      <tr
                        key={t.ustazid}
                        className="border-b hover:bg-blue-50 transition"
                      >
                        <td className="px-4 py-2 text-blue-900 font-medium">
                          {t.ustazname}
                        </td>
                        <td className="px-4 py-2">{t.phone}</td>
                        <td className="px-4 py-2">
                          <a
                            href={`/controller/teachers/${t.ustazid}/lateness`}
                            className="text-teal-700 hover:underline"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-blue-700 mb-2">
              Pending Permission Requests
            </h2>
            <div className="overflow-x-auto rounded-lg shadow">
              <table className="min-w-full bg-white">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Teacher
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Dates
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPermissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center text-gray-500 py-8"
                      >
                        No pending requests.
                      </td>
                    </tr>
                  ) : (
                    pendingPermissions.map((req) => (
                      <tr
                        key={req.id}
                        className="border-b hover:bg-blue-50 transition"
                      >
                        <td className="px-4 py-2 text-blue-900 font-medium">
                          {req.teacherId}
                        </td>
                        <td className="px-4 py-2">{req.requestedDates}</td>
                        <td className="px-4 py-2">{req.reasonCategory}</td>
                        <td className="px-4 py-2">{req.reasonDetails}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
