import React from 'react';
import DashboardLayout from '@/components/navigation/DashboardLayout';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
