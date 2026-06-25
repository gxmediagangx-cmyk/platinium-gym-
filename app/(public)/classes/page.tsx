"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Users, Flame, Calendar, MapPin, Target, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

type ClassData = {
  id: string;
  title: string;
  description: string;
  schedule: string;
  coach: string;
  level: string;
  intensity: string;
  image: string;
  category: string;
  createdAt?: any;
};

export default function ClassesPage() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("All");
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, "classes"), where("isActive", "==", true));
        const snap = await getDocs(q);
        const items: ClassData[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.name || "",
            description: data.description || "",
            schedule: data.schedule || "",
            coach: data.coachName || "",
            level: data.difficulty || "All Levels",
            intensity: data.difficulty || "All Levels",
            image: data.imageUrl || "",
            category: data.category || "Custom",
            createdAt: data.createdAt,
          };
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return ta - tb;
        });
        setClasses(items);
      } catch {
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const categories = ["All", ...Array.from(new Set(classes.map(c => c.category)))];

  const filteredClasses = activeTab === "All"
    ? classes
    : classes.filter(c => c.category === activeTab);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs uppercase tracking-widest font-bold mb-4">
            <Flame size={14} /> Group Training
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-wider mb-4">
            Our <span className="text-brand-blue">Classes</span>
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            From high-intensity combat sports to rhythmic dancing and youth fitness. Find your perfect class and push your boundaries together.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-6 py-2.5 rounded-full font-display font-bold text-sm uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
              activeTab === cat
                ? 'bg-brand-blue text-brand-black shadow-glow-sm'
                : 'bg-brand-dark border border-brand-gray text-gray-400 hover:border-brand-gray-light hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Class List */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 size={32} className="animate-spin mb-4 text-brand-blue" />
            <p className="font-display uppercase tracking-wider text-sm">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
            <p className="text-gray-400 font-display uppercase tracking-widest">No classes available yet.</p>
          </div>
        ) : (
          filteredClasses.map((cls, idx) => (
            <div key={cls.id || idx} className="bg-brand-dark border border-brand-gray rounded-3xl overflow-hidden group hover:border-brand-gray-light transition-all duration-500 flex flex-col md:flex-row">

              {/* Image Side */}
              <div className="md:w-2/5 md:min-h-full aspect-video md:aspect-auto relative overflow-hidden shrink-0">
                 <div className="absolute inset-0 bg-brand-black/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                 {cls.image ? (
                   <img src={cls.image} alt={cls.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 ) : (
                   <div className="absolute inset-0 w-full h-full bg-brand-gray flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                   </div>
                 )}
                 <div className="absolute top-4 left-4 z-20">
                   <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-blue/20 text-brand-blue px-3 py-1.5 rounded-full backdrop-blur-md border border-brand-blue/30 inline-block">
                     {cls.intensity} Intensity
                   </span>
                 </div>
              </div>

              {/* Content Side */}
              <div className="p-8 md:p-10 flex-1 flex flex-col justify-center relative">
                 <div className="absolute right-0 top-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                 <h3 className="font-display font-bold text-3xl md:text-4xl uppercase tracking-wide mb-4 group-hover:text-brand-blue transition-colors">
                   {cls.title}
                 </h3>
                 <p className="text-gray-400 leading-relaxed mb-8 max-w-2xl">
                   {cls.description}
                 </p>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                   <div className="bg-brand-black border border-brand-gray-light rounded-xl p-4 flex flex-col gap-2">
                     <Calendar size={18} className="text-brand-blue" />
                     <div className="text-sm font-bold text-white">{cls.schedule}</div>
                     <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Schedule</div>
                   </div>
                   <div className="bg-brand-black border border-brand-gray-light rounded-xl p-4 flex flex-col gap-2">
                     <Users size={18} className="text-brand-blue" />
                     <div className="text-sm font-bold text-white">{cls.coach}</div>
                     <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Instructor</div>
                   </div>
                   <div className="bg-brand-black border border-brand-gray-light rounded-xl p-4 flex flex-col gap-2">
                     <Target size={18} className="text-brand-blue" />
                     <div className="text-sm font-bold text-white">{cls.level}</div>
                     <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Required Level</div>
                   </div>
                    <div className="bg-brand-black border border-brand-gray-light rounded-xl p-4 flex flex-col gap-2 justify-center items-center">
                       <Link href={pathname.startsWith('/dashboard') ? '/dashboard/contact' : '/contact'} className="w-full h-full min-h-[60px] relative group/btn overflow-hidden rounded-lg bg-brand-blue/10 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black hover:shadow-glow-hover active:scale-95 flex items-center justify-center">
                         <span className="absolute inset-0 border border-brand-blue/50 rounded-lg group-hover/btn:border-transparent"></span>
                         <span className="font-display font-bold tracking-wider uppercase text-sm">Join</span>
                       </Link>
                    </div>
                 </div>
              </div>

            </div>
          ))
        )}

        {!loading && classes.length > 0 && filteredClasses.length === 0 && (
          <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
            <p className="text-gray-400 font-display uppercase tracking-widest">No classes found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
