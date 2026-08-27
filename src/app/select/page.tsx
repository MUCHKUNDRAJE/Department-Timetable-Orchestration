'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Printer,
  Database,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  FlaskConical,
  DoorOpen,
  UserCheck,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { INSTITUTION_INFO } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function HubPage() {
  const classes = useTimetableStore((s) => s.classes);
  const labs = useTimetableStore((s) => s.labs);
  const rooms = useTimetableStore((s) => s.rooms);
  const faculty = useTimetableStore((s) => s.faculty);
  const assignments = useTimetableStore((s) => s.assignments);

  const totalSlotsWeek = 48;
  const totalAllocatedHours = assignments.reduce((acc, curr) => acc + curr.duration, 0);

  const cards = [
    {
      title: 'Schedule Timetable',
      subtitle: 'Visual Grid Scheduler',
      description:
        'Interactive 8×6 matrix to allocate lectures and 2-hour lab blocks with real-time double-booking checks and weekly max hour constraints.',
      href: '/schedule',
      icon: Calendar,
      theme: 'from-primary to-accent',
      accentColor: 'text-primary',
      badge: 'Visual Matrix',
      badgeBg: 'bg-primary-light text-primary border-primary/20',
      highlights: [
        'Live pre-filtered faculty availability',
        'Auto 2-hour contiguous lab merge',
        'Instant collision & workload feedback',
      ],
      ctaText: 'Open Scheduler Matrix',
    },
    {
      title: 'Print & Export Timetable',
      subtitle: 'Publishing & PDF Studio',
      description:
        'Generate official institution-grade timetables with HOD signature blocks, subject code legends, and one-click multi-page bulk PDF export.',
      href: '/print',
      icon: Printer,
      theme: 'from-accent to-primary',
      accentColor: 'text-accent',
      badge: 'Pixel-Accurate PDF',
      badgeBg: 'bg-accent-light text-primary border-accent/30',
      highlights: [
        'UG Class, Lab, Room & Faculty modes',
        'Single and multi-page bulk PDF export',
        'Official institutional signature layouts',
      ],
      ctaText: 'Launch Export Studio',
    },
    {
      title: 'Insert & Manage Data',
      subtitle: 'Entity Management Center',
      description:
        'Configure Classes, Laboratories, Smart Lecture Rooms, Faculty profiles, and Subject mappings with instant JSON database backup and restore.',
      href: '/data',
      icon: Database,
      theme: 'from-highlight to-primary',
      accentColor: 'text-highlight',
      badge: 'Master Database',
      badgeBg: 'bg-highlight-light text-highlight border-highlight/30',
      highlights: [
        'Faculty subject multi-select assignment',
        'Instant search, edit & delete drawers',
        'Full JSON backup & restore utility',
      ],
      ctaText: 'Manage Master Records',
    },
  ];

  return (
    <div className="space-y-10 py-2">
      {/* Institutional Department Banner */}
      <div className="bg-surface border border-border rounded-3xl p-8 shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 via-highlight/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-subtle border border-border text-xs font-semibold text-muted-foreground mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{INSTITUTION_INFO.academicYear} Timetable Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Department Timetable Orchestration
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {INSTITUTION_INFO.department} — Yeshwantrao Chavan College of Engineering.
              Coordinate conflict-free lecture and lab allocations across faculty and venues.
            </p>
          </div>

          {/* Quick Snapshot Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-subtle p-3 rounded-2xl border border-border shrink-0">
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Classes</div>
              <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                {classes.length}
              </div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Labs</div>
              <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1">
                <FlaskConical className="w-4 h-4 text-highlight" />
                {labs.length}
              </div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Rooms</div>
              <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1">
                <DoorOpen className="w-4 h-4 text-primary" />
                {rooms.length}
              </div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Faculty</div>
              <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-primary" />
                {faculty.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main Action Hub Cards */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            Select an Operational Workflow
          </h2>
          <span className="text-xs text-muted">Choose your action destination</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.08 }}
              >
                <Link
                  href={card.href}
                  className="group block h-full bg-surface border border-border rounded-3xl p-7 shadow-subtle hover:shadow-card hover:border-accent/80 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Top Tag & Icon */}
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform',
                          card.theme
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-lg border',
                          card.badgeBg
                        )}
                      >
                        {card.badge}
                      </span>
                    </div>

                    {/* Titles */}
                    <div>
                      <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                        {card.subtitle}
                      </span>
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    {/* Highlight Bullets */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      {card.highlights.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-foreground font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Button CTA */}
                  <div className="pt-6 mt-6 border-t border-border flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                    <span>{card.ctaText}</span>
                    <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
