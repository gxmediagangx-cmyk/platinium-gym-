"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Target, Calendar, Flame, Award,
  Sparkles, Plus, AlertTriangle, X, Loader2,
  ChevronLeft, ChevronRight, Activity, CheckCircle,
  BookOpen, Trash2, MoreVertical, Edit3, Gift, Trophy
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, doc, onSnapshot, getDocs, getDoc, updateDoc, deleteDoc, setDoc,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

interface ProgressGoal {
  id?: string;
  label?: string;
  targetWeight: number;
  startWeight?: number;
  targetBodyFat?: number;
  startBodyFat?: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed_unclaimed' | 'completed_claimed';
  completedAt?: Timestamp;
  isEarly?: boolean;
  daysEarlyOrLate?: number;
  createdAt?: Timestamp;
}

interface ProgressEntry {
  id?: string;
  date: string;
  trainedWhat: string;
  bodyWeight?: number;
  bodyFatPercent?: number;
  nutritionFollowedPercent?: number;
  notes?: string;
  createdAt?: Timestamp;
}

interface ProgressStreak {
  currentStreak: number;
  bestStreak: number;
  lastEntryDate: string;
}

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

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function toDateStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val?.toDate) return val.toDate().toISOString().split('T')[0];
  if (val?.seconds) return new Date(val.seconds * 1000).toISOString().split('T')[0];
  return '';
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const timeRangeOptions: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

function deduplicateEntries(arr: ProgressEntry[]): ProgressEntry[] {
  const map = new Map<string, ProgressEntry>();
  for (const entry of arr) {
    map.set(entry.date, entry);
  }
  return Array.from(map.values());
}

type Tab = 'overview' | 'entries';

