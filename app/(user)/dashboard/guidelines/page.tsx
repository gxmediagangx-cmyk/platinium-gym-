"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardGuidelinesPage() {
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [length, setLength] = useState<'quick' | 'detailed'>('quick');

  useEffect(() => {
    const fetchGuidelines = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "guidelines"));
        if (snap.exists()) {
          const d = snap.data();
          setData({
            quickEn: d.quickEn || "",
            detailedEn: d.detailedEn || "",
            quickAr: d.quickAr || "",
            detailedAr: d.detailedAr || "",
          });
        } else {
          setData({ quickEn: "", detailedEn: "", quickAr: "", detailedAr: "" });
        }
      } catch {
        setData({ quickEn: "", detailedEn: "", quickAr: "", detailedAr: "" });
      } finally {
        setLoading(false);
      }
    };
    fetchGuidelines();
  }, []);

  const contentKey = `${length}${lang === 'en' ? 'En' : 'Ar'}` as keyof typeof data;
  const content = data?.[contentKey] || "";
  const isAr = lang === 'ar';

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-brand-blue" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs uppercase tracking-widest font-bold mb-4">
            <BookOpen size={14} /> Guidelines
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            {isAr ? "الإرشادات" : "Guidelines"}
          </h1>
          <p className="text-gray-400">Gym rules and guidelines.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <BookOpen size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No guidelines yet</p>
          <p className="text-gray-600 text-sm">Guidelines have not been configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs uppercase tracking-widest font-bold mb-4">
          <BookOpen size={14} /> {isAr ? "قواعد الجيم" : "Guidelines"}
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          {isAr ? "الإرشادات" : "Guidelines"}
        </h1>
        <p className="text-gray-400">Gym rules and member guidelines.</p>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-brand-dark border border-brand-gray">
          <button
            onClick={() => setLang('en')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              lang === 'en' ? 'bg-brand-blue text-brand-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              lang === 'ar' ? 'bg-brand-blue text-brand-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            العربية
          </button>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-brand-dark border border-brand-gray">
          <button
            onClick={() => setLength('quick')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              length === 'quick' ? 'bg-brand-blue text-brand-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {isAr ? "Quick سريع" : "Quick"}
          </button>
          <button
            onClick={() => setLength('detailed')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              length === 'detailed' ? 'bg-brand-blue text-brand-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {isAr ? "تفصيلي" : "Detailed"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 md:p-8">
        <pre
          dir={isAr ? "rtl" : "ltr"}
          className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-sm"
        >
          {content}
        </pre>
      </div>
    </div>
  );
}
