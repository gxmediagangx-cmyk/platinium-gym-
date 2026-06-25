"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, Home, BookOpen, ClipboardList,
  FileText, Brain, Menu, X, LogOut, Users, ShieldAlert,
  LayoutDashboard, Calendar, Dumbbell, Apple, TrendingUp,
  Sparkles, Tag, ArrowLeft, Lock, Eye, EyeOff,
  ShieldCheck, AlertTriangle, Loader2, Phone, Camera
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const role = userSnap.data()?.role;
        setIsAuthenticated(role === 'admin' || role === 'coach');
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, adminEmail, password);
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      const role = userSnap.data()?.role;
      if (role === 'admin' || role === 'coach') {
        setIsAuthenticated(true);
        
      } else {
        await signOut(auth);
        setAuthError('Access denied. Coach or Admin role required.');
      }
    } catch {
      setAuthError('Invalid credentials. Access denied.');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      const role = userSnap.data()?.role;
      if (role === 'admin' || role === 'coach') {
        setIsAuthenticated(true);
        
      } else {
        await signOut(auth);
        setAuthError('Access denied. Coach or Admin role required.');
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in failed. Please try again or use email/password.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    await signOut(auth);
    router.push('/');
  };

  const sidebarLinks = [
    { name: 'Dashboard', href: '/coach', icon: LayoutDashboard },
    { name: 'Classes', href: '/coach/classes', icon: Calendar },
    { name: 'Coaches', href: '/coach/coaches', icon: Users },
    { name: 'Workout Templates', href: '/coach/workout-templates', icon: Dumbbell },
    { name: 'Nutrition Templates', href: '/coach/nutrition-templates', icon: Apple },
    { name: 'Transformations', href: '/coach/transformations', icon: TrendingUp },
    { name: "What's New", href: '/coach/whats-new', icon: Sparkles },
    { name: 'Offers', href: '/coach/offers', icon: Tag },
    { name: 'AI Global Memory', href: '/coach/ai-memory', icon: Brain, glow: true },
    { name: 'Contact', href: '/coach/contact', icon: Phone },
    { name: 'Guidelines', href: '/coach/guidelines', icon: BookOpen },
    { name: 'Photos', href: '/coach/photos', icon: Camera },
  ];

  if (loading) {
    return <div className="min-h-screen bg-brand-black flex items-center justify-center"><Loader2 size={32} className="animate-spin text-purple-400" /></div>;
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-brand-dark border border-brand-gray p-8 rounded-3xl relative overflow-hidden my-4">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
              <Lock size={32} />
            </div>
            <h2 className="font-display font-extrabold text-2xl tracking-wider uppercase mb-1">
              COACH <span className="text-purple-400">PORTAL</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono tracking-widest uppercase">
              Authorized Staff Only
            </p>
          </div>
          {authError && (
            <div className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs font-mono font-bold text-red-400 leading-relaxed">{authError}</p>
            </div>
          )}
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Admin Email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-purple-500 transition-all"
              required
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-purple-500 transition-all font-mono tracking-widest text-center"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 text-white font-display font-black text-sm uppercase tracking-widest rounded-xl hover:bg-purple-500 transition-all"
            >
              <ShieldCheck size={18} /> Verify Credentials
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-gray-light"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-brand-dark px-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">OR</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-800 text-sm font-bold rounded-xl transition-all border border-gray-300"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin text-gray-500" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Sign in with Google
          </button>

          <div className="mt-8 pt-6 border-t border-brand-gray-light flex flex-col gap-1 items-center">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Terminal Status: Protected
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-brand-dark border-r border-brand-gray hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <Link href="/coach" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded shadow-glow-sm bg-purple-500/20 border border-purple-500 flex items-center justify-center text-purple-500">
               <ShieldAlert size={18} />
            </div>
            <span className="font-display font-bold text-xl uppercase tracking-wider text-white">
              Coach Portal
            </span>
          </Link>
        </div>

        <div className="px-4 py-6 flex-1 flex flex-col gap-2">
          {sidebarLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-brand-gray'}`}
              >
                <link.icon size={20} className={link.glow && !isActive ? 'text-purple-400' : ''} />
                <span className="font-medium text-sm">{link.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-brand-gray">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-black border border-brand-gray mb-4">
            <div className="w-8 h-8 rounded-full bg-brand-gray-light flex items-center justify-center overflow-hidden">
               <img src={user?.photoURL || "https://images.unsplash.com/photo-1567598508481-65985588e295?w=100&h=100&fit=crop"} alt="Avatar"/>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate text-white">{user?.displayName || "Coach"}</div>
              <div className="text-xs text-purple-400 truncate uppercase tracking-widest font-mono">Head Coach</div>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 mb-2 text-sm text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-brand-gray"
          >
            <ArrowLeft size={16} /> Back to Website
          </Link>
          <button onClick={handleLogout} className="flex items-center w-full gap-3 px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-brand-gray">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header container */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-brand-dark border-b border-brand-gray flex items-center justify-between px-4 sticky top-0 z-30">
          <Link href="/coach" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-purple-500/20 border border-purple-500 flex items-center justify-center text-purple-500">
               <ShieldAlert size={18} />
            </div>
            <span className="font-display font-bold text-xl uppercase tracking-wider text-white">
              Coach Portal
            </span>
          </Link>
          <div className="flex items-center gap-3">
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
            <span className="font-display font-bold text-xl uppercase tracking-wider text-white">Coach Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X size={28} className="text-gray-300 hover:text-white" />
            </button>
         </div>
         <div className="flex flex-col p-4 gap-2 flex-1 overflow-y-auto">
           {sidebarLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${isActive ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-gray-400'}`}
                >
                  <link.icon size={24} />
                  <span className="font-bold text-lg">{link.name}</span>
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
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-4 rounded-lg bg-red-950/40 text-red-400 font-bold uppercase tracking-wider">
              <LogOut size={18} /> Logout
            </button>
         </div>
      </div>
    </div>
  );
}
