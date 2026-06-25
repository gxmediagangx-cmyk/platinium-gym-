"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, Loader2, Send, CheckCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const MAX_CHARS = 1000;
const FEEDBACK_TYPES = ["General", "Bug Report", "Feature Request", "Complaint", "Compliment"];

export default function DashboardFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("General");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const snap = await getDoc(doc(db, "users", user.uid));
          const data = snap.data();
          setUserProfile({
            name: data?.name || user.displayName || "",
            email: user.email || "",
          });
        }
      } catch {
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, "userFeedback"), {
        userId: user.uid,
        userName: userProfile?.name || "",
        userEmail: userProfile?.email || user.email || "",
        type: selectedType,
        message: trimmed,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setMessage("");
      setSelectedType("General");
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      console.log("Failed to submit feedback");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-brand-blue" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs uppercase tracking-widest font-bold mb-4">
          <MessageSquare size={14} /> Feedback
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          Send <span className="text-brand-blue">Feedback</span>
        </h1>
        <p className="text-gray-400">Help us improve — share your thoughts, report issues, or suggest features.</p>
      </div>

      {/* Success message */}
      {submitted && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-8 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-semibold">Thank you for your feedback!</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-brand-dark border border-brand-gray rounded-2xl p-6 md:p-8 space-y-6">
        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Feedback Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue appearance-none"
          >
            {FEEDBACK_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
            maxLength={MAX_CHARS}
            rows={8}
            placeholder="Tell us what's on your mind..."
            className="w-full bg-brand-black border border-brand-gray text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
            required
          />
          <span className={`text-[10px] font-mono text-right ${message.length >= MAX_CHARS ? "text-red-400" : "text-gray-500"}`}>
            {message.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !message.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 bg-brand-blue text-black font-display font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-opacity-90 disabled:opacity-40 transition-all"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {saving ? "Sending..." : "Submit Feedback"}
        </button>
      </form>

      {/* GX Team Watermark */}
      <div className="flex flex-col items-center justify-center pt-12 mt-8 border-t border-brand-gray/20">
        <img
          src="/logo_gym-removebg-preview.png"
          alt="Made by GX Team"
          className="w-28 h-28 object-contain opacity-85 brightness-110 hover:opacity-100 transition-all duration-300"
        />
        <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-gray-500 mt-3">
          Made by GX Team
        </p>
        <p className="text-[11px] font-mono text-gray-500 mt-1 tracking-wider">
          Contact for work: <span className="text-gray-300">01095777037</span>
        </p>
      </div>
    </div>
  );
}
