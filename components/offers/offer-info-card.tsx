import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface OfferInfoCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

export default function OfferInfoCard({ icon: Icon, label, value }: OfferInfoCardProps) {
  return (
    <div className="bg-brand-black border border-brand-gray rounded-xl p-4 flex items-center gap-4 hover:border-brand-blue/50 transition-all duration-300 group">
      <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-brand-blue" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">{label || ''}</div>
        <div className="text-sm font-bold text-white truncate">{value || ''}</div>
      </div>
    </div>
  );
}
