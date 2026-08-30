import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { HydrationGuard } from '@/components/layout/HydrationGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { LoadingBar } from '@/components/ui/LoadingBar';

export const metadata: Metadata = {
  title: 'Timetable Allocation System | Department Scheduling Studio',
  description:
    'Institutional class, laboratory, classroom, and faculty timetable scheduling engine with real-time conflict validation and multi-page PDF generation.',
    icons:"/image.png"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-primary/20 selection:text-primary">
        <LoadingBar />
        <HydrationGuard>
          <AuthGuard>
            <div className="min-h-screen flex flex-col bg-background text-foreground">
              <Navbar />
              <main className="flex-1 max-w-[1680px] w-full mx-auto px-2 sm:px-4 lg:px-10 py-4">
                {children}
              </main>

              {/* App Footer Watermark */}
              <footer className="border-t border-border/60 py-3 px-4 text-center text-xs text-muted font-medium select-none no-print">
                <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <span>Timetable Allocator</span>
                  <span className="opacity-40">•</span>
                  <span>Created by <strong className="text-foreground font-semibold">Muchkundraje Thote</strong></span>
                </p>
              </footer>

              {/* Small Floating Watermark Pill */}
              <div className="fixed bottom-3 right-3 z-30 pointer-events-none select-none no-print">
                <div className="px-2.5 py-1 rounded-full bg-surface/85 backdrop-blur-md border border-border text-[10px] font-mono text-muted-foreground shadow-xs flex items-center gap-1.5 opacity-75 hover:opacity-100 transition-opacity pointer-events-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Slotify</span>
                  <span className="opacity-40">|</span>
                  <span>Created by <strong className="text-foreground font-semibold">Muchkundraje Thote</strong></span>
                </div>
              </div>
            </div>
          </AuthGuard>
        </HydrationGuard>
        <ToastContainer />
      </body>
    </html>
  );
}
