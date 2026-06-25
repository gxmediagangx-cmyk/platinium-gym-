import type { Metadata } from 'next';
import { Inter, Outfit, Pacifico } from 'next/font/google';
import './globals.css';
import FirebaseSetupWarning from '@/components/FirebaseSetupWarning';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
});

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
});

export const metadata: Metadata = {
  title: 'Platinum Gym - Design System',
  description: 'Premium gaming-style fitness platform design system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isFirebaseConfigured = 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "your_api_key" && 
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("your_");

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${pacifico.variable} dark`} style={{ colorScheme: 'dark' }}>
      <body className="font-sans antialiased bg-black text-white selection:bg-brand-blue selection:text-black min-h-screen" suppressHydrationWarning>
        {isFirebaseConfigured ? children : <FirebaseSetupWarning />}
      </body>
    </html>
  );
}

