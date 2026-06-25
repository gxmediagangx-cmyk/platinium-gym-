import React from 'react';
import CoachLayout from '@/components/navigation/CoachLayout';

export default function CoachRoleLayout({ children }: { children: React.ReactNode }) {
  return <CoachLayout>{children}</CoachLayout>;
}
