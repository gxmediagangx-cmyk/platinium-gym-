"use client";

import React, { useState, useEffect } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { getActiveOffers, Offer } from '@/lib/offers';
import FeaturedOfferCard from '@/components/offers/featured-offer-card';

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getActiveOffers();
        if (!cancelled) setOffers(result);
      } catch {
        // no offers
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs uppercase tracking-widest font-bold mb-4">
            <Zap size={14} /> Limited Time
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-wider mb-4">
            Our <span className="text-brand-blue">Offers</span>
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            Take advantage of our exclusive membership packages and special promotions. Don&apos;t miss out on the best value deals.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={40} className="text-brand-blue animate-spin" />
        </div>
      ) : offers.length === 0 ? (
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-500 text-lg">No active offers at the moment. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {offers.map((offer) => (
            <FeaturedOfferCard key={offer.id || 'offer'} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
