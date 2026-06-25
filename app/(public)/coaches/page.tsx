"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight, Medal, History, Filter, Loader2, X, Phone } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

type CoachData = {
  id: string;
  name: string;
  position: string;
  specialization: string;
  experience: string;
  bio: string;
  image: string;
  categories: string[];
  phoneNumber: string;
  isActive: boolean;
  createdAt?: any;
};

export default function CoachesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const q = query(collection(db, "coaches"), where("isActive", "==", true));
        const snap = await getDocs(q);
        const items: CoachData[] = snap.docs.map((d) => {
          const data = d.data();
          const specialties = data.specialties || [];
          return {
            id: d.id,
            name: data.name || "",
            position: data.role || "",
            specialization: specialties.length > 0 ? specialties[0] : data.role || "",
            experience: data.experienceYears ? `${data.experienceYears}+ Years` : "",
            bio: data.description || "",
            image: data.photoUrl || "",
            categories: specialties,
            phoneNumber: data.phoneNumber || "",
            isActive: data.isActive ?? true,
            createdAt: data.createdAt,
          };
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return ta - tb;
        });
        setCoaches(items);
      } catch {
        setCoaches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCoaches();
  }, []);

  const CATEGORIES = ["All", ...Array.from(new Set(coaches.flatMap(coach => coach.categories)))];

  const filteredTeam = activeFilter === "All"
    ? coaches
    : coaches.filter(coach => coach.categories.includes(activeFilter));

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs uppercase tracking-widest font-bold mb-4">
            <Medal size={14} /> The Elite
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-wider mb-4">
            Our <span className="text-brand-blue">Coaches</span>
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            Train with our certified pros. Real masters dedicated to maximizing your results, correcting your form, and building your strongest physical version.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 no-scrollbar">
        <div className="flex items-center gap-2 text-gray-500 mr-2 whitespace-nowrap">
          <Filter size={18} /> <span className="font-display uppercase tracking-wider text-sm font-bold">Filter:</span>
        </div>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-6 py-2.5 rounded-full font-display font-bold text-sm uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
              activeFilter === cat
                ? 'bg-brand-blue text-brand-black shadow-glow-sm'
                : 'bg-brand-dark border border-brand-gray text-gray-400 hover:border-brand-gray-light hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 size={32} className="animate-spin mb-4 text-brand-blue" />
            <p className="font-display uppercase tracking-wider text-sm">Loading coaches...</p>
          </div>
        ) : coaches.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
            <p className="text-gray-400 font-display uppercase tracking-widest">No coaches available yet.</p>
          </div>
        ) : (
          filteredTeam.map((coach, idx) => (
            <div key={coach.id || idx} className="group relative bg-brand-dark/40 border border-brand-gray/35 hover:border-brand-blue/30 rounded-3xl p-5 transition-all duration-300 flex flex-col h-full">

              {/* Aspect Square image container */}
              <div className="aspect-square overflow-hidden bg-brand-black rounded-2xl relative mb-6">
                {coach.image ? (
                  <img
                    src={coach.image}
                    alt={coach.name}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </div>
                )}

                <div className="absolute top-4 right-4 z-20">
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-blue/20 text-brand-blue px-3 py-1.5 rounded-full backdrop-blur-md border border-brand-blue/30 inline-block">
                    {coach.specialization}
                  </span>
                </div>
              </div>

              {/* Content Below Graphic to Avoid Overlays Cutting Content */}
              <div className="flex-grow flex flex-col">
                <div className="text-brand-blue text-sm font-mono uppercase tracking-widest mb-1">
                  {coach.position}
                </div>
                <h3 className="font-display font-bold text-2xl uppercase tracking-wide mb-3 text-white">
                  {coach.name}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">
                  {coach.bio}
                </p>

                <div className="flex items-center justify-between pt-5 border-t border-brand-gray/40 mt-auto">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono bg-brand-black px-3 py-1.5 rounded-lg border border-brand-gray">
                    <History size={14} className="text-brand-blue" />
                    {coach.experience}
                  </div>
                  <button
                    onClick={() => setSelectedCoach(coach)}
                    className="text-xs font-display font-bold uppercase tracking-wider text-white hover:text-brand-blue transition-colors flex items-center gap-1.5 group/btn"
                  >
                    View Profile <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {!loading && coaches.length > 0 && filteredTeam.length === 0 && (
        <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
          <p className="text-gray-400 font-display uppercase tracking-widest">No coaches found in this category.</p>
        </div>
      )}

      {/* Coach Profile Modal */}
      {selectedCoach && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCoach(null)}
        >
          <div
            className="bg-brand-dark border border-brand-gray rounded-3xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCoach(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Image */}
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-brand-black border border-brand-gray-light mb-5">
                {selectedCoach.image ? (
                  <img src={selectedCoach.image} alt={selectedCoach.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </div>
                )}
              </div>

              {/* Name */}
              <h2 className="font-display font-bold text-3xl uppercase tracking-wide text-white mb-2">
                {selectedCoach.name || ''}
              </h2>

              {/* Role Badge */}
              {selectedCoach.position && (
                <span className="inline-flex text-[10px] uppercase tracking-wider font-bold bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/30 mb-3">
                  {selectedCoach.position}
                </span>
              )}

              {/* Specialization Badge — only if different from role */}
              {selectedCoach.specialization && selectedCoach.specialization !== selectedCoach.position && (
                <span className="inline-flex text-[10px] uppercase tracking-wider font-bold bg-brand-blue/20 text-brand-blue px-3 py-1.5 rounded-full border border-brand-blue/30 mb-4">
                  {selectedCoach.specialization}
                </span>
              )}

              {/* Experience */}
              {selectedCoach.experience && (
                <div className="flex items-center gap-2 text-gray-400 text-xs font-mono bg-brand-black px-3 py-1.5 rounded-lg border border-brand-gray mb-4">
                  <History size={14} className="text-brand-blue" />
                  {selectedCoach.experience}
                </div>
              )}

              {/* Phone Number */}
              {(selectedCoach.phoneNumber) && (
                <a
                  href={`tel:${selectedCoach.phoneNumber.replace(/\D/g, '')}`}
                  className="flex items-center gap-2 text-gray-400 text-xs font-mono bg-brand-black px-3 py-1.5 rounded-lg border border-brand-gray mb-4 hover:text-brand-blue transition-colors"
                >
                  <Phone size={14} className="text-brand-blue" />
                  {selectedCoach.phoneNumber}
                </a>
              )}

              {/* Specialties Tags */}
              {selectedCoach.categories && selectedCoach.categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {selectedCoach.categories.map((s: string) => (
                    <span key={s} className="text-[10px] bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded border border-brand-blue/20">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio */}
              {selectedCoach.bio && (
                <p className="text-gray-400 text-sm leading-relaxed mb-5">{selectedCoach.bio}</p>
              )}

              {/* Status Badge */}
              <span className={`inline-flex text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border ${
                selectedCoach.isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}>
                {selectedCoach.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
