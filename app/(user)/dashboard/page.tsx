"use client";

import React, { useEffect, useState } from 'react';
import { Dumbbell, Activity, Droplets, Flame, Target, ShieldAlert, Bot, Plus, ArrowRight, TrendingUp, Edit2, X, Save } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [todayDay, setTodayDay] = useState<any>(null);
  const [workoutLoading, setWorkoutLoading] = useState(true);
  const [progressGoal, setProgressGoal] = useState<any>(null);
  const [injuries, setInjuries] = useState<any[]>([]);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editActivity, setEditActivity] = useState('Moderate');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile(data);
          setEditName(data.name || '');
          setEditWeight(data.weight || '');
          setEditHeight(data.height || '');
          setEditActivity(data.activityRate || 'Moderate');
          setInjuries(data.injuries || []);
        } else {
          setUserProfile({ name: user.displayName || 'Athlete', weight: 0 });
        }

        try {
          const pgSnap = await getDoc(doc(db, 'users', user.uid, 'progressGoal', 'main'));
          if (pgSnap.exists()) setProgressGoal(pgSnap.data());
        } catch {
          // progress goal is optional
        }

        try {
          const q = query(collection(db, 'users', user.uid, 'workouts'));
          const snap = await getDocs(q);
          const active = snap.docs.find((d) => d.data().isActive === true);
          if (!active) {
            setActiveWorkout(null);
            setWorkoutLoading(false);
          } else {
            setActiveWorkout({ id: active.id, ...active.data() });

            const daysSnap = await getDocs(collection(db, 'users', user.uid, 'workouts', active.id, 'days'));
            const days = daysSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            if (days.length === 0) {
              setTodayDay(null);
              setWorkoutLoading(false);
            } else {
              const nowUtc = new Date();
              const cairoMs = nowUtc.getTime() + (3 * 60 * 60 * 1000);
              const cairo = new Date(cairoMs);
              // Roll back one day if before 3 AM Cairo
              if (cairo.getUTCHours() < 3) {
                cairo.setUTCDate(cairo.getUTCDate() - 1);
              }
              const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
              const todayName = weekdays[cairo.getUTCDay()];
              // Case-insensitive match as safety net
              const matchedDay = days.find(
                (d: any) => (d.dayName || '').trim().toLowerCase() === todayName.toLowerCase()
              );
              setTodayDay(matchedDay || null);
              setWorkoutLoading(false);
            }
          }
        } catch {
          setActiveWorkout(null);
          setTodayDay(null);
          setWorkoutLoading(false);
        }
      } else {
        setWorkoutLoading(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, {
        name: editName,
        weight: Number(editWeight),
        height: Number(editHeight),
        activityRate: editActivity
      });
      setUserProfile((prev: any) => ({
        ...prev,
        name: editName,
        weight: Number(editWeight),
        height: Number(editHeight),
        activityRate: editActivity
      }));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (loading) {
    return <div className="p-8 pb-24 max-w-6xl mx-auto flex justify-center"><div className="animate-pulse flex items-center text-brand-blue font-bold uppercase">Loading...</div></div>;
  }

  // Calculate calories loosely based on weight & activity
  const baseCalories = userProfile?.weight ? userProfile.weight * 24 : 2000;
  const activityMultiplier = editActivity === 'Sedentary' ? 1.2 : editActivity === 'Light' ? 1.375 : editActivity === 'Moderate' ? 1.55 : editActivity === 'Active' ? 1.725 : 1.9;
  const maxCalories = Math.round(baseCalories * activityMultiplier);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            Welcome back, <span className="text-brand-blue">{userProfile?.name?.split(' ')[0] || 'Athlete'}</span>
          </h1>
          <p className="text-gray-400">Here&apos;s your summary for today.</p>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-dark border border-brand-gray rounded-xl hover:border-brand-blue transition-colors text-sm font-bold uppercase tracking-wider"
        >
          <Edit2 size={16} /> Edit Profile
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <h2 className="font-display font-bold text-2xl uppercase tracking-wider mb-6">Edit Profile</h2>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Name</label>
                <input 
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gray text-white rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Weight (kg)</label>
                  <input 
                    type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full bg-brand-black border border-brand-gray text-white rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Height (cm)</label>
                  <input 
                    type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)}
                    className="w-full bg-brand-black border border-brand-gray text-white rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Activity Rate</label>
                <select 
                  value={editActivity} onChange={(e) => setEditActivity(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gray text-white rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
                >
                  <option value="Sedentary">Sedentary (Little/no exercise)</option>
                  <option value="Light">Light (Exercise 1-3 days/week)</option>
                  <option value="Moderate">Moderate (Exercise 3-5 days/week)</option>
                  <option value="Active">Active (Exercise 6-7 days/week)</option>
                  <option value="Very Active">Very Active (Very hard work)</option>
                </select>
              </div>
              <button 
                onClick={handleSaveProfile}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-brand-blue text-black hover:bg-opacity-90 transition-all rounded-lg font-bold uppercase tracking-wider"
              >
                <Save size={20} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        
        {/* Today's Workout */}
        <div className="md:col-span-8 bg-brand-dark rounded-3xl border border-brand-gray p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-[80px] -mr-20 -mt-20"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue border border-brand-blue/30">
               <Dumbbell size={20} />
             </div>
             <h2 className="font-display font-bold text-xl uppercase tracking-wider">Today&apos;s Workout</h2>
          </div>
          
          <div className="relative z-10">
            {workoutLoading ? (
              <div className="animate-pulse">
                <div className="h-4 w-32 bg-brand-gray rounded-lg mb-3" />
                <div className="h-10 w-72 bg-brand-gray rounded-lg mb-2" />
                <div className="h-5 w-48 bg-brand-gray rounded-lg mb-8" />
                <div className="h-14 w-44 bg-brand-gray rounded-xl" />
              </div>
            ) : !activeWorkout ? (
              <>
                <h3 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tight mb-2">No Active Workout</h3>
                <p className="text-gray-400 mb-8 max-w-md">You haven&apos;t set a workout plan as active yet.</p>
                <Link
                  href="/dashboard/workouts"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-gray-600 text-gray-400 font-display font-bold uppercase tracking-wider transition-all hover:border-gray-400 hover:text-white"
                >
                  Set Up Workout <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm uppercase tracking-[0.2em] text-brand-blue font-bold mb-3">{activeWorkout.name || ''}</p>
                <h3 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tight mb-2 group-hover:text-brand-blue transition-colors">{todayDay?.dayName || ''}</h3>
                {todayDay?.dayLabel && (
                  <p className="text-2xl text-gray-300 font-bold uppercase tracking-wider mb-8">{todayDay.dayLabel}</p>
                )}
                {!todayDay?.dayLabel && <div className="mb-8" />}
                <Link
                  href={`/dashboard/workouts/${activeWorkout.id}`}
                  className="w-full sm:w-auto relative group/btn overflow-hidden rounded-xl bg-brand-blue/10 px-8 py-4 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black focus:ring-2 focus:ring-brand-blue focus:outline-none inline-block"
                >
                  <span className="absolute inset-0 border border-brand-blue/50 rounded-xl group-hover/btn:border-transparent"></span>
                  <span className="font-display font-bold tracking-wider uppercase flex items-center justify-center gap-2">
                    Start Workout <Plus size={18} />
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* AI Assistant Shortcut */}
        <div className="md:col-span-4 bg-purple-500/10 rounded-3xl border border-purple-500/20 p-6 flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                  <Bot size={20} />
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider text-purple-400">AI Coach</h2>
             </div>
             <p className="text-gray-300 text-sm leading-relaxed mb-6">Ask about your form, nutrition alternatives, or workout adjustments.</p>
           </div>
           <Link href="/dashboard/ai-assistant" className="w-full bg-purple-500 text-black rounded-xl px-6 py-4 font-display font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:bg-purple-400 transition-colors">
              Chat Now <ArrowRight size={18} />
           </Link>
        </div>

        {/* Mini Stats Row */}
        <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-2">
          
          {/* Weight */}
          <div className="bg-brand-dark rounded-2xl border border-brand-gray p-5 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-gray-400">
               <Activity size={16} />
               <span className="text-xs uppercase tracking-widest font-bold">Weight</span>
            </div>
            <div className="flex items-end gap-2">
               <span className="font-display font-bold text-3xl">{userProfile?.weight || 0}</span>
               <span className="text-sm font-mono text-gray-500 mb-1">KG</span>
            </div>
          </div>
          
          {/* Fitness Goal */}
          <Link href="/dashboard/progress" className="bg-brand-dark rounded-2xl border border-brand-gray p-5 flex flex-col justify-between h-32 hover:border-brand-blue/50 transition-colors">
            <div className="flex items-center gap-2 text-gray-400">
               <Target size={16} />
               <span className="text-xs uppercase tracking-widest font-bold">Goal</span>
            </div>
            {progressGoal ? (
               <div className="flex flex-col gap-0.5">
                 <span className="text-sm font-bold text-white leading-tight">{progressGoal.label || 'Body Transformation Goal'}</span>
                 <span className="text-xs text-brand-blue font-mono">Target: {progressGoal.targetWeight} kg</span>
               </div>
            ) : (
               <div className="flex flex-col gap-0.5">
                 <span className="text-sm text-gray-500">No active goal</span>
                 <span className="text-xs text-gray-600">Set one in Progress</span>
               </div>
            )}
          </Link>
          
          {/* Health Restrictions */}
          <Link href="/dashboard/profile" className="bg-brand-dark rounded-2xl border border-brand-gray p-5 flex flex-col justify-between h-32 hover:border-brand-blue/50 transition-colors">
            <div className="flex items-center gap-2">
               <ShieldAlert size={16} className={injuries.length > 0 ? 'text-red-400' : 'text-gray-400'} />
               <span className={`text-xs uppercase tracking-widest font-bold ${injuries.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>Health</span>
            </div>
            {injuries.length > 0 ? (
               <div className="flex flex-col gap-1">
                 <span className="text-sm font-bold text-white leading-tight">{injuries[0].text.length > 60 ? injuries[0].text.slice(0, 60) + '...' : injuries[0].text}</span>
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${
                   injuries[0].severity === 'High' ? 'bg-red-500/20 text-red-400' :
                   injuries[0].severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                   'bg-green-500/20 text-green-400'
                 }`}>{injuries[0].severity}</span>
               </div>
            ) : (
               <span className="text-sm text-gray-500">No restrictions</span>
            )}
          </Link>

          {/* Progress Shortcut */}
          <Link href="/dashboard/progress" className="bg-brand-blue/5 rounded-2xl border border-brand-blue/20 p-5 flex flex-col justify-center items-center h-32 hover:bg-brand-blue/10 transition-colors cursor-pointer group block">
             <TrendingUp size={24} className="text-brand-blue mb-2 group-hover:scale-110 transition-transform" />
             <span className="font-display font-bold uppercase tracking-wider text-sm text-brand-blue text-center">Progress<br/>Overview</span>
          </Link>

        </div>

      </div>
    </div>
  );
}
