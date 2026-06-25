"use client";

import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar, Loader2, Newspaper, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

type Post = {
  id: string;
  title: string;
  date: string;
  content: string;
  imageUrl: string;
  createdAt?: any;
};

const cornerStyles: Record<Corner, React.CSSProperties> = {
  "bottom-right": { bottom: 24, right: 24 },
  "bottom-left": { bottom: 24, left: 24 },
  "top-right": { top: 24, right: 24 },
  "top-left": { top: 24, left: 24 },
};

type ArrowDef = { icon: React.ElementType; dir: Corner; label: string };

const arrowMap: Record<Corner, [ArrowDef, ArrowDef]> = {
  "bottom-right": [
    { icon: ArrowLeft, dir: "bottom-left", label: "Move left" },
    { icon: ArrowUp, dir: "top-right", label: "Move up" },
  ],
  "bottom-left": [
    { icon: ArrowRight, dir: "bottom-right", label: "Move right" },
    { icon: ArrowUp, dir: "top-left", label: "Move up" },
  ],
  "top-right": [
    { icon: ArrowLeft, dir: "top-left", label: "Move left" },
    { icon: ArrowDown, dir: "bottom-right", label: "Move down" },
  ],
  "top-left": [
    { icon: ArrowRight, dir: "top-right", label: "Move right" },
    { icon: ArrowDown, dir: "bottom-left", label: "Move down" },
  ],
};

export default function WhatsNewBubble() {
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('whatsNew_lastSeen') : null;
    return stored ? Number(stored) : 0;
  });

  useEffect(() => {
    const q = query(collection(db, "whatsNew"), where("isActive", "==", true));
    const unsub = onSnapshot(q,
      (snap) => {
        const items: Post[] = [];
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let recent = 0;
        snap.forEach((d) => {
          const data = d.data();
          const post = {
            id: d.id,
            title: data.title || "",
            date: data.date || "",
            content: data.content || "",
            imageUrl: data.imageUrl || "",
            createdAt: data.createdAt,
          };
          items.push(post);
          const ts = data.createdAt?.toMillis?.() ?? 0;
          if (ts >= sevenDaysAgo && ts > lastSeenAt) recent++;
        });
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setPosts(items);
        setUnreadCount(recent);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [lastSeenAt]);

  const arrows = arrowMap[corner];

  return (
    <>
      {/* Bubble + Arrows Container */}
      <div
        className="fixed z-50 flex items-center gap-2"
        style={{ ...cornerStyles[corner], transition: "all 0.3s ease", flexDirection: corner.startsWith("bottom") ? "row" : "row" }}
      >
        {/* Directional Arrows */}
        <div className={`flex gap-1.5 ${corner.startsWith("bottom") ? "items-end" : "items-start"}`}>
          {arrows.map((arrow) => {
            const Icon = arrow.icon;
            return (
              <button
                key={arrow.dir}
                onClick={() => setCorner(arrow.dir)}
                title={arrow.label}
                className="w-9 h-9 rounded-full bg-brand-dark border border-brand-gray text-gray-400 hover:text-white hover:border-brand-blue/50 transition-all flex items-center justify-center"
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>

        {/* Bubble */}
        <button
          onClick={() => {
            if (!panelOpen) {
              const now = Date.now();
              localStorage.setItem('whatsNew_lastSeen', now.toString());
              setLastSeenAt(now);
            }
            setPanelOpen((prev) => !prev);
          }}
          className="w-14 h-14 rounded-full bg-brand-blue text-black shadow-glow flex items-center justify-center hover:scale-105 active:scale-95 transition-transform select-none shrink-0"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-brand-dark border-l border-brand-gray shadow-2xl transition-transform duration-300 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-gray-light">
          <div className="flex items-center gap-2">
            <Newspaper size={18} className="text-brand-blue" />
            <h2 className="font-display font-bold text-lg uppercase tracking-wider">What's New</h2>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-brand-gray transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-64px)] p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-brand-blue" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Newspaper size={36} className="text-brand-blue/20 mb-3" />
              <p className="text-gray-500 font-display uppercase tracking-widest text-sm">No news yet</p>
              <p className="text-gray-600 text-xs mt-1">Check back soon.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-brand-black border border-brand-gray rounded-2xl p-4">
                  {post.date && (
                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mb-2">
                      <Calendar size={10} className="text-brand-blue/70" /> {post.date}
                    </p>
                  )}
                  <h3 className="font-display font-bold text-sm uppercase tracking-wide text-white mb-2">
                    {post.title || ''}
                  </h3>
                  {post.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden bg-brand-black border border-brand-gray-light">
                      <img src={post.imageUrl} alt={post.title} className="w-full max-h-32 object-cover" />
                    </div>
                  )}
                  {post.content && (
                    <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
