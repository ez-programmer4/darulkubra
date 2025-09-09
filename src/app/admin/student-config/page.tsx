"use client";
import { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSettings, FiUsers, FiPackage, FiBook } from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function StudentConfigPage() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItems, setNewItems] = useState({
    status: "",
    package: "",
    subject: ""
  });

  useEffect(() => {
    fetchConfigurations();
  }, []);

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
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/student-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim(), action: "add" })
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `${type} added successfully`
        });
        setNewItems(prev => ({ ...prev, [type]: "" }));
        fetchConfigurations();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
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
        body: JSON.stringify({ type, id, action: "delete" })
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `${type} deleted successfully`
        });
        fetchConfigurations();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const ConfigSection = ({ title, icon: Icon, items, type, color }: {
    title: string;
    icon: any;
    items: any[];
    type: 'status' | 'package' | 'subject';
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 ${color} rounded-xl`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-gray-600">Manage {title.toLowerCase()}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newItems[type as keyof typeof newItems]}
          onChange={(e) => setNewItems(prev => ({ ...prev, [type as keyof typeof newItems]: e.target.value }))}
          placeholder={`Add new ${type}`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === "Enter" && addItem(type, newItems[type])}
        />
        <button
          onClick={() => addItem(type, newItems[type])}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
        >
          <FiPlus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <span className="font-medium text-gray-900">{item.name}</span>
            <button
              onClick={() => deleteItem(type, item.id)}
              disabled={loading}
              className="text-red-600 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
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
            <h1 className="text-3xl font-bold text-gray-900">Student Configuration</h1>
            <p className="text-gray-600">Manage student statuses, packages, and subjects</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConfigSection
            title="Student Statuses"
            icon={FiUsers}
            items={statuses}
            type="status"
            color="bg-green-600"
          />
          
          <ConfigSection
            title="Student Packages"
            icon={FiPackage}
            items={packages}
            type="package"
            color="bg-purple-600"
          />
          
          <ConfigSection
            title="Student Subjects"
            icon={FiBook}
            items={subjects}
            type="subject"
            color="bg-indigo-600"
          />
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h4 className="font-bold text-yellow-800 mb-2">📝 Important Notes:</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Changes will be reflected in student registration forms immediately</li>
            <li>• Existing students will keep their current values</li>
            <li>• Deleting items may affect existing student records</li>
            <li>• These configurations are used across the entire system</li>
          </ul>
        </div>
      </div>
    </div>
  );
}