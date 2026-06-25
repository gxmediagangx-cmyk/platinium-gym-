"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Newspaper, Plus, Edit2, Trash2, Save, X, Loader2, Image as ImageIcon,
  Upload, AlertTriangle, CheckCircle, Calendar
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";
import { uploadImage, deleteImage, compressImage } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

type Post = {
  id: string;
  title: string;
  date: string;
  content: string;
  imageUrl: string;
  imageStoragePath: string;
  isActive: boolean;
  createdAt?: any;
};

export default function CoachWhatsNewPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "whatsNew")),
      (snap) => {
        const items: Post[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            title: data.title || "",
            date: data.date || "",
            content: data.content || "",
            imageUrl: data.imageUrl || "",
            imageStoragePath: data.imageStoragePath || "",
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
          });
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setPosts(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDate("");
    setContent("");
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setExistingStoragePath(null);
    setImageError(null);
    setError(null);
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
  };

  const openAddForm = () => {
    resetForm();
    const now = new Date();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    setDate(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    setShowForm(true);
  };

  const openEditForm = (item: Post) => {
    setTitle(item.title);
    setDate(item.date);
    setContent(item.content);
    setIsActive(item.isActive);
    setExistingImageUrl(item.imageUrl);
    setExistingStoragePath(item.imageStoragePath);
    setImagePreview(item.imageUrl || null);
    setImageFile(null);
    setImageError(null);
    setError(null);
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

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        let imageUrl = existingImageUrl || "";
        let imageStoragePath = existingStoragePath || "";

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const path = `whatsNew/${editingId}/${filename}`;
          const compressed = await compressImage(imageFile);
          await uploadImage(compressed, path);
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gym-images/${path}`;
          imageStoragePath = path;

          if (existingStoragePath) {
            await deleteImage(existingStoragePath);
          }
        }

        await updateDoc(doc(db, "whatsNew", editingId), {
          title: title.trim(),
          date: date.trim(),
          content: content.trim(),
          imageUrl,
          imageStoragePath,
          isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, "whatsNew"), {
          title: title.trim(),
          date: date.trim(),
          content: content.trim(),
          imageUrl: "",
          imageStoragePath: "",
          isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const path = `whatsNew/${docRef.id}/${filename}`;
          const compressed = await compressImage(imageFile);
          await uploadImage(compressed, path);
          const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gym-images/${path}`;
          const imageStoragePath = path;
          await updateDoc(doc(db, "whatsNew", docRef.id), { imageUrl, imageStoragePath });
        }
      }
      resetForm();
    } catch {
      setError("Failed to save post.");
    } finally {
    setSaving(false);
    setUploadProgress(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setError(null);
    try {
      const item = posts.find((p) => p.id === id);
      if (item?.imageStoragePath) {
        await deleteImage(item.imageStoragePath);
      }
      await deleteDoc(doc(db, "whatsNew", id));
      setDeleteConfirm(null);
    } catch {
      setError("Failed to delete post.");
    } finally {
      setDeleting(false);
    }
  };

  const contentPreview = (text: string) => {
    const stripped = text.replace(/<[^>]*>/g, "");
    return stripped.length > 150 ? stripped.slice(0, 150) + "..." : stripped;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Newspaper size={14} /> News Management
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            What's <span className="text-blue-400">New</span>
          </h1>
          <p className="text-gray-400">Create and manage gym announcements and updates.</p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="bg-blue-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-blue-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <Plus size={18} /> Add News
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-blue-400">
              {editingId ? "Edit News Post" : "New News Post"}
            </h2>
            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Title <span className="text-brand-blue">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. New Equipment Arriving Next Week"
                maxLength={100}
                required
              />
              <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{title.length}/100</div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value.slice(0, 30))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. 17 May 2026"
                maxLength={30}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Content <span className="text-gray-500">(max 1000 chars)</span></label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              rows={5}
              className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
              placeholder="Write the news content..."
              maxLength={1000}
            />
            <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{content.length}/1000</div>
          </div>

          {/* Image upload */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Image <span className="text-gray-500">(optional, PNG/JPG, max 15MB)</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleImageSelect(e.dataTransfer.files?.[0] || null); }}
                onClick={() => fileInputRef.current?.click()}
                className="relative bg-brand-black border border-dashed border-brand-gray-light rounded-xl p-6 text-center cursor-pointer hover:border-brand-blue/50 transition-colors"
              >
                {imagePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg object-contain" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleImageSelect(null); }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-mono"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload size={24} />
                    <span className="text-xs">Click or drop image</span>
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
              <div className="flex flex-col justify-end">
                {existingImageUrl && !imageFile && (
                  <p className="text-xs text-gray-500 font-mono">Current image will be kept.</p>
                )}
              </div>
            </div>
            {imageError && <p className="text-red-400 text-[10px] font-mono mt-1">{imageError}</p>}
          </div>

          {/* isActive toggle */}
          <div className="mb-6">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Status</label>
            <div className="flex items-center gap-4 bg-brand-black border border-brand-gray rounded-xl px-4 py-3">
              <button
                onClick={() => setIsActive(true)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300'
                }`}
              >
                <CheckCircle size={14} className="inline mr-1" /> Active
              </button>
              <button
                onClick={() => setIsActive(false)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  !isActive
                    ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                    : 'bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300'
                }`}
              >
                <X size={14} className="inline mr-1" /> Inactive
              </button>
            </div>
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
              disabled={saving || !title.trim()}
              className="px-6 py-3 bg-blue-500 text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Post"}
            </button>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 w-48 bg-brand-gray rounded-lg" />
                    <div className="h-4 w-14 bg-brand-gray rounded-full" />
                  </div>
                  <div className="h-3 w-32 bg-brand-gray rounded-lg mb-2" />
                  <div className="h-4 w-full bg-brand-gray rounded-lg mb-1" />
                  <div className="h-4 w-3/4 bg-brand-gray rounded-lg" />
                </div>
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-brand-gray shrink-0" />
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-brand-gray-light">
                <div className="h-6 w-12 bg-brand-gray rounded" />
                <div className="h-6 w-12 bg-brand-gray rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Newspaper size={48} className="text-blue-400/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No news posts yet</p>
          <p className="text-gray-600 text-sm">Create your first announcement.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => {
            const isConfirmDelete = deleteConfirm === post.id;
            return (
              <div
                key={post.id}
                className="bg-brand-dark border border-brand-gray rounded-2xl p-5 md:p-6 hover:border-brand-gray-light transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-display font-bold text-lg md:text-xl uppercase tracking-wide text-white break-words">
                        {post.title || ''}
                      </h3>
                      {post.isActive ? (
                        <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle size={10} /> Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1">
                          <X size={10} /> Inactive
                        </span>
                      )}
                    </div>
                    {post.date && (
                      <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5 mb-2">
                        <Calendar size={12} className="text-brand-blue/70" /> {post.date}
                      </p>
                    )}
                    {post.content && (
                      <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {contentPreview(post.content)}
                      </p>
                    )}
                  </div>

                  {post.imageUrl && (
                    <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-brand-black border border-brand-gray-light">
                      <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {post.imageUrl && !contentPreview(post.content) && (
                  <div className="mt-3">
                    <img src={post.imageUrl} alt="" className="max-h-48 rounded-xl object-contain bg-brand-black" />
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-brand-gray-light">
                  <button
                    onClick={() => openEditForm(post)}
                    className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  {isConfirmDelete ? (
                    <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1">
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <span className="text-[10px] text-red-300 font-mono">Sure?</span>
                      <button
                        onClick={() => handleDelete(post.id)}
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
                      onClick={() => setDeleteConfirm(post.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
