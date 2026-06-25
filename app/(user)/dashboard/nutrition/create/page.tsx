"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Apple, FileText, Check, ArrowLeft, ArrowRight,
  Loader2, AlertTriangle, Users, Target, Star, Calendar
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, getDocs, addDoc,
  doc, serverTimestamp, writeBatch, updateDoc, DocumentReference
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

export default function CreateNutritionPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // wizard state
  const [step, setStep] = useState(1);
  const [planType, setPlanType] = useState<'custom' | 'template' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
      if (!currentUser) router.replace('/login');
    });
    return () => unsub();
  }, [router]);

  // load templates when step reaches 2 and type is template
  useEffect(() => {
    if (step === 2 && planType === 'template' && user) {
      setTemplatesLoading(true);
      setTemplatesError(null);
      const q = query(
        collection(db, 'nutritionTemplates'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      getDocs(q)
        .then((snapshot) => {
          const list: Template[] = [];
          snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Template));
          setTemplates(list);

          // auto-select from URL param
          const templateId = searchParams.get('templateId');
          if (templateId) {
            const found = list.find((t) => t.id === templateId);
            if (found) setSelectedTemplate(found);
          }
        })
        .catch((err) => {
          setTemplatesError(err.message || 'Failed to load templates');
        })
        .finally(() => setTemplatesLoading(false));
    }
  }, [step, planType, user, searchParams]);

  const canGoNext = (): boolean => {
    if (step === 1) return planType !== null;
    if (step === 2 && planType === 'custom') return name.trim().length > 0;
    if (step === 2 && planType === 'template') return selectedTemplate !== null;
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
      const baseData: Record<string, any> = {
        isActive: false,
        itemsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let docRef: DocumentReference;
      if (planType === 'custom') {
        docRef = await addDoc(collection(db, 'users', user.uid, 'nutritionPlans'), {
          ...baseData,
          name: name.trim(),
          description: description.trim() || '',
          type: 'custom',
        });
      } else if (planType === 'template' && selectedTemplate) {
        docRef = await addDoc(collection(db, 'users', user.uid, 'nutritionPlans'), {
          ...baseData,
          name: selectedTemplate.name,
          description: '',
          type: 'template',
          templateId: selectedTemplate.id,
        });

        // Copy template items into the new plan
        const itemsSnap = await getDocs(
          query(
            collection(db, 'nutritionTemplates', selectedTemplate.id, 'items'),
            orderBy('order', 'asc')
          )
        );

        if (!itemsSnap.empty) {
          const batch = writeBatch(db);
          itemsSnap.forEach((itemDoc) => {
            const itemData = itemDoc.data();
            const newItemRef = doc(collection(db, 'users', user.uid, 'nutritionPlans', docRef.id, 'items'));
            batch.set(newItemRef, {
              ...itemData,
              createdAt: serverTimestamp(),
            });
          });
          await batch.commit();

          // Update itemsCount
          await updateDoc(docRef, { itemsCount: itemsSnap.size });
        }
      } else {
        throw new Error('Invalid plan configuration');
      }

      router.push(`/dashboard/nutrition/${docRef.id}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create nutrition plan');
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
            Create <span className="text-brand-blue">Plan</span>
          </h1>
          <p className="text-gray-400 mb-10">Choose how you want to build your nutrition &amp; routine plan.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setPlanType('custom')}
              className={`text-left p-8 rounded-3xl border-2 transition-all duration-300 ${
                planType === 'custom'
                  ? 'bg-brand-dark border-brand-blue shadow-glow-sm'
                  : 'bg-brand-dark border-brand-gray hover:border-brand-blue/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-5">
                <Apple size={28} className="text-brand-blue" />
              </div>
              <h3 className="font-display font-bold text-2xl uppercase tracking-wide text-white mb-2">Custom Plan</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Build your own nutrition &amp; routine plan from scratch. Add meals, sun exposure, and daily habits your way.
              </p>
              {planType === 'custom' && (
                <div className="mt-4 flex items-center gap-2 text-brand-blue text-xs font-mono uppercase tracking-widest">
                  <Check size={14} /> Selected
                </div>
              )}
            </button>

            <button
              onClick={() => setPlanType('template')}
              className={`text-left p-8 rounded-3xl border-2 transition-all duration-300 ${
                planType === 'template'
                  ? 'bg-brand-dark border-brand-blue shadow-glow-sm'
                  : 'bg-brand-dark border-brand-gray hover:border-brand-blue/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5">
                <FileText size={28} className="text-purple-400" />
              </div>
              <h3 className="font-display font-bold text-2xl uppercase tracking-wide text-white mb-2">Coach Template</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Start with a professionally designed nutrition plan from our coaches. Customize it to fit your goals.
              </p>
              {planType === 'template' && (
                <div className="mt-4 flex items-center gap-2 text-brand-blue text-xs font-mono uppercase tracking-widest">
                  <Check size={14} /> Selected
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2a — Custom details */}
      {step === 2 && planType === 'custom' && (
        <div className="animate-fade-in">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider mb-8">
            Plan <span className="text-brand-blue">Details</span>
          </h2>

          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-lg">
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                  Plan Name <span className="text-brand-blue">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 60))}
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                  placeholder="e.g. Clean Bulk Meal Plan"
                  maxLength={60}
                  required
                />
                <div className="text-right text-[10px] font-mono text-gray-500 mt-1">
                  {name.length}/60
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                  Description <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  rows={4}
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
                  placeholder="Describe your nutrition plan..."
                  maxLength={200}
                />
                <div className="text-right text-[10px] font-mono text-gray-500 mt-1">
                  {description.length}/200
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2b — Template selection */}
      {step === 2 && planType === 'template' && (
        <div className="animate-fade-in">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider mb-2">
            Choose <span className="text-brand-blue">Template</span>
          </h2>
          <p className="text-gray-400 mb-8">Select a coach-designed template to get started.</p>

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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
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
          )}
        </div>
      )}

      {/* Step 3 — Confirmation */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider mb-2">
            Confirm <span className="text-brand-blue">Plan</span>
          </h2>
          <p className="text-gray-400 mb-8">Review the details before creating your nutrition plan.</p>

          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-2xl">
            <div className="flex flex-col gap-6">
              {/* Type */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  planType === 'custom' ? 'bg-brand-blue/10' : 'bg-purple-500/10'
                }`}>
                  {planType === 'custom' ? (
                    <Apple size={20} className="text-brand-blue" />
                  ) : (
                    <FileText size={20} className="text-purple-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Type</div>
                  <div className="text-sm font-bold text-white uppercase tracking-wider">
                    {planType === 'custom' ? 'Custom Plan' : 'Coach Template'}
                  </div>
                </div>
              </div>

              {/* Name / Template info */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                  <Star size={20} className="text-brand-blue" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">
                    {planType === 'custom' ? 'Name' : 'Template'}
                  </div>
                  <div className="text-sm font-bold text-white break-words">
                    {planType === 'custom'
                      ? name.trim() || 'Untitled Plan'
                      : selectedTemplate?.name || 'Unknown Template'
                    }
                  </div>
                  {planType === 'template' && selectedTemplate?.coachName && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      by {selectedTemplate.coachName}
                    </div>
                  )}
                </div>
              </div>

              {/* Description (custom only) */}
              {planType === 'custom' && description.trim() && (
                <div className="p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-1">Description</div>
                  <p className="text-sm text-gray-300 break-words">{description.trim()}</p>
                </div>
              )}

              {/* Goal / difficulty (template only) */}
              {planType === 'template' && selectedTemplate && (
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
            onClick={() => router.push('/dashboard/nutrition')}
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
            {submitting ? 'Creating...' : 'Create Plan'}
          </button>
        )}
      </div>
    </div>
  );
}
