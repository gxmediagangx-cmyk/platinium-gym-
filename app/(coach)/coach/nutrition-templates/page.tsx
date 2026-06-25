"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Apple, Plus, Trash2, Loader2, AlertTriangle, Users, Target, CheckCircle, XCircle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, query, onSnapshot, addDoc, deleteDoc, doc, writeBatch, getDocs
} from 'firebase/firestore';

type Template = {
  id: string;
  name: string;
  coachName: string;
  goal: string;
  difficulty: string;
  isActive: boolean;
  itemsCount: number;
  createdAt?: any;
};

export default function NutritionTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'nutritionTemplates')),
      (snap) => {
        const items: Template[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            name: data.name || '',
            coachName: data.coachName || '',
            goal: data.goal || '',
            difficulty: data.difficulty || 'Beginner',
            isActive: data.isActive ?? true,
            itemsCount: data.itemsCount ?? 0,
            createdAt: data.createdAt,
          });
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setTemplates(items);
        setLoading(false);
      },
      () => {
        setTemplates([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'nutritionTemplates'), {
        name: 'Untitled Template',
        coachName: '',
        goal: '',
        difficulty: 'Beginner',
        isActive: true,
        itemsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      router.push(`/coach/nutrition-templates/${docRef.id}`);
    } catch {
      setError('Failed to create template');
      setCreating(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setDeleting(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const itemsSnap = await getDocs(collection(db, 'nutritionTemplates', templateId, 'items'));
      itemsSnap.forEach((itemDoc) => batch.delete(itemDoc.ref));
      batch.delete(doc(db, 'nutritionTemplates', templateId));
      await batch.commit();
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const difficultyColor = (d: string) => {
    if (d === 'Advanced') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (d === 'Intermediate') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-4xl uppercase tracking-wider">
            Nutrition <span className="text-brand-blue">Templates</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage coach-designed nutrition &amp; routine templates.</p>
        </div>
        <button
          id="new-nutrition-template-btn"
          onClick={handleCreate}
          disabled={creating}
          className="px-6 py-3 bg-brand-blue text-black rounded-xl text-sm font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-50 self-start shrink-0"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {creating ? 'Creating...' : 'New Template'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="h-6 w-40 bg-brand-gray rounded-lg flex-1" />
                <div className="h-5 w-20 bg-brand-gray rounded-full shrink-0" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-4 w-24 bg-brand-gray rounded-lg" />
                <div className="h-4 w-20 bg-brand-gray rounded-lg" />
              </div>
              <div className="pt-4 border-t border-brand-gray-light">
                <div className="h-8 w-16 bg-brand-gray rounded-lg ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Apple size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No nutrition templates available yet.</p>
          <p className="text-gray-600 text-sm">Create your first template to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-brand-dark border border-brand-gray rounded-3xl p-6 hover:border-brand-gray-light transition-all duration-300 flex flex-col cursor-pointer group"
              onClick={() => router.push(`/coach/nutrition-templates/${t.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-display font-bold text-xl uppercase tracking-wide text-white break-words flex-1 min-w-0">
                  {t.name || 'Untitled Template'}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-block text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${difficultyColor(t.difficulty)}`}>
                    {t.difficulty || 'Beginner'}
                  </span>
                  {t.isActive ? (
                    <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle size={10} /> Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1">
                      <XCircle size={10} /> Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 font-mono mb-4">
                {t.coachName && (
                  <span className="flex items-center gap-1.5">
                    <Users size={12} className="text-brand-blue/70" /> {t.coachName}
                  </span>
                )}
                {t.goal && (
                  <span className="flex items-center gap-1.5">
                    <Target size={12} className="text-brand-blue/70" /> {t.goal}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Apple size={12} className="text-brand-blue/70" /> {t.itemsCount} item{t.itemsCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-auto pt-4 border-t border-brand-gray-light flex justify-end">
                {deleteConfirm === t.id ? (
                  <div className="flex items-center gap-2 bg-red-950/20 border border-red-500/20 rounded-lg px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <AlertTriangle size={12} className="text-red-400 shrink-0" />
                    <span className="text-[10px] text-red-300 font-mono">Delete this template?</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                      disabled={deleting}
                      className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold uppercase disabled:opacity-50"
                    >
                      {deleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                      className="px-2 py-0.5 bg-brand-gray text-gray-400 rounded text-[10px] font-bold uppercase"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(t.id); }}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/10"
                    title="Delete template"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
