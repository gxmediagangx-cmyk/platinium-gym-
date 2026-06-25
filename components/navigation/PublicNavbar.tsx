"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Coaches', href: '/coaches' },
    { name: 'Classes', href: '/classes' },
    { name: "What's New", href: '/whats-new' },
    { name: 'Transformations', href: '/transformations' },
    { name: 'Photos', href: '/gallery' },
    { name: 'Offers', href: '/offers' },
    { name: 'Contact', href: '/contact' },
    { name: 'Guidelines', href: '/guidelines' },
  ];

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-brand-black/90 backdrop-blur-md border-b border-brand-gray-light' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Logo size="md" />
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-[11px] xl:text-xs font-bold uppercase tracking-wider text-gray-400 font-display">
            {navLinks.map(link => (
              <Link 
                key={link.name} 
                href={link.href}
                className={`hover:text-brand-blue transition-colors whitespace-nowrap ${pathname === link.href ? 'text-brand-blue' : ''}`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <Link href="/dashboard" className="relative group overflow-hidden rounded-lg bg-brand-blue/10 px-6 py-2.5 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black hover:shadow-glow-hover active:scale-95">
                <span className="absolute inset-0 border border-brand-blue/50 rounded-lg group-hover:border-transparent"></span>
                <span className="font-display font-bold tracking-wider uppercase text-sm">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-display font-bold tracking-wider uppercase hover:text-brand-blue transition-colors">
                  Login
                </Link>
                <Link href="/login" className="relative group overflow-hidden rounded-lg bg-brand-blue/10 px-6 py-2.5 text-brand-blue transition-all duration-300 hover:bg-brand-blue hover:text-black hover:shadow-glow-hover active:scale-95">
                  <span className="absolute inset-0 border border-brand-blue/50 rounded-lg group-hover:border-transparent"></span>
                  <span className="font-display font-bold tracking-wider uppercase text-sm">Join Now</span>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile Toggle */}
          <button 
            className="lg:hidden text-gray-300 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-brand-black/95 backdrop-blur-3xl z-40 lg:hidden transition-all duration-300 flex flex-col overflow-y-auto ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="flex-1 flex flex-col pt-32 px-6 gap-6">
          {navLinks.map(link => (
            <Link 
              key={link.name} 
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`font-display font-bold text-3xl uppercase tracking-wider border-b border-brand-gray pb-4 ${pathname === link.href ? 'text-brand-blue' : 'text-white'}`}
            >
              {link.name}
            </Link>
          ))}
          <div className="mt-8 flex flex-col gap-4">
             {user ? (
               <Link 
                 href="/dashboard"
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="bg-brand-blue text-black px-8 py-4 rounded-lg font-display font-bold uppercase tracking-wider text-center flex justify-center items-center gap-2"
               >
                 Dashboard <ArrowRight size={18} />
               </Link>
             ) : (
               <>
                 <Link 
                   href="/login" 
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="border border-brand-gray-light bg-brand-dark/50 text-white px-8 py-4 rounded-lg font-display font-bold uppercase tracking-wider text-center"
                 >
                   Login
                 </Link>
                 <Link 
                   href="/login"
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="bg-brand-blue text-black px-8 py-4 rounded-lg font-display font-bold uppercase tracking-wider text-center flex justify-center items-center gap-2"
                 >
                   Join Now <ArrowRight size={18} />
                 </Link>
               </>
             )}
          </div>
        </div>
      </div>
    </>
  );
}
