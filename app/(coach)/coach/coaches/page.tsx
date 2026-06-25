"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users, Plus, Edit2, Trash2, Save, X, Loader2, Image as ImageIcon,
  Upload, AlertTriangle, Medal, Phone, Hash
} from "lucide-react";
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { uploadImage, deleteImage, compressImage } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

type CoachEntry = {
  id: string;
  name: string;
  role: string;
  experienceYears: number;
  description: string;
  photoUrl: string;
  photoStoragePath: string;
  specialties: string[];
  phoneNumber: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export default function CoachCoachesPage() {
  const [coaches, setCoaches] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    role: "",
    experienceYears: 0,
    description: "",
    phoneNumber: "",
    isActive: true,
    specialties: [] as string[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "coaches")),
      (snap) => {
        const items: CoachEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "",
            role: data.role || "",
            experienceYears: data.experienceYears ?? 0,
            description: data.description || "",
            photoUrl: data.photoUrl || "",
            photoStoragePath: data.photoStoragePath || "",
            specialties: data.specialties || [],
            phoneNumber: data.phoneNumber || "",
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setCoaches(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setForm({ name: "", role: "", experienceYears: 0, description: "", phoneNumber: "", isActive: true, specialties: [] });
    setImageFile(null);
    setImagePreview(null);
    setExistingPhotoUrl(null);
    setExistingStoragePath(null);
    setImageError(null);
    setSpecialtyInput("");
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
    setUploadProgress(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: CoachEntry) => {
    setForm({
      name: item.name,
      role: item.role,
      experienceYears: item.experienceYears,
      description: item.description,
      phoneNumber: item.phoneNumber,
      isActive: item.isActive,
      specialties: item.specialties,
    });
    setExistingPhotoUrl(item.photoUrl);
    setExistingStoragePath(item.photoStoragePath);
    setImagePreview(item.photoUrl || null);
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

  const addSpecialty = () => {
    const tag = specialtyInput.trim();
    if (!tag || form.specialties.length >= 6 || tag.length > 30) return;
    if (!form.specialties.includes(tag)) {
      setForm({ ...form, specialties: [...form.specialties, tag] });
    }
    setSpecialtyInput("");
  };

  const removeSpecialty = (tag: string) => {
    setForm({ ...form, specialties: form.specialties.filter((s) => s !== tag) });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setUploadProgress(true);

    try {
      if (editingId) {
        let photoUrl = existingPhotoUrl || "";
        let photoStoragePath = existingStoragePath || "";

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const path = `coaches/${editingId}/${filename}`;
          const compressed = await compressImage(imageFile);
          await uploadImage(compressed, path);
          photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gym-images/${path}`;
          photoStoragePath = path;

          if (existingStoragePath) {
            await deleteImage(existingStoragePath);
          }
        }

        await updateDoc(doc(db, "coaches", editingId), {
          name: form.name.trim(),
          role: form.role.trim(),
          experienceYears: form.experienceYears,
          description: form.description.trim(),
          phoneNumber: form.phoneNumber.trim(),
          isActive: form.isActive,
          specialties: form.specialties,
          photoUrl,
          photoStoragePath,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, "coaches"), {
          name: form.name.trim(),
          role: form.role.trim(),
          experienceYears: form.experienceYears,
          description: form.description.trim(),
          phoneNumber: form.phoneNumber.trim(),
          isActive: form.isActive,
          specialties: form.specialties,
          photoUrl: "",
          photoStoragePath: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const path = `coaches/${docRef.id}/${filename}`;
          const compressed = await compressImage(imageFile);
          await uploadImage(compressed, path);
          const photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gym-images/${path}`;
          const photoStoragePath = path;
          await updateDoc(doc(db, "coaches", docRef.id), { photoUrl, photoStoragePath });
        }
      }
      resetForm();
    } catch {
      console.log("Failed to save coach");
    } finally {
      setSaving(false);
      setUploadProgress(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const item = coaches.find((c) => c.id === id);
      if (item?.photoStoragePath) {
        await deleteImage(item.photoStoragePath);
      }
      await deleteDoc(doc(db, "coaches", id));
      setDeleteConfirm(null);
    } catch {
      console.log("Failed to delete coach");
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
            <Medal size={14} /> Coach Management
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            Our <span className="text-purple-400">Coaches</span>
          </h1>
          <p className="text-gray-400">Manage coaching staff profiles, specialties, and availability.</p>
        </div>
        <button
          onClick={openAddForm}
          className="bg-purple-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-purple-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <Plus size={18} /> Add New Coach
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl uppercase tracking-wider text-purple-400">
              {editingId ? "Edit Coach" : "New Coach"}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 60) })}
                maxLength={60}
                placeholder="e.g. Ahmed Elsayed"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-gray-500 text-right">{form.name.length}/60</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Role</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value.slice(0, 60) })}
                maxLength={60}
                placeholder="e.g. Head Coach"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Experience (Years)</label>
              <input
                type="number"
                value={form.experienceYears || ""}
                onChange={(e) => setForm({ ...form, experienceYears: parseInt(e.target.value) || 0 })}
                min={0}
                max={60}
                placeholder="e.g. 12"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Phone Number</label>
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="e.g. +20 100 000 0000"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })}
                maxLength={500}
                rows={3}
                placeholder="Describe the coach's background and expertise..."
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
              <span className="text-[10px] text-gray-500 text-right">{form.description.length}/500</span>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Specialties (max 6)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.specialties.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300"
                  >
                    <Hash size={10} />
                    {tag}
                    <button onClick={() => removeSpecialty(tag)} className="text-purple-400 hover:text-red-400 ml-0.5">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value.slice(0, 30))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty(); } }}
                  placeholder="Type a specialty and press Enter"
                  maxLength={30}
                  disabled={form.specialties.length >= 6}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
                <button
                  onClick={addSpecialty}
                  disabled={!specialtyInput.trim() || form.specialties.length >= 6}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-xl text-sm transition-colors"
                >
                  Add
                </button>
              </div>
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
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Photo</label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
              >
                {imagePreview ? (
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-xl overflow-hidden mx-auto border border-gray-700">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(existingPhotoUrl || null); }}
                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload size={28} />
                    <p className="text-sm">Drag & drop or click to upload</p>
                    <p className="text-[10px]">Recommended size: 800 × 800px (square). PNG or JPG, max 15 MB.</p>
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
              {uploadProgress && imageFile ? "Uploading..." : "Save Coach"}
            </button>
          </div>
        </div>
      )}

      {/* Coach List */}
      {loading ? (
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="bg-brand-dark border border-brand-gray rounded-2xl overflow-hidden">
                <div className="aspect-square bg-brand-gray" />
                <div className="p-5">
                  <div className="h-5 w-32 bg-brand-gray rounded-lg mb-2" />
                  <div className="h-4 w-24 bg-brand-gray rounded-lg mb-3" />
                  <div className="h-3 w-full bg-brand-gray rounded-lg mb-1" />
                  <div className="h-3 w-2/3 bg-brand-gray rounded-lg mb-4" />
                  <div className="flex gap-2">
                    {[1,2,3].map((j) => <div key={j} className="h-6 w-16 bg-brand-gray rounded-full" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coaches.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden group hover:border-gray-600 transition-colors"
            >
              {/* Photo */}
              <div className="aspect-square bg-gray-800 relative overflow-hidden">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Users size={48} />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {item.isActive ? (
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-widest bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400 mb-1">
                  {item.role || "No role"}
                </div>
                <h3 className="font-bold text-white text-lg mb-2 truncate">{item.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Medal size={12} /> {item.experienceYears} {item.experienceYears === 1 ? "year" : "years"}</span>
                  {item.phoneNumber && (
                    <span className="flex items-center gap-1"><Phone size={12} /> {item.phoneNumber}</span>
                  )}
                </div>
                <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-3">{item.description}</p>
                {item.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.specialties.map((s) => (
                      <span key={s} className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => openEditForm(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-purple-400 hover:border-purple-500 transition-colors font-bold uppercase tracking-wider"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  {deleteConfirm === item.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting}
                        className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500/30 transition-colors"
                      >
                        {deleting ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Yes"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 py-2 bg-gray-700 text-gray-400 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-600 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors font-bold uppercase tracking-wider"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {coaches.length === 0 && (
            <div className="col-span-full text-center py-20 bg-gray-900 rounded-2xl border border-gray-700">
              <Users size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest">No coaches found.</p>
              <p className="text-gray-600 text-sm mt-2">Click "Add New Coach" to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
