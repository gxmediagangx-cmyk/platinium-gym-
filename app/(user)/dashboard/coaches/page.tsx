import React from 'react';
import CoachesPage from '@/app/(public)/coaches/page';

export default function DashboardCoachesPage() {
  return (
    <div className="pt-20 md:pt-8 h-screen overflow-y-auto w-full">
      <CoachesPage />
    </div>
  );
}
