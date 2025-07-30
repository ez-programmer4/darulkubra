"use client";
import React, { useEffect, useState } from "react";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCheck,
  FiX,
  FiLoader,
} from "react-icons/fi";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [editType, setEditType] = useState<"positive" | "negative" | null>(
    null
  );
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-3">
        <FiCheck className="text-green-500 h-8 w-8" />
        Quality Categories Configuration
      </h1>
      <p className="text-blue-500 mb-8">
        Configure the positive and negative quality feedback categories for
        supervisors/controllers. These categories are used for quality reviews
        and analytics.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
          <FiX /> {error}
        </div>
      )}
      {loading ? (
        <div className="text-center py-12 text-blue-600 flex flex-col items-center">
          <FiLoader className="animate-spin w-8 h-8 mb-2" /> Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Positive */}
          <div className="bg-white border-l-4 border-green-500 rounded-xl shadow p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                Positive Categories
                <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold ml-2">
                  Positive
                </span>
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => {
                  setShowAdd("positive");
                  setAddValue("");
                }}
              >
                <FiPlus className="mr-1" /> Add
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-green-700">
                      Description
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-green-700">
                      Created
                    </th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {positive.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-gray-400 py-4"
                      >
                        No positive categories.
                      </td>
                    </tr>
                  ) : (
                    positive.map((cat: any) => (
                      <tr
                        key={cat.id}
                        className="border-b hover:bg-green-50 transition"
                      >
                        <td className="px-2 py-1 text-blue-900 font-medium">
                          {editId === cat.id ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              className="w-full"
                            />
                          ) : (
                            cat.description
                          )}
                        </td>
                        <td className="px-2 py-1 text-xs text-gray-500">
                          {cat.createdAt
                            ? new Date(cat.createdAt).toLocaleDateString()
                            : ""}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {editId === cat.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleEdit}
                                disabled={editLoading}
                              >
                                <FiCheck />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditId(null);
                                  setEditValue("");
                                  setEditType(null);
                                }}
                              >
                                <FiX />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditId(cat.id);
                                  setEditValue(cat.description);
                                  setEditType("positive");
                                }}
                              >
                                <FiEdit />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(cat.id)}
                                disabled={deleteLoading && deleteId === cat.id}
                              >
                                {deleteLoading && deleteId === cat.id ? (
                                  <FiLoader className="animate-spin" />
                                ) : (
                                  <FiTrash2 />
                                )}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {showAdd === "positive" && (
              <form
                className="flex gap-2 mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdd("positive");
                }}
              >
                <Input
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="Add positive category..."
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={addLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {addLoading ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiCheck />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdd(null)}
                >
                  <FiX />
                </Button>
              </form>
            )}
          </div>
          {/* Negative */}
          <div className="bg-white border-l-4 border-red-500 rounded-xl shadow p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                Negative Categories
                <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold ml-2">
                  Negative
                </span>
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => {
                  setShowAdd("negative");
                  setAddValue("");
                }}
              >
                <FiPlus className="mr-1" /> Add
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-red-700">
                      Description
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-red-700">
                      Created
                    </th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {negative.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-gray-400 py-4"
                      >
                        No negative categories.
                      </td>
                    </tr>
                  ) : (
                    negative.map((cat: any) => (
                      <tr
                        key={cat.id}
                        className="border-b hover:bg-red-50 transition"
                      >
                        <td className="px-2 py-1 text-red-900 font-medium">
                          {editId === cat.id ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              className="w-full"
                            />
                          ) : (
                            cat.description
                          )}
                        </td>
                        <td className="px-2 py-1 text-xs text-gray-500">
                          {cat.createdAt
                            ? new Date(cat.createdAt).toLocaleDateString()
                            : ""}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {editId === cat.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleEdit}
                                disabled={editLoading}
                              >
                                <FiCheck />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditId(null);
                                  setEditValue("");
                                  setEditType(null);
                                }}
                              >
                                <FiX />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditId(cat.id);
                                  setEditValue(cat.description);
                                  setEditType("negative");
                                }}
                              >
                                <FiEdit />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(cat.id)}
                                disabled={deleteLoading && deleteId === cat.id}
                              >
                                {deleteLoading && deleteId === cat.id ? (
                                  <FiLoader className="animate-spin" />
                                ) : (
                                  <FiTrash2 />
                                )}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {showAdd === "negative" && (
              <form
                className="flex gap-2 mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdd("negative");
                }}
              >
                <Input
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="Add negative category..."
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={addLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {addLoading ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiCheck />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdd(null)}
                >
                  <FiX />
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
