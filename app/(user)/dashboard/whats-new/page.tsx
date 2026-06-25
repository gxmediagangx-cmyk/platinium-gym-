"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, Calendar, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type Post = {
  id: string;
  title: string;
  date: string;
  content: string;
  imageUrl: string;
  createdAt?: any;
};

export default function DashboardWhatsNewPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "whatsNew"), where("isActive", "==", true));
    const unsub = onSnapshot(q,
      (snap) => {
        const items: Post[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            title: data.title || "",
            date: data.date || "",
            content: data.content || "",
            imageUrl: data.imageUrl || "",
            createdAt: data.createdAt,
          });
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setPosts(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs uppercase tracking-widest font-bold mb-4">
          <Newspaper size={14} /> Updates
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          What's <span className="text-brand-blue">New</span>
        </h1>
        <p className="text-gray-400">Latest news and announcements from Platinum Gym.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-brand-blue" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Newspaper size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No news yet</p>
          <p className="text-gray-600 text-sm">Check back soon for updates.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-brand-dark border border-brand-gray rounded-2xl p-6 md:p-8 hover:border-brand-gray-light transition-all"
            >
              {post.date && (
                <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5 mb-3">
                  <Calendar size={12} className="text-brand-blue/70" /> {post.date}
                </p>
              )}
              <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-wide text-white mb-4">
                {post.title || ''}
              </h2>
              {post.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden bg-brand-black border border-brand-gray-light">
                  <img src={post.imageUrl} alt={post.title} className="w-full object-contain" />
                </div>
              )}
              {post.content && (
                <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
