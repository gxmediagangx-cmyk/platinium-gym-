"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Dumbbell, Activity, Calendar, Award, 
  Trash2, Plus, Edit2, Save, X, CheckCircle, Circle, AlertTriangle, 
  Ruler, HelpCircle, Check, Sparkles, Shield, Lock, Loader2, Eye, EyeOff
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';

interface Goal {
  id: string;
  text: string;
  category: string;
  completed: boolean;
  createdAt: string;
}

interface Injury {
  id: string;
  text: string;
  severity: 'Low' | 'Medium' | 'High';
  date: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core editing state
  const [isEditingCore, setIsEditingCore] = useState(false);
  const [coreForm, setCoreForm] = useState({
    name: '',
    phone: '',
    activityRate: 'Moderate',
    weight: 0,
    height: 0,
    membershipTier: 'Pro Member'
  });

  // Goals dynamic states
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Strength');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');

  // Medical/Injuries dynamic states
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [newInjuryText, setNewInjuryText] = useState('');
  const [newInjurySeverity, setNewInjurySeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Account Security state
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load additional database stats
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setCoreForm({
            name: data.name || currentUser.displayName || '',
            phone: data.phone || '',
            activityRate: data.activityRate || 'Moderate',
            weight: Number(data.weight) || 0,
            height: Number(data.height) || 0,
            membershipTier: data.membershipTier || 'Pro Member'
          });
          setGoals(data.goals || []);
          setInjuries(data.injuries || []);
        } else {
          // Setup fallback structure
          const fallbackData = {
            name: currentUser.displayName || 'Athlete',
            email: currentUser.email || '',
            phone: '',
            activityRate: 'Moderate',
            weight: 75,
            height: 175,
            membershipTier: 'Pro Member',
            goals: [],
            injuries: []
          };
          setProfile(fallbackData);
          setCoreForm({
            name: fallbackData.name,
            phone: fallbackData.phone,
            activityRate: fallbackData.activityRate,
            weight: fallbackData.weight,
            height: fallbackData.height,
            membershipTier: fallbackData.membershipTier
          });
          setGoals([]);
          setInjuries([]);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleSaveCore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: coreForm.name,
        phone: coreForm.phone,
        activityRate: coreForm.activityRate,
        weight: Number(coreForm.weight),
        height: Number(coreForm.height),
        membershipTier: coreForm.membershipTier
      });
      setProfile((prev: any) => ({
        ...prev,
        name: coreForm.name,
        phone: coreForm.phone,
        activityRate: coreForm.activityRate,
        weight: Number(coreForm.weight),
        height: Number(coreForm.height),
        membershipTier: coreForm.membershipTier
      }));
      setIsEditingCore(false);
      triggerSuccess("Core training profile updated.");
    } catch (e) {
      console.error("Failed to update profile info:", e);
    }
  };

  // Sync to Firestore wrapper
  const syncGoalsToDatabase = async (updatedGoals: Goal[]) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { goals: updatedGoals });
      setGoals(updatedGoals);
    } catch (e) {
      console.error("Failed to update goals dynamically:", e);
    }
  };

  const syncInjuriesToDatabase = async (updatedInjuries: Injury[]) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { injuries: updatedInjuries });
      setInjuries(updatedInjuries);
    } catch (e) {
      console.error("Failed to update medical health limits:", e);
    }
  };

  const hasPasswordProvider = (user?.providerData ?? []).some(
    (p: any) => p.providerId === 'password'
  );

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(user, newPassword);
      setPasswordSuccess("Password updated successfully");
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordExpanded(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError("For security reasons, please log out and sign back in before changing your password.");
      } else {
        setPasswordError(err.message || "Failed to update password");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // GOAL INTERACTIONS
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const newGoal: Goal = {
      id: 'goal_' + Date.now(),
      text: newGoalText.trim(),
      category: newGoalCategory,
      completed: false,
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [...goals, newGoal];
    await syncGoalsToDatabase(updated);
    setNewGoalText('');
    triggerSuccess("Added milestone target.");
  };

  const handleToggleGoal = async (id: string) => {
    const updated = goals.map(g => {
      if (g.id === id) {
        return { ...g, completed: !g.completed };
      }
      return g;
    });
    await syncGoalsToDatabase(updated);
    triggerSuccess("Target status updated.");
  };

  const handleDeleteGoal = async (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    await syncGoalsToDatabase(updated);
    triggerSuccess("Goal removed successfully.");
  };

  const handleStartEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditingGoalText(goal.text);
  };

  const handleSaveGoalEdit = async (id: string) => {
    if (!editingGoalText.trim()) return;
    const updated = goals.map(g => {
      if (g.id === id) {
        return { ...g, text: editingGoalText.trim() };
      }
      return g;
    });
    await syncGoalsToDatabase(updated);
    setEditingGoalId(null);
    triggerSuccess("Goal description synced.");
  };

  // MEDICAL INJURY INTERACTIONS
  const handleAddInjury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInjuryText.trim()) return;

    const newInjury: Injury = {
      id: 'injury_' + Date.now(),
      text: newInjuryText.trim(),
      severity: newInjurySeverity,
      date: new Date().toLocaleDateString()
    };

    const updated = [...injuries, newInjury];
    await syncInjuriesToDatabase(updated);
    setNewInjuryText('');
    triggerSuccess("Health restriction submitted.");
  };

  const handleDeleteInjury = async (id: string) => {
    const updated = injuries.filter(inj => inj.id !== id);
    await syncInjuriesToDatabase(updated);
    triggerSuccess("Health limitation removed.");
  };

  if (loading) {
    return (
      <div className="p-8 pb-24 max-w-6xl mx-auto flex justify-center items-center pin-h-[50vh]">
        <div className="animate-pulse flex items-center text-brand-blue font-mono font-bold uppercase tracking-widest gap-2">
          <span>Retrieving credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Notifications */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-dark border-l-4 border-brand-blue text-white rounded-xl py-3.5 px-6 shadow-2xl flex items-center gap-3 animate-slide-up">
          <CheckCircle className="text-brand-blue shrink-0 animate-bounce" size={18} />
          <span className="text-sm font-semibold tracking-wide">{successMessage}</span>
        </div>
      )}

      {/* Header section styled elegantly */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl uppercase tracking-wider mb-2">
            My <span className="text-brand-blue">Profile</span>
          </h1>
          <p className="text-gray-400">Configure parameters, milestones, and physical fitness health guidelines.</p>
        </div>
        
        {!isEditingCore && (
          <button 
            id="edit-profile-action-btn"
            onClick={() => setIsEditingCore(true)}
            className="self-start md:self-end bg-brand-dark hover:bg-brand-gray border border-brand-gray-light hover:border-brand-blue transition-all duration-300 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2"
          >
            <Edit2 size={14} /> Update Core Metrics
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CORE INFO DISPLAY OR EDIT */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* PROFILE CARD */}
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-[40px] -mr-10 -mt-10"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 border-2 border-brand-blue/30 flex items-center justify-center font-display font-black text-2xl text-brand-blue shadow-glow-sm overflow-hidden shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile?.name ? profile.name[0].toUpperCase() : 'A'
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-white uppercase tracking-wider">{profile?.name || 'Athlete Name'}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-widest bg-brand-blue/15 border border-brand-blue/25 text-brand-blue font-bold">
                  {profile?.membershipTier || 'Pro Member'}
                </span>
                <p className="text-xs text-mono text-gray-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                  <Mail size={12} /> {profile?.email || 'N/A'}
                </p>
              </div>
            </div>

            <hr className="border-brand-gray-light mb-6" />

            {!isEditingCore ? (
              <div id="core-profile-view" className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-black/40 border border-brand-gray-light p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Weight</span>
                    <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-1">
                      {profile?.weight || '0'} <span className="text-xs text-gray-500 font-mono uppercase">kg</span>
                    </div>
                  </div>
                  <div className="bg-brand-black/40 border border-brand-gray-light p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Height</span>
                    <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-1">
                      {profile?.height || '0'} <span className="text-xs text-gray-500 font-mono uppercase">cm</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-black/40 border border-brand-gray-light p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Activity Rate</span>
                    <div className="text-xs font-bold text-brand-blue uppercase mt-1">
                      {profile?.activityRate || 'Moderate'}
                    </div>
                  </div>
                  <div className="bg-brand-black/40 border border-brand-gray-light p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Contact</span>
                    <div className="text-xs font-mono font-bold text-white mt-1">
                      {profile?.phone || 'No phone set'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form id="core-profile-form" onSubmit={handleSaveCore} className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Athlete Name</label>
                  <input 
                    id="profile-name-input"
                    type="text" 
                    value={coreForm.name}
                    onChange={(e) => setCoreForm({ ...coreForm, name: e.target.value })}
                    className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Weight (kg)</label>
                    <input 
                      id="profile-weight-input"
                      type="number" 
                      value={coreForm.weight}
                      onChange={(e) => setCoreForm({ ...coreForm, weight: Number(e.target.value) })}
                      className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                      min="30"
                      max="300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Height (cm)</label>
                    <input 
                      id="profile-height-input"
                      type="number" 
                      value={coreForm.height}
                      onChange={(e) => setCoreForm({ ...coreForm, height: Number(e.target.value) })}
                      className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue"
                      min="100"
                      max="250"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Contact Phone</label>
                    <input 
                      id="profile-phone-input"
                      type="text" 
                      placeholder="+1 (555) 123-4567"
                      value={coreForm.phone}
                      onChange={(e) => setCoreForm({ ...coreForm, phone: e.target.value })}
                      className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Activity Level</label>
                    <select 
                      id="profile-activity-select"
                      value={coreForm.activityRate}
                      onChange={(e) => setCoreForm({ ...coreForm, activityRate: e.target.value })}
                      className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
                    >
                      <option value="Sedentary">Sedentary (No exercise)</option>
                      <option value="Light">Light (1-3 days/week)</option>
                      <option value="Moderate">Moderate (3-5 days/week)</option>
                      <option value="Active">Active (6-7 days/week)</option>
                      <option value="Very Active">Very Active (Heavy training)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Membership Plan</label>
                  <select 
                    id="profile-membership-select"
                    value={coreForm.membershipTier}
                    onChange={(e) => setCoreForm({ ...coreForm, membershipTier: e.target.value })}
                    className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none animate-fade-in"
                  >
                    <option value="Pro Member">Pro Member Access</option>
                    <option value="Standard Coach">Standard Club Roster</option>
                    <option value="VIP Elite Athlete">VIP Elite Ambassador</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    id="profile-cancel-edit-btn"
                    type="button"
                    onClick={() => setIsEditingCore(false)}
                    className="flex-1 py-3 bg-brand-gray hover:bg-brand-gray-light text-center transition-colors text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl border border-brand-gray-light"
                  >
                    Cancel
                  </button>
                  <button 
                    id="profile-save-edit-btn"
                    type="submit"
                    className="flex-1 py-3 bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-glow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* BRONZE / GOLD BADGES STATS */}
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 flex flex-col gap-4">
            <h4 className="font-display font-bold text-md uppercase tracking-wider text-white flex items-center gap-2">
              <Award className="text-brand-blue" size={16} /> Club Badges & Level
            </h4>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/30 via-transparent to-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-white uppercase tracking-wider">Level 3 Platinum Athlete</div>
                <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-1 uppercase">Next: Master Tier (Goal count 5)</div>
              </div>
            </div>
          </div>

          {/* ACCOUNT SECURITY CARD */}
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 flex flex-col gap-4">
            <h4 className="font-display font-bold text-md uppercase tracking-wider text-white flex items-center gap-2">
              <Shield className="text-brand-blue" size={16} /> Account Security
            </h4>

            {/* Email display */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-black/50 border border-brand-gray-light">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-brand-blue" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">Email</div>
                <div className="text-sm font-bold text-white truncate">{user?.email || ''}</div>
              </div>
            </div>

            {/* Password section */}
            {hasPasswordProvider ? (
              <>
                {!passwordExpanded ? (
                  <button
                    onClick={() => setPasswordExpanded(true)}
                    className="flex items-center gap-2 text-sm text-brand-blue hover:text-white transition-colors font-display font-bold uppercase tracking-wider"
                  >
                    <Lock size={16} /> Change Password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4 animate-fade-in">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-brand-blue"
                          placeholder="Min. 8 characters"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-blue transition-colors"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-gray-400 mb-1">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-brand-blue"
                          placeholder="Re-enter new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-blue transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {passwordError && (
                      <div className="text-red-400 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle size={14} /> {passwordError}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="text-emerald-400 text-xs font-mono flex items-center gap-2">
                        <CheckCircle size={14} /> {passwordSuccess}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordExpanded(false);
                          setPasswordError(null);
                          setPasswordSuccess(null);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="flex-1 py-3 bg-brand-gray hover:bg-brand-gray-light transition-colors text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl border border-brand-gray-light"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex-1 py-3 bg-brand-blue hover:bg-opacity-95 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-glow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {passwordLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                <Shield size={14} /> Signed in with Google — password not applicable
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EXPANDABLE GOALS LIST AND MEDICAL LIMITS */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* PERSONAL GOALS & TRAINING MILESTONES (ADD, DELETE, STATUS CHANGE) */}
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center pb-2 border-b border-brand-gray">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase tracking-wider">
                  Fitness Milestones & <span className="text-brand-blue">Goals</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Add, modify, track progress or remove target workout logs.</p>
              </div>
            </div>

            {/* List of active targets */}
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {goals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-xs">
                  No fitness targets submitted yet. Establish your first milestone below.
                </div>
              ) : (
                goals.map((g) => {
                  const isEditing = editingGoalId === g.id;
                  return (
                    <div 
                      key={g.id} 
                      className={`p-4 bg-brand-black border rounded-2xl flex items-center justify-between gap-4 hover:border-brand-blue/10 transition-all ${
                        g.completed ? 'border-brand-gray-light bg-brand-black/20 opacity-75' : 'border-brand-gray'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Completion toggle state */}
                        <button 
                          id={`toggle-goal-${g.id}-btn`}
                          onClick={() => handleToggleGoal(g.id)}
                          className="text-gray-500 hover:text-brand-blue transition-colors shrink-0"
                        >
                          {g.completed ? (
                            <CheckCircle className="text-emerald-500" size={18} />
                          ) : (
                            <Circle className="text-gray-600 hover:text-brand-blue" size={18} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex gap-2 w-full">
                              <input 
                                id={`edit-goal-input-${g.id}`}
                                type="text"
                                value={editingGoalText}
                                onChange={(e) => setEditingGoalText(e.target.value)}
                                className="flex-1 bg-brand-gray border border-brand-gray-light rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-brand-blue"
                              />
                              <button 
                                id={`save-goal-edit-${g.id}`}
                                onClick={() => handleSaveGoalEdit(g.id)}
                                className="p-1 bg-brand-blue text-black rounded hover:bg-opacity-95 transition-all"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                id={`cancel-goal-edit-${g.id}`}
                                onClick={() => setEditingGoalId(null)}
                                className="p-1 bg-brand-gray text-white rounded hover:bg-brand-gray-light transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <p className={`text-sm text-white truncate font-medium ${g.completed ? 'line-through text-gray-500' : ''}`}>
                              {g.text}
                            </p>
                          )}
                          <div className="flex gap-2 items-center text-[9px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
                            <span className="text-brand-blue font-bold">{g.category}</span>
                            <span>•</span>
                            <span>Added: {g.createdAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Display action controls */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            id={`edit-goal-${g.id}-btn`}
                            onClick={() => handleStartEditGoal(g)}
                            className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-brand-gray-light rounded transition-colors"
                            title="Edit goal title"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            id={`delete-goal-${g.id}-btn`}
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                            title="Remove target"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Create Goal Form */}
            <form onSubmit={handleAddGoal} className="flex flex-col sm:flex-row gap-3 mt-2 border-t border-brand-gray pt-4">
              <input 
                id="goal-text-input"
                type="text"
                placeholder="e.g. Squat 110kg for 3 sets of 5 reps"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                className="flex-1 bg-brand-black border border-brand-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-600"
                required
              />
              <div className="flex gap-2 shrink-0">
                <select 
                  id="goal-category-select"
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                  className="bg-brand-black border border-brand-gray rounded-xl px-3 py-3 text-xs text-white uppercase focus:outline-none focus:border-brand-blue appearance-none font-bold tracking-wider"
                >
                  <option value="Strength">Strength</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Weight loss">Fat Loss</option>
                  <option value="Flexibility">Mobility</option>
                </select>
                <button 
                  id="add-goal-submit"
                  type="submit"
                  className="px-5 bg-brand-blue hover:bg-opacity-95 text-black rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-glow-sm"
                >
                  <Plus size={14} /> Add Target
                </button>
              </div>
            </form>
          </div>

          {/* MEDICAL RESTRICTIONS & INJURIES CARD */}
          <div className="bg-brand-dark border border-brand-gray rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center pb-2 border-b border-brand-gray">
              <div>
                <h3 className="font-display font-extrabold text-lg uppercase tracking-wider text-rose-400">
                  Health Limits & <span className="text-rose-500">Injuries</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Specify chronic soreness, backaches, or post-surgical limits safely.</p>
              </div>
            </div>

            {/* List of restrictions */}
            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1">
              {injuries.length === 0 ? (
                <div className="text-center py-6 text-gray-500 font-mono text-xs">
                  No limiting circumstances or injuries logged.
                </div>
              ) : (
                injuries.map((inj) => (
                  <div key={inj.id} className="p-4 bg-brand-black border border-brand-gray rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-950/30 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-100 font-bold leading-relaxed">{inj.text}</p>
                        <div className="flex gap-2 items-center text-[9px] font-mono text-gray-500 mt-1 uppercase tracking-wider">
                          <span className={`font-semibold ${
                            inj.severity === 'High' ? 'text-red-500' : inj.severity === 'Medium' ? 'text-orange-500' : 'text-yellow-500'
                          }`}>
                            {inj.severity} Severity
                          </span>
                          <span>•</span>
                          <span>Logged: {inj.date}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      id={`delete-injury-${inj.id}-btn`}
                      onClick={() => handleDeleteInjury(inj.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors shrink-0"
                      title="Delete limit"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create Injury Form */}
            <form onSubmit={handleAddInjury} className="flex flex-col sm:flex-row gap-3 mt-2 border-t border-brand-gray pt-4">
              <input 
                id="injury-text-input"
                type="text"
                placeholder="e.g. Chronic lower back disk strain / avoid heavy squats"
                value={newInjuryText}
                onChange={(e) => setNewInjuryText(e.target.value)}
                className="flex-1 bg-brand-black border border-brand-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-600"
                required
              />
              <div className="flex gap-2 shrink-0">
                <select 
                  id="injury-severity-select"
                  value={newInjurySeverity}
                  onChange={(e) => setNewInjurySeverity(e.target.value as any)}
                  className="bg-brand-black border border-brand-gray rounded-xl px-3 py-3 text-xs text-white uppercase focus:outline-none focus:border-brand-blue appearance-none font-bold tracking-wider"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">Severe / High</option>
                </select>
                <button 
                  id="add-injury-submit"
                  type="submit"
                  className="px-5 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/20 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> Add Restriction
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
