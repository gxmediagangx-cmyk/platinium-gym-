"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Pencil, Plus, Check, X, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, updateDoc, collection, query, getDocs,
  addDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

export default function AISettingsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [languageMode, setLanguageMode] = useState("auto");
  const [responseStyle, setResponseStyle] = useState("balanced");

  const [memories, setMemories] = useState<Array<{ id: string; text: string }>>([]);
  const [langError, setLangError] = useState<string | null>(null);
  const [styleError, setStyleError] = useState<string | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [addText, setAddText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const maxMemories = 20;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setLanguageMode(data.languageMode || "auto");
            setResponseStyle(data.responseStyle || "balanced");
          }
        } catch {
          console.log("Could not load settings");
        }

        try {
          const memQuery = query(collection(db, "users", user.uid, "aiMemory"));
          const memSnap = await getDocs(memQuery);
          const entries: Array<{ id: string; text: string; sortOrder: number }> = [];
          memSnap.forEach((d) => {
            const data = d.data();
            entries.push({
              id: d.id,
              text: data.text || "",
              sortOrder: data.createdAt?.seconds || 0,
            });
          });
          entries.sort((a, b) => a.sortOrder - b.sortOrder);
          setMemories(entries.map(({ id, text }) => ({ id, text })));
        } catch {
          console.log("Could not load memories");
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLanguageChange = async (value: string) => {
    if (!uid) return;
    const prev = languageMode;
    setLanguageMode(value);
    setLangError(null);
    try {
      await updateDoc(doc(db, "users", uid), { languageMode: value });
    } catch {
      setLanguageMode(prev);
      setLangError("Failed to save. Reverted.");
      setTimeout(() => setLangError(null), 3000);
    }
  };

  const handleStyleChange = async (value: string) => {
    if (!uid) return;
    const prev = responseStyle;
    setResponseStyle(value);
    setStyleError(null);
    try {
      await updateDoc(doc(db, "users", uid), { responseStyle: value });
    } catch {
      setResponseStyle(prev);
      setStyleError("Failed to save. Reverted.");
      setTimeout(() => setStyleError(null), 3000);
    }
  };

  const handleAddMemory = async () => {
    if (!uid || !addText.trim()) return;
    const text = addText.trim().slice(0, 500);
    try {
      const docRef = await addDoc(collection(db, "users", uid, "aiMemory"), {
        text,
        createdAt: serverTimestamp(),
      });
      setMemories((prev) => [...prev, { id: docRef.id, text }]);
      setAddText("");
      setShowAddInput(false);
    } catch {
      console.log("Failed to add memory");
    }
  };

  const handleEditMemory = async (id: string) => {
    if (!uid || !editText.trim()) return;
    const text = editText.trim().slice(0, 500);
    try {
      await updateDoc(doc(db, "users", uid, "aiMemory", id), { text });
      setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
      setEditingId(null);
      setEditText("");
    } catch {
      console.log("Failed to edit memory");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, "users", uid, "aiMemory", id));
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {
      console.log("Failed to delete memory");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="font-bold text-2xl md:text-3xl uppercase tracking-wider">
          AI <span className="text-purple-400">Settings</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Customize how your AI coach communicates with you
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-1">Language Mode</h2>
        <p className="text-xs text-gray-500 mb-4">
          Choose the language your AI coach will respond in
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: "english", label: "English", desc: "Always respond in English" },
            { value: "arabic", label: "Arabic", desc: "Always respond in Arabic" },
            { value: "auto", label: "Auto", desc: "Detect and match your language" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleLanguageChange(opt.value)}
              className={`rounded-xl border p-4 text-left transition-all ${
                languageMode === opt.value
                  ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="font-medium text-sm text-white mb-1">{opt.label}</div>
              <div className="text-xs text-gray-400">{opt.desc}</div>
            </button>
          ))}
        </div>
        {langError && (
          <p className="text-xs text-red-400 mt-2">{langError}</p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-1">Response Style</h2>
        <p className="text-xs text-gray-500 mb-4">
          How detailed do you want your AI coach&apos;s responses to be?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: "quick", label: "Quick", desc: "Short and to the point" },
            { value: "balanced", label: "Balanced", desc: "Clear and helpful" },
            { value: "detailed", label: "Detailed", desc: "In-depth and comprehensive" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStyleChange(opt.value)}
              className={`rounded-xl border p-4 text-left transition-all ${
                responseStyle === opt.value
                  ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="font-medium text-sm text-white mb-1">{opt.label}</div>
              <div className="text-xs text-gray-400">{opt.desc}</div>
            </button>
          ))}
        </div>
        {styleError && (
          <p className="text-xs text-red-400 mt-2">{styleError}</p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-1">Your Memory</h2>
        <p className="text-xs text-gray-500 mb-4">
          Save personal preferences, goals, or anything you want your AI coach to remember about you
        </p>

        {memories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center mb-4">
            <p className="text-sm text-gray-500">
              No memories saved yet. The more I know about you, the better I can help.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="flex items-start gap-3 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3"
              >
                {editingId === mem.id ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value.slice(0, 500))}
                        maxLength={500}
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditMemory(mem.id)}
                        disabled={!editText.trim()}
                        className="text-green-400 hover:text-green-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditText(""); }}
                        className="text-gray-500 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="text-right mt-1">
                      <span className={`text-xs ${editText.length >= 500 ? "text-red-400" : "text-gray-500"}`}>
                        {editText.length}/500
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-gray-200 leading-relaxed">{mem.text}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(mem.id);
                          setEditText(mem.text);
                        }}
                        className="text-gray-500 hover:text-purple-400 transition-colors p-1"
                        title="Edit memory"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Delete memory"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {memories.length >= maxMemories ? (
          <p className="text-xs text-gray-500 mb-3">
            Memory limit reached ({memories.length}/{maxMemories}). Delete an entry to add a new one.
          </p>
        ) : showAddInput ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <input
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="e.g. I prefer morning workouts..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${addText.length >= 500 ? "text-red-400" : "text-gray-500"}`}>
                {addText.length}/500
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowAddInput(false); setAddText(""); }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMemory}
                  disabled={!addText.trim()}
                  className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Plus size={16} />
            Add Memory
          </button>
        )}
      </section>
    </div>
  );
}
