"use client";

import React, { useState, useEffect } from 'react';
import { Camera, X, Filter, ZoomIn, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const snap = await getDocs(collection(db, 'gymPhotos'));
        const list = snap.docs.map((d) => d.data());
        list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        setPhotos(list);
      } catch {
        // fallback to empty
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  // Close lightbox on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = ['All', ...Array.from(new Set(photos.map((p) => p.category || '').filter(Boolean)))];

  const filteredGallery = activeTab === "All"
    ? photos
    : photos.filter((item) => item.category === activeTab);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs uppercase tracking-widest font-bold mb-4">
            <Camera size={14} /> The Experience
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-wider mb-4">
            Facility <span className="text-brand-blue">Photos</span>
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            Take a look inside our premium facilities, intense classes, and the community that makes our gym a true powerhouse.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-blue mx-auto" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
          <p className="text-gray-400 font-display uppercase tracking-widest">No photos added yet</p>
        </div>
      ) : (
        <>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 no-scrollbar">
        <div className="flex items-center gap-2 text-gray-500 mr-2 whitespace-nowrap">
          <Filter size={18} /> <span className="font-display uppercase tracking-wider text-sm font-bold">Filter:</span>
        </div>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-6 py-2.5 rounded-full font-display font-bold text-sm uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
              activeTab === cat
                ? 'bg-brand-blue text-brand-black shadow-glow-sm'
                : 'bg-brand-dark border border-brand-gray text-gray-400 hover:border-brand-gray-light hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {filteredGallery.map((item, idx) => (
          <div
            key={idx}
            className="break-inside-avoid relative overflow-hidden rounded-2xl group cursor-pointer border border-brand-gray hover:border-brand-blue/50 transition-all duration-500 bg-brand-dark"
            onClick={() => setSelectedImage(item)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

            <img
              src={item.imageUrl || ''}
              alt={item.title || ''}
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />

            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
               <div className="flex items-center justify-between">
                 <div>
                   <h3 className="font-display font-bold text-xl uppercase tracking-wide text-white">{item.title || ''}</h3>
                   <span className="text-brand-blue text-xs uppercase tracking-widest font-bold font-mono">{item.category || ''}</span>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-brand-blue/20 backdrop-blur-md flex items-center justify-center text-brand-blue">
                   <ZoomIn size={20} />
                 </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {filteredGallery.length === 0 && (
        <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
          <p className="text-gray-400 font-display uppercase tracking-widest">No images found in this category.</p>
        </div>
      )}

      {/* Lightbox Modal */}
      <div
        className={`fixed inset-0 z-[100] bg-brand-black/98 backdrop-blur-xl transition-all duration-500 flex flex-col items-center justify-center ${
          selectedImage ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setSelectedImage(null)}
      >
        <button
          className="absolute top-6 right-6 w-12 h-12 rounded-full bg-brand-dark border border-brand-gray flex items-center justify-center text-gray-400 hover:text-white hover:border-brand-gray-light hover:shadow-glow-sm transition-all z-[110]"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(null);
          }}
        >
          <X size={24} />
        </button>

        {selectedImage && (
          <div
            className="w-full h-full p-6 md:p-12 lg:p-24 flex flex-col items-center justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={selectedImage.imageUrl || ''}
                alt={selectedImage.title || ''}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center">
               <span className="text-brand-blue text-xs uppercase tracking-widest font-bold font-mono bg-brand-black/80 px-4 py-2 rounded-full border border-brand-blue/20 backdrop-blur-md mb-2">{selectedImage.category || ''}</span>
               <h3 className="font-display font-bold text-2xl uppercase tracking-wide text-white drop-shadow-md">{selectedImage.title || ''}</h3>
            </div>
          </div>
        )}
      </div>

        </>
      )}
    </div>
  );
}

