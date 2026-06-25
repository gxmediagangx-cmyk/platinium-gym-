"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, BookOpen, CheckCircle, Calendar,
  Clock, Sparkles, Check, X, AlertTriangle, Loader2,
  Apple, Trash2
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, onSnapshot,
  updateDoc, deleteDoc, doc, writeBatch, getDoc, getDocs,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface NutritionPlan {
  id?: string;
  name: string;
  description: string;
  type: 'custom' | 'template';
  templateId?: string;
  isActive: boolean;
  itemsCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function NutritionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Plans state
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // set active
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // review
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setPlansLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Plans live listener — no orderBy to avoid index requirement
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'nutritionPlans'),
      (snapshot) => {
        const list: NutritionPlan[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as NutritionPlan));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPlans(list);
        setPlansLoading(false);
      },
      () => {
        setPlans([]);
        setPlansLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this nutrition plan and all its items?')) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const itemsSnap = await getDocs(collection(db, 'users', user.uid, 'nutritionPlans', id, 'items'));
      itemsSnap.forEach((item) => batch.delete(item.ref));
      batch.delete(doc(db, 'users', user.uid, 'nutritionPlans', id));
      await batch.commit();
    } catch (err) {
      console.error('Error deleting nutrition plan:', err);
    }
  };

  const handleSetActive = async (id: string) => {
    if (!user) return;
    setActivatingId(id);
    try {
      const batch = writeBatch(db);
      plans.forEach((p) => {
        if (p.id !== id) {
          batch.update(doc(db, 'users', user.uid, 'nutritionPlans', p.id!), { isActive: false });
        }
      });
      batch.update(doc(db, 'users', user.uid, 'nutritionPlans', id), { isActive: true });
      await batch.commit();
    } catch {
      setError('Failed to set active plan');
    } finally {
      setActivatingId(null);
    }
  };

  const handleReviewWithAI = async (p: NutritionPlan) => {
    if (!user || !p.id) return;
    setReviewingId(p.id);
    setError(null);

    try {
      let userGoal = '';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) userGoal = userDoc.data()?.goal || '';
      } catch {}

      let summary = '';
      summary += `Nutrition & Routine Plan: ${p.name || 'Untitled'}\n`;
      if (p.description) summary += `${p.description}\n`;
      if (userGoal) summary += `Goal: ${userGoal}\n`;
      summary += '\n';

      let fetchSuccess = true;
      try {
        const itemsSnap = await getDocs(collection(db, 'users', user.uid, 'nutritionPlans', p.id, 'items'));

        const items: {
          time?: string;
          title?: string;
          type?: string;
          components?: string;
          notes?: string;
          duration?: string;
          order?: number;
        }[] = [];
        itemsSnap.forEach((i) => items.push({ id: i.id, ...i.data() } as any));
        items.sort((a, b) => (a.order || 0) - (b.order || 0));

        if (items.length === 0) {
          summary += 'No items added to this plan yet\n';
        }

        for (const item of items) {
          const time = item.time || '';
          const title = item.title || '';
          const type = item.type || '';
          const typeLabel = type === 'other' ? (item.components || 'Other') : type;
          summary += `${time ? `${time} \u2014 ` : ''}${title}${type ? ` (${typeLabel})` : ''}\n`;
          if (item.components) summary += `  Components: ${item.components}\n`;
          if (item.duration) summary += `  Duration: ${item.duration}\n`;
          if (item.notes) summary += `  Notes: ${item.notes}\n`;
          summary += '\n';
        }
      } catch {
        fetchSuccess = false;
      }

      if (!fetchSuccess) {
        summary += 'Plan details could not be fully loaded \u2014 please describe your plan to the AI\n';
      }

      localStorage.setItem(
        'ai_nutrition_review',
        JSON.stringify({
          planId: p.id,
          planName: p.name || '',
          summary,
          goal: userGoal,
          autoReview: true,
        })
      );

      router.push('/dashboard/ai-assistant');
    } catch {
      setError('Failed to prepare nutrition review');
      setReviewingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            Nutrition & <span className="text-brand-blue">Routine</span>
          </h1>
          <p className="text-gray-400 text-sm">Manage your meal plans and daily routines.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/nutrition/create')}
          className="bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-sm transition-all shrink-0"
        >
          <Plus size={18} /> Add Nutrition Plan
        </button>
      </div>

      {/* Plans List */}
      {plansLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-3xl p-6 animate-pulse">
              <div className="h-6 w-3/4 bg-brand-gray rounded-lg mb-4" />
              <div className="h-4 w-full bg-brand-gray rounded-lg mb-2" />
              <div className="h-4 w-2/3 bg-brand-gray rounded-lg mb-6" />
              <div className="flex gap-3">
                <div className="h-10 w-24 bg-brand-gray rounded-xl" />
                <div className="h-10 w-24 bg-brand-gray rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-brand-dark border border-brand-gray rounded-3xl">
          <Apple size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No nutrition plans yet</p>
          <p className="text-gray-600 text-sm max-w-md text-center">
            Add your first meal plan to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((p) => {
            const isDeleting = confirmDeleteId === p.id;
            const deletingNow = deletingId === p.id;

            return (
              <div
                key={p.id}
                className={`bg-brand-dark border rounded-3xl p-6 transition-all duration-300 ${
                  p.isActive
                    ? 'border-brand-blue/40 shadow-glow-sm'
                    : 'border-brand-gray hover:border-brand-gray-light'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wide text-white break-words">
                        {p.name || ''}
                      </h3>
                      <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
                        p.type === 'template'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                      }`}>
                        {p.type === 'template' ? 'COACH TEMPLATE' : 'CUSTOM'}
                      </span>
                      {p.isActive && (
                        <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle size={12} /> ACTIVE
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-gray-400 text-sm leading-relaxed mb-3 max-w-2xl break-words">
                        {p.description || ''}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-brand-blue/70" /> {p.itemsCount || 0} items
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-brand-blue/70" /> Updated {formatDate(p.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => router.push(`/dashboard/nutrition/${p.id}`)}
                      className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-brand-blue/50 hover:text-brand-blue transition-all flex items-center gap-1.5"
                    >
                      <BookOpen size={14} /> Open
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-950/20 border border-red-500/20 rounded-xl">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        <span className="text-xs text-red-300 font-mono">Sure?</span>
                        <button
                          onClick={() => handleDelete(p.id!)}
                          disabled={deletingNow}
                          className="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase transition-all hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {deletingNow ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 bg-brand-gray text-gray-400 rounded-lg text-xs font-bold uppercase transition-all hover:text-white"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(p.id!)}
                        className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}

                    <button
                      onClick={() => handleSetActive(p.id!)}
                      disabled={activatingId === p.id || p.isActive}
                      className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-emerald-500/30 hover:text-emerald-400 transition-all flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {activatingId === p.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      {p.isActive ? 'Active' : 'Set Active'}
                    </button>

                    <button
                      onClick={() => handleReviewWithAI(p)}
                      disabled={reviewingId === p.id}
                      className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-purple-500/30 hover:text-purple-400 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {reviewingId === p.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {reviewingId === p.id ? 'Preparing...' : 'AI Review'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
