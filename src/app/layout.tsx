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
            <main className="flex-1 max-w-[1680px] w-full mx-auto px-2 sm:px-4 lg:px-10 py-4">
              {children}
            </main>
          </div>
        </HydrationGuard>
      </body>
    </html>
  );
}
