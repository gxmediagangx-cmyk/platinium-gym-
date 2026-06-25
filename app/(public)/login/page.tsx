"use client";

import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn, AlertCircle, Mail, Lock, UserPlus, User, Activity, Dumbbell, Ruler } from 'lucide-react';

export default function Page() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityRate, setActivityRate] = useState('Moderate');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      
      // Check if user exists, if not create default profile
      const userRef = doc(db, 'users', cred.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: cred.user.displayName || 'Athlete',
          email: cred.user.email,
          weight: 70,
          height: 170,
          activityRate: 'Moderate',
          createdAt: new Date().toISOString()
        });
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    if (isSignUp && (!name || !weight || !height)) {
      setError("Please fill in all profile details.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name,
          email,
          weight: Number(weight),
          height: Number(height),
          activityRate,
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to ${isSignUp ? 'create account' : 'sign in'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-lg mx-auto px-6 min-h-screen">
      <h1 className="font-display font-bold text-4xl uppercase tracking-wider mb-8 text-center text-brand-blue">
        {isSignUp ? 'Join the Elite' : 'Sign In'}
      </h1>
      
      <div className="bg-brand-dark border border-brand-gray p-8 rounded-2xl flex flex-col gap-6 shadow-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isSignUp ? 'Create Profile' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400">
            {isSignUp ? 'Enter your details to generate your tailored program.' : 'Sign in to access your dashboard and fitness plan.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-brand-black p-1 rounded-lg border border-brand-gray">
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${!isSignUp ? 'bg-brand-dark text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${isSignUp ? 'bg-brand-dark text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {isSignUp && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gray text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="number" 
                    placeholder="Weight (kg)" 
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-brand-black border border-brand-gray text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                    disabled={loading}
                    min="30"
                    max="300"
                  />
                </div>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="number" 
                    placeholder="Height (cm)" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-brand-black border border-brand-gray text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
                    disabled={loading}
                    min="100"
                    max="250"
                  />
                </div>
              </div>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={activityRate}
                  onChange={(e) => setActivityRate(e.target.value)}
                  className="w-full bg-brand-black border border-brand-gray text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors appearance-none"
                  disabled={loading}
                >
                  <option value="Sedentary">Sedentary (Little/no exercise)</option>
                  <option value="Light">Light (Exercise 1-3 days/week)</option>
                  <option value="Moderate">Moderate (Exercise 3-5 days/week)</option>
                  <option value="Active">Active (Exercise 6-7 days/week)</option>
                  <option value="Very Active">Very Active (Very hard exercise/job)</option>
                </select>
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-black border border-brand-gray text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-black border border-brand-gray text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-brand-blue text-black hover:bg-opacity-90 transition-all rounded-lg font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-brand-gray"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-brand-gray"></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-brand-blue/10 text-brand-blue border border-brand-blue/30 hover:bg-brand-blue hover:text-white transition-all rounded-lg font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            <>
              <LogIn size={20} />
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

