"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap, Plus, Edit2, Trash2, Save, X, Loader2,
  Upload, AlertTriangle, CheckCircle, Calendar
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc, getDocs
} from "firebase/firestore";
import { uploadImage, deleteImage, compressImage } from '@/lib/supabase';
import { createOffer, updateOffer, deleteOffer, Offer } from "@/lib/offers";

interface OfferWithStorage extends Offer {
  imageStoragePath?: string;
}

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

const defaultForm = () => ({
  title: "",
  subtitle: "",
  description: "",
  price: 0,
  currency: "",
  durationText: "",
  validUntil: "",
  badgeText: "",
  includedItems: [] as string[],
  includedClasses: [] as string[],
  ctaLabel: "",
  ctaHref: "/contact",
  imageUrl: "",
  imageStoragePath: "",
  isActive: true,
  sortOrder: 0,
});

export default function CoachOffersPage() {
  const [offers, setOffers] = useState<OfferWithStorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(defaultForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag inputs
  const [itemInput, setItemInput] = useState("");
  const [classInput, setClassInput] = useState("");
  const [activeClasses, setActiveClasses] = useState<string[]>([]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, "classes"), where("isActive", "==", true));
        const snap = await getDocs(q);
        const titles = snap.docs.map((d) => d.data().title || "").filter(Boolean);
        titles.sort((a, b) => a.localeCompare(b));
        setActiveClasses(titles);
      } catch {}
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "offers")),
      (snap) => {
        const items: OfferWithStorage[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            description: data.description || "",
            price: data.price ?? 0,
            currency: data.currency || "",
            durationText: data.durationText || "",
            validUntil: data.validUntil || "",
            badgeText: data.badgeText || "",
            includedItems: data.includedItems || [],
            includedClasses: data.includedClasses || [],
            ctaLabel: data.ctaLabel || "",
            ctaHref: data.ctaHref || "",
            imageUrl: data.imageUrl || "",
            imageStoragePath: data.imageStoragePath || "",
            isActive: data.isActive ?? true,
            sortOrder: data.sortOrder ?? 0,
            createdAt: data.createdAt,
          });
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setOffers(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setForm(defaultForm());
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setError(null);
    setItemInput("");
    setClassInput("");
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: OfferWithStorage) => {
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      description: item.description || "",
      price: item.price ?? 0,
      currency: item.currency || "",
      durationText: item.durationText || "",
      validUntil: typeof item.validUntil === "string" ? item.validUntil : "",
      badgeText: item.badgeText || "",
      includedItems: item.includedItems || [],
      includedClasses: item.includedClasses || [],
      ctaLabel: item.ctaLabel || "",
      ctaHref: item.ctaHref || "",
      imageUrl: item.imageUrl || "",
      imageStoragePath: item.imageStoragePath || "",
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? 0,
    });
    setImagePreview(item.imageUrl || null);
    setImageFile(null);
    setImageError(null);
    setError(null);
    setItemInput("");
    setClassInput("");
    setEditingId(item.id || null);
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

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void, max: number) => {
    const tag = input.trim();
    if (!tag || list.length >= max || list.includes(tag)) return;
    setList([...list, tag]);
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, tag: string) => {
    setList(list.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      let imageUrl = form.imageUrl;
      let imageStoragePath = form.imageStoragePath;

      if (editingId) {
        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const path = `offers/${editingId}/${filename}`;
          const compressed = await compressImage(imageFile);
          await uploadImage(compressed, path);
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gym-images/${path}`;
          imageStoragePath = path;

          if (form.imageStoragePath) {
            await deleteImage(form.imageStoragePath);
          }
        }

        await updateOffer(editingId, {
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          description: form.description.trim(),
          price: form.price,
          currency: form.currency.trim(),
          durationText: form.durationText.trim(),
          validUntil: form.validUntil.trim(),
          badgeText: form.badgeText.trim(),
          includedItems: form.includedItems,
          includedClasses: form.includedClasses,
          ctaLabel: form.ctaLabel.trim(),
          ctaHref: form.ctaHref.trim(),
          imageUrl,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        });
        if (imageStoragePath !== form.imageStoragePath) {
          await updateDoc(doc(db, "offers", editingId), { imageStoragePath });
        }
      } else {
        const docRef = await createOffer({
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          description: form.description.trim(),
          price: form.price,
          currency: form.currency.trim(),
          durationText: form.durationText.trim(),
          validUntil: form.validUntil.trim(),
          badgeText: form.badgeText.trim(),
          includedItems: form.includedItems,
          includedClasses: form.includedClasses,
          ctaLabel: form.ctaLabel.trim(),
          ctaHref: form.ctaHref.trim(),
          imageUrl: "",
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        });

        if (imageFile) {
          const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
          const filename = `${Date.now()}.${ext}`;
          const path = `offers/${docRef}/${filename}`;
          const compressed = await compressImage(imageFile);
          await uploadImage(compressed, path);
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gym-images/${path}`;
          imageStoragePath = path;
          await updateOffer(docRef, { imageUrl });
          await updateDoc(doc(db, "offers", docRef), { imageStoragePath });
        }
      }
      resetForm();
    } catch {
      setError("Failed to save offer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setError(null);
    try {
      const item = offers.find((o) => o.id === id);
      if (item?.imageStoragePath) {
        await deleteImage(item.imageStoragePath);
      }
      await deleteOffer(id);
      setDeleteConfirm(null);
    } catch {
      setError("Failed to delete offer.");
    } finally {
      setDeleting(false);
    }
  };

  const renderTagInput = (
    label: string,
    tags: string[],
    setTags: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void,
    placeholder: string,
    max: number,
    listId?: string
  ) => (
    <div>
      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">
        {label} <span className="text-gray-500">({tags.length}/{max})</span>
      </label>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(tags, setTags, input, setInput, max);
            }
          }}
          className="flex-1 bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
          placeholder={placeholder}
          list={listId}
        />
        <button
          type="button"
          onClick={() => addTag(tags, setTags, input, setInput, max)}
          disabled={!input.trim() || tags.length >= max}
          className="px-3 py-3 bg-brand-blue/20 text-brand-blue rounded-xl text-xs font-bold uppercase disabled:opacity-30 hover:bg-brand-blue/30 transition-colors"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] font-mono px-2.5 py-1 rounded-full">
              {tag}
              <button type="button" onClick={() => removeTag(tags, setTags, tag)} className="hover:text-red-400">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const currency = form.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Zap size={14} /> Offer Management
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            <span className="text-purple-400">Offers</span>
          </h1>
          <p className="text-gray-400">Create and manage membership offers and promotions.</p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="bg-purple-500 text-black px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-purple-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
          >
            <Plus size={18} /> Add Offer
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
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-purple-400">
              {editingId ? "Edit Offer" : "New Offer"}
            </h2>
            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Title <span className="text-brand-blue">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value.slice(0, 120) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. 3 Months Membership"
                maxLength={120}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Subtitle</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value.slice(0, 200) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Best value for committed members"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Badge Text</label>
              <input
                type="text"
                value={form.badgeText}
                onChange={(e) => setForm((prev) => ({ ...prev, badgeText: e.target.value.slice(0, 30) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. SPECIAL OFFER"
                maxLength={30}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value.slice(0, 500) }))}
              rows={3}
              className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
              placeholder="Describe the offer..."
              maxLength={500}
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Price <span className="text-brand-blue">*</span></label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.slice(0, 10) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. EGP"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Duration Text</label>
              <input
                type="text"
                value={form.durationText}
                onChange={(e) => setForm((prev) => ({ ...prev, durationText: e.target.value.slice(0, 30) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. 3 Months"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                min={0}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Valid Until</label>
              <input
                type="text"
                value={form.validUntil}
                onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value.slice(0, 30) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. 23 Jun 2026"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">CTA Label</label>
              <input
                type="text"
                value={form.ctaLabel}
                onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value.slice(0, 30) }))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Claim Offer"
                maxLength={30}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">CTA Link</label>
            <input
              type="text"
              value={form.ctaHref}
              onChange={(e) => setForm((prev) => ({ ...prev, ctaHref: e.target.value.slice(0, 200) }))}
              className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
              placeholder="e.g. /login"
              maxLength={200}
            />
          </div>

          {/* Tag inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {renderTagInput("Included Items", form.includedItems, (v) => setForm((prev) => ({ ...prev, includedItems: v })), itemInput, setItemInput, "e.g. Full gym access", 20)}
            <div>
              {renderTagInput("Included Classes", form.includedClasses, (v) => setForm((prev) => ({ ...prev, includedClasses: v })), classInput, setClassInput, "e.g. Yoga", 20, "classes-list")}
              <datalist id="classes-list">
                {activeClasses.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Image upload */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Image <span className="text-gray-500">(optional, recommended 600×400, PNG/JPG, max 15MB)</span></label>
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
                {form.imageUrl && !imageFile && (
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
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isActive: true }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  form.isActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300"
                }`}
              >
                <CheckCircle size={14} className="inline mr-1" /> Active
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isActive: false }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  !form.isActive
                    ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                    : "bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300"
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
              disabled={saving || !form.title.trim()}
              className="px-6 py-3 bg-purple-500 text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Offer"}
            </button>
          </div>
        </div>
      )}

      {/* Offers List */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 w-48 bg-brand-gray rounded-lg" />
                    <div className="h-4 w-16 bg-brand-gray rounded-full" />
                  </div>
                  <div className="h-4 w-36 bg-brand-gray rounded-lg mb-2" />
                  <div className="h-3 w-full bg-brand-gray rounded-lg mb-1" />
                  <div className="h-3 w-2/3 bg-brand-gray rounded-lg" />
                </div>
                <div className="w-24 h-16 md:w-32 md:h-20 rounded-xl bg-brand-gray shrink-0" />
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-brand-gray-light">
                <div className="h-6 w-12 bg-brand-gray rounded" />
                <div className="h-6 w-12 bg-brand-gray rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : offers.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Zap size={48} className="text-purple-400/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No offers yet</p>
          <p className="text-gray-600 text-sm">Create your first promotion.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {offers.map((offer) => {
            const isConfirmDelete = deleteConfirm === offer.id;
            return (
              <div
                key={offer.id}
                className="bg-brand-dark border border-brand-gray rounded-2xl p-5 md:p-6 hover:border-brand-gray-light transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-display font-bold text-lg md:text-xl uppercase tracking-wide text-white break-words">
                        {offer.title || ''}
                      </h3>
                      {offer.isActive ? (
                        <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle size={10} /> Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1">
                          <X size={10} /> Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      <span className="text-purple-400 font-bold font-mono text-lg">
                        {formatter(offer.price)} {offer.currency || ''}
                      </span>
                      {offer.durationText && (
                        <span className="text-gray-500 font-mono text-xs">{offer.durationText}</span>
                      )}
                      {offer.validUntil && (
                          <span className="text-gray-500 text-xs font-mono flex items-center gap-1">
                            <Calendar size={11} className="text-brand-blue/70" /> Until {String(offer.validUntil || '')}
                          </span>
                      )}
                    </div>

                    {offer.badgeText && (
                      <span className="inline-block mt-2 text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {offer.badgeText}
                      </span>
                    )}

                    {offer.description && (
                      <p className="text-sm text-gray-400 leading-relaxed mt-2 whitespace-pre-wrap">
                        {offer.description.length > 200 ? offer.description.slice(0, 200) + '...' : offer.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-3">
                      {offer.includedItems && offer.includedItems.length > 0 && (
                        <div>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Items:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {offer.includedItems.map((item) => (
                              <span key={item} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {offer.includedClasses && offer.includedClasses.length > 0 && (
                        <div>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">Classes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {offer.includedClasses.map((cls) => (
                              <span key={cls} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                {cls}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {offer.imageUrl && (
                    <div className="shrink-0 w-24 h-16 md:w-32 md:h-20 rounded-xl overflow-hidden bg-brand-black border border-brand-gray-light">
                      <img src={offer.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-brand-gray-light">
                  <button
                    onClick={() => openEditForm(offer)}
                    className="p-1.5 text-gray-500 hover:text-purple-400 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  {isConfirmDelete ? (
                    <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1">
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <span className="text-[10px] text-red-300 font-mono">Sure?</span>
                      <button
                        onClick={() => handleDelete(offer.id!)}
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
                      onClick={() => setDeleteConfirm(offer.id!)}
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

function formatter(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
