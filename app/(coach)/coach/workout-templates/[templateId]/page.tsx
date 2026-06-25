"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, ChevronRight, ChevronDown, Edit2, Plus, Trash2,
  Check, X, AlertTriangle, Loader2, CheckCircle, Dumbbell,
  ChevronUp, ChevronDown as ChevronDownIcon
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
  daysCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface Day {
  id: string;
  dayName: string;
  dayLabel?: string;
  order: number;
  createdAt?: Timestamp;
}

interface Exercise {
  id: string;
  title: string;
  sets: number;
  reps: string;
  notes: string;
  order: number;
  createdAt?: Timestamp;
}

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export default function TemplateBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // accordion
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // add day
  const [showAddDay, setShowAddDay] = useState(false);
  const [addDayName, setAddDayName] = useState('Monday');
  const [addDayLabel, setAddDayLabel] = useState('');
  const [addingDay, setAddingDay] = useState(false);
  const [addDayError, setAddDayError] = useState<string | null>(null);

  // edit day
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editDayName, setEditDayName] = useState('');
  const [editDayLabel, setEditDayLabel] = useState('');
  const [savingDay, setSavingDay] = useState(false);

  // delete day
  const [confirmDeleteDayId, setConfirmDeleteDayId] = useState<string | null>(null);
  const [deletingDay, setDeletingDay] = useState(false);

  // exercises keyed by dayId
  const [exercisesMap, setExercisesMap] = useState<Record<string, Exercise[]>>({});
  const [loadingExercises, setLoadingExercises] = useState<Record<string, boolean>>({});

  // exercise form
  const [exerciseFormDayId, setExerciseFormDayId] = useState<string | null>(null);
  const [exerciseTitle, setExerciseTitle] = useState('');
  const [exerciseSets, setExerciseSets] = useState<number>(3);
  const [exerciseReps, setExerciseReps] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [savingExercise, setSavingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);

  // delete exercise
  const [confirmDeleteExerciseId, setConfirmDeleteExerciseId] = useState<string | null>(null);
  const [deletingExercise, setDeletingExercise] = useState(false);

  // expanded notes
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  const ref = (path: string) => doc(db, 'workoutTemplates', templateId, ...path.split('/').filter(Boolean));

  // listen to template doc
  useEffect(() => {
    if (!templateId) return;

    const unsub = onSnapshot(
      doc(db, 'workoutTemplates', templateId),
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
        setError('Failed to load template');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [templateId]);

  // listen to days subcollection
  useEffect(() => {
    if (!templateId) return;

    const weekdayOrder: Record<string, number> = {
      Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7
    };

    const q = query(collection(db, 'workoutTemplates', templateId, 'days'));

    const unsub = onSnapshot(q,
      (snapshot) => {
        const list: Day[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Day));

        const orderValues = list.map((d) => d.order ?? 0);
        const hasDuplicates = orderValues.some((o, i) => orderValues.indexOf(o) !== i);

        if (hasDuplicates) {
          list.sort((a, b) => (weekdayOrder[a.dayName] ?? 8) - (weekdayOrder[b.dayName] ?? 8));
          list.forEach((d, i) => { d.order = i + 1; });
          const repairBatch = writeBatch(db);
          list.forEach((d) => {
            repairBatch.update(doc(db, 'workoutTemplates', templateId, 'days', d.id), { order: d.order });
          });
          repairBatch.commit().catch(() => {});
        } else {
          list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }

        setDays(list);
      },
      () => {
        setError('Failed to load days');
      }
    );
    return () => unsub();
  }, [templateId]);

  // lazy load exercises when a day is expanded
  useEffect(() => {
    if (!templateId || !expandedDay) return;

    const q = query(collection(db, 'workoutTemplates', templateId, 'days', expandedDay, 'exercises'));

    setLoadingExercises((prev) => ({ ...prev, [expandedDay]: true }));

    const unsub = onSnapshot(q,
      (snapshot) => {
        const list: Exercise[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Exercise));
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setExercisesMap((prev) => ({ ...prev, [expandedDay]: list }));
        setLoadingExercises((prev) => ({ ...prev, [expandedDay]: false }));
      },
      () => {
        setError('Failed to load exercises');
        setLoadingExercises((prev) => ({ ...prev, [expandedDay]: false }));
      }
    );

    return () => unsub();
  }, [templateId, expandedDay]);

  const handleSaveTemplate = async (field: string, value: any) => {
    setSavingTemplate(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'workoutTemplates', templateId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddDayError(null);
    setAddingDay(true);
    try {
      await addDoc(
        collection(db, 'workoutTemplates', templateId, 'days'),
        {
          dayName: addDayName.trim(),
          dayLabel: addDayLabel.trim() || '',
          order: days.length > 0 ? Math.max(...days.map((d) => d.order ?? 0)) + 1 : 1,
          createdAt: serverTimestamp(),
        }
      );
      await updateDoc(doc(db, 'workoutTemplates', templateId), {
        daysCount: days.length + 1,
        updatedAt: serverTimestamp(),
      });
      setShowAddDay(false);
      setAddDayName('Monday');
      setAddDayLabel('');
    } catch {
      setAddDayError('Failed to add day');
    } finally {
      setAddingDay(false);
    }
  };

  const handleStartEditDay = (day: Day) => {
    setEditingDayId(day.id);
    setEditDayName(day.dayName || '');
    setEditDayLabel(day.dayLabel || '');
  };

  const handleSaveEditDay = async (dayId: string) => {
    setSavingDay(true);
    try {
      await updateDoc(
        doc(db, 'workoutTemplates', templateId, 'days', dayId),
        {
          dayName: editDayName.trim(),
          dayLabel: editDayLabel.trim() || '',
        }
      );
      setEditingDayId(null);
    } catch {
      setError('Failed to update day');
    } finally {
      setSavingDay(false);
    }
  };

  const handleCancelEditDay = () => {
    setEditingDayId(null);
  };

  const handleDeleteDay = async (dayId: string) => {
    setDeletingDay(true);
    try {
      const batch = writeBatch(db);
      const exercisesSnap = await getDocs(
        collection(db, 'workoutTemplates', templateId, 'days', dayId, 'exercises')
      );
      exercisesSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'workoutTemplates', templateId, 'days', dayId));
      batch.update(doc(db, 'workoutTemplates', templateId), {
        daysCount: Math.max(0, days.length - 1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setConfirmDeleteDayId(null);
      if (expandedDay === dayId) setExpandedDay(null);
    } catch {
      setError('Failed to delete day');
    } finally {
      setDeletingDay(false);
    }
  };

  const handleReorderDay = async (dayId: string, direction: 'up' | 'down') => {
    const idx = days.findIndex((d) => d.id === dayId);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= days.length) return;

    const current = days[idx];
    const swap = days[swapIdx];

    setError(null);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'workoutTemplates', templateId, 'days', current.id), { order: swap.order });
      batch.update(doc(db, 'workoutTemplates', templateId, 'days', swap.id), { order: current.order });
      await batch.commit();
    } catch {
      setError('Failed to reorder day');
    }
  };

  const dayDisplay = (day: Day) => {
    const n = day.dayName || '';
    const l = day.dayLabel || '';
    return l ? `${n} — ${l}` : n;
  };

  // --- Exercise handlers ---

  const openExerciseForm = (dayId: string, exercise?: Exercise) => {
    setExerciseFormDayId(dayId);
    setExerciseError(null);
    setSetsError(null);
    if (exercise) {
      setExerciseTitle(exercise.title || '');
      setExerciseSets(exercise.sets || 3);
      setExerciseReps(exercise.reps || '');
      setExerciseNotes(exercise.notes || '');
      setEditingExerciseId(exercise.id);
    } else {
      setExerciseTitle('');
      setExerciseSets(3);
      setExerciseReps('');
      setExerciseNotes('');
      setEditingExerciseId(null);
    }
  };

  const closeExerciseForm = () => {
    setExerciseFormDayId(null);
    setExerciseTitle('');
    setExerciseSets(3);
    setExerciseReps('');
    setExerciseNotes('');
    setEditingExerciseId(null);
    setExerciseError(null);
    setSetsError(null);
  };

  const handleExerciseSetsChange = (value: string) => {
    const num = Number(value);
    if (value === '' || value === '0') {
      setExerciseSets(0);
      setSetsError(null);
      return;
    }
    if (isNaN(num) || !Number.isInteger(num)) {
      setSetsError('Sets must be a whole number');
      return;
    }
    if (num < 1 || num > 99) {
      setSetsError('Sets must be between 1 and 99');
      return;
    }
    setSetsError(null);
    setExerciseSets(num);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseFormDayId) return;
    setExerciseError(null);

    if (!exerciseTitle.trim()) {
      setExerciseError('Title is required');
      return;
    }
    const setsVal = Number(exerciseSets) || 0;
    if (setsVal < 1 || setsVal > 99 || !Number.isInteger(setsVal)) {
      setExerciseError('Sets must be a valid number between 1 and 99');
      return;
    }

    setSavingExercise(true);
    try {
      const baseData = {
        title: exerciseTitle.trim(),
        sets: setsVal,
        reps: (exerciseReps || '').trim(),
        notes: (exerciseNotes || '').trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingExerciseId) {
        await updateDoc(
          doc(db, 'workoutTemplates', templateId, 'days', exerciseFormDayId, 'exercises', editingExerciseId),
          baseData
        );
      } else {
        const exercises = exercisesMap[exerciseFormDayId] || [];
        await addDoc(
          collection(db, 'workoutTemplates', templateId, 'days', exerciseFormDayId, 'exercises'),
          {
            ...baseData,
            order: exercises.length + 1,
            createdAt: serverTimestamp(),
          }
        );
      }
      closeExerciseForm();
    } catch {
      setExerciseError('Failed to save exercise');
    } finally {
      setSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    setDeletingExercise(true);
    try {
      await deleteDoc(
        doc(db, 'workoutTemplates', templateId, 'days', dayId, 'exercises', exerciseId)
      );
      setConfirmDeleteExerciseId(null);
    } catch {
      setError('Failed to delete exercise');
    } finally {
      setDeletingExercise(false);
    }
  };

  const handleReorderExercise = async (dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    const exercises = exercisesMap[dayId] || [];
    const idx = exercises.findIndex((e) => e.id === exerciseId);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= exercises.length) return;

    const current = exercises[idx];
    const swap = exercises[swapIdx];

    try {
      const batch = writeBatch(db);
      batch.update(
        doc(db, 'workoutTemplates', templateId, 'days', dayId, 'exercises', current.id),
        { order: swap.order }
      );
      batch.update(
        doc(db, 'workoutTemplates', templateId, 'days', dayId, 'exercises', swap.id),
        { order: current.order }
      );
      await batch.commit();
    } catch {
      setError('Failed to reorder exercise');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-brand-gray rounded-lg" />
          <div className="h-12 w-64 bg-brand-gray rounded-xl" />
          <div className="h-4 w-96 bg-brand-gray rounded-lg" />
          <div className="space-y-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-brand-gray rounded-2xl" />
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
            onClick={() => router.push('/coach/workout-templates')}
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
        onClick={() => router.push('/coach/workout-templates')}
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
              {days.length} day{days.length !== 1 ? 's' : ''}
              {savingTemplate && (
                <span className="ml-3 text-brand-blue">
                  <Loader2 size={12} className="inline animate-spin mr-1" /> Saving...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Days Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-wider">
          Training <span className="text-brand-blue">Days</span>
        </h2>
        {!showAddDay && (
          <button
            onClick={() => setShowAddDay(true)}
            className="px-5 py-2.5 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 shadow-glow-sm transition-all"
          >
            <Plus size={16} /> Add Day
          </button>
        )}
      </div>

      {/* Add Day Inline Form */}
      {showAddDay && (
        <form onSubmit={handleAddDay} className="bg-brand-dark border border-brand-gray rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Day Name *</label>
              <select
                value={addDayName}
                onChange={(e) => setAddDayName(e.target.value)}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
                required
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Day Label *</label>
              <input
                type="text"
                value={addDayLabel}
                onChange={(e) => setAddDayLabel(e.target.value.slice(0, 40))}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                placeholder="e.g. Push Day"
                maxLength={40}
                required
              />
              <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{addDayLabel.length}/40</div>
            </div>
          </div>
          {addDayError && (
            <div className="mb-4 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle size={14} /> {addDayError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowAddDay(false); setAddDayName('Monday'); setAddDayLabel(''); setAddDayError(null); }}
              className="px-5 py-2.5 bg-brand-gray border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingDay || !addDayName.trim() || !addDayLabel.trim()}
              className="px-5 py-2.5 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {addingDay ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {addingDay ? 'Adding...' : 'Add Day'}
            </button>
          </div>
        </form>
      )}

      {/* Days List */}
      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-brand-dark border border-brand-gray rounded-3xl">
          <Dumbbell size={40} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest mb-2">No training days yet</p>
          <p className="text-gray-600 text-sm">Add your first training day to start building this template.</p>
        </div>
      ) : (
        <div className="space-y-3">
           {days.map((day, dayIdx) => {
            const isExpanded = expandedDay === day.id;
            const isEditing = editingDayId === day.id;
            const isConfirmDelete = confirmDeleteDayId === day.id;
            const dayExercises = exercisesMap[day.id] || [];
            const isLoadingExercises = loadingExercises[day.id];
            const isFormOpen = exerciseFormDayId === day.id;
            const isFirstDay = dayIdx === 0;
            const isLastDay = dayIdx === days.length - 1;

            return (
              <div
                key={day.id}
                className="bg-brand-dark border border-brand-gray rounded-2xl overflow-hidden transition-all duration-200 group"
              >
                {/* Accordion Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const next = isExpanded ? null : day.id;
                    setExpandedDay(next);
                    if (next !== day.id) closeExerciseForm();
                  }}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const next = isExpanded ? null : day.id;
                      setExpandedDay(next);
                      if (next !== day.id) closeExerciseForm();
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 md:p-5 text-left hover:bg-brand-black/20 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-brand-blue shrink-0 transition-transform" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-500 shrink-0 transition-transform" />
                  )}

                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={editDayName}
                        onChange={(e) => setEditDayName(e.target.value)}
                        className="flex-1 bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-brand-blue appearance-none"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                      <input
                        type="text"
                        value={editDayLabel}
                        onChange={(e) => setEditDayLabel(e.target.value.slice(0, 40))}
                        className="flex-1 bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-brand-blue"
                        placeholder="Day label"
                        maxLength={40}
                      />
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveEditDay(day.id); }}
                          disabled={savingDay}
                          className="p-2 bg-brand-blue text-black rounded-lg transition-all disabled:opacity-50"
                        >
                          {savingDay ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelEditDay(); }}
                          className="p-2 bg-brand-gray text-white rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-mono text-gray-500 shrink-0 w-6">#{day.order}</span>
                      <span className="flex-1 text-sm md:text-base font-bold text-white truncate">
                        {dayDisplay(day)}
                      </span>
                    </>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReorderDay(day.id, 'up'); }}
                        disabled={isFirstDay}
                        className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors disabled:opacity-20"
                        title="Move day up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReorderDay(day.id, 'down'); }}
                        disabled={isLastDay}
                        className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors disabled:opacity-20"
                        title="Move day down"
                      >
                        <ChevronDownIcon size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartEditDay(day); }}
                        className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors"
                        title="Edit day"
                      >
                        <Edit2 size={14} />
                      </button>
                      {isConfirmDelete ? (
                        <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-2 py-1">
                          <AlertTriangle size={12} className="text-red-400 shrink-0" />
                          <span className="text-[10px] text-red-300 font-mono">Sure?</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDay(day.id); }}
                            disabled={deletingDay}
                            className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold uppercase disabled:opacity-50"
                          >
                            {deletingDay ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteDayId(null); }}
                            className="px-1.5 py-0.5 bg-brand-gray text-gray-400 rounded text-[10px] font-bold uppercase"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteDayId(day.id); }}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete day"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Accordion Content — Exercises */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-brand-gray px-4 md:px-5 py-5 animate-fade-in">
                    {isLoadingExercises ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={24} className="text-brand-blue animate-spin" />
                      </div>
                    ) : dayExercises.length === 0 && !isFormOpen ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Dumbbell size={28} className="text-brand-blue/20 mb-3" />
                        <p className="text-gray-500 text-sm font-mono uppercase tracking-widest mb-3">
                          No exercises yet
                        </p>
                        <button
                          onClick={() => openExerciseForm(day.id)}
                          className="px-4 py-2 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 shadow-glow-sm transition-all"
                        >
                          <Plus size={14} /> Add Exercise
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayExercises.map((ex, idx) => {
                          const isExpandedNotes = expandedNotes === ex.id;
                          const isConfirmDel = confirmDeleteExerciseId === ex.id;
                          const hasPrev = idx > 0;
                          const hasNext = idx < dayExercises.length - 1;

                          return (
                            <div key={ex.id} className="bg-brand-black border border-brand-gray rounded-xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono text-gray-500">#{ex.order}</span>
                                    <h4 className="text-sm font-bold text-white break-words">{ex.title || ''}</h4>
                                  </div>
                                  <div className="mt-1 text-sm text-brand-blue font-mono">
                                    {(Number(ex.sets) || 0)} x {(ex.reps || '') || '—'}
                                  </div>
                                  {ex.notes && (
                                    <button
                                      onClick={() => setExpandedNotes(isExpandedNotes ? null : ex.id)}
                                      className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors font-mono"
                                    >
                                      {isExpandedNotes ? (
                                        <ChevronDownIcon size={12} />
                                      ) : (
                                        <ChevronRight size={12} />
                                      )}
                                      {isExpandedNotes ? 'Hide notes' : 'Show notes'}
                                    </button>
                                  )}
                                  {isExpandedNotes && ex.notes && (
                                    <p className="mt-2 text-xs text-gray-400 leading-relaxed break-words bg-brand-dark rounded-lg px-3 py-2 border border-brand-gray-light">
                                      {ex.notes}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Reorder arrows */}
                                  <div className="flex flex-col gap-0.5 mr-1">
                                    <button
                                      onClick={() => handleReorderExercise(day.id, ex.id, 'up')}
                                      disabled={!hasPrev}
                                      className="p-0.5 text-gray-600 hover:text-brand-blue transition-colors disabled:opacity-20"
                                      title="Move up"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleReorderExercise(day.id, ex.id, 'down')}
                                      disabled={!hasNext}
                                      className="p-0.5 text-gray-600 hover:text-brand-blue transition-colors disabled:opacity-20"
                                      title="Move down"
                                    >
                                      <ChevronDownIcon size={14} />
                                    </button>
                                  </div>

                                  {isFormOpen && editingExerciseId === ex.id ? null : (
                                    <>
                                      <button
                                        onClick={() => openExerciseForm(day.id, ex)}
                                        className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors"
                                        title="Edit exercise"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      {isConfirmDel ? (
                                        <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 rounded-lg px-1.5 py-0.5">
                                          <AlertTriangle size={10} className="text-red-400 shrink-0" />
                                          <button
                                            onClick={() => handleDeleteExercise(day.id, ex.id)}
                                            disabled={deletingExercise}
                                            className="px-1 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-bold uppercase disabled:opacity-50"
                                          >
                                            {deletingExercise ? <Loader2 size={9} className="animate-spin" /> : 'Yes'}
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteExerciseId(null)}
                                            className="px-1 py-0.5 bg-brand-gray text-gray-400 rounded text-[9px] font-bold uppercase"
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteExerciseId(ex.id)}
                                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                          title="Delete exercise"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Exercise button or form */}
                        {isFormOpen ? (
                          <form onSubmit={handleSaveExercise} className="bg-brand-dark border border-brand-gray rounded-xl p-5 mt-3 animate-fade-in">
                            <h5 className="text-xs font-mono uppercase tracking-widest text-brand-blue mb-4">
                              {editingExerciseId ? 'Edit Exercise' : 'Add Exercise'}
                            </h5>
                            <div className="flex flex-col gap-4">
                              <div>
                                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Title *</label>
                                <input
                                  type="text"
                                  value={exerciseTitle}
                                  onChange={(e) => setExerciseTitle(e.target.value.slice(0, 80))}
                                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                                  placeholder="e.g. Barbell Bench Press"
                                  maxLength={80}
                                  required
                                />
                                <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{exerciseTitle.length}/80</div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Sets</label>
                                  <input
                                    type="number"
                                    value={exerciseSets}
                                    onChange={(e) => handleExerciseSetsChange(e.target.value)}
                                    className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                                    min={1}
                                    max={99}
                                  />
                                  {setsError && (
                                    <div className="text-red-400 text-[10px] font-mono mt-1">{setsError}</div>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Reps</label>
                                  <input
                                    type="text"
                                    value={exerciseReps}
                                    onChange={(e) => setExerciseReps(e.target.value.slice(0, 20))}
                                    className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                                    placeholder="e.g. 8-12, To failure"
                                    maxLength={20}
                                  />
                                  <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{exerciseReps.length}/20</div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Notes <span className="text-gray-500">(optional)</span></label>
                                <textarea
                                  value={exerciseNotes}
                                  onChange={(e) => setExerciseNotes(e.target.value.slice(0, 300))}
                                  rows={2}
                                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
                                  placeholder="Form tips, rest periods, etc."
                                  maxLength={300}
                                />
                                <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{exerciseNotes.length}/300</div>
                              </div>

                              {exerciseError && (
                                <div className="text-red-400 text-xs font-mono flex items-center gap-2">
                                  <AlertTriangle size={14} /> {exerciseError}
                                </div>
                              )}

                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={closeExerciseForm}
                                  className="flex-1 py-2.5 bg-brand-gray border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={savingExercise || !exerciseTitle.trim()}
                                  className="flex-1 py-2.5 bg-brand-blue text-black rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  {savingExercise ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                  {savingExercise ? 'Saving...' : editingExerciseId ? 'Save Changes' : 'Add Exercise'}
                                </button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => openExerciseForm(day.id)}
                            className="w-full mt-3 py-2.5 border border-dashed border-brand-gray-light rounded-xl text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-brand-blue hover:border-brand-blue/50 transition-all"
                          >
                            <Plus size={14} className="inline mr-1" /> Add Exercise
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
