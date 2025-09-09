"use client";
import { useState, useEffect, useRef } from "react";
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
  FiSearch,
  FiInfo,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

export default function StudentConfigPage() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editType, setEditType] = useState<string>("");
  const [newStatus, setNewStatus] = useState("");
  const [newPackage, setNewPackage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState({
    status: "",
    package: "",
    subject: "",
  });
  const [activeTab, setActiveTab] = useState<"status" | "package" | "subject">(
    "status"
  );
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    package: true,
    subject: true,
  });
  const inputRefs = {
    status: useRef<HTMLInputElement>(null),
    package: useRef<HTMLInputElement>(null),
    subject: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  useEffect(() => {
    // Focus on the active tab's input when tab changes
    if (inputRefs[activeTab].current) {
      inputRefs[activeTab].current?.focus();
    }
  }, [activeTab]);

  const fetchConfigurations = async () => {
    setLoading(true);
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
      toast({
        title: "Error",
        description: "Failed to fetch configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    if (!confirm("This will reset all configurations to default. Continue?"))
      return;

    setInitializing(true);
    try {
      const res = await fetch("/api/admin/student-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init" }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Defaults initialized successfully",
        });
        fetchConfigurations();
      } else {
        throw new Error("Failed to initialize defaults");
      }
    } catch (error) {
      console.error("Failed to initialize defaults");
      toast({
        title: "Error",
        description: "Failed to initialize defaults",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
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
          description: `${
            type.charAt(0).toUpperCase() + type.slice(1)
          } added successfully`,
        });
        // Clear the specific input
        if (type === "status") setNewStatus("");
        else if (type === "package") setNewPackage("");
        else if (type === "subject") setNewSubject("");
        fetchConfigurations();
      } else {
        const errorData = await res.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to add item",
          variant: "destructive",
        });
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
          description: `${
            type.charAt(0).toUpperCase() + type.slice(1)
          } deleted successfully`,
        });
        fetchConfigurations();
      } else {
        const errorData = await res.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete item",
          variant: "destructive",
        });
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

  const startEdit = (id: string, name: string, type: string) => {
    setEditingId(id);
    setEditValue(name);
    setEditType(type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
    setEditType("");
  };

  const saveEdit = async () => {
    if (!editValue.trim()) {
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
        body: JSON.stringify({
          type: editType,
          id: editingId,
          name: editValue.trim(),
          action: "update",
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `${
            editType.charAt(0).toUpperCase() + editType.slice(1)
          } updated successfully`,
        });
        cancelEdit();
        fetchConfigurations();
      } else {
        const errorData = await res.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update item",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredItems = (items: any[], type: string) => {
    if (!searchTerm[type as keyof typeof searchTerm]) return items;
    return items.filter((item) =>
      item.name
        .toLowerCase()
        .includes(searchTerm[type as keyof typeof searchTerm].toLowerCase())
    );
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
      <div
        className="flex items-center justify-between gap-3 mb-6 cursor-pointer"
        onClick={() => toggleSection(type)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-3 ${color} rounded-xl`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-600 text-sm">{items.length} items</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          {expandedSections[type] ? (
            <FiChevronUp className="h-5 w-5" />
          ) : (
            <FiChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {expandedSections[type] && (
        <>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex gap-2 mb-2">
              <input
                ref={inputRefs[type]}
                type="text"
                value={
                  type === "status"
                    ? newStatus
                    : type === "package"
                    ? newPackage
                    : newSubject
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (type === "status") setNewStatus(value);
                  else if (type === "package") setNewPackage(value);
                  else if (type === "subject") setNewSubject(value);
                }}
                placeholder={`Add new ${type}...`}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const value =
                      type === "status"
                        ? newStatus
                        : type === "package"
                        ? newPackage
                        : newSubject;
                    if (value.trim()) {
                      addItem(type, value);
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const value =
                    type === "status"
                      ? newStatus
                      : type === "package"
                      ? newPackage
                      : newSubject;
                  addItem(type, value);
                }}
                disabled={
                  loading ||
                  !(
                    type === "status"
                      ? newStatus
                      : type === "package"
                      ? newPackage
                      : newSubject
                  ).trim()
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <FiPlus className="h-4 w-4" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Press Enter or click Add to create • Use Escape to cancel edit
            </p>
          </div>

          <div className="mb-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={`Search ${type}...`}
                value={searchTerm[type as keyof typeof searchTerm]}
                onChange={(e) =>
                  setSearchTerm({ ...searchTerm, [type]: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredItems(items, type).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      disabled={loading}
                      className="text-green-600 hover:text-green-700 p-1 rounded transition-colors disabled:opacity-50"
                    >
                      <FiSave className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={loading}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors disabled:opacity-50"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-900 text-sm flex-1">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(item.id, item.name, type)}
                        disabled={loading}
                        className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-blue-50"
                      >
                        <FiEdit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(type, item.id)}
                        disabled={loading}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredItems(items, type).length === 0 && items.length > 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No {type} found matching your search
              </div>
            ) : (
              items.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No {title.toLowerCase()} configured yet
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={initializeDefaults}
              disabled={initializing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${initializing ? "animate-spin" : ""}`}
              />
              Reset Defaults
            </button>
            <button
              onClick={fetchConfigurations}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation for mobile */}
        <div className="flex mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-200 w-full md:hidden">
          {[
            { id: "status", label: "Statuses", icon: FiUsers },
            { id: "package", label: "Packages", icon: FiPackage },
            { id: "subject", label: "Subjects", icon: FiBook },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as "status" | "package" | "subject")
                }
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={activeTab !== "status" ? "hidden md:block" : ""}>
            <ConfigSection
              title="Student Statuses"
              icon={FiUsers}
              items={statuses}
              type="status"
              color="bg-green-500"
            />
          </div>

          <div className={activeTab !== "package" ? "hidden md:block" : ""}>
            <ConfigSection
              title="Student Packages"
              icon={FiPackage}
              items={packages}
              type="package"
              color="bg-purple-500"
            />
          </div>

          <div className={activeTab !== "subject" ? "hidden md:block" : ""}>
            <ConfigSection
              title="Student Subjects"
              icon={FiBook}
              items={subjects}
              type="subject"
              color="bg-indigo-500"
            />
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
            <FiInfo className="h-5 w-5" />
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
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Click on section headers to expand/collapse</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
