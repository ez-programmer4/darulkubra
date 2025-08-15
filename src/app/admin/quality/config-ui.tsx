"use client";
import React, { useEffect, useState } from "react";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiX,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";

const apiUrl = "/api/admin/quality-descriptions";

export default function AdminQualityConfigPage() {
  const [positive, setPositive] = useState<any[]>([]);
  const [negative, setNegative] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<"positive" | "negative" | null>(null);
  const [addValue, setAddValue] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editType, setEditType] = useState<"positive" | "negative" | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [pos, neg] = await Promise.all([
        fetch(apiUrl + "?type=positive").then((r) => r.json()),
        fetch(apiUrl + "?type=negative").then((r) => r.json()),
      ]);
      setPositive(pos);
      setNegative(neg);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAdd(type: "positive" | "negative") {
    if (!addValue.trim()) return;
    setAddLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description: addValue }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setAddValue("");
      setShowAdd(null);
      fetchData();
      toast({ title: "Added!", description: `Category added to ${type}.` });
    } catch (e: any) {
      setError(e.message || "Failed to add");
      toast({
        title: "Error",
        description: e.message || "Failed to add",
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEdit() {
    if (!editValue.trim() || !editId || !editType) return;
    setEditLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          type: editType,
          description: editValue,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditId(null);
      setEditValue("");
      setEditType(null);
      fetchData();
      toast({ title: "Updated!", description: `Category updated.` });
    } catch (e: any) {
      setError(e.message || "Failed to update");
      toast({
        title: "Error",
        description: e.message || "Failed to update",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleteId(id);
    setDeleteLoading(true);
    try {
      const res = await fetch(apiUrl + `?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchData();
      toast({ title: "Deleted!", description: `Category deleted.` });
    } catch (e: any) {
      setError(e.message || "Failed to delete");
      toast({
        title: "Error",
        description: e.message || "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto mb-6"></div>
        <p className="text-black font-medium text-lg">Loading categories...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-8 bg-red-50 rounded-full w-fit mx-auto mb-8">
          <FiXCircle className="h-16 w-16 text-red-500" />
        </div>
        <h3 className="text-3xl font-bold text-black mb-4">Error Loading Categories</h3>
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <FiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Positive Categories</h3>
              <p className="text-gray-600">Categories for good performance</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-black">{positive.length}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <FiXCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Negative Categories</h3>
              <p className="text-gray-600">Categories for poor performance</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-black">{negative.length}</div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Positive Categories */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">Positive Categories</h2>
                <p className="text-gray-600 text-sm">Good performance indicators</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAdd("positive");
                setAddValue("");
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
            >
              <FiPlus className="h-4 w-4" />
              Add
            </button>
          </div>

          {showAdd === "positive" && (
            <form
              className="flex gap-2 mb-6 p-4 bg-white rounded-xl border border-gray-200"
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd("positive");
              }}
            >
              <input
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="Add positive category..."
                autoFocus
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              />
              <button
                type="submit"
                disabled={addLoading}
                className={`bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 ${
                  addLoading ? "opacity-75" : ""
                }`}
              >
                {addLoading ? <FiLoader className="animate-spin h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105"
              >
                <FiX className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="space-y-3">
            {positive.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-6 bg-white rounded-xl border border-gray-200">
                  <FiCheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No positive categories yet</p>
                </div>
              </div>
            ) : (
              positive.map((cat: any) => (
                <div key={cat.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editId === cat.id ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      ) : (
                        <div>
                          <p className="font-semibold text-black">{cat.description}</p>
                          <p className="text-sm text-gray-500">
                            Created: {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {editId === cat.id ? (
                        <>
                          <button
                            onClick={handleEdit}
                            disabled={editLoading}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                          >
                            {editLoading ? <FiLoader className="animate-spin h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditId(null);
                              setEditValue("");
                              setEditType(null);
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditId(cat.id);
                              setEditValue(cat.description);
                              setEditType("positive");
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            <FiEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={deleteLoading && deleteId === cat.id}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          >
                            {deleteLoading && deleteId === cat.id ? (
                              <FiLoader className="animate-spin h-4 w-4" />
                            ) : (
                              <FiTrash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Negative Categories */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiXCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">Negative Categories</h2>
                <p className="text-gray-600 text-sm">Poor performance indicators</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAdd("negative");
                setAddValue("");
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2"
            >
              <FiPlus className="h-4 w-4" />
              Add
            </button>
          </div>

          {showAdd === "negative" && (
            <form
              className="flex gap-2 mb-6 p-4 bg-white rounded-xl border border-gray-200"
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd("negative");
              }}
            >
              <input
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="Add negative category..."
                autoFocus
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
              />
              <button
                type="submit"
                disabled={addLoading}
                className={`bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 flex items-center gap-2 ${
                  addLoading ? "opacity-75" : ""
                }`}
              >
                {addLoading ? <FiLoader className="animate-spin h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105"
              >
                <FiX className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="space-y-3">
            {negative.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-6 bg-white rounded-xl border border-gray-200">
                  <FiXCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No negative categories yet</p>
                </div>
              </div>
            ) : (
              negative.map((cat: any) => (
                <div key={cat.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editId === cat.id ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      ) : (
                        <div>
                          <p className="font-semibold text-black">{cat.description}</p>
                          <p className="text-sm text-gray-500">
                            Created: {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {editId === cat.id ? (
                        <>
                          <button
                            onClick={handleEdit}
                            disabled={editLoading}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                          >
                            {editLoading ? <FiLoader className="animate-spin h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditId(null);
                              setEditValue("");
                              setEditType(null);
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditId(cat.id);
                              setEditValue(cat.description);
                              setEditType("negative");
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            <FiEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={deleteLoading && deleteId === cat.id}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          >
                            {deleteLoading && deleteId === cat.id ? (
                              <FiLoader className="animate-spin h-4 w-4" />
                            ) : (
                              <FiTrash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}