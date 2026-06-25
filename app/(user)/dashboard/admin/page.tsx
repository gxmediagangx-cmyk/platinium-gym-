"use client";

import React, { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, ShieldCheck, AlertTriangle, 
  Users, Activity, Clipboard, Plus, Trash2, 
  Edit3, Save, X, RefreshCw, ChevronRight, CheckCircle, Search, Dumbbell, Ruler, Loader2, MessageSquare
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, doc, updateDoc, getDoc,
  deleteDoc, addDoc, query, onSnapshot 
} from 'firebase/firestore';

export default function AdminPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  
  // App data states
  const [users, setUsers] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingKnowledge, setLoadingKnowledge] = useState<boolean>(true);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'knowledge' | 'feedback'>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  
  // New Coach Knowledge states
  const [newKnowledgeContent, setNewKnowledgeContent] = useState<string>('');
  const [addingKnowledge, setAddingKnowledge] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync users and coach knowledge real-time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        setIsAuthenticated(userSnap.data()?.role === 'admin');
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Error monitoring users collection:", error);
      setLoadingUsers(false);
    });

    const knowledgeQuery = query(collection(db, 'coach_knowledge'));
    const unsubscribeKnowledge = onSnapshot(knowledgeQuery, (snapshot) => {
      const knowledgeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setKnowledge(knowledgeList);
      setLoadingKnowledge(false);
    }, (error) => {
      console.error("Error monitoring coach_knowledge collection:", error);
      setLoadingKnowledge(false);
    });

    const unsubscribeFeedbacks = onSnapshot(collection(db, 'userFeedback'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setFeedbacks(list);
      setLoadingFeedbacks(false);
    }, () => setLoadingFeedbacks(false));

    return () => {
      unsubscribeUsers();
      unsubscribeKnowledge();
      unsubscribeFeedbacks();
    };
  }, [isAuthenticated]);

  // Handle access authentication via Firebase Auth + Firestore role check
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, adminEmail, password);
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      const role = userSnap.data()?.role;

      if (role === 'admin') {
        setIsAuthenticated(true);
      } else {
        await signOut(auth);
        setAuthError('Access denied. Admin role required.');
      }
    } catch (err: any) {
      setAuthError('Invalid credentials. Access denied.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      const role = userSnap.data()?.role;

      if (role === 'admin') {
        setIsAuthenticated(true);
      } else {
        await signOut(auth);
        setAuthError('Access denied. Admin role required.');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in failed. Try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    await signOut(auth);
  };

  // User entity updates
  const handleEditUserClick = (user: any) => {
    setEditingUser({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      weight: user.weight || '',
      height: user.height || '',
      activityRate: user.activityRate || 'Moderate'
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);

    try {
      const docRef = doc(db, 'users', editingUser.id);
      await updateDoc(docRef, {
        name: editingUser.name,
        email: editingUser.email,
        weight: Number(editingUser.weight),
        height: Number(editingUser.height),
        activityRate: editingUser.activityRate
      });
      showSuccess("Athlete profile updated successfully.");
      setEditingUser(null);
    } catch (err) {
      console.error("Failed to update user:", err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      const docRef = doc(db, 'users', deletingUser.id);
      await deleteDoc(docRef);
      showSuccess("Athlete profile deleted permanently.");
      setDeletingUser(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  // Coach Knowledge additions
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKnowledgeContent.trim()) return;
    setAddingKnowledge(true);

    try {
      await addDoc(collection(db, 'coach_knowledge'), {
        content: newKnowledgeContent.trim(),
        createdAt: new Date().toISOString()
      });
      setNewKnowledgeContent('');
      showSuccess("New guideline added to AI coach knowledge base.");
    } catch (err) {
      console.error("Failed to add AI knowledge:", err);
    } finally {
      setAddingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'coach_knowledge', docId));
      showSuccess("Guideline removed from AI coach knowledge base.");
    } catch (err) {
      console.error("Failed to delete knowledge:", err);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Calculated statistics
  const totalUsers = users.length;
  const validWeights = users.map(u => Number(u.weight)).filter(w => !isNaN(w) && w > 0);
  const avgWeight = validWeights.length > 0 
    ? Math.round(validWeights.reduce((a, b) => a + b, 0) / validWeights.length) 
    : 0;

  const validHeights = users.map(u => Number(u.height)).filter(h => !isNaN(h) && h > 0);
  const avgHeight = validHeights.length > 0 
    ? Math.round(validHeights.reduce((a, b) => a + b, 0) / validHeights.length) 
    : 0;

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.activityRate && user.activityRate.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-brand-black text-white selection:bg-brand-blue selection:text-black font-sans flex flex-col p-4 md:p-8">
      {/* Top action bar */}
      <header className="border-b border-brand-gray bg-brand-dark/50 backdrop-blur-md rounded-2xl mb-8 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center text-black font-display font-extrabold tracking-tighter text-xl">
            P
          </div>
          <div>
            <h1 className="font-display font-extrabold tracking-wider uppercase text-lg text-white">
              Platinum <span className="text-brand-blue">Gym</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-brand-blue opacity-85">ADMIN PORTAL</p>
          </div>
        </div>

        {isAuthenticated && (
          <button 
            id="admin-logout-btn"
            onClick={handleLogout}
            className="px-4 py-2 bg-brand-gray border border-brand-gray-light text-gray-300 hover:text-white rounded-lg font-display font-bold text-xs uppercase tracking-wider transition-colors hover:border-brand-blue/30"
          >
            Logout
          </button>
        )}
      </header>

      {/* Main flow wrapper */}
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col justify-center items-center">
        
        {successMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-brand-dark border-l-4 border-emerald-500 text-white rounded-xl py-3.5 px-5 shadow-2xl flex items-center gap-3 animate-slide-up">
            <CheckCircle className="text-emerald-500 shrink-0" size={18} />
            <span className="text-sm font-semibold tracking-wide">{successMsg}</span>
          </div>
        )}

        {authLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-brand-blue" />
          </div>
        ) : !isAuthenticated ? (
          <div className="w-full max-w-md bg-brand-dark border border-brand-gray p-8 rounded-3xl my-4">
            <div className="flex flex-col items-center text-center mb-8">
              <h2 className="font-display font-extrabold text-2xl tracking-wider">
                Coach Portal <span className="text-brand-blue">Login</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Sign in to manage gym content
              </p>
            </div>

            {authError && (
              <div className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-xs font-bold text-red-400 leading-relaxed">{authError}</p>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-blue transition-all"
                  required
                />
              </div>
              <div className="relative">
                <input 
                  id="admin-passwd-input"
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-brand-blue transition-all"
                  required
                />
                <button 
                  id="admin-passwd-visibility-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button 
                id="admin-auth-submit-btn"
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-blue text-black font-display font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-opacity-95 transition-all"
              >
                <ShieldCheck size={18} /> Sign In
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-gray-light"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-brand-dark px-4 text-xs text-gray-500 uppercase">or</span>
              </div>
            </div>

            <button
              id="admin-google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-100 text-black font-medium text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                  <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                  <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                </svg>
              )}
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-8 my-4">
            
            {/* Header Action bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-wider">
                  CONTROL <span className="text-brand-blue">CENTER</span>
                </h2>
                <p className="text-gray-400 text-sm mt-1">Gym operations monitoring, trainer AI knowledge alignment, and athlete roster administration.</p>
              </div>

              {/* Console Tabs */}
              <div className="flex overflow-x-auto bg-brand-dark p-1 rounded-xl border border-brand-gray self-start lg:self-center scrollbar-none">
                <button 
                  id="tab-overview-btn"
                  onClick={() => setActiveTab('overview')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-brand-blue text-black shadow-glow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  <Activity size={14} /> Overview
                </button>
                <button 
                  id="tab-users-btn"
                  onClick={() => setActiveTab('users')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-brand-blue text-black shadow-glow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  <Users size={14} /> Athletes Roster ({totalUsers})
                </button>
                <button 
                  id="tab-knowledge-btn"
                  onClick={() => setActiveTab('knowledge')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'knowledge' ? 'bg-brand-blue text-black shadow-glow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  <Clipboard size={14} /> AI Coach Rules ({knowledge.length})
                </button>
                <button 
                  onClick={() => setActiveTab('feedback')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'feedback' ? 'bg-brand-blue text-black shadow-glow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  <MessageSquare size={14} /> Feedback ({feedbacks.filter(f => !f.isRead).length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Stats Matrix Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold">Total Athletes</span>
                      <Users size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-extrabold tracking-tight">
                        {loadingUsers ? <RefreshCw className="animate-spin text-brand-blue/50" size={24} /> : totalUsers}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">Active Profiles</p>
                    </div>
                  </div>

                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold">Avg Athlete Weight</span>
                      <Dumbbell size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-extrabold tracking-tight">
                        {loadingUsers ? <RefreshCw className="animate-spin text-brand-blue/50" size={24} /> : `${avgWeight} kg`}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">Body Mass Index Input</p>
                    </div>
                  </div>

                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold">Avg Athlete Height</span>
                      <Ruler size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-extrabold tracking-tight">
                        {loadingUsers ? <RefreshCw className="animate-spin text-brand-blue/50" size={24} /> : `${avgHeight} cm`}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">Height Statistics</p>
                    </div>
                  </div>

                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold">AI Guidelines</span>
                      <Clipboard size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-extrabold tracking-tight">
                        {loadingKnowledge ? <RefreshCw className="animate-spin text-brand-blue/50" size={24} /> : knowledge.length}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">AI Coach Guidelines</p>
                    </div>
                  </div>

                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-2xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-gray-400 mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold">User Feedback</span>
                      <MessageSquare size={18} className="text-brand-blue" />
                    </div>
                    <div>
                      <div className="text-3xl font-display font-extrabold tracking-tight">
                        {loadingFeedbacks ? <RefreshCw className="animate-spin text-brand-blue/50" size={24} /> : feedbacks.length}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">{feedbacks.filter(f => !f.isRead).length} Unread</p>
                    </div>
                  </div>
                </div>

                {/* Sub panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                  {/* Recent Athletes */}
                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-3xl flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-display font-bold text-lg uppercase tracking-wider">Recent Athlete Registrations</h3>
                      <button 
                        onClick={() => setActiveTab('users')}
                        className="text-brand-blue hover:underline text-xs uppercase tracking-wider font-bold flex items-center gap-1"
                      >
                        See All <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {loadingUsers ? (
                        <div className="text-center py-6 text-gray-500 font-mono">Querying database...</div>
                      ) : users.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 font-mono">No athletes registered in the database.</div>
                      ) : (
                        users.slice(0, 5).map((u, i) => (
                          <div key={u.id || i} className="flex items-center justify-between p-3.5 bg-brand-black border border-brand-gray-light rounded-xl hover:border-brand-blue/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-gray-light font-display text-xs font-bold text-brand-blue flex items-center justify-center">
                                {u.name ? u.name[0].toUpperCase() : 'A'}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white">{u.name || 'Anonymous Athlete'}</h4>
                              </div>
                            </div>
                            <span className="text-[10px] uppercase font-bold px-2 py-1 bg-brand-gray-light border border-brand-gray text-gray-300 rounded">
                              {u.activityRate || 'Moderate'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Operational Settings Banner */}
                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 select-none pointer-events-none text-[150px] font-display font-black text-brand-blue leading-none">
                      PG
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/5 border border-brand-blue/20 text-brand-blue flex items-center justify-center">
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className="font-display font-bold text-lg uppercase tracking-wider">Secure Cloud Synced Connection</h3>
                      <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                        This administrative dashboard is direct-mapped to your safe Firebase Cloud Firestore instance protecting and updating all core parameters real-time. Changes modify production databases immediately.
                      </p>
                    </div>

                    <div className="pt-6 border-t border-brand-gray-light flex justify-between items-center text-xs mt-4">
                      <span className="text-gray-500 font-mono">Active Model Sync</span>
                      <span className="text-brand-blue font-bold font-mono tracking-widest bg-brand-blue/5 border border-brand-blue/15 px-2.5 py-1 rounded">
                        firebase@v12.x
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ATHLETES DIRECTORY */}
            {activeTab === 'users' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Search / Filter header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      id="athlete-search-input"
                      type="text"
                      placeholder="Search athletes by name, email, activity rate..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-brand-black border border-brand-dark text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all text-white placeholder:text-gray-500"
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Viewing {filteredUsers.length} of {totalUsers} athletes
                  </span>
                </div>

                {/* Table list */}
                <div className="bg-brand-dark border border-brand-gray rounded-3xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-brand-gray-light bg-brand-black/40 text-[10px] font-mono tracking-widest uppercase text-gray-400">
                        <th className="py-4 px-6">Athlete Profile</th>
                        <th className="py-4 px-6">Physical Stats</th>
                        <th className="py-4 px-6">Activity Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-gray-light">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-gray-500 font-mono">
                            Fetching from Firestore...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-gray-500 font-mono">
                            No matching athletes found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user, idx) => (
                          <tr key={user.id || idx} className="hover:bg-brand-black/20 transition-all font-medium">
                            {/* Profile cell */}
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center font-display font-extrabold text-sm text-brand-blue">
                                  {user.name ? user.name[0].toUpperCase() : 'A'}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white">{user.name || 'Anonymous Athlete'}</div>
                                </div>
                              </div>
                            </td>

                            {/* Weight / Height stat cell */}
                            <td className="py-5 px-6">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs text-white">
                                  <Dumbbell size={12} className="text-brand-blue opacity-80" />
                                  <span>{user.weight ? `${user.weight} kg` : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Ruler size={12} className="text-gray-500" />
                                  <span>{user.height ? `${user.height} cm` : 'N/A'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Activity Level */}
                            <td className="py-5 px-6">
                              <span className={`inline-block text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded border ${
                                user.activityRate === 'Very Active' || user.activityRate === 'Active'
                                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/25'
                                  : 'bg-brand-gray-light text-gray-300 border-brand-gray'
                              }`}>
                                {user.activityRate || 'Moderate'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AI COACH KNOWLEDGE BASE */}
            {activeTab === 'knowledge' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                {/* Guidelines creator */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-3xl flex flex-col gap-4 relative">
                    <h3 className="font-display font-extrabold text-lg uppercase tracking-wider">
                      Add New <span className="text-brand-blue">Guideline</span>
                    </h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Write raw instructions, nutritional recommendations, operational rules, or workout philosophies. The Gemini AI coach assistant automatically incorporates these rules to formulate tailored guidance responses for athletes.
                    </p>

                    <form onSubmit={handleAddKnowledge} className="flex flex-col gap-4 mt-2">
                      <textarea 
                        id="knowledge-textarea"
                        placeholder="e.g. 'At Platinum Gym, we recommend a core surplus of 300 kcal for lean muscle building blocks, while ensuring hydration targets of 35ml per kg bodyweight daily.'"
                        value={newKnowledgeContent}
                        onChange={(e) => setNewKnowledgeContent(e.target.value)}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl p-4 min-h-[160px] focus:outline-none focus:border-brand-blue resize-y placeholder:text-gray-600 leading-relaxed"
                        required
                        disabled={addingKnowledge}
                      />

                      <button 
                        id="add-knowledge-submit"
                        type="submit"
                        disabled={addingKnowledge || !newKnowledgeContent.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-blue text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-opacity-95 disabled:opacity-50 transition-all select-none"
                      >
                        <Plus size={16} /> {addingKnowledge ? 'Writing Core...' : 'Inject Guideline'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Guidelines directory list */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="bg-brand-dark border border-brand-gray p-6 rounded-3xl flex flex-col gap-4">
                    <h3 className="font-display font-bold text-lg uppercase tracking-wider">AI Coach Knowledge Directory</h3>
                    
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {loadingKnowledge ? (
                        <div className="text-center py-12 text-gray-500 font-mono">Fetching knowledge directory...</div>
                      ) : knowledge.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 font-mono text-xs max-w-sm mx-auto leading-relaxed">
                          No active context guidelines loaded. The AI Coach will revert to generic default training philosophies. Inject your first core guideline on the left.
                        </div>
                      ) : (
                        knowledge.map((item, idx) => (
                          <div key={item.id || idx} className="p-4 bg-brand-black border border-brand-gray-light rounded-2xl flex items-start gap-4 hover:border-brand-blue/15 transition-all">
                            <span className="w-6 h-6 rounded-lg bg-brand-blue/10 border border-brand-blue/15 text-brand-blue font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 select-none">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-300 leading-relaxed font-normal whitespace-pre-wrap">{item.content}</p>
                              {item.createdAt && (
                                <span className="text-[9px] font-mono text-gray-500 block mt-2">
                                  INJECTED: {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <button 
                              id={`delete-knowledge-${item.id}-btn`}
                              onClick={() => handleDeleteKnowledge(item.id)}
                              className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-950/10 transition-colors shrink-0"
                              title="Delete guideline"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FEEDBACK */}
            {activeTab === 'feedback' && (
              <div className="animate-fade-in">
                {loadingFeedbacks ? (
                  <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
                    <Loader2 size={32} className="animate-spin text-brand-blue mx-auto mb-4" />
                    <p className="text-gray-500 font-mono text-sm">Loading feedback...</p>
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
                    <MessageSquare size={48} className="text-brand-blue/30 mb-4" />
                    <p className="text-gray-500 font-display uppercase tracking-widest text-lg">No feedback received yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className={`bg-brand-dark border rounded-2xl p-6 transition-colors ${
                          fb.isRead ? 'border-brand-gray opacity-60' : 'border-brand-gray-light'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="font-bold text-white text-sm">{fb.userName || 'Anonymous'}</h3>
                            <p className="text-xs text-gray-400 font-mono">{fb.userEmail || ''}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-1">
                              {fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'userFeedback', fb.id), { isRead: !fb.isRead });
                                } catch {}
                              }}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                                fb.isRead
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-brand-black border-brand-gray text-gray-500 hover:text-gray-300'
                              }`}
                              title={fb.isRead ? 'Mark as unread' : 'Mark as read'}
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this feedback?')) {
                                  try {
                                    await deleteDoc(doc(db, 'userFeedback', fb.id));
                                  } catch {}
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-brand-black border border-brand-gray flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500 transition-colors"
                              title="Delete feedback"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{fb.message || fb.feedback || ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* EDIT ATHLETE PROFILES MODAL */}
            {editingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-brand-dark border border-brand-gray rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                  <button 
                    id="close-edit-modal-btn"
                    onClick={() => setEditingUser(null)} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                  
                  <h3 className="font-display font-bold text-xl uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Edit3 size={18} className="text-brand-blue" /> Edit Athlete Profile
                  </h3>

                  <form onSubmit={handleUpdateUser} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Athlete Name</label>
                      <input 
                        id="edit-athlete-name-input"
                        type="text" 
                        value={editingUser.name} 
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Email Address</label>
                      <input 
                        id="edit-athlete-email-input"
                        type="email" 
                        value={editingUser.email} 
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Weight (kg)</label>
                        <input 
                          id="edit-athlete-weight-input"
                          type="number" 
                          value={editingUser.weight} 
                          onChange={(e) => setEditingUser({ ...editingUser, weight: e.target.value })}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                          min="30"
                          max="300"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Height (cm)</label>
                        <input 
                          id="edit-athlete-height-input"
                          type="number" 
                          value={editingUser.height} 
                          onChange={(e) => setEditingUser({ ...editingUser, height: e.target.value })}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue"
                          min="100"
                          max="250"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Activity Level</label>
                      <select 
                        id="edit-athlete-activity-select"
                        value={editingUser.activityRate} 
                        onChange={(e) => setEditingUser({ ...editingUser, activityRate: e.target.value })}
                        className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
                      >
                        <option value="Sedentary">Sedentary (Little/no exercise)</option>
                        <option value="Light">Light (Exercise 1-3 days/week)</option>
                        <option value="Moderate">Moderate (Exercise 3-5 days/week)</option>
                        <option value="Active">Active (Exercise 6-7 days/week)</option>
                        <option value="Very Active">Very Active (Very hard exercise)</option>
                      </select>
                    </div>

                    <button 
                      id="save-athlete-changes"
                      type="submit"
                      disabled={submittingEdit}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-brand-blue text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-opacity-95 disabled:opacity-50 transition-all"
                    >
                      <Save size={16} /> {submittingEdit ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* DELETE USER CONFIRM MODAL */}
            {deletingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
                <div className="bg-brand-dark border-2 border-red-500/25 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-500/35 text-red-500 flex items-center justify-center mb-4">
                      <Trash2 size={24} />
                    </div>
                    
                    <h3 className="font-display font-black text-xl uppercase tracking-wider mb-2">Delete Profile Permanently?</h3>
                    <p className="text-gray-400 text-xs leading-relaxed mb-6">
                      Are you absolutely sure you want to delete the athlete profile for <span className="font-bold text-white">&quot;{deletingUser.name || 'Anonymous'}&quot;</span>? This database deletion is immediate and completely irreversible.
                    </p>

                    <div className="flex gap-4 w-full">
                      <button 
                        id="cancel-delete-athlete-btn"
                        onClick={() => setDeletingUser(null)}
                        className="flex-1 py-3 bg-brand-gray border border-brand-gray-light hover:border-white transition-colors text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl"
                      >
                        Abort Action
                      </button>
                      <button 
                        id="confirm-delete-athlete-btn"
                        onClick={handleDeleteUser}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 hover:text-white transition-colors text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Standalone clean subtle footer */}
      <footer className="py-8 bg-brand-black border-t border-brand-gray-light text-center text-xs text-gray-500 tracking-wider uppercase font-mono mt-auto">
        Platinum Gym Staff Portal &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