export default function ProgressPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<ProgressGoal | null>(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [streak, setStreak] = useState<ProgressStreak | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [chartView, setChartView] = useState<'weight' | 'progress' | 'both'>('both');
  const [reviewing, setReviewing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date(getEgyptToday() + 'T00:00:00');
    return today.getMonth();
  });
  const [calendarYear, setCalendarYear] = useState(() => {
    const today = new Date(getEgyptToday() + 'T00:00:00');
    return today.getFullYear();
  });
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [openMenuDate, setOpenMenuDate] = useState<string | null>(null);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const completionCheckedRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStage, setCelebrationStage] = useState<'gift' | 'trophy'>('gift');
  const [closingGift, setClosingGift] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; x: number; y: number; rotation: number; shape: 'circle' | 'rect'; color: string; delay: number }[]>([]);
  const [modalClosing, setModalClosing] = useState(false);
  const celebrationShownRef = useRef(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setGoalLoading(false);
        setEntriesLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, 'users', user.uid, 'progressGoal', 'main'),
      (snap) => {
        if (snap.exists()) {
          setGoal({ id: snap.id, ...snap.data() } as ProgressGoal);
        } else {
          setGoal(null);
        }
        setGoalLoading(false);
      },
      () => {
        setGoal(null);
        setGoalLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubEntries = onSnapshot(
      collection(db, 'users', user.uid, 'progressEntries'),
      (snap) => {
        const rawList: ProgressEntry[] = [];
        snap.forEach((d) => rawList.push({ id: d.id, ...d.data() } as ProgressEntry));
        rawList.sort((a, b) => a.date.localeCompare(b.date));
        setEntries(deduplicateEntries(rawList));
        setEntriesLoading(false);
      },
      () => {
        setEntries([]);
        setEntriesLoading(false);
      }
    );

    const fetchStreak = async () => {
      try {
        const streakSnap = await getDoc(doc(db, 'users', user.uid, 'progressStreak', 'main'));
        if (streakSnap.exists()) {
          setStreak(streakSnap.data() as ProgressStreak);
        }
      } catch {}
    };
    fetchStreak();

    return () => unsubEntries();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuDate(null);
      setConfirmDeleteDate(null);
    };
    if (openMenuDate) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuDate]);

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const currentWeight = latestEntry?.bodyWeight || 0;
  const startWeight = goal?.startWeight || 0;
  const targetWeight = goal?.targetWeight || 0;
  const isLoss = targetWeight < startWeight;

  let progressPercent = 0;
  if (startWeight && targetWeight && startWeight !== targetWeight && currentWeight) {
    const raw = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100;
    progressPercent = Math.max(0, Math.min(100, raw));
  }

  const totalChange = currentWeight ? currentWeight - startWeight : 0;
  const totalChangeAbs = Math.abs(totalChange);
  const isLossDirection = totalChange < 0;

  const todayStr = getEgyptToday();

  const todayDate = new Date(todayStr + 'T00:00:00');
  const startOfWeek = new Date(todayDate);
  const dayOfWeek = todayDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(todayDate.getDate() + mondayOffset);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  const entriesThisWeek = entries.filter((e) => e.date >= startOfWeekStr).length;

  const entryDates = new Set(entries.map((e) => e.date));

  const graphData = entries
    .filter((e) => e.bodyWeight)
    .map((e) => {
      const bw = e.bodyWeight || 0;
      let score = 0;
      if (startWeight && targetWeight && startWeight !== targetWeight) {
        const raw = ((startWeight - bw) / (startWeight - targetWeight)) * 100;
        score = Math.max(0, Math.min(100, raw));
      }
      return {
        date: formatDateShort(e.date),
        rawDate: e.date,
        weight: bw,
        progressScore: Math.round(score),
      };
    })
    .filter((d) => {
      if (timeRange === 'ALL') return true;
      const rangeMap: Record<TimeRange, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'ALL': 0 };
      const days = rangeMap[timeRange] || 30;
      const dDate = new Date(d.rawDate + 'T00:00:00');
      const cutoff = new Date(todayDate);
      cutoff.setDate(cutoff.getDate() - days);
      return dDate >= cutoff;
    });

  const goalLabel = goal?.label || (isLoss ? 'Weight Loss Goal' : targetWeight > startWeight ? 'Weight Gain Goal' : 'Body Transformation Goal');

  const handleReviewWithAI = async () => {
    if (!user || !goal) return;
    setReviewing(true);
    setError(null);

    try {
      let summary = '';
      summary += `Progress Goal: ${goalLabel}\n`;
      summary += `Status: ${goal.status}\n`;
      if (goal.startDate) summary += `Start: ${goal.startDate}\n`;
      if (goal.endDate) summary += `Target End: ${goal.endDate}\n`;
      if (goal.startWeight) summary += `Start Weight: ${goal.startWeight} kg\n`;
      if (goal.targetWeight) summary += `Target Weight: ${goal.targetWeight} kg\n`;
      if (currentWeight) summary += `Current Weight: ${currentWeight} kg\n`;
      if (goal.startBodyFat) summary += `Start Body Fat: ${goal.startBodyFat}%\n`;
      if (goal.targetBodyFat) summary += `Target Body Fat: ${goal.targetBodyFat}%\n`;
      summary += `Progress: ${Math.round(progressPercent)}% toward goal\n`;
      summary += `Entries: ${entries.length} total\n\n`;

      if (entries.length > 0) {
        summary += 'Entry Log:\n';
        for (const e of entries) {
          summary += `\n${e.date}`;
          if (e.trainedWhat) summary += ` \u2014 ${e.trainedWhat}`;
          if (e.bodyWeight) summary += ` | Weight: ${e.bodyWeight} kg`;
          if (e.bodyFatPercent) summary += ` | BF: ${e.bodyFatPercent}%`;
          if (e.nutritionFollowedPercent !== undefined) summary += ` | Nutrition: ${e.nutritionFollowedPercent}%`;
          if (e.notes) summary += ` | Notes: ${e.notes}`;
        }
      }

      localStorage.setItem(
        'ai_progress_review',
        JSON.stringify({
          summary,
          goal: {
            label: goalLabel,
            targetWeight: goal.targetWeight,
            startWeight: goal.startWeight,
          },
          autoReview: true,
        })
      );

      router.push('/dashboard/ai-assistant');
    } catch {
      setError('Failed to prepare progress review');
      setReviewing(false);
    }
  };

  useEffect(() => {
    if (!goal || !entries.length || completionCheckedRef.current) return;
    if (goal.status === 'completed_unclaimed' || goal.status === 'completed_claimed') return;
    if (goal.status !== 'active' || !latestEntry?.bodyWeight || !goal.startWeight || !goal.targetWeight) return;
    if (!goal.startWeight || !goal.targetWeight || Math.abs(goal.startWeight - goal.targetWeight) < 0.5) return;
    const reached = isLoss
      ? latestEntry.bodyWeight < goal.targetWeight + 0.05
      : latestEntry.bodyWeight > goal.targetWeight - 0.05;

    if (!reached) return;

    completionCheckedRef.current = true;

    const endDateTime = new Date(toDateStr(goal.endDate) + 'T00:00:00');
    const todayDateTime = new Date(todayStr + 'T00:00:00');
    const diffTime = endDateTime.getTime() - todayDateTime.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const updateCompletion = async () => {
      try {
        await updateDoc(doc(db, 'users', user!.uid, 'progressGoal', 'main'), {
          status: 'completed_unclaimed',
          completedAt: serverTimestamp(),
          isEarly: diffDays > 0,
          daysEarlyOrLate: diffDays,
        });
      } catch {}
    };

    updateCompletion();
  }, [goal, entries, latestEntry, isLoss, user, todayStr]);

  useEffect(() => {
    if (goal?.status === 'completed_unclaimed' && !celebrationShownRef.current) {
      const goalKey = `pg_celebration_${goal.completedAt?.seconds || toDateStr(goal.startDate)}`;
      const alreadyShown = typeof window !== 'undefined' && localStorage.getItem(goalKey) === 'true';
      if (!alreadyShown) {
        celebrationShownRef.current = true;
        if (typeof window !== 'undefined') localStorage.setItem(goalKey, 'true');
        setShowCelebration(true);
        setCelebrationStage('gift');
      }
    }
  }, [goal]);

  const triggerConfetti = () => {
    const pieces: typeof confettiPieces = [];
    const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 35;
    const colors = ['#FFD700', '#D4AF37', '#FFC107', '#FFF8DC', '#F5F5DC', '#FFE4B5', '#DAA520'];
    for (let i = 0; i < count; i++) {
      pieces.push({
        id: i,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400 - 80,
        rotation: Math.random() * 720 - 360,
        shape: Math.random() > 0.5 ? 'circle' as const : 'rect' as const,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 80,
      });
    }
    setConfettiPieces(pieces);
    setTimeout(() => setConfettiPieces([]), 1200);
  };

  const handleGiftOpen = () => {
    setClosingGift(true);
    setTimeout(() => {
      triggerConfetti();
      setCelebrationStage('trophy');
      setClosingGift(false);
    }, 300);
  };

  const handleClaimReward = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const goalRef = doc(db, 'users', user.uid, 'progressGoal', 'main');
      const goalSnap = await getDoc(goalRef);
      if (goalSnap.exists()) {
        const goalData = goalSnap.data();
        await setDoc(doc(collection(db, 'users', user.uid, 'progressGoalHistory')), {
          ...goalData,
          status: 'completed_claimed',
          completedAt: serverTimestamp(),
          claimedAt: serverTimestamp(),
        });
        await deleteDoc(goalRef);
        const goalKey = `pg_celebration_${goal?.completedAt?.seconds || toDateStr(goal?.startDate || '')}`;
        if (typeof window !== 'undefined') localStorage.removeItem(goalKey);
      }
      setModalClosing(true);
      setTimeout(() => {
        setShowCelebration(false);
        setCelebrationStage('gift');
        setConfettiPieces([]);
        setModalClosing(false);
        setGoal(null);
      }, 300);
    } catch {
      setError('Failed to claim reward. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleDeleteEntry = async (entryDate: string) => {
    if (!user) return;
    setDeletingDate(entryDate);
    setError(null);

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'progressEntries', entryDate));

      const remaining = deduplicateEntries(entries.filter((e) => e.date !== entryDate));
      setEntries(remaining);

      if (remaining.length === 0) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'progressStreak', 'main'), {
            currentStreak: 0,
            bestStreak: 0,
            lastEntryDate: '',
          });
          setStreak({ currentStreak: 0, bestStreak: 0, lastEntryDate: '' });
        } catch {}
      } else {
        const sorted = [...remaining].sort((a, b) => b.date.localeCompare(a.date));
        let newStreak = 1;
        for (let i = 1; i < sorted.length; i++) {
          const prevDate = new Date(sorted[i - 1].date + 'T00:00:00');
          const currDate = new Date(sorted[i].date + 'T00:00:00');
          const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak += 1;
          } else {
            break;
          }
        }
        try {
          const streakRef = doc(db, 'users', user.uid, 'progressStreak', 'main');
          const streakSnap = await getDoc(streakRef);
          const prevBest = streakSnap.exists() ? (streakSnap.data().bestStreak || 0) : 0;
          await setDoc(streakRef, {
            currentStreak: newStreak,
            bestStreak: prevBest,
            lastEntryDate: sorted[0].date,
          });
          setStreak({ currentStreak: newStreak, bestStreak: prevBest, lastEntryDate: sorted[0].date });
        } catch {}
      }

      setConfirmDeleteDate(null);
      setOpenMenuDate(null);
    } catch {
      setError('Failed to delete entry');
    } finally {
      setDeletingDate(null);
    }
  };

  const calendarMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
  const startPad = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const entriesDesc = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const loading = goalLoading || entriesLoading;

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
        <div className="h-10 w-56 bg-brand-gray rounded-xl animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-brand-dark border border-brand-gray rounded-3xl p-6 animate-pulse">
            <div className="h-6 w-48 bg-brand-gray rounded-lg mb-6" />
            <div className="h-4 w-3/4 bg-brand-gray rounded-lg mb-2" />
            <div className="h-4 w-1/2 bg-brand-gray rounded-lg mb-6" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-brand-gray rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 animate-pulse">
            <div className="h-32 w-32 bg-brand-gray rounded-full mx-auto mb-4" />
            <div className="h-4 w-20 bg-brand-gray rounded-lg mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!goal || goal.status === 'completed_claimed') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
        {error && (
          <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-32 bg-brand-dark border border-brand-gray rounded-3xl">
          <Target size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No active goal</p>
          <p className="text-gray-600 text-sm max-w-md text-center mb-8">
            Set your first target to start tracking your transformation.
          </p>
          <button
            onClick={() => router.push('/dashboard/progress/create')}
            className="bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-sm transition-all"
          >
            <Target size={18} /> New Target
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      <style>{`
        @keyframes pulse-gift {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-gift {
          animation: pulse-gift 2s ease-in-out infinite;
        }
        @keyframes trophy-bounce {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-trophy-bounce {
          animation: trophy-bounce 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes confetti-fly {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; }
        }
      `}</style>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            My <span className="text-brand-blue">Progress</span>
          </h1>
          <p className="text-gray-400 text-sm">Track your transformation journey.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/progress/entry')}
            className="bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-sm transition-all shrink-0"
          >
            <Plus size={18} /> Add Entry
          </button>
          <button
            onClick={() => router.push('/dashboard/progress/create')}
            className="bg-brand-black border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider px-5 py-3.5 text-white hover:border-brand-blue/50 hover:text-brand-blue transition-all flex items-center gap-2 shrink-0"
          >
            <Target size={16} /> New Target
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-brand-dark border border-brand-gray rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
            activeTab === 'overview'
              ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <Activity size={14} className="inline mr-1.5" /> Overview
        </button>
        <button
          onClick={() => setActiveTab('entries')}
          className={`px-5 py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
            activeTab === 'entries'
              ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <BookOpen size={14} className="inline mr-1.5" /> Entries
          {entries.length > 0 && (
            <span className="ml-2 text-[9px] font-mono bg-brand-gray text-gray-400 px-1.5 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Goal Card + Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goal Card */}
            <div className={`bg-brand-dark border rounded-3xl p-6 ${
              goal.status === 'completed_unclaimed'
                ? 'border-emerald-500/40 shadow-glow-sm'
                : 'border-brand-gray'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Target size={22} className="text-brand-blue" />
                  <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white">
                    {goalLabel}
                  </h2>
                </div>
                {goal.status === 'completed_unclaimed' && (
                  <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle size={12} /> COMPLETED
                  </span>
                )}
                {goal.status === 'active' && (
                  <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Start Date</p>
                  <p className="text-white font-medium text-sm">{formatDateShort(toDateStr(goal.startDate)) || ''}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Target Date</p>
                  <p className="text-white font-medium text-sm">{formatDateShort(toDateStr(goal.endDate)) || ''}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Starting Weight</p>
                  <p className="text-white font-medium text-sm">{startWeight ? `${startWeight} kg` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Target Weight</p>
                  <p className="text-white font-medium text-sm">{targetWeight ? `${targetWeight} kg` : 'Not set'}</p>
                </div>
              </div>

              {(goal.startBodyFat || goal.targetBodyFat) && (
                <div className="grid grid-cols-2 gap-4 mb-2">
                  {goal.startBodyFat ? (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Start Body Fat</p>
                      <p className="text-white font-medium text-sm">{goal.startBodyFat}%</p>
                    </div>
                  ) : null}
                  {goal.targetBodyFat ? (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Target Body Fat</p>
                      <p className="text-white font-medium text-sm">{goal.targetBodyFat}%</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-brand-dark border border-brand-gray rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-brand-blue" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Total Change</p>
                </div>
                <p className={`font-display font-bold text-2xl ${totalChange === 0 ? 'text-gray-400' : isLossDirection ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {totalChange === 0 ? '\u2014' : `${isLossDirection ? '-' : '+'}${totalChangeAbs.toFixed(1)} kg`}
                </p>
              </div>
              <div className="bg-brand-dark border border-brand-gray rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={16} className="text-orange-400" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Current Streak</p>
                </div>
                <p className="font-display font-bold text-2xl text-white">
                  {streak?.currentStreak || 0} <span className="text-xs text-gray-500 font-mono font-normal">days</span>
                </p>
              </div>
              <div className="bg-brand-dark border border-brand-gray rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-brand-blue" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Entries This Week</p>
                </div>
                <p className="font-display font-bold text-2xl text-white">
                  {entriesThisWeek} <span className="text-xs text-gray-500 font-mono font-normal">entries</span>
                </p>
              </div>
              <div className="bg-brand-dark border border-brand-gray rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-amber-400" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Best Streak</p>
                </div>
                <p className="font-display font-bold text-2xl text-white">
                  {streak?.bestStreak || 0} <span className="text-xs text-gray-500 font-mono font-normal">days</span>
                </p>
              </div>
            </div>

            {/* Progress Graph */}
            <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">Progress Chart</h3>
                <div className="flex gap-1">
                  {timeRangeOptions.map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                        timeRange === r
                          ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                          : 'text-gray-500 hover:text-white bg-brand-black border border-brand-gray'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 mb-4">
                {(['weight', 'progress', 'both'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                      chartView === v
                        ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                        : 'text-gray-500 hover:text-white bg-brand-black border border-brand-gray'
                    }`}
                  >
                    {v === 'weight' ? 'Weight' : v === 'progress' ? 'Progress' : 'Both'}
                  </button>
                ))}
              </div>

              {graphData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Activity size={32} className="text-brand-blue/20 mb-3" />
                  <p className="text-sm font-mono">No data for this period</p>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: '#1e293b' }}
                        interval="preserveStartEnd"
                      />
                      {chartView !== 'progress' && (
                        <YAxis
                          yAxisId="weight"
                          orientation="left"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: '#1e293b' }}
                          domain={['auto', 'auto']}
                          tickFormatter={(v) => `${v}kg`}
                        />
                      )}
                      {chartView !== 'weight' && (
                        <YAxis
                          yAxisId="score"
                          orientation="right"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: '#1e293b' }}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      {chartView !== 'weight' && (
                        <Line
                          yAxisId="score"
                          type="monotone"
                          dataKey="progressScore"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', r: 3 }}
                          activeDot={{ r: 5 }}
                          name="Progress"
                        />
                      )}
                      {chartView !== 'progress' && (
                        <Line
                          yAxisId="weight"
                          type="monotone"
                          dataKey="weight"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 3 }}
                          activeDot={{ r: 5 }}
                          name="Weight"
                        />
                      )}
                      {chartView !== 'progress' && goal?.targetWeight && (
                        <ReferenceLine yAxisId="weight" y={goal.targetWeight} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1} label={{ value: `Target: ${goal.targetWeight}kg`, fill: '#22c55e', fontSize: 10, position: 'insideBottomRight' }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex items-center justify-center gap-6 mt-4">
                {chartView !== 'progress' && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 rounded bg-blue-500" />
                    <span className="text-[10px] font-mono text-gray-500">Weight</span>
                  </div>
                )}
                {chartView !== 'weight' && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 rounded bg-purple-500" />
                    <span className="text-[10px] font-mono text-gray-500">Progress Score</span>
                  </div>
                )}
                {chartView !== 'progress' && goal?.targetWeight && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 rounded bg-green-500" />
                    <span className="text-[10px] font-mono text-gray-500">Target</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — Progress Ring + Calendar */}
          <div className="space-y-6">
            {/* Progress Ring */}
            <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 flex flex-col items-center">
              <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white mb-6">Goal Progress</h3>
              <div className="relative">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle
                    cx="90"
                    cy="90"
                    r="78"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="10"
                  />
                  <circle
                    cx="90"
                    cy="90"
                    r="78"
                    fill="none"
                    stroke={progressPercent >= 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 78}`}
                    strokeDashoffset={`${2 * Math.PI * 78 * (1 - progressPercent / 100)}`}
                    transform="rotate(-90 90 90)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                  <text x="90" y="80" textAnchor="middle" fill="white" fontSize="36" fontWeight="bold" fontFamily="monospace">
                    {Math.round(progressPercent)}%
                  </text>
                  <text x="90" y="105" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace">
                    complete
                  </text>
                </svg>
              </div>
              {currentWeight ? (
                <p className="text-sm text-gray-400 mt-4 font-mono">
                  <span className="text-white font-bold">{currentWeight}</span> kg current
                </p>
              ) : null}
            </div>

            {/* Streak Calendar */}
            <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-brand-gray transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className="font-display font-bold text-sm uppercase tracking-wide text-white">
                  {calendarMonthNames[calendarMonth]} {calendarYear}
                </h3>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-brand-gray transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-center text-[9px] font-mono uppercase tracking-wider text-gray-600 py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const monthStr = String(calendarMonth + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const dateStr = `${calendarYear}-${monthStr}-${dayStr}`;
                  const hasEntry = entryDates.has(dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xs font-mono transition-all ${
                        isToday
                          ? 'ring-2 ring-brand-blue bg-brand-blue/5 text-white font-bold'
                          : hasEntry
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'text-gray-600'
                      }`}
                    >
                      {hasEntry ? (
                        <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-brand-blue' : 'bg-emerald-400'}`} />
                      ) : (
                        <span className="text-[10px]">{day}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-brand-gray">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-mono text-gray-500">Logged</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-blue ring-2 ring-brand-blue/30" />
                  <span className="text-[9px] font-mono text-gray-500">Today</span>
                </div>
              </div>
            </div>

            {/* AI Review */}
            <button
              onClick={handleReviewWithAI}
              disabled={reviewing || entries.length === 0}
              className="w-full px-6 py-4 bg-brand-black border border-brand-gray-light rounded-2xl text-xs font-display font-bold uppercase tracking-wider text-white hover:border-purple-500/30 hover:text-purple-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {reviewing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {reviewing ? 'Preparing...' : 'Review With AI'}
            </button>
          </div>
        </div>
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <div>
          {entriesDesc.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-brand-dark border border-brand-gray rounded-3xl">
              <BookOpen size={48} className="text-brand-blue/30 mb-4" />
              <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No entries yet</p>
              <p className="text-gray-600 text-sm max-w-md text-center mb-8">
                Log your first day to start tracking your progress.
              </p>
              <button
                onClick={() => router.push('/dashboard/progress/entry')}
                className="bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-glow-sm transition-all"
              >
                <Plus size={18} /> Log Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entriesDesc.map((entry) => {
                const isDeleting = confirmDeleteDate === entry.date;
                const deletingNow = deletingDate === entry.date;
                const menuOpen = openMenuDate === entry.date;

                return (
                  <div
                    key={entry.date}
                    className="bg-brand-dark border border-brand-gray rounded-2xl p-5 transition-all hover:border-brand-gray-light"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1.5">
                          <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
                            {formatDateFull(entry.date)}
                          </h3>
                          <span className="text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                            {entry.trainedWhat ? entry.trainedWhat.slice(0, 30) + (entry.trainedWhat.length > 30 ? '\u2026' : '') : 'Rest day'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono mt-2">
                          {entry.nutritionFollowedPercent != null && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <span className="text-brand-blue/70">Nutrition:</span> {entry.nutritionFollowedPercent}%
                            </span>
                          )}
                          {entry.bodyWeight && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <span className="text-brand-blue/70">Weight:</span> {entry.bodyWeight} kg
                            </span>
                          )}
                          {entry.bodyFatPercent && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <span className="text-brand-blue/70">BF:</span> {entry.bodyFatPercent}%
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-1">{entry.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => router.push(`/dashboard/progress/entry?date=${entry.date}`)}
                          className="p-2 rounded-lg text-gray-500 hover:text-brand-blue hover:bg-brand-gray transition-all"
                          title="Edit entry"
                        >
                          <Edit3 size={15} />
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuDate(menuOpen ? null : entry.date);
                            }}
                            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-brand-gray transition-all"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {menuOpen && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-brand-dark border border-brand-gray rounded-xl p-1.5 shadow-xl min-w-[140px]">
                              {isDeleting ? (
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <AlertTriangle size={13} className="text-red-400 shrink-0" />
                                  <span className="text-[10px] text-red-300 font-mono">Sure?</span>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.date)}
                                    disabled={deletingNow}
                                    className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-red-500/30 disabled:opacity-50"
                                  >
                                    {deletingNow ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                                  </button>
                                  <button
                                    onClick={() => { setConfirmDeleteDate(null); setOpenMenuDate(null); }}
                                    className="px-2 py-1 bg-brand-gray text-gray-400 rounded-lg text-[10px] font-bold uppercase transition-all hover:text-white"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setConfirmDeleteDate(entry.date); setOpenMenuDate(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: modalClosing ? 0 : 1 }}
        >
          <div className="w-full max-w-[480px] mx-4">
            {/* Stage 1 — Gift Box */}
            {celebrationStage === 'gift' && (
              <div className="flex flex-col items-center py-16">
                <div
                  onClick={handleGiftOpen}
                  className={`relative cursor-pointer select-none transition-all duration-[250ms] ${
                    closingGift ? 'scale-150 rotate-12 opacity-0' : ''
                  }`}
                >
                  <div
                    className="w-40 h-40 flex items-center justify-center rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)' }}
                  >
                    <Gift
                      size={96}
                      className={`${closingGift ? '' : 'animate-pulse-gift'}`}
                      style={{
                        color: '#D4AF37',
                        filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))',
                      }}
                    />
                  </div>
                </div>
                <p className="text-white font-display font-semibold text-xl mt-6">You have a reward waiting</p>
                <p className="text-gray-500 text-sm mt-2">Tap to open</p>
              </div>
            )}

            {/* Stage 2 — Trophy Reveal */}
            {celebrationStage === 'trophy' && (
              <div className="flex flex-col items-center py-8 md:py-12">
                {/* Confetti */}
                {confettiPieces.map((p) => (
                  <div
                    key={p.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rotation}deg)`,
                      width: p.shape === 'circle' ? 8 : 6,
                      height: p.shape === 'circle' ? 8 : 14,
                      borderRadius: p.shape === 'circle' ? '50%' : 2,
                      backgroundColor: p.color,
                      opacity: 1,
                      transition: `all 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms`,
                      animation: `confetti-fly 800ms ${p.delay}ms both`,
                    }}
                  />
                ))}

                {/* Trophy */}
                <div
                  className="w-36 h-36 flex items-center justify-center rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)' }}
                >
                  <Trophy
                    size={80}
                    className="animate-trophy-bounce"
                    style={{
                      color: '#D4AF37',
                      filter: 'drop-shadow(0 0 25px rgba(212,175,55,0.5))',
                    }}
                  />
                </div>

                {/* Congratulations */}
                <h2
                  className="font-display font-extrabold text-4xl uppercase tracking-wider mt-6 mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #D4AF37, #B8860B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Congratulations!
                </h2>

                {/* Days message */}
                {(() => {
                  const earlyDays = goal?.daysEarlyOrLate ?? 0;
                  const absDays = Math.abs(earlyDays);
                  if (earlyDays > 0) {
                    return (
                      <p className="text-gray-300 text-sm text-center">
                        You reached your goal{' '}
                        <span className="text-emerald-400 font-bold">{absDays} day{absDays !== 1 ? 's' : ''}</span> early
                      </p>
                    );
                  }
                  if (earlyDays === 0) {
                    return (
                      <p className="text-gray-300 text-sm text-center">
                        You reached your goal{' '}
                        <span className="text-brand-blue font-bold">on schedule</span>
                      </p>
                    );
                  }
                  return (
                    <p className="text-gray-300 text-sm text-center">
                      You achieved your goal{' '}
                      <span className="text-amber-400 font-bold">{absDays} day{absDays !== 1 ? 's' : ''}</span> late
                    </p>
                  );
                })()}

                <p className="text-gray-500 text-xs italic mt-1">Amazing work and incredible discipline!</p>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 w-full mt-8">
                  <div className="bg-gray-900 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-1">Total Change</p>
                    <p className={`font-display font-bold text-lg ${totalChange === 0 ? 'text-gray-400' : isLossDirection ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {totalChange === 0 ? '\u2014' : `${isLossDirection ? '-' : '+'}${totalChangeAbs.toFixed(1)} kg`}
                    </p>
                  </div>
                  <div className="bg-gray-900 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-1">Journey</p>
                    <p className="font-display font-bold text-lg text-white">
                      {(() => {
                        if (!goal?.startDate) return '\u2014';
                        const s = new Date(toDateStr(goal.startDate) + 'T00:00:00');
                        const t = new Date(todayStr + 'T00:00:00');
                        const d = Math.round((t.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
                        return `${d}d`;
                      })()}
                    </p>
                  </div>
                  <div className="bg-gray-900 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-1">Timing</p>
                    <p className={`font-display font-bold text-lg ${
                      !goal?.daysEarlyOrLate ? 'text-brand-blue' : goal.daysEarlyOrLate > 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {(() => {
                        const ed = goal?.daysEarlyOrLate;
                        if (ed === undefined || ed === null) return '\u2014';
                        if (ed > 0) return `${ed}d early`;
                        if (ed === 0) return 'On time';
                        return `${Math.abs(ed)}d late`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Claim Button */}
                <button
                  onClick={handleClaimReward}
                  disabled={claiming}
                  className="mt-8 w-full px-8 py-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider text-black bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {claiming ? <Loader2 size={18} className="animate-spin" /> : <Award size={18} />}
                  {claiming ? 'Claiming...' : 'Claim Reward'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
