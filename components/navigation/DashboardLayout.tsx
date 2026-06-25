"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Activity, LayoutDashboard, Dumbbell, Apple, 
  TrendingUp, Bot, User, Menu, X, LogOut, Settings, Award, Users, Calendar, ArrowLeft, Phone, BookOpen, MessageSquare
} from 'lucide-react';
import Logo from '@/components/Logo';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProgressNotification, setHasProgressNotification] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, 'users', user.uid, 'progressGoal', 'main'),
      (snap) => {
        if (snap.exists() && snap.data()?.status === 'completed_unclaimed') {
          setHasProgressNotification(true);
        } else {
          setHasProgressNotification(false);
        }
      },
      () => setHasProgressNotification(false)
    );

    return () => unsub();
  }, [user]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut(auth);
    router.push('/');
  };

  const sidebarLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Classes', href: '/dashboard/classes', icon: Calendar },
    { name: 'Coaches', href: '/dashboard/coaches', icon: Users },
    { name: 'Workouts', href: '/dashboard/workouts', icon: Dumbbell },
    { name: 'Nutrition', href: '/dashboard/nutrition', icon: Apple },
    { name: 'Progress', href: '/dashboard/progress', icon: TrendingUp },
    { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Bot, glow: true },
    { name: 'What\'s New', href: '/dashboard/whats-new', icon: Activity },
    { name: 'Contact', href: '/dashboard/contact', icon: Phone },
    { name: 'Guidelines', href: '/dashboard/guidelines', icon: BookOpen },
    { name: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Logo size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-brand-dark border-r border-brand-gray hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <Logo size="sm" />
        </div>
        
        <div className="px-4 py-6 flex-1 flex flex-col gap-2">
          {sidebarLinks.map(link => {
            const isActive = pathname === link.href;
            const isProgress = link.name === 'Progress';
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' : 'text-gray-400 hover:text-white hover:bg-brand-gray'}`}
              >
                <link.icon size={20} className={link.glow && !isActive ? 'text-brand-blue' : ''} />
                <span className="font-medium">{link.name}</span>
                {isProgress && hasProgressNotification && (
                  <span className="ml-auto w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                )}
                {link.glow && !isProgress && <span className="ml-auto w-2 h-2 rounded-full bg-brand-blue shadow-glow-sm"></span>}
              </Link>
            )
          })}
        </div>
        
        <div className="p-4 border-t border-brand-gray">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-black border border-brand-gray mb-4">
            <div className="w-8 h-8 rounded-full bg-brand-gray-light flex items-center justify-center overflow-hidden">
               <img src={user?.photoURL || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop"} alt="Avatar"/>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate text-white">{user?.displayName || "Gym Member"}</div>
              <div className="text-xs text-brand-blue truncate uppercase tracking-widest font-mono">Pro Member</div>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 mb-2 text-sm text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-brand-gray"
          >
            <ArrowLeft size={16} /> Back to Website
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2 w-full text-sm text-gray-500 hover:text-white transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header container */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-brand-dark border-b border-brand-gray flex items-center justify-between px-4 sticky top-0 z-30">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
             <button className="w-8 h-8 rounded-full bg-brand-gray-light overflow-hidden">
                <img src={user?.photoURL || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop"} alt="Avatar"/>
             </button>
             <button onClick={() => setIsMobileMenuOpen(true)}>
               <Menu size={24} className="text-gray-300" />
             </button>
          </div>
        </header>

        {/* Child Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {children}
        </main>
      </div>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-50 bg-brand-black/95 backdrop-blur-xl md:hidden flex flex-col transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
         <div className="flex items-center justify-between p-4 border-b border-brand-gray">
            <span className="font-display font-bold text-xl uppercase tracking-wider text-white">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X size={28} className="text-gray-300 hover:text-white" />
            </button>
         </div>
         <div className="flex flex-col p-4 gap-2 flex-1 overflow-y-auto">
           {sidebarLinks.map(link => {
              const isActive = pathname === link.href;
              const isProgress = link.name === 'Progress';
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${isActive ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' : 'text-gray-400'}`}
                >
                  <link.icon size={24} />
                  <span className="font-bold text-lg">{link.name}</span>
                  {isProgress && hasProgressNotification && (
                    <span className="ml-auto w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  )}
                </Link>
              )
           })}
         </div>
          <div className="shrink-0 px-8 py-6 space-y-2 border-t border-brand-gray">
             <Link
               href="/"
               onClick={() => setIsMobileMenuOpen(false)}
               className="flex items-center justify-center gap-2 w-full py-4 rounded-lg bg-brand-gray text-white font-bold uppercase tracking-wider"
             >
               <ArrowLeft size={18} /> Back to Website
             </Link>
             <button onClick={handleSignOut} className="flex items-center justify-center gap-2 w-full py-4 rounded-lg bg-red-950/40 text-red-400 font-bold uppercase tracking-wider">
               <LogOut size={18} /> Sign Out
             </button>
          </div>
      </div>
    </div>
  );
}
