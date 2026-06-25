"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Users, Dumbbell, Apple, TrendingUp,
  Sparkles, Tag, Brain, Loader2, BookOpen, ClipboardList, FileText
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export default function CoachDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalCoaches, setTotalCoaches] = useState(0);
  const [totalOffers, setTotalOffers] = useState(0);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setAdminName(currentUser.displayName || 'Coach');
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const classesSnap = await getDocs(collection(db, 'classes'));
        setTotalClasses(classesSnap.size);
      } catch {
        setTotalClasses(0);
      }

      try {
        const coachesSnap = await getDocs(collection(db, 'coaches'));
        setTotalCoaches(coachesSnap.size);
      } catch {
        setTotalCoaches(0);
      }

      try {
        const offersSnap = await getDocs(collection(db, 'offers'));
        setTotalOffers(offersSnap.size);
      } catch {
        setTotalOffers(0);
      }

      let templates = 0;
      try {
        const workoutSnap = await getDocs(collection(db, 'workoutTemplates'));
        templates += workoutSnap.size;
      } catch {}

      try {
        const nutritionSnap = await getDocs(collection(db, 'nutritionTemplates'));
        templates += nutritionSnap.size;
      } catch {}

      setTotalTemplates(templates);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Classes', value: totalClasses, icon: Calendar, color: 'blue' },
    { label: 'Total Coaches', value: totalCoaches, icon: Users, color: 'emerald' },
    { label: 'Active Offers', value: totalOffers, icon: Tag, color: 'orange' },
    { label: 'Active Templates', value: totalTemplates, icon: ClipboardList, color: 'purple' },
  ];

  const quickLinks = [
    {
      title: 'Classes',
      desc: 'Manage gym class schedule and categories.',
      href: '/coach/classes',
      icon: Calendar,
      color: 'blue',
    },
    {
      title: 'Coaches',
      desc: 'View and manage coaching staff.',
      href: '/coach/coaches',
      icon: Users,
      color: 'emerald',
    },
    {
      title: 'Templates',
      desc: 'Create workout programs and nutrition plans.',
      href: '/coach/workouts',
      icon: ClipboardList,
      color: 'orange',
    },
    {
      title: 'Transformations',
      desc: 'Review member transformation stories.',
      href: '/coach/transformations',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      title: "What's New",
      desc: 'Post updates and announcements.',
      href: '/coach/whats-new',
      icon: Sparkles,
      color: 'pink',
    },
    {
      title: 'Offers',
      desc: 'Create and manage promotions.',
      href: '/coach/offers',
      icon: Tag,
      color: 'amber',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs uppercase tracking-widest font-bold mb-4">
          <LayoutDashboard size={14} /> Dashboard
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          Welcome back, <span className="text-purple-400">{adminName}</span>
        </h1>
        <p className="text-gray-400">Manage your gym, content, and coaching team from one place.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => {
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          };
          return (
            <div
              key={card.label}
              className="bg-brand-dark border border-brand-gray rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-bold text-gray-400">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-xl ${colorMap[card.color]} border flex items-center justify-center`}>
                  <card.icon size={16} />
                </div>
              </div>
              <div className="text-3xl font-display font-extrabold tracking-tight text-white">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white mb-5">
        Quick <span className="text-purple-400">Links</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quickLinks.map((link) => {
          const borderMap: Record<string, string> = {
            blue: 'hover:border-blue-400',
            emerald: 'hover:border-emerald-400',
            orange: 'hover:border-orange-400',
            purple: 'hover:border-purple-400',
            pink: 'hover:border-pink-400',
            amber: 'hover:border-amber-400',
          };
          const iconBgMap: Record<string, string> = {
            blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-500/20',
            emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20',
            orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20 group-hover:bg-orange-500/20',
            purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:bg-purple-500/20',
            pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20 group-hover:bg-pink-500/20',
            amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20',
          };
          return link.title === 'Templates' ? (
            <div
              key={link.title}
              className={`bg-brand-dark rounded-3xl border border-brand-gray p-6 flex flex-col justify-between group ${borderMap[link.color]} transition-all`}
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${iconBgMap[link.color]} border flex items-center justify-center transition-colors`}
                  >
                    <link.icon size={22} />
                  </div>
                  <h3 className="font-display font-bold text-xl uppercase tracking-wider text-white">
                    {link.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-5 line-clamp-2">{link.desc}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/coach/workout-templates"
                  className="flex-1 bg-brand-black border border-brand-gray text-white font-display font-bold text-xs uppercase tracking-wider px-3 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors hover:border-orange-400"
                >
                  <Dumbbell size={14} /> Workout
                </Link>
                <Link
                  href="/coach/nutrition-templates"
                  className="flex-1 bg-brand-black border border-brand-gray text-white font-display font-bold text-xs uppercase tracking-wider px-3 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors hover:border-orange-400"
                >
                  <Apple size={14} /> Nutrition
                </Link>
              </div>
            </div>
          ) : (
            <Link
              key={link.title}
              href={link.href}
              className={`bg-brand-dark rounded-3xl border border-brand-gray p-6 flex flex-col justify-between group ${borderMap[link.color]} transition-all`}
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${iconBgMap[link.color]} border flex items-center justify-center transition-colors`}
                  >
                    <link.icon size={22} />
                  </div>
                  <h3 className="font-display font-bold text-xl uppercase tracking-wider text-white">
                    {link.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-5 line-clamp-2">{link.desc}</p>
              </div>
              <div className="bg-brand-black border border-brand-gray text-white font-display font-bold text-sm uppercase tracking-wider px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors group-hover:border-inherit">
                Manage {link.title}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
