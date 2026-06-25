"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Activity, Users, MapPin, 
  Phone, Dumbbell, HeartPulse, Apple, 
  Star, Quote, ExternalLink, Menu, Target,
  Zap, Medal, Clock, Play, User
} from 'lucide-react';
import Logo from '@/components/Logo';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function CoachImage({ src, name, size }: { src: string; name: string; size: 'large' | 'small' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03] ${size === 'large' ? '' : 'z-10'}`}
      />
    );
  }
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center text-brand-gray-light ${size === 'large' ? '' : 'z-10'}`}>
      <User size={size === 'large' ? 64 : 32} className="opacity-30" />
    </div>
  );
}

export default function LandingPage() {
  const [siteStats, setSiteStats] = useState({
    machines: 20,
    coaches: 6,
    weeklyClasses: 8,
    workingHours: '11 AM - 1 PM Ladies Only\n1 PM - 2 AM Men',
    workingHoursExceptions: 'Except Sat, Mon, Wed 6-8 PM Ladies Only'
  });
  const [headCoach, setHeadCoach] = useState<any>(null);
  const [otherCoaches, setOtherCoaches] = useState<any[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'contact'));
        if (snap.exists()) {
          const d = snap.data();
          setSiteStats({
            machines: d.eliteMachines ?? 20,
            coaches: d.proCoaches ?? 6,
            weeklyClasses: d.weeklyClasses ?? 8,
            workingHours: d.workingHoursMain || '11 AM - 1 PM Ladies Only\n1 PM - 2 AM Men',
            workingHoursExceptions: d.workingHoursExceptions || 'Except Sat, Mon, Wed 6-8 PM Ladies Only',
          });
        }
      } catch {
        // fallback to defaults
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const snap = await getDocs(collection(db, 'coaches'));
        const all = snap.docs.map((d) => d.data());
        const active = all.filter((c: any) => c.isActive === true);
        const head = active.find((c: any) => (c.role || '').toLowerCase().includes('head')) || null;
        const others = active
          .filter((c: any) => head && c.name !== head.name)
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setHeadCoach(head);
        setOtherCoaches(others);
      } catch {
        // fallback to empty
      } finally {
        setCoachesLoading(false);
      }
    };
    fetchCoaches();
  }, []);

  return (
    <div className="min-h-screen bg-brand-black text-white font-sans selection:bg-brand-blue selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-brand-black/50 z-10" />
          <img 
            src="/10.jpg" 
            alt="Gym Background" 
            className="w-full h-full object-cover object-center opacity-60"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full">
          <div className="max-w-2xl">
            <h1 className="font-display font-bold text-6xl md:text-8xl uppercase tracking-tighter leading-[0.9] mb-2">
              Push <br />
              <span 
                className="bg-gradient-to-r from-brand-blue to-white text-transparent inline-block"
                style={{
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }}
              >
                Hard
              </span>
            </h1>
            <p className="text-white text-xl md:text-2xl font-bold uppercase tracking-widest mb-6">
              Go Further
            </p>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-lg font-light leading-relaxed">
              Experience the ultimate gaming-style fitness environment. Advanced machines, elite coaching, and a community built on strength.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={isLoggedIn ? '/dashboard' : '/login'} className="relative group overflow-hidden rounded-lg bg-brand-blue/10 px-8 py-4 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black hover:shadow-glow-hover active:scale-95 text-center">
                <span className="absolute inset-0 border border-brand-blue/50 rounded-lg group-hover:border-transparent"></span>
                <span className="font-display font-bold tracking-wider uppercase text-lg">Join Now</span>
              </Link>
              <Link href="/coaches" className="border border-brand-gray-light bg-brand-dark/50 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-display font-bold uppercase tracking-wider transition-all duration-300 hover:border-brand-blue/50 hover:text-brand-blue hover:bg-brand-blue/5 active:scale-95 flex items-center justify-center gap-2">
                View Coaches <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <div className="border-y border-brand-gray-light bg-brand-dark overflow-hidden relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-brand-gray-light/50">
             <div className="flex flex-col items-center justify-center text-center px-4">
                <div className="font-display font-bold text-3xl md:text-4xl text-white mb-2">{siteStats.machines}</div>
               <div className="text-sm font-mono uppercase tracking-widest text-brand-blue">Elite Machines</div>
             </div>
             
             <div className="flex flex-col items-center justify-center text-center px-4">
                <div className="font-display font-bold text-3xl md:text-4xl text-white mb-2">{siteStats.coaches}</div>
               <div className="text-sm font-mono uppercase tracking-widest text-brand-blue">Pro Coaches</div>
             </div>
             
             <div className="flex flex-col items-center justify-center text-center px-4 h-full">
                <div className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-white leading-tight mb-2 w-full max-w-[220px] whitespace-pre-line">
                  {siteStats.workingHours}
                </div>
                {siteStats.workingHoursExceptions && (
                  <span className="text-[9px] md:text-[10px] text-gray-400 normal-case tracking-normal">
                    ({siteStats.workingHoursExceptions})
                  </span>
                )}
              </div>
             
             <div className="flex flex-col items-center justify-center text-center px-4">
                <div className="font-display font-bold text-3xl md:text-4xl text-white mb-2">{siteStats.weeklyClasses}</div>
               <div className="text-sm font-mono uppercase tracking-widest text-brand-blue">Weekly Classes</div>
             </div>
          </div>
        </div>
      </div>

      {/* Coaches Section */}
      <section id="coaches" className="py-24 bg-brand-dark relative overflow-hidden border-y border-brand-gray">
        <div className="absolute left-0 bottom-0 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="font-display font-bold text-4xl md:text-5xl uppercase tracking-tight mb-4">
                Elite <span className="text-brand-blue">Coaches</span>
              </h2>
              <p className="text-gray-400 max-w-md">Train with our certified pros. Real masters dedicated to maximizing your results.</p>
            </div>
          </div>

          {/* Featured Head Coach Spotlight */}
          {coachesLoading && (
            <div className="mb-12 bg-gradient-to-r from-brand-black via-brand-dark/40 to-brand-black rounded-3xl border border-brand-blue/30 p-6 md:p-10 relative overflow-hidden animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-5 lg:col-span-4 max-w-sm mx-auto w-full">
                  <div className="aspect-square w-full rounded-2xl bg-brand-gray" />
                </div>
                <div className="md:col-span-7 lg:col-span-8 space-y-5">
                  <div className="h-6 w-48 rounded-full bg-brand-gray" />
                  <div className="h-4 w-24 rounded bg-brand-gray" />
                  <div className="h-10 w-72 rounded bg-brand-gray" />
                  <div className="h-16 w-full rounded bg-brand-gray" />
                  <div className="flex gap-4">
                    <div className="h-10 w-36 rounded-xl bg-brand-gray" />
                    <div className="h-10 w-36 rounded-xl bg-brand-gray" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {!coachesLoading && headCoach && (
          <div className="mb-12 bg-gradient-to-r from-brand-black via-brand-dark/40 to-brand-black rounded-3xl border border-brand-blue/30 p-6 md:p-10 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">

              {/* Head Coach Poster */}
              <div className="md:col-span-5 lg:col-span-4 max-w-sm mx-auto w-full">
                <div className="aspect-square w-full overflow-hidden rounded-2xl border border-brand-blue/40 shadow-glow-sm bg-brand-black relative group">
                  <CoachImage src={headCoach.photoUrl || headCoach.image || ''} name={headCoach.name || ''} size="large" />
                  <div className="absolute inset-0 border border-brand-blue/20 rounded-2xl pointer-events-none"></div>
                </div>
              </div>

              {/* Head Coach Spotlight Info */}
              <div className="md:col-span-7 lg:col-span-8 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/40 text-brand-blue text-xs uppercase tracking-widest font-bold font-mono">
                  ★ LEADERSHIP & EXCELLENCE
                </div>
                <div>
                  <div className="text-brand-blue text-xs font-mono uppercase tracking-widest mb-1">{headCoach.role || 'Head Coach'}</div>
                  <h3 className="font-display font-bold text-4xl md:text-5xl uppercase tracking-tighter text-white">
                    {headCoach.name || ''}
                  </h3>
                </div>
                <p className="text-gray-300 md:text-lg font-light leading-relaxed max-w-2xl">
                  {headCoach.description || headCoach.bio || ''}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  {(headCoach.experience) ? (
                    <div className="bg-brand-black/80 px-4 py-2 rounded-xl border border-brand-gray text-xs text-gray-400 font-mono">
                      Experience: <span className="text-white font-bold">{headCoach.experience}+ Years</span>
                    </div>
                  ) : null}
                  {(headCoach.specialization || headCoach.specialties?.[0]) ? (
                    <div className="bg-brand-black/80 px-4 py-2 rounded-xl border border-brand-gray text-xs text-gray-400 font-mono">
                      Speciality: <span className="text-white font-bold">{headCoach.specialization || headCoach.specialties?.[0]}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Grid of Other Elite Coaches */}
          {otherCoaches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 p-6 rounded-3xl border border-brand-gray-light bg-brand-black">
            {otherCoaches.map((coach, idx) => (
              <div key={idx} className="group relative flex flex-col h-full bg-brand-dark/40 p-4 rounded-2xl border border-brand-gray/35 hover:border-brand-blue/30 transition-all duration-300">
                {/* 1:1 Aspect Ratio Image Container */}
                <div className="aspect-square overflow-hidden bg-brand-black rounded-xl border border-brand-gray/50 relative">
                  <CoachImage src={coach.photoUrl || coach.image || ''} name={coach.name || ''} size="small" />
                </div>
                {/* Clean, Non-Overlapping Meta Section Below the Graphic */}
                <div className="pt-4 flex flex-col">
                  <div className="text-brand-blue text-xs font-mono uppercase tracking-widest">{coach.role || ''}</div>
                  <h3 className="font-display font-bold text-xl uppercase tracking-wide mt-1 text-white">{coach.name || ''}</h3>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="absolute right-0 top-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-4xl md:text-5xl uppercase tracking-tight mb-4">
              Premium <span className="text-brand-blue">Features</span>
            </h2>
            <p className="text-gray-400">Everything you need to level up your fitness journey in an environment designed for peak performance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Dumbbell, title: "Modern Equipment", desc: "State-of-the-art machines and free weights zone." },
              { icon: Target, title: "Professional Coaches", desc: "Expert guidance from certified personal trainers." },
              { icon: Activity, title: "Fitness Classes", desc: "High-energy group workouts for all levels." },
              { icon: Apple, title: "Nutrition Support", desc: "Customized meal plans to fuel your progress." }
            ].map((feature, idx) => (
              <div key={idx} className="bg-brand-dark p-8 rounded-2xl border border-brand-gray group hover:border-brand-blue/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-xl bg-brand-black border border-brand-gray-light flex items-center justify-center text-brand-blue mb-6 group-hover:shadow-glow-sm transition-all">
                  <feature.icon size={28} />
                </div>
                <h3 className="font-display font-bold text-xl uppercase tracking-wide mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section (Replaces long scroll) */}
      <section className="py-32 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-brand-dark"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-brand-black z-10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-20 text-center">
          <h2 className="font-display font-bold text-5xl md:text-7xl uppercase tracking-tighter mb-6">
            Unlock The <span className="text-brand-blue">Full</span> Experience
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Stop scrolling and start training. Join Platinum Gym today to get full access to our elite coaches, classes, and premium facilities.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href={isLoggedIn ? '/dashboard' : '/login'} className="relative group overflow-hidden rounded-xl bg-brand-blue/10 px-10 py-5 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black hover:shadow-glow-hover active:scale-95 inline-block">
              <span className="absolute inset-0 border border-brand-blue/50 rounded-xl group-hover:border-transparent"></span>
              <span className="font-display font-bold tracking-wider uppercase text-xl flex items-center justify-center gap-2">
                Join Now <Zap size={20} className="fill-current" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-gray bg-brand-black py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <Logo size="sm" link={false} />
          <p className="text-sm text-gray-500 font-mono text-center">
            © {new Date().getFullYear()} PLATINUM GYM. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-4 text-gray-500">
             <a href="#" className="hover:text-brand-blue transition-colors">
               <ExternalLink size={20} />
             </a>
          </div>
        </div>
      </footer>

      {/* GX Team Watermark */}
      <div className="w-full flex flex-col items-center justify-center py-16 mt-8 border-t border-brand-gray/30">
        <img
          src="/logo_gym-removebg-preview.png"
          alt="Made by GX Team"
          className="w-36 h-36 object-contain opacity-90 brightness-110 hover:opacity-100 transition-all duration-300"
        />
        <p className="text-xs font-mono uppercase tracking-[0.4em] text-gray-400 mt-4">
          Made by <span className="text-brand-blue font-bold">GX Team</span>
        </p>
        <p className="text-[11px] font-mono text-gray-500 mt-1 tracking-wider">
          Contact for work: <span className="text-gray-300">01095777037</span>
        </p>
      </div>

      {/* Fixed bottom powered by bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 py-2 bg-brand-black/80 backdrop-blur-md border-t border-brand-gray/20 pointer-events-none">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-600">
          Powered by <span className="text-brand-blue font-bold">GX Team</span>
        </p>
        <span className="text-gray-700 text-[10px]">•</span>
        <p className="text-[10px] font-mono text-gray-600 tracking-wider">01095777037</p>
      </div>
    </div>
  );
}

