"use client";
import { useState, useEffect } from "react";
import {
  FiPlus,
  FiTrash2,
  FiSettings,
  FiUsers,
  FiPackage,
  FiBook,
  FiRefreshCw,
  FiEdit3,
  FiSave,
  FiX,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function StudentConfigPage() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newItems, setNewItems] = useState({
    status: "",
    package: "",
    subject: "",
  });

  useEffect(() => {
    fetchConfigurations();
    initializeDefaults();
  }, []);

  const initializeDefaults = async () => {
    setInitializing(true);
    try {
      await fetch("/api/admin/student-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init" }),
      });
      fetchConfigurations();
    } catch (error) {
      console.error("Failed to initialize defaults");
    } finally {
      setInitializing(false);
    }
  };

  const fetchConfigurations = async () => {
    try {
      const res = await fetch("/api/admin/student-config");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses || []);
        setPackages(data.packages || []);
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Failed to fetch configurations");
    }
  };

  const addItem = async (type: string, name: string) => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/student-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim(), action: "add" }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `${type} added successfully`,
        });
        setNewItems((prev) => ({ ...prev, [type]: "" }));
        fetchConfigurations();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (type: string, id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/student-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, action: "delete" }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `${type} deleted successfully`,
        });
        fetchConfigurations();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ConfigSection = ({
    title,
    icon: Icon,
    items,
    type,
    color,
  }: {
    title: string;
    icon: any;
    items: any[];
    type: "status" | "package" | "subject";
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 ${color} rounded-xl`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm">Manage {title.toLowerCase()}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newItems[type as keyof typeof newItems]}
            onChange={(e) =>
              setNewItems((prev) => ({
                ...prev,
                [type as keyof typeof newItems]: e.target.value,
              }))
            }
            placeholder={`Add new ${type}...`}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            onKeyPress={(e) =>
              e.key === "Enter" && addItem(type, newItems[type as keyof typeof newItems])
            }
          />
          <button
            onClick={() => addItem(type, newItems[type as keyof typeof newItems])}
            disabled={
              loading || !newItems[type as keyof typeof newItems].trim()
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <FiPlus className="h-4 w-4" />
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Press Enter or click Add to create a new {type}
        </p>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900 text-sm">
              {item.name}
            </span>
            <button
              onClick={() => deleteItem(type, item.id)}
              disabled={loading}
              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-red-50"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No {title.toLowerCase()} configured yet
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-600 rounded-xl">
            <FiSettings className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Student Configuration
            </h1>
            <p className="text-gray-600">
              Manage student statuses, packages, and subjects
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConfigSection
            title="Student Statuses"
            icon={FiUsers}
            items={statuses}
            type="status"
            color="bg-green-500"
          />

          <ConfigSection
            title="Student Packages"
            icon={FiPackage}
            items={packages}
            type="package"
            color="bg-purple-500"
          />

          <ConfigSection
            title="Student Subjects"
            icon={FiBook}
            items={subjects}
            type="subject"
            color="bg-indigo-500"
          />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Important Notes
          </h4>
          <ul className="text-blue-700 text-sm space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                Changes will be reflected in student registration forms
                immediately
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Existing students will keep their current values</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Deleting items may affect existing student records</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>
                These configurations are used across the entire system
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
