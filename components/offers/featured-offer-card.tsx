import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Dumbbell, Calendar, Clock, Star, Zap } from 'lucide-react';
import type { Offer } from '@/lib/offers';
import OfferInfoCard from '@/components/offers/offer-info-card';
import { Timestamp } from 'firebase/firestore';

interface FeaturedOfferCardProps {
  offer: Offer;
}

function formatValidUntil(validUntil: Timestamp | string | null | undefined): string {
  if (!validUntil) return '';
  if (validUntil instanceof Timestamp) {
    return validUntil.toDate().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (typeof validUntil === 'string') return validUntil;
  return '';
}

export default function FeaturedOfferCard({ offer }: FeaturedOfferCardProps) {
  const title = offer.title || '';
  const subtitle = offer.subtitle || '';
  const description = offer.description || '';
  const price = Number(offer.price) || 0;
  const currency = offer.currency || 'EGP';
  const durationText = offer.durationText || '';
  const badgeText = offer.badgeText || 'SPECIAL OFFER';
  const includedItems = offer.includedItems || [];
  const includedClasses = offer.includedClasses || [];
  const ctaLabel = offer.ctaLabel || 'Claim Offer';
  const ctaHref = offer.ctaHref || '/contact';
  const imageUrl = offer.imageUrl || '';
  const validUntilFormatted = formatValidUntil(offer.validUntil);

  const priceFormatted = price.toLocaleString('en-US');

  return (
    <div className="bg-brand-dark border border-brand-gray rounded-3xl overflow-hidden group hover:border-brand-blue/30 transition-all duration-500">
      <div className="flex flex-col md:flex-row">
        {/* Left Image Panel */}
        <div className="md:w-2/5 md:min-h-full aspect-video md:aspect-auto relative overflow-hidden shrink-0">
          {imageUrl ? (
            <>
              <div className="absolute inset-0 bg-brand-black/20 z-10" />
              <img
                src={imageUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-black to-brand-blue/20" />
          )}
          <div className="absolute top-4 left-4 z-20">
            <span className="text-[10px] uppercase tracking-widest font-bold bg-brand-blue text-brand-black px-3 py-1.5 rounded-full shadow-glow-sm inline-block">
              {badgeText}
            </span>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="p-8 md:p-10 flex-1 flex flex-col justify-center relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {subtitle && (
            <div className="text-xs font-mono uppercase tracking-widest text-brand-blue mb-2">
              {subtitle}
            </div>
          )}

          <h3 className="font-display font-bold text-3xl md:text-4xl uppercase tracking-wide mb-2 group-hover:text-brand-blue transition-colors break-words">
            {title}
          </h3>

          {description && (
            <p className="text-gray-400 leading-relaxed mb-4 max-w-2xl break-words">
              {description}
            </p>
          )}

          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-display font-bold text-4xl md:text-5xl text-brand-blue">
              {priceFormatted} {currency}
            </span>
            {durationText && (
              <span className="text-gray-500 text-sm font-mono uppercase tracking-wider">
                / {durationText}
              </span>
            )}
          </div>

          {validUntilFormatted && (
            <div className="text-sm text-gray-500 font-mono uppercase tracking-wider mb-6">
              Valid until: <span className="text-white font-bold">{validUntilFormatted}</span>
            </div>
          )}

          {/* Included Items */}
          {includedItems.length > 0 && (
            <ul className="space-y-2 mb-6">
              {includedItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-300 text-sm">
                  <Check size={18} className="text-brand-blue shrink-0 mt-0.5" />
                  <span className="break-words">{item || ''}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Included Classes */}
          {includedClasses.length > 0 && (
            <ul className="space-y-2 mb-6">
              {includedClasses.map((cls, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-300 text-sm">
                  <Check size={18} className="text-brand-blue shrink-0 mt-0.5" />
                  <span className="break-words">Free class: {cls || ''}</span>
                </li>
              ))}
            </ul>
          )}

          {/* CTA Button */}
          <Link
            href={ctaHref}
            className="relative group/btn overflow-hidden rounded-lg bg-brand-blue/10 px-8 py-4 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black hover:shadow-glow-hover active:scale-95 inline-flex items-center justify-center gap-2 w-fit"
          >
            <span className="absolute inset-0 border border-brand-blue/50 rounded-lg group-hover/btn:border-transparent" />
            <span className="font-display font-bold tracking-wider uppercase text-sm">
              {ctaLabel}
            </span>
            <ArrowRight size={18} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Bottom Info Cards */}
      <div className="border-t border-brand-gray px-8 md:px-10 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OfferInfoCard
            icon={Dumbbell}
            label="Access"
            value="Full Gym Access"
          />
          <OfferInfoCard
            icon={Calendar}
            label="Included Classes"
            value={includedClasses.length > 0 ? includedClasses.join(', ').substring(0, 35) + (includedClasses.join(', ').length > 35 ? '...' : '') : 'None'}
          />
          <OfferInfoCard
            icon={Clock}
            label="Duration"
            value={durationText || 'Membership'}
          />
          <OfferInfoCard
            icon={Star}
            label="Value"
            value="Best Value"
          />
        </div>
        <p className="text-center text-xs font-mono uppercase tracking-widest text-brand-blue pt-2">
          LIMITED TIME OFFER — DON&apos;T MISS OUT!
        </p>
      </div>
    </div>
  );
}
