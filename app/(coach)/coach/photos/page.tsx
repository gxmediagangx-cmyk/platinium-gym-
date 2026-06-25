"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera, Plus, Edit2, Trash2, Save, X, Loader2, Upload,
  AlertTriangle
} from "lucide-react";
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { uploadImage, deleteImage, compressImage } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const CATEGORIES = ["Gym Equipment", "Classes", "Events", "Competitions", "Community"];

type PhotoEntry = {
  id: string;
  imageUrl: string;
  storagePath: string;
  title: string;
  category: string;
  order: number;
  createdAt?: any;
};

export default function CoachPhotosPage() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    category: "Gym Equipment",
    order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "gymPhotos"),
      (snap) => {
        const items: PhotoEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            imageUrl: data.imageUrl || "",
            storagePath: data.storagePath || "",
            title: data.title || "",
            category: data.category || "Gym Equipment",
            order: data.order ?? 0,
            createdAt: data.createdAt,
          };
        });
        items.sort((a, b) => a.order - b.order);
        setPhotos(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setForm({ title: "", category: "Gym Equipment", order: 0 });
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

  const openEditForm = (item: PhotoEntry) => {
    setForm({ title: item.title, category: item.category, order: item.order });
    setExistingImageUrl(item.imageUrl);
    setExistingStoragePath(item.storagePath);
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
    if (!form.title.trim()) return;
    setSaving(true);
    setUploadProgress(true);

    try {
      if (editingId) {
        let imageUrl = existingImageUrl || "";
        let storagePath = existingStoragePath || "";

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const compressed = await compressImage(imageFile);
          const path = `gymPhotos/${filename}`;
          imageUrl = await uploadImage(compressed, path);
          storagePath = path;

          if (existingStoragePath) {
            try {
              await deleteImage(existingStoragePath);
            } catch {}
          }
        }

        await updateDoc(doc(db, "gymPhotos", editingId), {
          title: form.title.trim(),
          category: form.category,
          order: form.order,
          imageUrl,
          storagePath,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, "gymPhotos"), {
          title: form.title.trim(),
          category: form.category,
          order: form.order,
          imageUrl: "",
          storagePath: "",
          createdAt: serverTimestamp(),
        });

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const compressed = await compressImage(imageFile);
          const path = `gymPhotos/${filename}`;
          const imageUrl = await uploadImage(compressed, path);
          await updateDoc(doc(db, "gymPhotos", docRef.id), { imageUrl, storagePath: path });
        }
      }
      resetForm();
    } catch {
      console.log("Failed to save photo");
    } finally {
      setSaving(false);
      setUploadProgress(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const item = photos.find((p) => p.id === id);
      if (item?.storagePath) {
        try {
          await deleteImage(item.storagePath);
        } catch {}
      }
      await deleteDoc(doc(db, "gymPhotos", id));
      setDeleteConfirm(null);
    } catch {
      console.log("Failed to delete photo");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Camera size={14} /> Photo Management
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            Gym <span className="text-purple-400">Photos</span>
          </h1>
          <p className="text-gray-400">Manage all gym facility photos displayed in the public gallery.</p>
        </div>
        <button
          onClick={openAddForm}
          className="bg-purple-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-purple-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <Plus size={18} /> Add Photo
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl uppercase tracking-wider text-purple-400">
              {editingId ? "Edit Photo" : "New Photo"}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 60) })}
                maxLength={60}
                placeholder="e.g. Heavy Lifters Zone"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-gray-500 text-right">{form.title.length}/60</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                min={0}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Photo</label>
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
                    <p className="text-[10px]">PNG or JPG, max 15 MB.</p>
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
              disabled={saving || !form.title.trim()}
              className="bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-bold px-6 py-3 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {uploadProgress && imageFile ? "Uploading..." : "Save Photo"}
            </button>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-brand-gray" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-brand-gray rounded" />
                <div className="h-3 w-1/2 bg-brand-gray rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden hover:border-gray-600 transition-colors group"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden bg-gray-800 relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Camera size={32} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white text-sm truncate">{item.title}</h3>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0">#{item.order}</span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20">
                  {item.category}
                </span>
              </div>

              {/* Actions overlay on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3 gap-2 pointer-events-none">
                <div className="pointer-events-auto flex gap-2">
                  <button
                    onClick={() => openEditForm(item)}
                    className="w-8 h-8 rounded-lg bg-gray-800/90 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:border-purple-500 transition-colors backdrop-blur-sm"
                    title="Edit photo"
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
                      className="w-8 h-8 rounded-lg bg-gray-800/90 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors backdrop-blur-sm"
                      title="Delete photo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {photos.length === 0 && (
            <div className="col-span-full text-center py-20 bg-gray-900 rounded-2xl border border-gray-700">
              <Camera size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest">No photos yet.</p>
              <p className="text-gray-600 text-sm mt-2">Click "Add Photo" to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
