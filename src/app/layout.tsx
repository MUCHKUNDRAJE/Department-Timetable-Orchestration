import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { HydrationGuard } from '@/components/layout/HydrationGuard';

export const metadata: Metadata = {
  title: 'Timetable Allocation System | Department Scheduling Studio',
  description:
    'Institutional class, laboratory, classroom, and faculty timetable scheduling engine with real-time conflict validation and multi-page PDF generation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-primary/20 selection:text-primary">
        <HydrationGuard>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </HydrationGuard>
      </body>
    </html>
  );
}
