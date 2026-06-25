import React from 'react';
import PublicNavbar from '@/components/navigation/PublicNavbar';
import WhatsNewBubble from '@/components/WhatsNewBubble';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main>
        {children}
      </main>
      <WhatsNewBubble />
    </>
  );
}
