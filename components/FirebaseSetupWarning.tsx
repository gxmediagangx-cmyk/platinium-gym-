"use client";

import React from 'react';
import { ShieldAlert, KeyRound, Database, Sparkles, LogIn, ExternalLink, RefreshCw } from 'lucide-react';
import Logo from './Logo';

export default function FirebaseSetupWarning() {
  const envKeys = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', desc: 'Firebase Web API Key' },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', desc: 'Auth Domain URL' },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', desc: 'Firebase Project ID' },
    { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', desc: 'Storage Bucket URI' },
    { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', desc: 'Messaging Sender ID' },
    { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', desc: 'Application Unique ID ID' },
  ];

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-brand-black text-white font-sans flex flex-col justify-between p-6 selection:bg-brand-blue selection:text-black">
      {/* Decorative Top Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-purple-500 to-brand-blue"></div>

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full py-4 flex justify-between items-center z-10">
        <Logo size="md" />
        <span className="text-[10px] uppercase font-mono tracking-widest text-brand-blue bg-brand-blue/10 px-3 py-1.5 rounded-full border border-brand-blue/20">
          ● Platform Setup Mode
        </span>
      </header>

      {/* Main Panel */}
      <main className="max-w-4xl mx-auto w-full my-auto flex flex-col lg:flex-row items-center gap-12 py-12 z-10">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs uppercase tracking-widest font-bold font-mono">
            <ShieldAlert size={14} className="animate-pulse" /> Authentication & Database Required
          </div>
          
          <h1 className="font-display font-extrabold text-4xl md:text-6xl uppercase tracking-tight leading-[0.9]">
            Let&apos;s Link <br />
            Your <span className="text-brand-blue">Firebase</span>
          </h1>
          
          <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light">
            To keep your workout logs, customized progress schedules, and group gym classes secure, this platinum-tier fit tech application uses a dedicated Firebase database.
          </p>

          <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">
            Don&apos;t worry - no coding required! As a vibe coder, you just need to drop your credentials into the project config.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={handleRefresh}
              className="px-6 py-3.5 bg-brand-blue hover:bg-opacity-90 text-black font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-glow-sm flex items-center gap-2"
            >
              <RefreshCw size={14} className="animate-spin" /> Recharge & Retry Connection
            </button>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3.5 bg-brand-gray border border-brand-gray-light hover:border-brand-blue/30 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
            >
              Open Firebase Console <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Steps Card */}
        <div className="w-full lg:w-[480px] bg-brand-dark border border-brand-gray rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col gap-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-[40px] -mr-10 -mt-10"></div>
          
          <div>
            <h3 className="font-display font-extrabold text-xl uppercase tracking-wider text-white flex items-center gap-2">
              <KeyRound className="text-brand-blue" size={20} /> Setup Instructions
            </h3>
            <p className="text-xs text-gray-400 mt-1">Configure these environment variables in your AI Studio settings:</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {envKeys.map((item, idx) => (
              <div key={idx} className="bg-brand-black/50 border border-brand-gray-light p-3 rounded-xl flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold text-gray-400 select-all truncate">{item.key}</div>
                  <div className="text-[9px] text-brand-blue font-mono uppercase tracking-wider mt-0.5">{item.desc}</div>
                </div>
                <span className="text-[9px] font-mono uppercase bg-brand-gray border border-brand-gray-light px-2 py-0.5 rounded text-gray-500">Missing</span>
              </div>
            ))}
          </div>

          <hr className="border-brand-gray-light" />

          <div className="text-center">
            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider leading-relaxed">
              Once you populate these secrets in your upper-right <span className="text-white">Settings/Secrets panel</span>, the app will instantly life up.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-6 border-t border-brand-gray flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left text-xs text-gray-500 font-mono z-10">
        <div>© {new Date().getFullYear()} PLATINUM GYM FIT TECH HUB. ALL RIGHTS RESERVED.</div>
        <div className="flex gap-4">
          <span className="text-brand-blue font-bold">VIBE-STABLE DESIGN GATEWAY</span>
        </div>
      </footer>
    </div>
  );
}
