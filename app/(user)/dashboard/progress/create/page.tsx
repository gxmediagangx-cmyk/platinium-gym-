"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Target, FileText, Check, ArrowLeft, ArrowRight,
  Loader2, AlertTriangle, Users, Star
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, setDoc,
  doc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Template {
  id: string;
  name: string;
  coachName: string;
  goal: string;
  difficulty: string;
  isActive: boolean;
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

function getTomorrow(): string {
  const d = new Date(getEgyptToday() + 'T00:00:00');
  d.setDate(d.getDate() + 1);
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

function DateField({ value, onChange, label, required, showToday }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
  showToday?: boolean;
}) {
  const todayStr = getEgyptToday();
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const parseValue = (v: string) => {
    if (!v) return { d: '', m: '', y: '' };
    const [y, m, d] = v.split('-');
    return { d: d || '', m: m || '', y: y || '' };
  };

  const [day, setDay] = useState(parseValue(value).d);
  const [month, setMonth] = useState(parseValue(value).m);
  const [year, setYear] = useState(parseValue(value).y);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = parseValue(value);
    setDay(p.d);
    setMonth(p.m);
    setYear(p.y);
  }, [value]);

  const combineAndValidate = (d: string, m: string, y: string) => {
    if (!d || !m || !y) {
      return;
    }
    const dNum = parseInt(d, 10);
    const mNum = parseInt(m, 10);
    const yNum = parseInt(y, 10);
    if (mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) {
      setError('Please enter a valid date');
      return;
    }
    const dateObj = new Date(yNum, mNum - 1, dNum);
    if (dateObj.getFullYear() !== yNum || dateObj.getMonth() !== mNum - 1 || dateObj.getDate() !== dNum) {
      setError('Please enter a valid date');
      return;
    }
    setError(null);
    const yyyy = y.padStart(4, '0');
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(v);
    if (v.length === 2 && monthRef.current) monthRef.current.focus();
    combineAndValidate(v, month, year);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(v);
    combineAndValidate(day, v, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(v);
    if (v.length === 4) combineAndValidate(day, month, v);
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {};
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

  const handleToday = () => {
    const [y, m, d] = todayStr.split('-');
    setDay(d);
    setMonth(m);
    setYear(y);
    setError(null);
    onChange(todayStr);
  };

  return (
    <div>
      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
        {label} {required && <span className="text-brand-blue">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="flex items-center gap-1 flex-1 bg-brand-black border border-brand-gray rounded-xl px-4 py-3">
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            value={day}
            onChange={handleDayChange}
            onKeyDown={handleDayKeyDown}
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
        {showToday && (
          <button
            type="button"
            onClick={handleToday}
            className="px-4 py-3 bg-brand-black border border-brand-gray rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-brand-blue hover:border-brand-blue/50 transition-all shrink-0"
          >
            Today
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-[10px] font-mono mt-1">{error}</p>
      )}
      <p className="text-gray-600 text-[10px] font-mono mt-1">
        Use 2-digit day and month (e.g. 06 for June, 05 for the 5th)
      </p>
    </div>
  );
}

export default function CreateGoalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [step, setStep] = useState(1);
  const [goalType, setGoalType] = useState<'custom' | 'template' | null>(null);
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [startBodyFat, setStartBodyFat] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const todayStr = getEgyptToday();
  const tomorrowStr = getTomorrow();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
      if (!currentUser) router.replace('/login');
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (step === 2 && goalType === 'template' && user) {
      setTemplatesLoading(true);
      setTemplatesError(null);
      const q = query(
        collection(db, 'progressTemplates'),
        where('isActive', '==', true)
      );
      getDocs(q)
        .then((snapshot) => {
          const list: Template[] = [];
          snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Template));
          setTemplates(list);
        })
        .catch(() => {
          setTemplatesError('Failed to load templates');
        })
        .finally(() => setTemplatesLoading(false));
    }
  }, [step, goalType, user]);

  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setPlanName(t.name || '');
  };

  const endDatePastError = endDate && endDate <= todayStr;
  const endDateBeforeStartError = endDate && startDate && endDate <= startDate;
  const startWeightRequiredError = !startWeight;
  const targetWeightCloseError = startWeight && targetWeight && Math.abs(parseFloat(targetWeight) - parseFloat(startWeight)) < 0.5;

  const canGoNext = (): boolean => {
    if (step === 1) return goalType !== null;
    if (step === 2) {
      if (goalType === 'template' && !selectedTemplate) return false;
      if (!planName.trim()) return false;
      if (!targetWeight || parseFloat(targetWeight) <= 0) return false;
      if (!startWeight) return false;
      if (!startDate || !endDate) return false;
      if (endDate <= todayStr) return false;
      if (endDate <= startDate) return false;
      if (targetWeightCloseError) return false;
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleCreate = async () => {
    if (!user) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const goalRef = doc(db, 'users', user.uid, 'progressGoal', 'main');
      const existingSnap = await getDoc(goalRef);

      if (existingSnap.exists() && existingSnap.data()?.status === 'active') {
        try {
          await addDoc(collection(db, 'users', user.uid, 'progressGoalHistory'), {
            ...existingSnap.data(),
            archivedAt: serverTimestamp(),
          });
        } catch {}
      }

      await setDoc(goalRef, {
        name: planName.trim(),
        startDate,
        endDate,
        startWeight: startWeight ? parseFloat(startWeight) : null,
        targetWeight: parseFloat(targetWeight),
        startBodyFat: startBodyFat ? parseFloat(startBodyFat) : null,
        targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : null,
        type: goalType,
        ...(goalType === 'template' && selectedTemplate
          ? { templateId: selectedTemplate.id, templateName: selectedTemplate.name }
          : {}),
        status: 'active',
        createdAt: serverTimestamp(),
      });

      router.push('/dashboard/progress');
    } catch {
      setSubmitError('Failed to create goal. Please try again.');
      setSubmitting(false);
    }
  };

  if (!authChecked || !user) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex justify-center items-center min-h-[50vh]">
        <Loader2 size={32} className="text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10 font-mono text-xs uppercase tracking-widest">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${step === s ? 'text-brand-blue' : step > s ? 'text-emerald-400' : 'text-gray-600'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                step === s
                  ? 'bg-brand-blue/20 border-brand-blue/50'
                  : step > s
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-brand-gray border-brand-gray-light'
              }`}>
                {step > s ? <Check size={12} /> : s}
              </div>
              <span className="hidden sm:inline">
                {s === 1 ? 'Type' : s === 2 ? 'Details' : 'Confirm'}
              </span>
            </div>
            {s < 3 && <div className="w-8 h-px bg-brand-gray-light" />}
          </React.Fragment>
        ))}
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="mb-6 bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{submitError}</span>
        </div>
      )}

      {/* Step 1 — Choose Type */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h1 className="font-display font-extrabold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            New <span className="text-brand-blue">Target</span>
          </h1>
          <p className="text-gray-400 mb-10">Choose how you want to set your body transformation goal.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setGoalType('custom')}
              className={`text-left p-8 rounded-3xl border-2 transition-all duration-300 ${
                goalType === 'custom'
                  ? 'bg-brand-dark border-brand-blue shadow-glow-sm'
                  : 'bg-brand-dark border-brand-gray hover:border-brand-blue/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-5">
                <Target size={28} className="text-brand-blue" />
              </div>
              <h3 className="font-display font-bold text-2xl uppercase tracking-wide text-white mb-2">Create Custom Plan</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Define your own goal from scratch. Set your target weight, dates, and body composition targets your way.
              </p>
              {goalType === 'custom' && (
                <div className="mt-4 flex items-center gap-2 text-brand-blue text-xs font-mono uppercase tracking-widest">
                  <Check size={14} /> Selected
                </div>
              )}
            </button>

            <button
              onClick={() => setGoalType('template')}
              className={`text-left p-8 rounded-3xl border-2 transition-all duration-300 ${
                goalType === 'template'
                  ? 'bg-brand-dark border-brand-blue shadow-glow-sm'
                  : 'bg-brand-dark border-brand-gray hover:border-brand-blue/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5">
                <FileText size={28} className="text-purple-400" />
              </div>
              <h3 className="font-display font-bold text-2xl uppercase tracking-wide text-white mb-2">Use a Template</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Start with a professionally designed goal from our coaches. Customize the details to fit you.
              </p>
              {goalType === 'template' && (
                <div className="mt-4 flex items-center gap-2 text-brand-blue text-xs font-mono uppercase tracking-widest">
                  <Check size={14} /> Selected
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2a — Custom details form */}
      {step === 2 && goalType === 'custom' && (
        <div className="animate-fade-in">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider mb-2">
            Goal <span className="text-brand-blue">Details</span>
          </h2>
          <p className="text-gray-400 mb-8">Define your transformation goal.</p>

          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-lg">
            <div className="flex flex-col gap-6">
              {/* Plan Name */}
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                  Plan Name <span className="text-brand-blue">*</span>
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value.slice(0, 60))}
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                  placeholder="e.g. Summer Cut 2026"
                  maxLength={60}
                  required
                />
                <div className="text-right text-[10px] font-mono text-gray-500 mt-1">
                  {planName.length}/60
                </div>
              </div>

              {/* Start Date */}
              <DateField
                value={startDate}
                onChange={setStartDate}
                label="Start Date"
                required
                showToday
              />

              {/* End Date */}
              <div>
                <DateField
                  value={endDate}
                  onChange={setEndDate}
                  label="End Date"
                  required
                />
                {endDatePastError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">End date must be at least tomorrow</p>
                )}
                {endDateBeforeStartError && !endDatePastError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">End date must be after start date</p>
                )}
              </div>

              <div className="h-px bg-brand-gray" />

              {/* Target Weight */}
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                  Target Weight (kg) <span className="text-brand-blue">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                />
                {targetWeightCloseError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">Target weight must differ from starting weight by at least 0.5 kg</p>
                )}
              </div>

              {/* Start Weight */}
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                  Starting Weight (kg) <span className="text-brand-blue">*</span>
                </label>
                {startWeightRequiredError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">Starting weight is required to track your progress</p>
                )}
                <input
                  type="number"
                  step="0.1"
                  value={startWeight}
                  onChange={(e) => setStartWeight(e.target.value)}
                  placeholder="e.g. 85"
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                    Start Body Fat % <span className="text-gray-500">— opt.</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={startBodyFat}
                    onChange={(e) => setStartBodyFat(e.target.value)}
                    placeholder="e.g. 22"
                    className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                    Target Body Fat % <span className="text-gray-500">— opt.</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetBodyFat}
                    onChange={(e) => setTargetBodyFat(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2b — Template selection */}
      {step === 2 && goalType === 'template' && (
        <div className="animate-fade-in">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider mb-2">
            Choose <span className="text-brand-blue">Template</span>
          </h2>
          <p className="text-gray-400 mb-8">Select a coach-designed template to start from. Then customize the details.</p>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="text-brand-blue animate-spin" />
            </div>
          ) : templatesError ? (
            <div className="bg-red-950/30 border border-red-500/20 rounded-xl px-5 py-4 text-sm text-red-300">
              {templatesError}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-brand-dark border border-brand-gray rounded-3xl">
              <FileText size={40} className="text-brand-blue/30 mb-4" />
              <p className="text-gray-500 font-display uppercase tracking-widest">No coach templates available yet.</p>
              <p className="text-gray-600 text-sm mt-2 max-w-md text-center">
                You can still create a custom goal from scratch.
              </p>
              <button
                onClick={() => { setGoalType('custom'); setStep(2); }}
                className="mt-6 px-6 py-3 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-xl text-xs font-display font-bold uppercase tracking-wider hover:bg-brand-blue/20 transition-all"
              >
                Create Custom Instead
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`text-left p-6 rounded-3xl border-2 transition-all duration-300 ${
                      selectedTemplate?.id === t.id
                        ? 'bg-brand-dark border-brand-blue shadow-glow-sm'
                        : 'bg-brand-dark border-brand-gray hover:border-brand-blue/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-display font-bold text-xl uppercase tracking-wide text-white break-words">{t.name || ''}</h3>
                      <span className={`shrink-0 text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full ${
                        t.difficulty === 'Advanced'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : t.difficulty === 'Intermediate'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {t.difficulty || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
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
                    </div>
                    {selectedTemplate?.id === t.id && (
                      <div className="mt-4 flex items-center gap-2 text-brand-blue text-xs font-mono uppercase tracking-widest">
                        <Check size={14} /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Form fields appear after template selection */}
              {selectedTemplate && (
                <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-lg">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-brand-blue mb-6">
                    Customize your goal from the <span className="text-white">{selectedTemplate.name}</span> template
                  </p>
                  <div className="flex flex-col gap-6">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                        Plan Name <span className="text-brand-blue">*</span>
                      </label>
                      <input
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value.slice(0, 60))}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                        maxLength={60}
                      />
                      <div className="text-right text-[10px] font-mono text-gray-500 mt-1">
                        {planName.length}/60
                      </div>
                    </div>

                    {/* Start Date */}
                    <DateField
                      value={startDate}
                      onChange={setStartDate}
                      label="Start Date"
                      required
                      showToday
                    />

                    {/* End Date */}
                    <div>
                      <DateField
                        value={endDate}
                        onChange={setEndDate}
                        label="End Date"
                        required
                      />
                      {endDatePastError && (
                        <p className="text-red-400 text-[10px] font-mono mt-1">End date must be at least tomorrow</p>
                      )}
                      {endDateBeforeStartError && !endDatePastError && (
                        <p className="text-red-400 text-[10px] font-mono mt-1">End date must be after start date</p>
                      )}
                    </div>

                    <div className="h-px bg-brand-gray" />

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                        Target Weight (kg) <span className="text-brand-blue">*</span>
                      </label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                />
                {targetWeightCloseError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">Target weight must differ from starting weight by at least 0.5 kg</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                  Starting Weight (kg) <span className="text-brand-blue">*</span>
                </label>
                {startWeightRequiredError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">Starting weight is required to track your progress</p>
                )}
                      <input
                        type="number"
                        step="0.1"
                        value={startWeight}
                        onChange={(e) => setStartWeight(e.target.value)}
                        placeholder="e.g. 85"
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                          Start BF % <span className="text-gray-500">— opt.</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={startBodyFat}
                          onChange={(e) => setStartBodyFat(e.target.value)}
                          placeholder="e.g. 22"
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                          Target BF % <span className="text-gray-500">— opt.</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={targetBodyFat}
                          onChange={(e) => setTargetBodyFat(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3 — Confirmation */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider mb-2">
            Confirm <span className="text-brand-blue">Goal</span>
          </h2>
          <p className="text-gray-400 mb-8">Review the details before creating your transformation goal.</p>

          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-2xl">
            <div className="flex flex-col gap-6">
              {/* Type */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  goalType === 'custom' ? 'bg-brand-blue/10' : 'bg-purple-500/10'
                }`}>
                  {goalType === 'custom' ? (
                    <Target size={20} className="text-brand-blue" />
                  ) : (
                    <FileText size={20} className="text-purple-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Type</div>
                  <div className="text-sm font-bold text-white uppercase tracking-wider">
                    {goalType === 'custom' ? 'Custom Plan' : 'Coach Template'}
                  </div>
                </div>
              </div>

              {/* Plan Name */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                  <Star size={20} className="text-brand-blue" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Plan Name</div>
                  <div className="text-sm font-bold text-white break-words">{planName.trim() || 'Untitled Goal'}</div>
                  {goalType === 'template' && selectedTemplate?.coachName && (
                    <div className="text-xs text-gray-500 mt-0.5">based on {selectedTemplate.name} by {selectedTemplate.coachName}</div>
                  )}
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Start Date</div>
                  <div className="text-sm font-bold text-white">{startDate ? formatDateDisplay(startDate) : ''}</div>
                </div>
                <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">End Date</div>
                  <div className="text-sm font-bold text-white">{endDate ? formatDateDisplay(endDate) : ''}</div>
                </div>
              </div>

              {/* Weights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Starting Weight</div>
                  <div className="text-sm font-bold text-white">
                    {startWeight ? `${parseFloat(startWeight).toFixed(1)} kg` : 'Not set'}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Target Weight</div>
                  <div className="text-sm font-bold text-brand-blue">
                    {targetWeight ? `${parseFloat(targetWeight).toFixed(1)} kg` : ''}
                  </div>
                </div>
              </div>

              {/* Body Fat */}
              {(startBodyFat || targetBodyFat) && (
                <div className="grid grid-cols-2 gap-4">
                  {startBodyFat && (
                    <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Start Body Fat</div>
                      <div className="text-sm font-bold text-white">{parseFloat(startBodyFat).toFixed(1)}%</div>
                    </div>
                  )}
                  {targetBodyFat && (
                    <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Target Body Fat</div>
                      <div className="text-sm font-bold text-brand-blue">{parseFloat(targetBodyFat).toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              )}

              {/* Template info */}
              {goalType === 'template' && selectedTemplate && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedTemplate.goal && (
                    <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Goal</div>
                      <div className="text-sm font-bold text-white">{selectedTemplate.goal}</div>
                    </div>
                  )}
                  {selectedTemplate.difficulty && (
                    <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Difficulty</div>
                      <div className="text-sm font-bold text-white">{selectedTemplate.difficulty}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <div className="flex items-center justify-between mt-10 max-w-2xl">
        {step > 1 ? (
          <button
            onClick={handleBack}
            disabled={submitting}
            className="px-6 py-3 bg-brand-gray hover:bg-brand-gray-light border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <button
            onClick={() => router.push('/dashboard/progress')}
            className="px-6 py-3 bg-brand-gray hover:bg-brand-gray-light border border-brand-gray-light rounded-xl text-xs font-display font-bold uppercase tracking-wider text-white transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Cancel
          </button>
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="px-8 py-3 bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-40"
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-8 py-3 bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {submitting ? 'Creating...' : 'Create Goal'}
          </button>
        )}
      </div>
    </div>
  );
}
