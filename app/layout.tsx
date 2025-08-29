import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import MobileBottomNav from '../components/MobileBottomNav';
import { AuthProvider } from '@/shared/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScanStock Pro - Mobile-First Inventory Management',
  description: 'AI-powered inventory management with mobile-first design, real-time sync, and offline support.',
  manifest: '/manifest.json',
  formatDetection: {
    telephone: false,
  },
  mobileWebAppCapable: 'yes',
  appleMobileWebAppTitle: 'ScanStock Pro',
  appleMobileWebAppStatusBarStyle: 'black-translucent',
  openGraph: {
    title: 'ScanStock Pro',
    description: 'Professional inventory management with AI-powered recognition',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'ScanStock Pro',
    description: 'Professional inventory management with AI-powered recognition',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#3B82F6" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
            <MobileBottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
