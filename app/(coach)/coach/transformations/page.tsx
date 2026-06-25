"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Trophy, Plus, Edit2, Trash2, Save, X, Loader2, Image as ImageIcon,
  Upload, AlertTriangle, CheckCircle, Medal
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { uploadImage, deleteImage, compressImage } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type WinnerData = {
  name: string;
  coachName: string;
  description: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeStoragePath: string;
  afterStoragePath: string;
};

type Competition = {
  id: string;
  title: string;
  month: string;
  year: number;
  status: "active" | "completed";
  winners: {
    first: WinnerData;
    second: WinnerData;
    third: WinnerData;
  };
  createdAt?: any;
  updatedAt?: any;
};

const emptyWinner = (): WinnerData => ({
  name: "", coachName: "", description: "",
  beforeImageUrl: "", afterImageUrl: "",
  beforeStoragePath: "", afterStoragePath: "",
});

const emptyCompetition = () => ({
  title: "",
  month: MONTHS[new Date().getMonth()],
  year: new Date().getFullYear(),
  status: "active" as "active" | "completed",
  winners: {
    first: emptyWinner(),
    second: emptyWinner(),
    third: emptyWinner(),
  },
});

export default function CoachTransformationsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState(emptyCompetition());

  // Track file uploads: { position-before: File, position-after: File }
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "competitions")),
      (snap) => {
        const items: Competition[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            title: data.title || "",
            month: data.month || "",
            year: data.year ?? new Date().getFullYear(),
            status: data.status || "active",
            winners: {
              first: { ...emptyWinner(), ...(data.winners?.first || {}) },
              second: { ...emptyWinner(), ...(data.winners?.second || {}) },
              third: { ...emptyWinner(), ...(data.winners?.third || {}) },
            },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setCompetitions(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setForm(emptyCompetition());
    setUploadFiles({});
    setImageErrors({});
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
  };

  const openAddForm = () => {
    resetForm();
    const now = new Date();
    setForm({
      title: `${MONTHS[now.getMonth()]} ${now.getFullYear()} Transformation Challenge`,
      month: MONTHS[now.getMonth()],
      year: now.getFullYear(),
      status: "active",
      winners: { first: emptyWinner(), second: emptyWinner(), third: emptyWinner() },
    });
    setShowForm(true);
  };

  const openEditForm = (item: Competition) => {
    setForm({
      title: item.title,
      month: item.month,
      year: item.year,
      status: item.status,
      winners: {
        first: { ...item.winners.first },
        second: { ...item.winners.second },
        third: { ...item.winners.third },
      },
    });
    setUploadFiles({});
    setImageErrors({});
    setEditingId(item.id);
    setShowForm(true);
  };

  const updateWinner = (position: "first" | "second" | "third", field: keyof WinnerData, value: string) => {
    setForm((prev) => ({
      ...prev,
      winners: { ...prev.winners, [position]: { ...prev.winners[position], [field]: value } },
    }));
  };

  const handleImageSelect = (position: "first" | "second" | "third", suffix: "before" | "after", file: File | null) => {
    const key = `${position}-${suffix}`;
    if (!file) {
      setUploadFiles((prev) => ({ ...prev, [key]: null }));
      setImageErrors((prev) => ({ ...prev, [key]: null }));
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageErrors((prev) => ({ ...prev, [key]: "Only PNG and JPG images are accepted." }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageErrors((prev) => ({ ...prev, [key]: "File size must be under 15 MB." }));
      return;
    }
    setUploadFiles((prev) => ({ ...prev, [key]: file }));
    setImageErrors((prev) => ({ ...prev, [key]: null }));
  };

  const uploadFile = async (competitionId: string, position: string, suffix: string, file: File): Promise<{ url: string; path: string }> => {
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `competitions/${competitionId}/${position}-${suffix}-${filename}`;
    const compressed = await compressImage(file);
    const url = await uploadImage(compressed, storagePath);
    return { url, path: storagePath };
  };

  const deleteOldImages = async (winners: Competition["winners"]) => {
    const paths: string[] = [];
    for (const pos of ["first", "second", "third"] as const) {
      if (winners[pos].beforeStoragePath) paths.push(winners[pos].beforeStoragePath);
      if (winners[pos].afterStoragePath) paths.push(winners[pos].afterStoragePath);
    }
        await Promise.allSettled(paths.map((p) => deleteImage(p)));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        const existing = competitions.find((c) => c.id === editingId);
        const oldWinners = existing?.winners;
        const newWinners = { ...form.winners };
        const filesToUpload: { position: string; suffix: string; file: File }[] = [];

        for (const pos of ["first", "second", "third"] as const) {
          for (const suffix of ["before", "after"] as const) {
            const key = `${pos}-${suffix}`;
            if (uploadFiles[key]) {
              filesToUpload.push({ position: pos, suffix, file: uploadFiles[key]! });
            }
          }
        }

        for (const fu of filesToUpload) {
          const result = await uploadFile(editingId, fu.position, fu.suffix, fu.file);
          if (fu.suffix === "before") {
            newWinners[fu.position as "first" | "second" | "third"].beforeImageUrl = result.url;
            newWinners[fu.position as "first" | "second" | "third"].beforeStoragePath = result.path;
          } else {
            newWinners[fu.position as "first" | "second" | "third"].afterImageUrl = result.url;
            newWinners[fu.position as "first" | "second" | "third"].afterStoragePath = result.path;
          }
        }

        await updateDoc(doc(db, "competitions", editingId), {
          title: form.title.trim(),
          month: form.month,
          year: form.year,
          status: form.status,
          winners: {
            first: {
              name: newWinners.first.name.trim(),
              coachName: newWinners.first.coachName.trim(),
              description: newWinners.first.description.trim(),
              beforeImageUrl: newWinners.first.beforeImageUrl,
              afterImageUrl: newWinners.first.afterImageUrl,
              beforeStoragePath: newWinners.first.beforeStoragePath,
              afterStoragePath: newWinners.first.afterStoragePath,
            },
            second: {
              name: newWinners.second.name.trim(),
              coachName: newWinners.second.coachName.trim(),
              description: newWinners.second.description.trim(),
              beforeImageUrl: newWinners.second.beforeImageUrl,
              afterImageUrl: newWinners.second.afterImageUrl,
              beforeStoragePath: newWinners.second.beforeStoragePath,
              afterStoragePath: newWinners.second.afterStoragePath,
            },
            third: {
              name: newWinners.third.name.trim(),
              coachName: newWinners.third.coachName.trim(),
              description: newWinners.third.description.trim(),
              beforeImageUrl: newWinners.third.beforeImageUrl,
              afterImageUrl: newWinners.third.afterImageUrl,
              beforeStoragePath: newWinners.third.beforeStoragePath,
              afterStoragePath: newWinners.third.afterStoragePath,
            },
          },
          updatedAt: serverTimestamp(),
        });

        // Delete old images that were replaced
        if (filesToUpload.length > 0 && oldWinners) {
          const pathsToDelete: string[] = [];
          for (const fu of filesToUpload) {
            if (fu.suffix === "before" && oldWinners[fu.position as "first" | "second" | "third"].beforeStoragePath) {
              pathsToDelete.push(oldWinners[fu.position as "first" | "second" | "third"].beforeStoragePath);
            }
            if (fu.suffix === "after" && oldWinners[fu.position as "first" | "second" | "third"].afterStoragePath) {
              pathsToDelete.push(oldWinners[fu.position as "first" | "second" | "third"].afterStoragePath);
            }
          }
          await Promise.allSettled(pathsToDelete.map((p) => deleteImage(p)));
        }
      } else {
        const docRef = await addDoc(collection(db, "competitions"), {
          title: form.title.trim(),
          month: form.month,
          year: form.year,
          status: form.status,
          winners: {
            first: emptyWinner(),
            second: emptyWinner(),
            third: emptyWinner(),
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const newWinners = {
          first: { ...emptyWinner() },
          second: { ...emptyWinner() },
          third: { ...emptyWinner() },
        };

        for (const pos of ["first", "second", "third"] as const) {
          for (const suffix of ["before", "after"] as const) {
            const key = `${pos}-${suffix}`;
            if (uploadFiles[key]) {
              const result = await uploadFile(docRef.id, pos, suffix, uploadFiles[key]!);
              if (suffix === "before") {
                newWinners[pos].beforeImageUrl = result.url;
                newWinners[pos].beforeStoragePath = result.path;
              } else {
                newWinners[pos].afterImageUrl = result.url;
                newWinners[pos].afterStoragePath = result.path;
              }
            }
          }
        }

        await updateDoc(doc(db, "competitions", docRef.id), { winners: newWinners });
      }
      resetForm();
    } catch {
      setImageErrors((prev) => ({ ...prev, _general: "Failed to save competition." }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const item = competitions.find((c) => c.id === id);
      if (item) {
        const paths: string[] = [];
        for (const pos of ["first", "second", "third"] as const) {
          if (item.winners[pos].beforeStoragePath) paths.push(item.winners[pos].beforeStoragePath);
          if (item.winners[pos].afterStoragePath) paths.push(item.winners[pos].afterStoragePath);
        }
    await Promise.allSettled(paths.map((p) => deleteImage(p)));
      }
      await deleteDoc(doc(db, "competitions", id));
      setDeleteConfirm(null);
    } catch {
      setImageErrors((prev) => ({ ...prev, _general: "Failed to delete competition." }));
    } finally {
      setDeleting(false);
    }
  };

  const renderWinnerUpload = (position: "first" | "second" | "third", label: string, medal: string) => {
    const w = form.winners[position];
    return (
      <div className="bg-brand-black border border-brand-gray rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Medal size={18} className="text-yellow-400" />
          <h4 className="font-display font-bold text-base uppercase tracking-wider">{label} — {medal}</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={w.name}
              onChange={(e) => updateWinner(position, "name", e.target.value.slice(0, 60))}
              className="w-full bg-brand-dark border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
              placeholder="Winner name"
              maxLength={60}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Coach Name</label>
            <input
              type="text"
              value={w.coachName}
              onChange={(e) => updateWinner(position, "coachName", e.target.value.slice(0, 60))}
              className="w-full bg-brand-dark border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
              placeholder="Coach name"
              maxLength={60}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Description <span className="text-gray-500">(max 300 chars)</span></label>
          <textarea
            value={w.description}
            onChange={(e) => updateWinner(position, "description", e.target.value.slice(0, 300))}
            rows={2}
            className="w-full bg-brand-dark border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
            placeholder="Describe the transformation..."
            maxLength={300}
          />
          <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{w.description.length}/300</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Before Image */}
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Before Photo <span className="text-gray-500">(PNG/JPG, max 15MB)</span></label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; handleImageSelect(position, "before", f || null); }}
              onClick={() => fileInputRefs.current[`${position}-before`]?.click()}
              className="relative bg-brand-dark border border-dashed border-brand-gray-light rounded-xl p-4 text-center cursor-pointer hover:border-brand-blue/50 transition-colors"
            >
              {uploadFiles[`${position}-before`] ? (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <ImageIcon size={16} className="text-brand-blue" />
                  {uploadFiles[`${position}-before`]!.name}
                </div>
              ) : w.beforeImageUrl ? (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <ImageIcon size={16} className="text-brand-blue" />
                  Current image
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <Upload size={20} />
                  <span className="text-[10px]">Click or drop</span>
                </div>
              )}
              <input
                ref={(el) => { fileInputRefs.current[`${position}-before`] = el; }}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleImageSelect(position, "before", e.target.files?.[0] || null)}
              />
            </div>
            {imageErrors[`${position}-before`] && (
              <p className="text-red-400 text-[10px] font-mono mt-1">{imageErrors[`${position}-before`]}</p>
            )}
          </div>

          {/* After Image */}
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">After Photo <span className="text-gray-500">(PNG/JPG, max 15MB)</span></label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; handleImageSelect(position, "after", f || null); }}
              onClick={() => fileInputRefs.current[`${position}-after`]?.click()}
              className="relative bg-brand-dark border border-dashed border-brand-gray-light rounded-xl p-4 text-center cursor-pointer hover:border-brand-blue/50 transition-colors"
            >
              {uploadFiles[`${position}-after`] ? (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <ImageIcon size={16} className="text-brand-blue" />
                  {uploadFiles[`${position}-after`]!.name}
                </div>
              ) : w.afterImageUrl ? (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <ImageIcon size={16} className="text-brand-blue" />
                  Current image
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <Upload size={20} />
                  <span className="text-[10px]">Click or drop</span>
                </div>
              )}
              <input
                ref={(el) => { fileInputRefs.current[`${position}-after`] = el; }}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleImageSelect(position, "after", e.target.files?.[0] || null)}
              />
            </div>
            {imageErrors[`${position}-after`] && (
              <p className="text-red-400 text-[10px] font-mono mt-1">{imageErrors[`${position}-after`]}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Trophy size={14} /> Transformation Management
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            <span className="text-amber-400">Competitions</span>
          </h1>
          <p className="text-gray-400">Manage transformation challenges and their winners.</p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="bg-amber-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          >
            <Plus size={18} /> Add Competition
          </button>
        )}
      </div>

      {imageErrors._general && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{imageErrors._general}</span>
          <button onClick={() => setImageErrors((prev) => ({ ...prev, _general: null }))} className="ml-auto text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-amber-400">
              {editingId ? "Edit Competition" : "New Competition"}
            </h2>
            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value.slice(0, 100) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. May 2026 Transformation Challenge"
                maxLength={100}
                required
              />
              <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{form.title.length}/100</div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Month</label>
              <select
                value={form.month}
                onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: Number(e.target.value) || new Date().getFullYear() }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                min={2020}
                max={2030}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Status</label>
              <div className="flex items-center gap-4 bg-brand-black border border-brand-gray rounded-xl px-4 py-3">
                <button
                  onClick={() => setForm((prev) => ({ ...prev, status: "active" }))}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    form.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300"
                  }`}
                >
                  <CheckCircle size={14} className="inline mr-1" /> Active
                </button>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, status: "completed" }))}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    form.status === "completed"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300"
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>

          {/* Winners */}
          <h3 className="font-display font-bold text-lg uppercase tracking-wider mb-4 text-white">
            Winner <span className="text-amber-400">Details</span>
          </h3>
          <div className="flex flex-col gap-6 mb-6">
            {renderWinnerUpload("first", "1st Place", "Gold")}
            {renderWinnerUpload("second", "2nd Place", "Silver")}
            {renderWinnerUpload("third", "3rd Place", "Bronze")}
          </div>

          <div className="flex gap-3 pt-4 border-t border-brand-gray-light">
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-brand-gray border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="px-6 py-3 bg-amber-500 text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Competition"}
            </button>
          </div>
        </div>
      )}

      {/* Competitions List */}
      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <div className="h-6 w-40 bg-brand-gray rounded-lg mb-1" />
                  <div className="h-4 w-24 bg-brand-gray rounded-lg" />
                </div>
                <div className="h-5 w-16 bg-brand-gray rounded-full" />
              </div>
              <div className="flex gap-3 mb-4">
                {[1,2,3].map((j) => (
                  <div key={j} className="flex-1 aspect-square rounded-lg bg-brand-gray" />
                ))}
              </div>
              <div className="h-4 w-32 bg-brand-gray rounded-lg mb-4" />
              <div className="pt-4 border-t border-brand-gray-light">
                <div className="h-8 w-16 bg-brand-gray rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : competitions.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Trophy size={48} className="text-amber-400/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No competitions yet</p>
          <p className="text-gray-600 text-sm">Create your first transformation challenge.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((c) => (
            <div
              key={c.id}
              className="bg-brand-dark border border-brand-gray rounded-3xl p-6 hover:border-brand-gray-light transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white break-words">{c.title || ''}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{c.month} {c.year}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
                  c.status === "active"
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {c.status}
                </span>
              </div>

              {/* Winner preview thumbnails */}
              <div className="flex gap-3 mb-4">
                {(["first", "second", "third"] as const).map((pos) => {
                  const w = c.winners[pos];
                  const hasBoth = w.beforeImageUrl && w.afterImageUrl;
                  return (
                    <div key={pos} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full aspect-square rounded-lg overflow-hidden bg-brand-black border border-brand-gray-light ${hasBoth ? '' : 'opacity-40'}`}>
                        {hasBoth ? (
                          <div className="grid grid-cols-2 h-full">
                            <img src={w.beforeImageUrl} alt="before" className="w-full h-full object-cover" />
                            <img src={w.afterImageUrl} alt="after" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-gray-500 uppercase">
                        {pos === "first" ? "1st" : pos === "second" ? "2nd" : "3rd"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {c.winners.first.name && (
                <p className="text-xs text-gray-400 font-mono mb-4 truncate">
                  Winner: {c.winners.first.name}
                  {c.winners.first.coachName && ` (${c.winners.first.coachName})`}
                </p>
              )}

              <div className="mt-auto pt-4 border-t border-brand-gray-light flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(c)}
                    className="p-2 text-gray-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-950/10"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  {deleteConfirm === c.id ? (
                    <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1">
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <span className="text-[10px] text-red-300 font-mono">Sure?</span>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting}
                        className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold uppercase disabled:opacity-50"
                      >
                        {deleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-1.5 py-0.5 bg-brand-gray text-gray-400 rounded text-[10px] font-bold uppercase"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/10"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
