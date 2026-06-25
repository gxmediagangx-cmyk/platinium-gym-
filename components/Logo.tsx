import React from 'react';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  link?: boolean;
}

export default function Logo({ className = '', size = 'md', link = true }: LogoProps) {
  const sizeClasses = {
    sm: {
      icon: 'w-8 h-8',
      iconSize: 16,
      text: 'text-xl',
      scriptSize: 'text-2xl',
    },
    md: {
      icon: 'w-10 h-10',
      iconSize: 20,
      text: 'text-2xl',
      scriptSize: 'text-3xl',
    },
    lg: {
      icon: 'w-14 h-14',
      iconSize: 28,
      text: 'text-3xl',
      scriptSize: 'text-4xl',
    }
  };

  const { icon, iconSize, text, scriptSize } = sizeClasses[size];

  const content = (
    <>
      <div className={`${icon} rounded-full shadow-[0_0_15px_rgba(0,210,255,0.4)] bg-brand-dark border-2 border-brand-blue flex items-center justify-center text-brand-blue shrink-0`}>
        <Dumbbell size={iconSize} className="ml-0.5 mt-0.5" />
      </div>
      <div className={`flex items-baseline gap-2 leading-none`}>
        <span 
          className={`font-script text-white drop-shadow-[0_0_12px_rgba(0,210,255,0.8)] ${scriptSize}`} 
          style={{ textTransform: 'none' }}
        >
          Platinum
        </span>
        <span 
          className={`font-script text-brand-blue drop-shadow-[0_0_12px_rgba(0,210,255,0.8)] ${scriptSize}`} 
          style={{ textTransform: 'none' }}
        >
          Gym
        </span>
      </div>
    </>
  );

  if (link) {
    return (
      <Link href="/" className={`flex items-center gap-3 ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {content}
    </div>
  );
}
