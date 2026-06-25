"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Brain, Loader2, Plus, Trash2, Edit3, X, CheckCircle, Save } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";

const MAX_CHARS = 3000;
const MAX_MEMORIES = 30;

interface Memory {
  id: string;
  text: string;
  isActive: boolean;
  order: number;
}

export default function AIGlobalMemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "aiGlobalMemories")),
      (snap) => {
        const list: Memory[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            text: data.text || "",
            isActive: data.isActive ?? true,
            order: data.order ?? 0,
          };
        });
        list.sort((a, b) => a.order - b.order);
        setMemories(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleAdd = useCallback(async () => {
    const trimmed = newText.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await addDoc(collection(db, "aiGlobalMemories"), {
        text: trimmed,
        isActive: true,
        order: memories.length,
        createdAt: serverTimestamp(),
      });
      setNewText("");
    } catch {
      console.log("Failed to add memory");
    } finally {
      setAdding(false);
    }
  }, [newText, adding, memories.length]);

  const handleToggle = useCallback(async (mem: Memory) => {
    try {
      await updateDoc(doc(db, "aiGlobalMemories", mem.id), {
        isActive: !mem.isActive,
      });
    } catch {
      console.log("Failed to toggle memory");
    }
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      await updateDoc(doc(db, "aiGlobalMemories", editingId), {
        text: trimmed,
      });
      setEditingId(null);
      setEditText("");
    } catch {
      console.log("Failed to update memory");
    }
  }, [editingId, editText]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "aiGlobalMemories", id));
      setDeleteConfirm(null);
    } catch {
      console.log("Failed to delete memory");
    }
  }, []);

  const sorted = memories;
  const count = sorted.length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
          <Brain size={14} /> Global AI Control
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          AI <span className="text-purple-400">Memory</span>
        </h1>
        <p className="text-gray-400">Manage memory snippets injected into every AI conversation for all users. Only active memories are used.</p>
      </div>

      {/* Info box */}
      <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-5 mb-8">
        <p className="text-sm text-blue-300 leading-relaxed">
          Each memory snippet is injected into every AI conversation for <strong className="text-blue-200">all users</strong>. Only memories marked as <strong className="text-blue-200">Active</strong> will be included. Example: <em className="text-blue-200">&ldquo;Recommend Coach Ali for beginners&rdquo;</em> or <em className="text-blue-200">&ldquo;Always mention our phone number when asked about personal training.&rdquo;</em>
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={32} className="animate-spin text-purple-400 mx-auto" />
        </div>
      ) : (
        <>
          {/* Memory count */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-mono text-gray-400 uppercase tracking-wider">
              {count} / {MAX_MEMORIES} memories
            </span>
          </div>

          {/* Memory list */}
          <div className="space-y-3 mb-8">
            {sorted.map((mem, idx) => (
              <div
                key={mem.id}
                className="bg-brand-dark border border-brand-gray rounded-2xl p-5 transition-all"
              >
                {editingId === mem.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value.slice(0, MAX_CHARS))}
                      rows={6}
                      className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono ${editText.length >= MAX_CHARS ? "text-red-400" : "text-gray-500"}`}>
                        {editText.length}/{MAX_CHARS}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingId(null); setEditText(""); }}
                          className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-brand-black border border-brand-gray rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleEditSave}
                          disabled={!editText.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-bold text-sm rounded-xl transition-colors"
                        >
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-400">#{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white break-words">
                        {mem.text.length > 100 ? mem.text.slice(0, 100) + "..." : mem.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(mem)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                          mem.isActive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-gray-700/50 text-gray-500 border border-gray-600"
                        }`}
                      >
                        {mem.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => { setEditingId(mem.id); setEditText(mem.text); }}
                        className="p-2 text-gray-500 hover:text-purple-400 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      {deleteConfirm === mem.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(mem.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Confirm delete"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-2 text-gray-500 hover:text-white transition-colors"
                            title="Cancel delete"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(mem.id)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {count === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                No memories yet. Add your first memory below.
              </div>
            )}
          </div>

          {/* Add new memory */}
          {count < MAX_MEMORIES && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Add New Memory</h3>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Enter memory text..."
                rows={5}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 resize-none mb-3"
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className={`text-xs font-mono ${newText.length >= MAX_CHARS ? "text-red-400" : "text-gray-500"}`}>
                  {newText.length}/{MAX_CHARS}
                </span>
                <div className="flex items-center gap-3">
                  {newText.trim() && (
                    <button
                      onClick={() => setNewText("")}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-brand-black border border-brand-gray rounded-xl transition-colors"
                    >
                      <X size={14} /> Clear
                    </button>
                  )}
                  <button
                    onClick={handleAdd}
                    disabled={adding || !newText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-bold text-sm rounded-xl uppercase tracking-wider transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add Memory
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
