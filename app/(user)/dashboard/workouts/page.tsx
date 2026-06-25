"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, BookOpen, Edit2, Trash2, CheckCircle, Calendar,
  Clock, Sparkles, Check, X, AlertTriangle, Loader2
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, writeBatch, getDoc, getDocs,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Workout {
  id?: string;
  name: string;
  description: string;
  type: 'custom' | 'template';
  templateId?: string;
  isActive: boolean;
  daysCount: number;
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

export default function WorkoutsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // set active loading indicator
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // review loading indicator
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'workouts'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q,
      (snapshot) => {
        const list: Workout[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Workout));
        setWorkouts(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to load workouts');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const handleStartEdit = (w: Workout) => {
    setEditingId(w.id || null);
    setEditName(w.name || '');
    setEditDescription(w.description || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!user) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'workouts', id), {
        name: editName.trim() || 'Untitled Workout',
        description: editDescription.trim() || '',
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update workout');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workout and all its days and exercises?')) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const daysSnap = await getDocs(collection(db, 'users', user.uid, 'workouts', id, 'days'));
      for (const dayDoc of daysSnap.docs) {
        const exercisesSnap = await getDocs(collection(db, 'users', user.uid, 'workouts', id, 'days', dayDoc.id, 'exercises'));
        exercisesSnap.forEach((ex) => batch.delete(ex.ref));
        batch.delete(dayDoc.ref);
      }
      batch.delete(doc(db, 'users', user.uid, 'workouts', id));
      await batch.commit();
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  const handleSetActive = async (id: string) => {
    if (!user) return;
    setActivatingId(id);
    try {
      const batch = writeBatch(db);
      workouts.forEach((w) => {
        if (w.id !== id) {
          batch.update(doc(db, 'users', user.uid, 'workouts', w.id!), { isActive: false });
        }
      });
      const nowCairo = new Date(new Date().getTime() + 3 * 60 * 60 * 1000);
      const activatedAt = nowCairo.toISOString().slice(0, 10);
      batch.update(doc(db, 'users', user.uid, 'workouts', id), { isActive: true, activatedAt });
      await batch.commit();
    } catch (err: any) {
      setError(err.message || 'Failed to set active workout');
    } finally {
      setActivatingId(null);
    }
  };

  const handleReviewWithAI = async (w: Workout) => {
    if (!user || !w.id) return;
    setReviewingId(w.id);
    setError(null);

    try {
      let userGoal = '';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) userGoal = userDoc.data()?.goal || '';
      } catch {}

      let summary = '';
      summary += `Workout: ${w.name || 'Untitled'}\n`;
      if (w.description) summary += `${w.description}\n`;
      summary += `Type: ${w.type === 'template' ? 'Coach Template' : 'Custom'}\n\n`;

      let fetchError = false;
      try {
        const daysSnap = await getDocs(
          query(collection(db, 'users', user.uid, 'workouts', w.id, 'days'), orderBy('order', 'asc'))
        );

        const days: { id: string; dayName: string; dayLabel?: string }[] = [];
        daysSnap.forEach((d) => days.push({ id: d.id, ...d.data() } as any));

        for (const day of days) {
          const dn = day.dayName || '';
          const dl = day.dayLabel || '';
          summary += `${dl ? `${dn} \u2014 ${dl}` : dn}:\n`;

          try {
            const exSnap = await getDocs(
              query(
                collection(db, 'users', user.uid, 'workouts', w.id, 'days', day.id, 'exercises'),
                orderBy('order', 'asc')
              )
            );

            const exercises: { title: string; sets: number; reps: string; notes: string }[] = [];
            exSnap.forEach((e) => exercises.push({ id: e.id, ...e.data() } as any));

            if (exercises.length === 0) {
              summary += '  (No exercises yet)\n';
            }

            for (const ex of exercises) {
              const title = ex.title || 'Exercise';
              const sets = Number(ex.sets) || 0;
              const reps = (ex.reps || '').trim();
              const repsStr = reps ? ` x ${reps}` : '';
              summary += `  \u2022 ${title}: ${sets} sets${repsStr}.`;
              if (ex.notes) summary += ` Notes: ${ex.notes}`;
              summary += '\n';
            }
          } catch {
            summary += '  (Could not load exercises)\n';
            fetchError = true;
          }
          summary += '\n';
        }
      } catch {
        summary += '(Could not load training days)\n';
        fetchError = true;
      }

      if (fetchError) {
        summary += '\nNote: Some workout data could not be loaded.';
      }

      localStorage.setItem(
        'ai_workout_review',
        JSON.stringify({
          workoutId: w.id,
          workoutName: w.name || '',
          summary,
          goal: userGoal,
          autoReview: true,
        })
      );

      router.push('/dashboard/ai-assistant');
    } catch (err: any) {
      setError(err.message || 'Failed to prepare workout review');
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
        <div className="flex items-center justify-between mb-8">
          <div className="h-10 w-48 bg-brand-gray rounded-xl animate-pulse" />
          <div className="h-12 w-40 bg-brand-gray rounded-xl animate-pulse" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-brand-dark border border-brand-gray rounded-3xl p-6 animate-pulse">
              <div className="h-6 w-3/4 bg-brand-gray rounded-lg mb-4" />
              <div className="h-4 w-full bg-brand-gray rounded-lg mb-2" />
              <div className="h-4 w-2/3 bg-brand-gray rounded-lg mb-6" />
              <div className="flex gap-3">
                <div className="h-10 w-24 bg-brand-gray rounded-xl" />
                <div className="h-10 w-24 bg-brand-gray rounded-xl" />
                <div className="h-10 w-24 bg-brand-gray rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
            My <span className="text-brand-blue">Workouts</span>
          </h1>
          <p className="text-gray-400 text-sm">Manage your training systems and track your progress.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/workouts/create')}
          className="bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-sm transition-all shrink-0"
        >
          <Plus size={18} /> Add Workout
        </button>
      </div>

      {/* Workout List */}
      {workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-brand-dark border border-brand-gray rounded-3xl">
          <BookOpen size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No workout systems yet</p>
          <p className="text-gray-600 text-sm max-w-md text-center">
            Add your first workout to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {workouts.map((w) => {
            const isEditing = editingId === w.id;
            const isDeleting = confirmDeleteId === w.id;
            const deletingNow = deletingId === w.id;

            return (
              <div
                key={w.id}
                className={`bg-brand-dark border rounded-3xl p-6 transition-all duration-300 ${
                  w.isActive
                    ? 'border-brand-blue/40 shadow-glow-sm'
                    : 'border-brand-gray hover:border-brand-gray-light'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-3 mb-4">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-brand-black border border-brand-gray rounded-xl px-4 py-3 text-white font-display font-bold text-xl uppercase tracking-wider focus:outline-none focus:border-brand-blue"
                          placeholder="Workout name"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className="w-full bg-brand-black border border-brand-gray rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-blue resize-none"
                          placeholder="Description (optional)"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wide text-white break-words">
                            {w.name || ''}
                          </h3>
                          <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
                            w.type === 'template'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                          }`}>
                            {w.type === 'template' ? 'COACH TEMPLATE' : 'CUSTOM'}
                          </span>
                          {w.isActive && (
                            <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle size={12} /> ACTIVE
                            </span>
                          )}
                        </div>
                        {w.description && (
                          <p className="text-gray-400 text-sm leading-relaxed mb-3 max-w-2xl break-words">
                            {w.description}
                          </p>
                        )}
                      </>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-brand-blue/70" /> {w.daysCount || 0} days
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-brand-blue/70" /> Updated {formatDate(w.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => router.push(`/dashboard/workouts/${w.id}`)}
                      className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-brand-blue/50 hover:text-brand-blue transition-all flex items-center gap-1.5"
                    >
                      <BookOpen size={14} /> Open
                    </button>

                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(w.id!)}
                          disabled={savingEdit}
                          className="px-4 py-2.5 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all hover:shadow-glow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2.5 bg-brand-gray border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:text-brand-blue transition-all flex items-center gap-1.5"
                        >
                          <X size={14} /> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(w)}
                        className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-brand-blue/50 hover:text-brand-blue transition-all flex items-center gap-1.5"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    )}

                    {isDeleting ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-950/20 border border-red-500/20 rounded-xl">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        <span className="text-xs text-red-300 font-mono">Sure?</span>
                        <button
                          onClick={() => handleDelete(w.id!)}
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
                        onClick={() => setConfirmDeleteId(w.id!)}
                        className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}

                    <button
                      onClick={() => handleSetActive(w.id!)}
                      disabled={activatingId === w.id || w.isActive}
                      className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-emerald-500/30 hover:text-emerald-400 transition-all flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {activatingId === w.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      {w.isActive ? 'Active' : 'Set Active'}
                    </button>

                    <button
                      onClick={() => handleReviewWithAI(w)}
                      disabled={reviewingId === w.id}
                      className="px-4 py-2.5 bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-purple-500/30 hover:text-purple-400 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {reviewingId === w.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {reviewingId === w.id ? 'Preparing...' : 'Review With AI'}
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