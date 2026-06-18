import type { Metadata } from 'next';
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Accommodation Manager',
  description: 'Dashboard for managing accommodation properties',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AppRouterCacheProvider>
          <AppShell>{children}</AppShell>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
