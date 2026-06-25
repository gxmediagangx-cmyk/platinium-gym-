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
  whatsappNumber: string;
  email: string;
  facebookLink: string;
  address: string;
  googleMapsLink: string;
  workingHoursMain: string;
  workingHoursExceptions: string;
};

export default function DashboardContactPage() {
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
            whatsappNumber: d.whatsappNumber || "",
            email: d.email || "",
            facebookLink: d.facebookLink || "",
            address: d.address || "",
            googleMapsLink: d.googleMapsLink || "",
            workingHoursMain: d.workingHoursMain || "",
            workingHoursExceptions: d.workingHoursExceptions || "",
          });
        } else {
          setData({
            phoneNumbers: [], whatsappNumber: "", email: "",
            facebookLink: "", address: "", googleMapsLink: "",
            workingHoursMain: "", workingHoursExceptions: "",
          });
        }
      } catch {
        setData({
          phoneNumbers: [], whatsappNumber: "", email: "",
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

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="flex justify-center py-24">
          <Loader2 size={32} className="animate-spin text-brand-blue" />
        </div>
      </div>
    );
  }

  const hasPhones = data?.phoneNumbers && data.phoneNumbers.length > 0;
  const hasWhatsApp = !!data?.whatsappNumber;
  const hasFacebook = !!data?.facebookLink;
  const hasEmail = !!data?.email;
  const hasAddress = !!data?.address;
  const hasMaps = !!data?.googleMapsLink;
  const hasHours = !!data?.workingHoursMain;
  const hasExceptions = !!data?.workingHoursExceptions;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs uppercase tracking-widest font-bold mb-4">
          <Globe size={14} /> Contact
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl uppercase tracking-wider mb-2">
          Contact <span className="text-brand-blue">Us</span>
        </h1>
        <p className="text-gray-400">Gym contact information and location details.</p>
      </div>

      {!hasPhones && !hasWhatsApp && !hasEmail && !hasFacebook && !hasAddress && !hasHours ? (
        <div className="flex flex-col items-center justify-center py-24 bg-brand-dark border border-brand-gray rounded-3xl">
          <Globe size={48} className="text-brand-blue/30 mb-4" />
          <p className="text-gray-500 font-display uppercase tracking-widest text-lg mb-2">No contact info yet</p>
          <p className="text-gray-600 text-sm">Contact settings have not been configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Call Us */}
          {hasPhones && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 hover:border-brand-gray-light transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue border border-brand-blue/30">
                  <Phone size={20} />
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider">Call Us</h2>
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
            </div>
          )}

          {/* WhatsApp */}
          {hasWhatsApp && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 hover:border-brand-gray-light transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                  <MessageCircle size={20} />
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider">WhatsApp</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4 font-mono">{data!.whatsappNumber}</p>
              <a
                href={formatWhatsApp(data!.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all"
              >
                <MessageCircle size={16} /> Chat on WhatsApp
              </a>
            </div>
          )}

          {/* Email */}
          {hasEmail && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 hover:border-brand-gray-light transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue border border-brand-blue/30">
                  <Mail size={20} />
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider">Email</h2>
              </div>
              <a
                href={`mailto:${data!.email}`}
                className="text-sm text-gray-300 hover:text-brand-blue transition-colors font-mono break-all"
              >
                {data!.email}
              </a>
            </div>
          )}

          {/* Facebook */}
          {hasFacebook && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 hover:border-brand-gray-light transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 border border-blue-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider">Facebook</h2>
              </div>
              <a
                href={data!.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 border border-blue-600/30 text-blue-500 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-blue-600/20 transition-all"
              >
                <ExternalLink size={16} /> Visit Our Facebook Page
              </a>
            </div>
          )}

          {/* Location */}
          {(hasAddress || hasMaps) && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 hover:border-brand-gray-light transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue border border-brand-blue/30">
                  <MapPin size={20} />
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider">Location</h2>
              </div>
              {hasAddress && (
                <p className="text-sm text-gray-300 mb-4 leading-relaxed whitespace-pre-wrap">{data!.address}</p>
              )}
              {hasMaps && (
                <a
                  href={data!.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-brand-blue/20 transition-all"
                >
                  <MapPin size={16} /> View on Map
                </a>
              )}
            </div>
          )}

          {/* Working Hours */}
          {hasHours && (
            <div className="bg-brand-dark border border-brand-gray rounded-2xl p-6 hover:border-brand-gray-light transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
                  <Clock size={20} />
                </div>
                <h2 className="font-display font-bold text-xl uppercase tracking-wider">Working Hours</h2>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
