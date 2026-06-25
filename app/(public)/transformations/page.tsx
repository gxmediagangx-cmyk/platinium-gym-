"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, ArrowRight, Loader2, ArrowLeft, ArrowRight as ArrowRightIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

type WinnerDisplay = {
  name: string;
  coachName: string;
  description: string;
  beforeImageUrl: string;
  afterImageUrl: string;
};

type Competition = {
  id: string;
  title: string;
  month: string;
  year: number;
  status: string;
  winners: {
    first: WinnerDisplay;
    second: WinnerDisplay;
    third: WinnerDisplay;
  };
  createdAt?: any;
};

const POSITION_META = {
  first: { label: "1st Place", medal: "🥇", color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/5" },
  second: { label: "2nd Place", medal: "🥈", color: "text-gray-300", border: "border-gray-400/30", bg: "bg-gray-400/5" },
  third: { label: "3rd Place", medal: "🥉", color: "text-amber-600", border: "border-amber-600/30", bg: "bg-amber-600/5" },
};

export default function TransformationsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "competitions")),
      (snap) => {
        const items: Competition[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (!data.status) return;
          items.push({
            id: d.id,
            title: data.title || "",
            month: data.month || "",
            year: data.year ?? 0,
            status: data.status || "",
            winners: {
              first: { name: "", coachName: "", description: "", beforeImageUrl: "", afterImageUrl: "", ...(data.winners?.first || {}) },
              second: { name: "", coachName: "", description: "", beforeImageUrl: "", afterImageUrl: "", ...(data.winners?.second || {}) },
              third: { name: "", coachName: "", description: "", beforeImageUrl: "", afterImageUrl: "", ...(data.winners?.third || {}) },
            },
            createdAt: data.createdAt,
          });
        });
        items.sort((a, b) => {
          const diff = (b.year || 0) - (a.year || 0);
          if (diff !== 0) return diff;
          const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
          return (months.indexOf(b.month) || 0) - (months.indexOf(a.month) || 0);
        });
        setCompetitions(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const monthYear = (c: Competition) => {
    const m = c.month || "";
    const y = c.year || 0;
    return m && y ? `${m} ${y}` : m || y || "";
  };

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs uppercase tracking-widest font-bold mb-4">
            <Trophy size={14} /> Hall of Fame
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-wider mb-4">
            <span className="text-amber-400">Transformations</span>
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            Real results from our community. Every journey starts with a single step — see what our members have achieved with dedication and expert guidance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Loader2 size={32} className="animate-spin mb-4 text-amber-400" />
          <p className="font-display uppercase tracking-wider text-sm">Loading transformations...</p>
        </div>
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Trophy size={48} className="text-amber-400/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No transformations yet</p>
          <p className="text-gray-600 text-sm">Check back soon for inspiring transformations from our community.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {competitions.map((c) => {
            const isExpanded = expandedId === c.id;
            const hasWinner = (pos: "first" | "second" | "third") => c.winners[pos].name && c.winners[pos].beforeImageUrl && c.winners[pos].afterImageUrl;

            return (
              <div key={c.id} className="bg-brand-dark border border-brand-gray rounded-3xl overflow-hidden">
                {/* Competition Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : c.id); } }}
                  className="w-full p-6 md:p-8 flex items-center justify-between cursor-pointer hover:bg-brand-black/20 transition-colors"
                >
                  <div>
                    <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-wider text-white">
                      {c.title || ''}
                    </h2>
                    <p className="text-sm text-gray-500 font-mono mt-1">{monthYear(c)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-mono uppercase tracking-widest font-bold px-3 py-1.5 rounded-full ${
                      c.status === "active"
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {c.status === "active" ? "Ongoing" : "Completed"}
                    </span>
                    {isExpanded ? (
                      <ArrowDown size={20} className="text-gray-500" />
                    ) : (
                      <ArrowRightIcon size={20} className="text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Winner Cards */}
                {isExpanded && (
                  <div className="border-t border-brand-gray px-6 md:px-8 pb-8 animate-fade-in">
                    {!hasWinner("first") && !hasWinner("second") && !hasWinner("third") ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Trophy size={36} className="text-amber-400/20 mb-3" />
                        <p className="text-gray-500 font-display uppercase tracking-widest text-sm">Winner details not yet published</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
                        {(["first", "second", "third"] as const).map((pos) => {
                          const w = c.winners[pos];
                          const meta = POSITION_META[pos];
                          if (!w.name) return null;

                          return (
                            <div key={pos} className={`bg-brand-black border ${meta.border} rounded-3xl overflow-hidden flex flex-col`}>
                              {/* Before / After images side by side */}
                              {w.beforeImageUrl && w.afterImageUrl && (
                                <div className="grid grid-cols-2">
                                  <div className="relative">
                                    <div className="absolute top-2 left-2 z-10 text-[9px] font-mono uppercase tracking-widest font-bold bg-black/60 text-white px-2 py-1 rounded">
                                      Before
                                    </div>
                                    <img src={w.beforeImageUrl} alt="Before" className="w-full aspect-square object-cover" />
                                  </div>
                                  <div className="relative">
                                    <div className="absolute top-2 left-2 z-10 text-[9px] font-mono uppercase tracking-widest font-bold bg-black/60 text-white px-2 py-1 rounded">
                                      After
                                    </div>
                                    <img src={w.afterImageUrl} alt="After" className="w-full aspect-square object-cover" />
                                  </div>
                                </div>
                              )}

                              <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                  <Medal size={18} className={meta.color} />
                                  <span className={`text-xs font-mono uppercase tracking-widest font-bold ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                </div>
                                <h3 className="font-display font-bold text-xl uppercase tracking-wide text-white mb-1">
                                  {w.name || ''}
                                </h3>
                                {w.coachName && (
                                  <p className="text-xs text-gray-500 font-mono mb-3">Coach: {w.coachName}</p>
                                )}
                                {w.description && (
                                  <p className="text-sm text-gray-400 leading-relaxed flex-1">{w.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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

function ArrowDown(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
