"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, ChevronRight, Edit2, Plus, Trash2,
  Check, X, AlertTriangle, Loader2, CheckCircle,
  ChevronUp, ChevronDown, Sun, Apple, Dumbbell, Star, Footprints,
  Clock, Sparkles, LayoutGrid, List, GripVertical
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  doc, collection, query, onSnapshot,
  addDoc, updateDoc, deleteDoc, writeBatch, getDocs,
  serverTimestamp, Timestamp
} from 'firebase/firestore';

interface Template {
  id?: string;
  name: string;
  coachName: string;
  goal: string;
  difficulty: string;
  isActive: boolean;
  itemsCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface NutritionItem {
  id: string;
  type: 'meal' | 'sun' | 'walk' | 'training' | 'other';
  title: string;
  time?: string;
  duration?: string;
  components?: string;
  notes?: string;
  customTypeLabel?: string;
  order: number;
  createdAt?: Timestamp;
}

const ITEM_TYPES = [
  { value: 'meal', label: 'Meal', icon: Apple, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { value: 'sun', label: 'Expose to Sun', icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { value: 'walk', label: 'Walk', icon: Footprints, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { value: 'training', label: 'Training', icon: Dumbbell, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
  { value: 'other', label: 'Other', icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

const typeMeta = (type: string) => ITEM_TYPES.find((t) => t.value === type) || ITEM_TYPES[4];

function formatTimeDisplay(time: string): string {
  if (!time) return '';
  try {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export default function NutritionTemplateBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [items, setItems] = useState<NutritionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');

  // add/edit item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemFormStep, setItemFormStep] = useState(1);
  const [itemType, setItemType] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemDuration, setItemDuration] = useState('');
  const [itemComponents, setItemComponents] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemCustomTypeLabel, setItemCustomTypeLabel] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // delete item
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // listen to template doc
  useEffect(() => {
    if (!templateId) return;

    const unsub = onSnapshot(
      doc(db, 'nutritionTemplates', templateId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTemplate({ id: snap.id, ...snap.data() } as Template);
        setLoading(false);
      },
      () => {
        setNotFound(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [templateId]);

  // listen to items subcollection
  useEffect(() => {
    if (!templateId) return;

    const q = query(collection(db, 'nutritionTemplates', templateId, 'items'));

    const unsub = onSnapshot(q,
      (snapshot) => {
        const list: NutritionItem[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as NutritionItem));
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setItems(list);
      },
      () => {
        setItems([]);
      }
    );
    return () => unsub();
  }, [templateId]);

  const scheduledItems = useMemo(() => {
    return items
      .filter((i) => i.time)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [items]);

  const unscheduledItems = useMemo(() => {
    return items.filter((i) => !i.time);
  }, [items]);

  const handleSaveTemplate = async (field: string, value: any) => {
    setSavingTemplate(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'nutritionTemplates', templateId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // ─── Item form ───────────────────────────────────────────────────────────────

  const openAddForm = () => {
    setShowItemForm(true);
    setItemFormStep(1);
    setItemType(null);
    setItemTitle('');
    setItemTime('');
    setItemDuration('');
    setItemComponents('');
    setItemNotes('');
    setItemCustomTypeLabel('');
    setEditingItemId(null);
    setItemError(null);
  };

  const openEditForm = (item: NutritionItem) => {
    setShowItemForm(true);
    setItemFormStep(2);
    setItemType(item.type);
    setItemTitle(item.title || '');
    setItemTime(item.time || '');
    setItemDuration(item.duration || '');
    setItemComponents(item.components || '');
    setItemNotes(item.notes || '');
    setItemCustomTypeLabel(item.customTypeLabel || '');
    setEditingItemId(item.id);
    setItemError(null);
  };

  const closeItemForm = () => {
    setShowItemForm(false);
    setItemFormStep(1);
    setItemType(null);
    setItemTitle('');
    setItemTime('');
    setItemDuration('');
    setItemComponents('');
    setItemNotes('');
    setItemCustomTypeLabel('');
    setEditingItemId(null);
    setItemError(null);
  };

  const handleItemTypeSelect = (type: string) => {
    setItemType(type);
    setItemFormStep(2);
  };

  const canSaveItem = (): boolean => {
    if (!itemType) return false;
    if (!itemTitle.trim()) return false;
    if (itemType === 'other' && !itemCustomTypeLabel.trim()) return false;
    return true;
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemType) return;
    setItemError(null);

    if (!itemTitle.trim()) {
      setItemError('Title is required');
      return;
    }
    if (itemType === 'other' && !itemCustomTypeLabel.trim()) {
      setItemError('Custom type label is required');
      return;
    }

    setSavingItem(true);
    try {
      const baseData: Record<string, any> = {
        type: itemType,
        title: itemTitle.trim(),
        time: itemTime.trim() || '',
        duration: itemDuration.trim() || '',
        components: itemComponents.trim() || '',
        notes: itemNotes.trim() || '',
        customTypeLabel: itemType === 'other' ? itemCustomTypeLabel.trim() : '',
        updatedAt: serverTimestamp(),
      };

      if (editingItemId) {
        await updateDoc(
          doc(db, 'nutritionTemplates', templateId, 'items', editingItemId),
          baseData
        );
      } else {
        await addDoc(
          collection(db, 'nutritionTemplates', templateId, 'items'),
          {
            ...baseData,
            order: items.length + 1,
            createdAt: serverTimestamp(),
          }
        );
        await updateDoc(doc(db, 'nutritionTemplates', templateId), {
          itemsCount: items.length + 1,
          updatedAt: serverTimestamp(),
        });
      }
      closeItemForm();
    } catch {
      setItemError('Failed to save item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingItem(true);
    try {
      await deleteDoc(
        doc(db, 'nutritionTemplates', templateId, 'items', itemId)
      );
      await updateDoc(doc(db, 'nutritionTemplates', templateId), {
        itemsCount: Math.max(0, items.length - 1),
        updatedAt: serverTimestamp(),
      });
      setConfirmDeleteItemId(null);
    } catch {
      setError('Failed to delete item');
    } finally {
      setDeletingItem(false);
    }
  };

  const handleReorderItem = async (itemId: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const current = items[idx];
    const swap = items[swapIdx];

    setError(null);
    try {
      const batch = writeBatch(db);
      batch.update(
        doc(db, 'nutritionTemplates', templateId, 'items', current.id),
        { order: swap.order }
      );
      batch.update(
        doc(db, 'nutritionTemplates', templateId, 'items', swap.id),
        { order: current.order }
      );
      await batch.commit();
    } catch {
      setError('Failed to reorder item');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-brand-gray rounded-lg" />
          <div className="h-12 w-64 bg-brand-gray rounded-xl" />
          <div className="h-4 w-96 bg-brand-gray rounded-lg" />
          <div className="space-y-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-brand-gray rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !template) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="flex flex-col items-center justify-center py-32 bg-brand-dark border border-brand-gray rounded-3xl">
          <AlertTriangle size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-4">Template not found</p>
          <button
            onClick={() => router.push('/coach/nutrition-templates')}
            className="px-6 py-3 bg-brand-blue text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-glow-sm transition-all"
          >
            <ArrowLeft size={16} /> Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push('/coach/nutrition-templates')}
        className="mb-6 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Templates
      </button>

      {/* Template Header — Inline Editable Fields */}
      <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Template Name</label>
              <input
                type="text"
                defaultValue={template.name}
                onBlur={(e) => handleSaveTemplate('name', e.target.value.trim() || 'Untitled Template')}
                className="w-full bg-brand-black border border-brand-gray text-white font-display font-bold text-xl md:text-2xl uppercase tracking-wider rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="Template name"
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Coach Name</label>
              <input
                type="text"
                defaultValue={template.coachName}
                onBlur={(e) => handleSaveTemplate('coachName', e.target.value.trim())}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Coach Ahmed"
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Goal</label>
              <input
                type="text"
                defaultValue={template.goal}
                onBlur={(e) => handleSaveTemplate('goal', e.target.value.trim())}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Muscle Gain, Fat Loss"
                maxLength={80}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Difficulty</label>
              <select
                defaultValue={template.difficulty}
                onChange={(e) => handleSaveTemplate('difficulty', e.target.value)}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Status</label>
              <div className="flex items-center gap-4 bg-brand-black border border-brand-gray rounded-xl px-4 py-3">
                <button
                  onClick={() => handleSaveTemplate('isActive', true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    template.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300'
                  }`}
                >
                  <CheckCircle size={14} className="inline mr-1" /> Active
                </button>
                <button
                  onClick={() => handleSaveTemplate('isActive', false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    !template.isActive
                      ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      : 'bg-brand-gray text-gray-500 border border-brand-gray-light hover:text-gray-300'
                  }`}
                >
                  <X size={14} className="inline mr-1" /> Inactive
                </button>
              </div>
            </div>
            <div className="mt-auto pt-2 text-xs font-mono text-gray-500">
              {items.length} item{items.length !== 1 ? 's' : ''}
              {savingTemplate && (
                <span className="ml-3 text-brand-blue">
                  <Loader2 size={12} className="inline animate-spin mr-1" /> Saving...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-brand-dark border border-brand-gray rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-brand-blue text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={14} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-5 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'bg-brand-blue text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={14} /> Schedule
          </button>
        </div>
        <button
          onClick={openAddForm}
          className="px-5 py-2.5 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 shadow-glow-sm transition-all"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {items.length === 0 && !showItemForm ? (
            <div className="flex flex-col items-center justify-center py-16 bg-brand-dark border border-brand-gray rounded-3xl">
              <Apple size={40} className="text-brand-blue/30 mb-4" />
              <p className="text-gray-500 font-display uppercase tracking-widest mb-2">No items yet</p>
              <p className="text-gray-600 text-sm">Add your first item to start building this template.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => {
                const isConfirmDelete = confirmDeleteItemId === item.id;
                const meta = typeMeta(item.type);
                const Icon = meta.icon;
                const hasPrev = idx > 0;
                const hasNext = idx < items.length - 1;

                return (
                  <div key={item.id} className="bg-brand-dark border border-brand-gray rounded-2xl p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon size={20} className={meta.color} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white break-words">{item.title || ''}</h4>
                            <span className="text-[10px] font-mono text-gray-500 uppercase">{item.type === 'other' ? (item.customTypeLabel || 'Other') : meta.label}</span>
                          </div>
                          {item.time && (
                            <div className="mt-1 text-xs text-gray-400 font-mono flex items-center gap-1.5">
                              <Clock size={12} className="text-brand-blue/70" /> {formatTimeDisplay(item.time)}
                            </div>
                          )}
                          {item.duration && (
                            <div className="text-xs text-gray-400 font-mono mt-0.5">Duration: {item.duration}</div>
                          )}
                          {item.components && (
                            <div className="text-xs text-gray-400 mt-1 leading-relaxed break-words">
                              <span className="text-gray-500 font-mono">Components:</span> {item.components}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-gray-400 mt-1 leading-relaxed break-words">
                              <span className="text-gray-500 font-mono">Notes:</span> {item.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button
                            onClick={() => handleReorderItem(item.id, 'up')}
                            disabled={!hasPrev}
                            className="p-0.5 text-gray-600 hover:text-brand-blue transition-colors disabled:opacity-20"
                            title="Move up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => handleReorderItem(item.id, 'down')}
                            disabled={!hasNext}
                            className="p-0.5 text-gray-600 hover:text-brand-blue transition-colors disabled:opacity-20"
                            title="Move down"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => openEditForm(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors"
                          title="Edit item"
                        >
                          <Edit2 size={13} />
                        </button>
                        {isConfirmDelete ? (
                          <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-1.5 py-0.5">
                            <AlertTriangle size={10} className="text-red-400 shrink-0" />
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItem}
                              className="px-1 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-bold uppercase disabled:opacity-50"
                            >
                              {deletingItem ? <Loader2 size={9} className="animate-spin" /> : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteItemId(null)}
                              className="px-1 py-0.5 bg-brand-gray text-gray-400 rounded text-[9px] font-bold uppercase"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteItemId(item.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Item Inline Form */}
          {showItemForm && (
            <div className="mt-6 bg-brand-dark border border-brand-gray rounded-3xl p-6 md:p-8 animate-fade-in">
              {itemFormStep === 1 ? (
                <>
                  <h3 className="font-display font-bold text-xl uppercase tracking-wider mb-6">
                    Choose <span className="text-brand-blue">Type</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {ITEM_TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = itemType === t.value;
                      return (
                        <button
                          key={t.value}
                          onClick={() => handleItemTypeSelect(t.value)}
                          className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? 'bg-brand-dark border-brand-blue shadow-glow-sm'
                              : 'bg-brand-black border-brand-gray hover:border-brand-blue/50'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl ${t.bg} flex items-center justify-center`}>
                            <Icon size={24} className={t.color} />
                          </div>
                          <span className="text-xs font-display font-bold uppercase tracking-wider text-white text-center leading-tight">
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={closeItemForm}
                    className="mt-6 px-5 py-2.5 bg-brand-gray border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <form onSubmit={handleSaveItem}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-bold text-xl uppercase tracking-wider">
                      {editingItemId ? 'Edit' : 'Add'} <span className="text-brand-blue">Item</span>
                    </h3>
                    {!editingItemId && (
                      <button
                        type="button"
                        onClick={() => setItemFormStep(1)}
                        className="text-xs text-gray-400 hover:text-white transition-colors font-mono uppercase tracking-widest"
                      >
                        &larr; Change type
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-8 h-8 rounded-lg ${typeMeta(itemType || '').bg} flex items-center justify-center`}>
                      {React.createElement(typeMeta(itemType || '').icon, { size: 16, className: typeMeta(itemType || '').color })}
                    </div>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      {itemType === 'other' ? 'Other' : ITEM_TYPES.find((t) => t.value === itemType)?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">
                        Title <span className="text-brand-blue">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemTitle}
                        onChange={(e) => setItemTitle(e.target.value.slice(0, 60))}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                        placeholder="e.g. Breakfast"
                        maxLength={60}
                        required
                      />
                      <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{itemTitle.length}/60</div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Time <span className="text-gray-500">(optional)</span></label>
                      <input
                        type="time"
                        value={itemTime}
                        onChange={(e) => setItemTime(e.target.value)}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                      />
                    </div>

                    {(itemType === 'sun' || itemType === 'walk' || itemType === 'training') && (
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Duration <span className="text-gray-500">(optional)</span></label>
                        <input
                          type="text"
                          value={itemDuration}
                          onChange={(e) => setItemDuration(e.target.value.slice(0, 40))}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                          placeholder="e.g. 15 minutes"
                          maxLength={40}
                        />
                      </div>
                    )}

                    {itemType === 'meal' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Components <span className="text-gray-500">(optional)</span></label>
                        <input
                          type="text"
                          value={itemComponents}
                          onChange={(e) => setItemComponents(e.target.value.slice(0, 300))}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                          placeholder="e.g. Chicken, rice, olive oil"
                          maxLength={300}
                        />
                        <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{itemComponents.length}/300</div>
                      </div>
                    )}

                    {itemType === 'other' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">
                          Custom Type Label <span className="text-brand-blue">*</span>
                        </label>
                        <input
                          type="text"
                          value={itemCustomTypeLabel}
                          onChange={(e) => setItemCustomTypeLabel(e.target.value.slice(0, 40))}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                          placeholder="e.g. Supplement, Stretch"
                          maxLength={40}
                          required
                        />
                        <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{itemCustomTypeLabel.length}/40</div>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Notes <span className="text-gray-500">(optional)</span></label>
                      <textarea
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value.slice(0, 300))}
                        rows={2}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
                        placeholder="Preparation tips, reminders, etc."
                        maxLength={300}
                      />
                      <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{itemNotes.length}/300</div>
                    </div>
                  </div>

                  {itemError && (
                    <div className="mb-4 text-red-400 text-xs font-mono flex items-center gap-2">
                      <AlertTriangle size={14} /> {itemError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeItemForm}
                      className="flex-1 py-2.5 bg-brand-gray border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingItem || !canSaveItem()}
                      className="flex-1 py-2.5 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingItem ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {savingItem ? 'Saving...' : editingItemId ? 'Save Changes' : 'Add Item'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div>
          {scheduledItems.length === 0 && unscheduledItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-brand-dark border border-brand-gray rounded-3xl">
              <Clock size={40} className="text-brand-blue/30 mb-4" />
              <p className="text-gray-500 font-display uppercase tracking-widest mb-2">No scheduled items</p>
              <p className="text-gray-600 text-sm">Add items with a time to see them here.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Timeline */}
              {scheduledItems.length > 0 && (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-brand-gray-light" />

                  <div className="space-y-6">
                    {scheduledItems.map((item) => {
                      const meta = typeMeta(item.type);
                      const Icon = meta.icon;
                      return (
                        <div key={item.id} className="relative pl-14">
                          <div className={`absolute left-3.5 w-4 h-4 rounded-full border-2 border-brand-dark ${meta.bg} flex items-center justify-center`}>
                            <div className="w-2 h-2 rounded-full bg-current opacity-40" />
                          </div>

                          <div className="bg-brand-dark border border-brand-gray rounded-2xl p-4 md:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                  <Icon size={18} className={meta.color} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-brand-blue font-bold uppercase tracking-wider">
                                      {formatTimeDisplay(item.time || '')}
                                    </span>
                                    <h4 className="text-sm font-bold text-white break-words">{item.title || ''}</h4>
                                    <span className="text-[10px] font-mono text-gray-500 uppercase">{item.type === 'other' ? (item.customTypeLabel || 'Other') : meta.label}</span>
                                  </div>
                                  {item.components && (
                                    <div className="mt-1 text-xs text-gray-400 leading-relaxed break-words">
                                      {item.components}
                                    </div>
                                  )}
                                  {item.duration && (
                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{item.duration}</div>
                                  )}
                                  {item.notes && (
                                    <div className="text-xs text-gray-400 mt-1 leading-relaxed break-words">
                                      <span className="text-gray-500 font-mono">Notes:</span> {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => openEditForm(item)}
                                className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors shrink-0"
                                title="Edit item"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unscheduled */}
              {unscheduledItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4 px-1">
                    Unscheduled
                  </h3>
                  <div className="space-y-3">
                    {unscheduledItems.map((item) => {
                      const meta = typeMeta(item.type);
                      const Icon = meta.icon;
                      return (
                        <div key={item.id} className="bg-brand-dark border border-brand-gray rounded-2xl p-4 md:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <Icon size={18} className={meta.color} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-white break-words">{item.title || ''}</h4>
                                  <span className="text-[10px] font-mono text-gray-500 uppercase">{item.type === 'other' ? (item.customTypeLabel || 'Other') : meta.label}</span>
                                </div>
                                {item.duration && (
                                  <div className="text-xs text-gray-400 font-mono mt-0.5">Duration: {item.duration}</div>
                                )}
                                {item.components && (
                                  <div className="text-xs text-gray-400 mt-1 leading-relaxed break-words">
                                    <span className="text-gray-500 font-mono">Components:</span> {item.components}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="text-xs text-gray-400 mt-1 leading-relaxed break-words">
                                    <span className="text-gray-500 font-mono">Notes:</span> {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => openEditForm(item)}
                              className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors shrink-0"
                              title="Edit item"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
