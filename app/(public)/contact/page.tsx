"use client";

import React, { useState, useEffect } from 'react';
import {
  Phone, MessageCircle, Globe, MapPin, Clock, Loader2,
  ExternalLink, Star, Mail
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type PhoneEntry = { number: string; isPrimary: boolean };

type ContactData = {
  phoneNumbers: PhoneEntry[];
  whatsappPrimary: string;
  whatsappSecondary: string;
  email: string;
  facebookLink: string;
  address: string;
  googleMapsLink: string;
  workingHoursMain: string;
  workingHoursExceptions: string;
};

export default function ContactPage() {
  const [data, setData] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "contact"));
        if (snap.exists()) {
          const d = snap.data();
          setData({
            phoneNumbers: d.phoneNumbers || [],
            whatsappPrimary: d.whatsappPrimary || d.whatsappNumber || "",
            whatsappSecondary: d.whatsappSecondary || "",
            email: d.email || "",
            facebookLink: d.facebookLink || "",
            address: d.address || "",
            googleMapsLink: d.googleMapsLink || "",
            workingHoursMain: d.workingHoursMain || "",
            workingHoursExceptions: d.workingHoursExceptions || "",
          });
        } else {
          setData({
            phoneNumbers: [], whatsappPrimary: "", whatsappSecondary: "", email: "",
            facebookLink: "", address: "", googleMapsLink: "",
            workingHoursMain: "", workingHoursExceptions: "",
          });
        }
      } catch {
        setData({
          phoneNumbers: [], whatsappPrimary: "", whatsappSecondary: "", email: "",
          facebookLink: "", address: "", googleMapsLink: "",
          workingHoursMain: "", workingHoursExceptions: "",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, []);

  const formatWhatsApp = (num: string) =>
    `https://wa.me/${num.replace(/\D/g, '')}`;

  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-brand-dark/40 border border-brand-gray/35 rounded-3xl p-6 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Loader2 size={32} className="animate-spin mb-4 text-brand-blue" />
          <p className="font-display uppercase tracking-wider text-sm">Loading contact info...</p>
        </div>
      </div>
    );
  }

  const hasPhones = data?.phoneNumbers && data.phoneNumbers.length > 0;
  const hasWhatsApp = !!data?.whatsappPrimary;
  const hasWhatsAppSecondary = !!data?.whatsappSecondary;
  const hasFacebook = !!data?.facebookLink;
  const hasEmail = !!data?.email;
  const hasAddressOrMaps = !!(data?.address || data?.googleMapsLink);
  const hasHours = !!data?.workingHoursMain;
  const hasExceptions = !!data?.workingHoursExceptions;

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 min-h-screen">
      {/* Hero */}
      <div className="mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs uppercase tracking-widest font-bold mb-4">
          <Globe size={14} /> Get in Touch
        </div>
        <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-wider mb-4">
          Contact <span className="text-brand-blue">Us</span>
        </h1>
        <p className="text-gray-400 max-w-2xl text-lg">
          We&apos;re here to help and answer any questions.
        </p>
      </div>

      {/* Cards Grid */}
      {!hasPhones && !hasWhatsApp && !hasEmail && !hasFacebook && !hasAddressOrMaps && !hasHours ? (
        <div className="text-center py-20 bg-brand-dark rounded-2xl border border-brand-gray">
          <p className="text-gray-400 font-display uppercase tracking-widest">Contact information coming soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Call Us */}
          {hasPhones && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">Call Us</h3>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {data!.phoneNumbers.map((entry, i) => (
                  <a
                    key={i}
                    href={`tel:${entry.number.replace(/\D/g, '')}`}
                    className="flex items-center gap-3 text-gray-300 hover:text-brand-blue transition-colors group"
                  >
                    <Phone size={14} className="shrink-0 text-gray-500 group-hover:text-brand-blue" />
                    <span className="text-sm font-mono">{entry.number}</span>
                    {entry.isPrimary && (
                      <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded border border-brand-blue/30 ml-auto">
                        <Star size={10} /> Primary
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* WhatsApp */}
          {hasWhatsApp && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">WhatsApp</h3>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={formatWhatsApp(data!.whatsappPrimary)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all w-fit"
                >
                  <MessageCircle size={16} /> {data!.whatsappPrimary}
                </a>
                {hasWhatsAppSecondary && (
                  <a
                    href={formatWhatsApp(data!.whatsappSecondary)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all w-fit"
                  >
                    <MessageCircle size={16} /> {data!.whatsappSecondary}
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Email */}
          {hasEmail && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">Email</h3>
                </div>
              </div>
              <a
                href={`mailto:${data!.email}`}
                className="text-sm text-gray-300 hover:text-brand-blue transition-colors font-mono break-all"
              >
                {data!.email}
              </a>
            </Card>
          )}

          {/* Facebook */}
          {hasFacebook && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">Facebook</h3>
                </div>
              </div>
              <a
                href={data!.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 border border-blue-600/30 text-blue-500 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-blue-600/20 transition-all"
              >
                <ExternalLink size={16} /> Visit Our Facebook Page
              </a>
            </Card>
          )}

          {/* Location */}
          {hasAddressOrMaps && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">Location</h3>
                </div>
              </div>
              {data!.address && (
                <p className="text-sm text-gray-300 mb-4 leading-relaxed whitespace-pre-wrap">{data!.address}</p>
              )}
              {data!.googleMapsLink && (
                <a
                  href={data!.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-brand-blue/20 transition-all"
                >
                  <MapPin size={16} /> View on Map
                </a>
              )}
            </Card>
          )}

          {/* Working Hours */}
          {hasHours && (
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-white">Working Hours</h3>
                </div>
              </div>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                {data!.workingHoursMain}
              </div>
              {hasExceptions && (
                <div className="mt-4 pt-4 border-t border-brand-gray/30">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500 mb-2">Exceptions</p>
                  <p className="text-sm text-amber-400/80 leading-relaxed whitespace-pre-wrap font-mono">
                    {data!.workingHoursExceptions}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
