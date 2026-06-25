"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar, Plus, Edit2, Trash2, Save, X, Loader2, Image as ImageIcon,
  Upload, AlertTriangle, CheckCircle, Users
} from "lucide-react";
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs
} from "firebase/firestore";
import { uploadImage, deleteImage, compressImage } from '@/lib/supabase';
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

type ClassEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  coachName: string;
  schedule: string;
  difficulty: string;
  imageUrl: string;
  imageStoragePath: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

const CATEGORIES = ["All", "Combat", "Cardio", "Dance", "Youth", "Custom"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "All Levels"];

export default function CoachClassesPage() {
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    category: "Combat",
    description: "",
    coachName: "",
    schedule: "",
    difficulty: "All Levels",
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "classes")),
      (snap) => {
        const items: ClassEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "",
            category: data.category || "Custom",
            description: data.description || "",
            coachName: data.coachName || "",
            schedule: data.schedule || "",
            difficulty: data.difficulty || "All Levels",
            imageUrl: data.imageUrl || "",
            imageStoragePath: data.imageStoragePath || "",
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setClasses(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const snap = await getDocs(collection(db, "coaches"));
        if (snap.size > 0) {
          setCoaches(snap.docs.map((d) => d.data().name || ""));
        }
      } catch {}
    };
    fetchCoaches();
  }, []);

  const resetForm = () => {
    setForm({ name: "", category: "Combat", description: "", coachName: "", schedule: "", difficulty: "All Levels", isActive: true });
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setExistingStoragePath(null);
    setImageError(null);
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
    setUploadProgress(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: ClassEntry) => {
    setForm({
      name: item.name,
      category: item.category,
      description: item.description,
      coachName: item.coachName,
      schedule: item.schedule,
      difficulty: item.difficulty,
      isActive: item.isActive,
    });
    setExistingImageUrl(item.imageUrl);
    setExistingStoragePath(item.imageStoragePath);
    setImagePreview(item.imageUrl || null);
    setImageFile(null);
    setImageError(null);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleImageSelect = (file: File | null) => {
    setImageError(null);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError("Only PNG and JPG images are accepted.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("File size must be under 15 MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleImageSelect(file || null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setUploadProgress(true);

    try {
      if (editingId) {
        let imageUrl = existingImageUrl || "";
        let imageStoragePath = existingStoragePath || "";

          if (imageFile) {
            const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
            const filename = `${Date.now()}.${ext}`;
            const compressed = await compressImage(imageFile);
            const path = `classes/${editingId}/${filename}`;
            imageUrl = await uploadImage(compressed, path);
            imageStoragePath = path;

          if (existingStoragePath) {
            try {
              await deleteImage(existingStoragePath);
            } catch {}
          }
        }

        await updateDoc(doc(db, "classes", editingId), {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          coachName: form.coachName.trim(),
          schedule: form.schedule.trim(),
          difficulty: form.difficulty,
          imageUrl,
          imageStoragePath,
          isActive: form.isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, "classes"), {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          coachName: form.coachName.trim(),
          schedule: form.schedule.trim(),
          difficulty: form.difficulty,
          imageUrl: "",
          imageStoragePath: "",
          isActive: form.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const compressed = await compressImage(imageFile);
          const path = `classes/${docRef.id}/${filename}`;
          const imageUrl = await uploadImage(compressed, path);
          const imageStoragePath = path;
          await updateDoc(doc(db, "classes", docRef.id), { imageUrl, imageStoragePath });
        }
      }
      resetForm();
    } catch {
      console.log("Failed to save class");
    } finally {
      setSaving(false);
      setUploadProgress(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const item = classes.find((c) => c.id === id);
      if (item?.imageStoragePath) {
        try {
          await deleteImage(item.imageStoragePath);
        } catch {}
      }
      await deleteDoc(doc(db, "classes", id));
      setDeleteConfirm(null);
    } catch {
      console.log("Failed to delete class");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = activeTab === "All"
    ? classes
    : classes.filter((c) => c.category === activeTab);

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      Combat: "bg-red-500/10 text-red-400 border-red-500/20",
      Cardio: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      Dance: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      Youth: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      Custom: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };
    return (
      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${colors[cat] || colors.Custom}`}>
        {cat}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Calendar size={14} /> Class Management
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            Gym <span className="text-purple-400">Classes</span>
          </h1>
          <p className="text-gray-400">Create and manage all gym classes across categories.</p>
        </div>
        <button
          onClick={openAddForm}
          className="bg-purple-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-purple-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <Plus size={18} /> Add New Class
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl uppercase tracking-wider text-purple-400">
              {editingId ? "Edit Class" : "New Class"}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Class Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 60) })}
                maxLength={60}
                placeholder="e.g. Boxing & Sanda"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-gray-500 text-right">{form.name.length}/60</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {CATEGORIES.slice(1).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })}
                maxLength={500}
                rows={3}
                placeholder="Describe what this class offers..."
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
              <span className="text-[10px] text-gray-500 text-right">{form.description.length}/500</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Coach</label>
              {coaches.length > 0 ? (
                <select
                  value={form.coachName}
                  onChange={(e) => setForm({ ...form, coachName: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select a coach</option>
                  {coaches.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.coachName}
                  onChange={(e) => setForm({ ...form, coachName: e.target.value })}
                  placeholder="e.g. Coach Hesham Ali"
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Schedule</label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                placeholder="e.g. Mon, Wed, Fri - 6:00 PM"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Status</label>
              <div className="flex items-center gap-3 h-full pt-2">
                <button
                  onClick={() => setForm({ ...form, isActive: true })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${form.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-500 border border-gray-700"}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setForm({ ...form, isActive: false })}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${!form.isActive ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-gray-800 text-gray-500 border border-gray-700"}`}
                >
                  Inactive
                </button>
              </div>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Class Image</label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
              >
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg mx-auto" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(existingImageUrl || null); }}
                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload size={28} />
                    <p className="text-sm">Drag & drop or click to upload</p>
                    <p className="text-[10px]">Recommended size: 1600 × 900px. PNG or JPG, max 15 MB.</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                />
              </div>
              {imageError && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertTriangle size={12} /> {imageError}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.description.trim()}
              className="bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-bold px-6 py-3 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {uploadProgress && imageFile ? "Uploading..." : "Save Class"}
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeTab === cat
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600"
            }`}
          >
            {cat} {cat !== "All" && `(${classes.filter((c) => c.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Class List */}
      {loading ? (
        <div className="animate-pulse">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-9 w-24 bg-brand-gray rounded-lg" />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-brand-dark border border-brand-gray rounded-2xl p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-brand-gray shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-brand-gray rounded-lg mb-2" />
                  <div className="h-4 w-64 bg-brand-gray rounded-lg" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-gray" />
                  <div className="w-8 h-8 rounded-lg bg-brand-gray" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex items-center gap-4 hover:border-gray-600 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 shrink-0 border border-gray-700">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                  {categoryBadge(item.category)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users size={12} /> {item.coachName || "No coach"}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {item.schedule || "No schedule"}</span>
                  {item.isActive ? (
                    <span className="text-emerald-400 font-mono uppercase tracking-widest">Active</span>
                  ) : (
                    <span className="text-red-400 font-mono uppercase tracking-widest">Inactive</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEditForm(item)}
                  className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500 transition-colors"
                  title="Edit class"
                >
                  <Edit2 size={14} />
                </button>
                {deleteConfirm === item.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting}
                      className="px-2 py-1.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold uppercase hover:bg-red-500/30 transition-colors"
                    >
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : "Yes"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1.5 bg-gray-700 text-gray-400 rounded text-[10px] font-bold uppercase hover:bg-gray-600 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                    title="Delete class"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-700">
              <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest">No classes found.</p>
              <p className="text-gray-600 text-sm mt-2">
                {activeTab === "All" ? "Click 'Add New Class' to get started." : "No classes in this category."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
