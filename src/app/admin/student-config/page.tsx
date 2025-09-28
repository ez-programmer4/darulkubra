"use client";
import { useState, useEffect, useRef } from "react";
import {
  FiPlus,
  FiSettings,
  FiUsers,
  FiPackage,
  FiBook,
  FiCalendar,
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
  const [daypackages, setDaypackages] = useState<any[]>([]);
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
    daypackage: "",
  });
  const [activeTab, setActiveTab] = useState<
    "status" | "package" | "subject" | "daypackage"
  >("status");
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    package: true,
    subject: true,
    daypackage: true,
  });
  const inputRefs = {
    status: useRef<HTMLInputElement>(null),
    package: useRef<HTMLInputElement>(null),
    subject: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/student-config");
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses || []);
        setPackages(data.packages || []);
        setSubjects(data.subjects || []);
        setDaypackages(data.daypackages || []);
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
            type?.charAt(0)?.toUpperCase() + type?.slice(1) || "Item"
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
            editType?.charAt(0)?.toUpperCase() + editType?.slice(1) || "Item"
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

  const AddItemInput = ({
    type,
  }: {
    type: "status" | "package" | "subject" | "daypackage";
  }) => {
    const [inputValue, setInputValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        addItem(type, inputValue);
        setInputValue("");
      }
    };

    return (
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Add new ${type}...`}
          className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <FiPlus className="h-5 w-5" />
          Add
        </button>
      </form>
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
    type: "status" | "package" | "subject" | "daypackage";
    color: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-xl border-0 p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div
        className="flex items-center justify-between gap-4 mb-8 cursor-pointer group"
        onClick={() => toggleSection(type)}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-4 ${color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-600 text-base font-medium">
              {items.length} items configured
            </p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all duration-300">
          {expandedSections[type] ? (
            <FiChevronUp className="h-6 w-6" />
          ) : (
            <FiChevronDown className="h-6 w-6" />
          )}
        </button>
      </div>

      {expandedSections[type] && (
        <>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 mb-6 border-0 shadow-lg">
            <AddItemInput type={type} />
            <p className="text-sm text-gray-600 mt-3 font-medium">
              💡 Press Enter or click Add to create • Use Escape to cancel edit
            </p>
          </div>

          <div className="mb-6">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
              <input
                type="text"
                placeholder={`Search ${type}...`}
                value={searchTerm[type as keyof typeof searchTerm]}
                onChange={(e) => {
                  setSearchTerm({ ...searchTerm, [type]: e.target.value });
                }}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-medium shadow-sm hover:shadow-md"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredItems(items, type).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 border-2 border-gray-100 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {editingId === item.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                      }}
                      className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-xl text-base font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      disabled={loading}
                      className="text-green-600 hover:text-green-700 p-3 rounded-xl transition-all duration-300 disabled:opacity-50 hover:bg-green-50 hover:shadow-md"
                    >
                      <FiSave className="h-5 w-5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={loading}
                      className="text-gray-500 hover:text-gray-700 p-3 rounded-xl transition-all duration-300 disabled:opacity-50 hover:bg-gray-100 hover:shadow-md"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-gray-900 text-base flex-1">
                      {item.name}
                    </span>
                    <button
                      onClick={() => startEdit(item.id, item.name, type)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-800 p-3 rounded-xl transition-all duration-300 disabled:opacity-50 hover:bg-blue-100 hover:shadow-md"
                    >
                      <FiEdit3 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            {filteredItems(items, type).length === 0 && items.length > 0 ? (
              <div className="text-center py-8 text-gray-600 text-base font-medium bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                🔍 No {type} found matching your search
              </div>
            ) : (
              items.length === 0 && (
                <div className="text-center py-12 text-gray-600 text-base font-medium bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-4xl mb-3">📝</div>
                  <div>No {title.toLowerCase()} configured yet</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Add your first item above
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <FiSettings className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Student Configuration
                </h1>
                <p className="text-indigo-100 text-lg">
                  Manage student statuses, packages, subjects, and day packages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={initializeDefaults}
                disabled={initializing}
                className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-300 disabled:opacity-50 font-medium border border-white/20 hover:border-white/30"
              >
                <FiRefreshCw
                  className={`h-5 w-5 ${initializing ? "animate-spin" : ""}`}
                />
                Reset Defaults
              </button>
              <button
                onClick={fetchConfigurations}
                disabled={loading}
                className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-100 text-indigo-600 rounded-xl transition-all duration-300 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl"
              >
                <FiRefreshCw
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation for mobile */}
        <div className="flex mb-8 bg-white rounded-2xl p-2 shadow-xl border-0 w-full md:hidden">
          {[
            { id: "status", label: "Statuses", icon: FiUsers, color: "green" },
            {
              id: "package",
              label: "Packages",
              icon: FiPackage,
              color: "purple",
            },
            {
              id: "daypackage",
              label: "Day Packages",
              icon: FiCalendar,
              color: "orange",
            },
            { id: "subject", label: "Subjects", icon: FiBook, color: "indigo" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as "status" | "package" | "subject" | "daypackage"
                  )
                }
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex-1 ${
                  isActive
                    ? `bg-${tab.color}-100 text-${tab.color}-700 shadow-lg border-2 border-${tab.color}-200`
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? `text-${tab.color}-600` : ""
                  }`}
                />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={activeTab !== "status" ? "hidden md:block" : ""}>
            <ConfigSection
              key="status-section"
              title="Student Statuses"
              icon={FiUsers}
              items={statuses}
              type="status"
              color="bg-green-500"
            />
          </div>

          <div className={activeTab !== "package" ? "hidden md:block" : ""}>
            <ConfigSection
              key="package-section"
              title="Student Packages"
              icon={FiPackage}
              items={packages}
              type="package"
              color="bg-purple-500"
            />
          </div>

          <div className={activeTab !== "daypackage" ? "hidden md:block" : ""}>
            <ConfigSection
              key="daypackage-section"
              title="Day Packages"
              icon={FiCalendar}
              items={daypackages}
              type="daypackage"
              color="bg-orange-500"
            />
          </div>

          <div className={activeTab !== "subject" ? "hidden md:block" : ""}>
            <ConfigSection
              key="subject-section"
              title="Student Subjects"
              icon={FiBook}
              items={subjects}
              type="subject"
              color="bg-indigo-500"
            />
          </div>
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-0 rounded-2xl p-8 shadow-xl">
          <h4 className="font-bold text-blue-800 mb-6 flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FiInfo className="h-6 w-6 text-blue-600" />
            </div>
            Important Notes
          </h4>
          <ul className="text-blue-700 text-base space-y-4">
            <li className="flex items-start gap-3">
              <div className="p-1 bg-blue-200 rounded-full mt-1">
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <span className="font-medium">
                Changes will be reflected in student registration forms
                immediately
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="p-1 bg-blue-200 rounded-full mt-1">
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <span className="font-medium">
                Existing students will keep their current values
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="p-1 bg-blue-200 rounded-full mt-1">
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <span className="font-medium">
                Deleting items may affect existing student records
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="p-1 bg-blue-200 rounded-full mt-1">
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <span className="font-medium">
                These configurations are used across the entire system
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="p-1 bg-blue-200 rounded-full mt-1">
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <span className="font-medium">
                Click on section headers to expand/collapse
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
