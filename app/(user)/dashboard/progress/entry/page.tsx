"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, AlertTriangle, X, ChevronLeft, Loader2,
  Dumbbell, Weight, Percent, ClipboardList
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function getEgyptToday(): string {
  const now = Date.now();
  const egyptOffset = 3 * 60 * 60 * 1000;
  const egyptNow = new Date(now + egyptOffset);
  const cutoffAdjusted = new Date(egyptNow);
  if (egyptNow.getUTCHours() < 3) {
    cutoffAdjusted.setUTCDate(cutoffAdjusted.getUTCDate() - 1);
  }
  return cutoffAdjusted.toISOString().split('T')[0];
}

function getDateNDaysAgo(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB');
  } catch {
    return dateStr;
  }
}

function AddEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);

  const todayStr = getEgyptToday();
  const minDateStr = getDateNDaysAgo(todayStr, 7);

  const [date, setDate] = useState(todayStr);
  const [trainedWhat, setTrainedWhat] = useState('');
  const [nutritionFollowedPercent, setNutritionFollowedPercent] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [notes, setNotes] = useState('');

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [dateFieldError, setDateFieldError] = useState<string | null>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const isEditing = !!searchParams.get('date');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      }
      setUser(currentUser);
    });
    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && user) {
      setLoadingEntry(true);
      const loadEntry = async () => {
        try {
          const entrySnap = await getDoc(doc(db, 'users', user.uid, 'progressEntries', dateParam));
          if (entrySnap.exists()) {
            const data = entrySnap.data();
            const entryDate = data.date || dateParam;
            setDate(entryDate);
            const [y, m, d] = entryDate.split('-');
            setDay(d || '');
            setMonth(m || '');
            setYear(y || '');
            setTrainedWhat(data.trainedWhat || '');
            setBodyWeight(data.bodyWeight != null ? String(data.bodyWeight) : '');
            setBodyFatPercent(data.bodyFatPercent != null ? String(data.bodyFatPercent) : '');
            setNutritionFollowedPercent(data.nutritionFollowedPercent != null ? String(data.nutritionFollowedPercent) : '');
            setNotes(data.notes || '');
          }
        } catch {
          setError('Could not load entry data');
        } finally {
          setLoadingEntry(false);
        }
      };
      loadEntry();
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!day || !month || !year) {
      setDateFieldError(null);
      return;
    }
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    const yNum = parseInt(year, 10);
    if (mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) {
      setDateFieldError('Please enter a valid date');
      return;
    }
    const dateObj = new Date(yNum, mNum - 1, dNum);
    if (dateObj.getFullYear() !== yNum || dateObj.getMonth() !== mNum - 1 || dateObj.getDate() !== dNum) {
      setDateFieldError('Please enter a valid date');
      return;
    }
    const yyyy = year.padStart(4, '0');
    const mm = month.padStart(2, '0');
    const dd = day.padStart(2, '0');
    const newDate = `${yyyy}-${mm}-${dd}`;
    if (newDate > todayStr || newDate < minDateStr) {
      setDateFieldError('You can only add today or a date within the past 7 days');
      return;
    }
    setDateFieldError(null);
    setDate(newDate);
  }, [day, month, year, todayStr, minDateStr]);

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(v);
    if (v.length === 2 && monthRef.current) monthRef.current.focus();
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(v);
    if (v.length === 2 && yearRef.current) yearRef.current.focus();
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(v);
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && month === '' && dayRef.current) {
      dayRef.current.focus();
    }
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && year === '' && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!date || dateFieldError) {
      setError(dateFieldError || 'Please enter a valid date');
      return;
    }

    if (date < minDateStr || date > todayStr) {
      setError('You can only add today or a date within the past 7 days');
      return;
    }

    if (!trainedWhat.trim()) {
      setError('Please describe what you trained today');
      return;
    }

    setSaving(true);
    setError(null);

    const bodyWeightValue = bodyWeight ? parseFloat(bodyWeight) : null;
    const bodyFatValue = bodyFatPercent ? parseFloat(bodyFatPercent) : null;
    const nutritionValue = nutritionFollowedPercent !== '' ? parseInt(nutritionFollowedPercent, 10) : null;

    try {
      await setDoc(doc(db, 'users', user.uid, 'progressEntries', date), {
        date,
        trainedWhat: trainedWhat.trim(),
        bodyWeight: bodyWeightValue,
        bodyFatPercent: bodyFatValue,
        nutritionFollowedPercent: nutritionValue,
        notes: notes.trim() || '',
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() }),
      });

      try {
        const streakRef = doc(db, 'users', user.uid, 'progressStreak', 'main');
        const streakSnap = await getDoc(streakRef);

        let currentStreak = 0;
        let bestStreak = 0;
        const lastEntryDate = date;

        if (streakSnap.exists()) {
          const data = streakSnap.data();
          currentStreak = data.currentStreak || 0;
          bestStreak = data.bestStreak || 0;
          const prevLastDate = data.lastEntryDate || '';

          if (prevLastDate === date) {
            // Editing same day — no change to streak
          } else {
            const prevDateObj = new Date(prevLastDate + 'T00:00:00');
            const entryDateObj = new Date(date + 'T00:00:00');
            const diffMs = entryDateObj.getTime() - prevDateObj.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays >= 1 && diffDays <= 6) {
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
          }

          bestStreak = Math.max(bestStreak, currentStreak);
        }
        // First entry ever: currentStreak stays 0, bestStreak stays 0

        await setDoc(streakRef, {
          currentStreak,
          bestStreak,
          lastEntryDate,
        });
      } catch {}

      if (bodyWeightValue) {
        try {
          const goalRef = doc(db, 'users', user.uid, 'progressGoal', 'main');
          const goalSnap = await getDoc(goalRef);
          if (goalSnap.exists()) {
            const goalData = goalSnap.data();
            if (
              goalData.status === 'active' &&
              goalData.startWeight &&
              goalData.targetWeight
            ) {
              const isLoss = goalData.targetWeight < goalData.startWeight;
              const reached = isLoss
                ? bodyWeightValue <= goalData.targetWeight
                : bodyWeightValue >= goalData.targetWeight;

              if (reached) {
                const todayObj = new Date(todayStr + 'T00:00:00');
                const endDateObj = new Date(goalData.endDate + 'T00:00:00');
                const diffDays = Math.round((endDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

                await updateDoc(goalRef, {
                  status: 'completed_unclaimed',
                  completedAt: serverTimestamp(),
                  isEarly: diffDays > 0,
                  daysEarlyOrLate: diffDays,
                });
              }
            }
          }
        } catch {}
      }

      router.push('/dashboard/progress');
    } catch {
      setError('Failed to save entry. Please try again.');
      setSaving(false);
    }
  };

  if (loadingEntry) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 flex justify-center items-center min-h-[40vh]">
        <Loader2 size={28} className="text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ChevronLeft size={16} /> Back to Progress
      </button>

      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      <h1 className="font-display font-extrabold text-3xl md:text-5xl uppercase tracking-wider mb-2">
        {isEditing ? 'Edit' : 'Log'} <span className="text-brand-blue">Entry</span>
      </h1>
      <p className="text-gray-400 text-sm mb-1">{isEditing ? 'Update your progress entry.' : 'Record your daily progress.'}</p>
      <p className="text-gray-600 text-xs mb-8">You can log entries within the last 7 days.</p>

      <form onSubmit={handleSubmit} className="bg-brand-dark border border-brand-gray rounded-3xl p-6 md:p-8 space-y-6">
        {/* Date */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
            Date <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-1 bg-brand-black border border-brand-gray rounded-xl px-4 py-3.5">
            <input
              ref={dayRef}
              type="text"
              inputMode="numeric"
              value={day}
              onChange={handleDayChange}
              placeholder="DD"
              maxLength={2}
              className="w-8 bg-transparent text-center text-white text-sm focus:outline-none placeholder:text-gray-600"
            />
            <span className="text-gray-500 shrink-0 text-sm">/</span>
            <input
              ref={monthRef}
              type="text"
              inputMode="numeric"
              value={month}
              onChange={handleMonthChange}
              onKeyDown={handleMonthKeyDown}
              placeholder="MM"
              maxLength={2}
              className="w-8 bg-transparent text-center text-white text-sm focus:outline-none placeholder:text-gray-600"
            />
            <span className="text-gray-500 shrink-0 text-sm">/</span>
            <input
              ref={yearRef}
              type="text"
              inputMode="numeric"
              value={year}
              onChange={handleYearChange}
              onKeyDown={handleYearKeyDown}
              placeholder="YYYY"
              maxLength={4}
              className="w-12 bg-transparent text-center text-white text-sm focus:outline-none placeholder:text-gray-600"
            />
          </div>
          {dateFieldError && (
            <p className="text-red-400 text-[10px] font-mono mt-1">{dateFieldError}</p>
          )}
        </div>

        {/* Trained What */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
            What did you train today? <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Dumbbell size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={trainedWhat}
              onChange={(e) => setTrainedWhat(e.target.value.slice(0, 100))}
              placeholder="e.g. Push Day (Chest, Shoulders, Triceps)"
              maxLength={100}
              className="w-full bg-brand-black border border-brand-gray rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{trainedWhat.length}/100</div>
        </div>

        {/* Nutrition slider */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <ClipboardList size={14} className="text-brand-blue/70" />
              Nutrition Followed %
            </div>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={nutritionFollowedPercent || '0'}
              onChange={(e) => setNutritionFollowedPercent(e.target.value === '0' && nutritionFollowedPercent === '' ? '' : e.target.value)}
              className="flex-1 h-2 rounded-full appearance-none bg-brand-gray cursor-pointer accent-brand-blue [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue [&::-webkit-slider-thumb]:shadow-glow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-blue [&::-moz-range-thumb]:border-0"
            />
            <span className="text-sm font-mono text-white font-bold w-10 text-center shrink-0">
              {nutritionFollowedPercent || '0'}%
            </span>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-gray-600 mt-1 px-0.5">
            <span>Not at all</span>
            <span>Perfect</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Body Weight */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Weight size={14} className="text-brand-blue/70" />
                Body Weight (kg)
              </div>
            </label>
            <input
              type="number"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              placeholder="e.g. 78.5"
              className="w-full bg-brand-black border border-brand-gray rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>

          {/* Body Fat */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Percent size={14} className="text-brand-blue/70" />
                Body Fat %
              </div>
            </label>
            <input
              type="number"
              step="0.1"
              value={bodyFatPercent}
              onChange={(e) => setBodyFatPercent(e.target.value)}
              placeholder="e.g. 18"
              className="w-full bg-brand-black border border-brand-gray rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 300))}
            rows={3}
            maxLength={300}
            placeholder="How did it go? Any observations..."
            className="w-full bg-brand-black border border-brand-gray rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-brand-blue resize-none"
          />
          <div className="text-right text-[10px] font-mono text-gray-500 mt-1">{notes.length}/300</div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-blue hover:bg-opacity-95 disabled:opacity-40 text-black font-display font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-sm transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? 'Saving...' : (isEditing ? 'Update Entry' : 'Log Entry')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3.5 bg-brand-black border border-brand-gray rounded-xl text-xs font-display font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddEntryPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 flex justify-center items-center min-h-[40vh]">
        <Loader2 size={28} className="text-brand-blue animate-spin" />
      </div>
    }>
      <AddEntryForm />
    </Suspense>
  );
}
