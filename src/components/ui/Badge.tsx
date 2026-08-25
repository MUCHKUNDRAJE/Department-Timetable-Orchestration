import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger' | 'outline' | 'mono';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium transition-colors select-none';

  const variants = {
    default: 'bg-surface-subtle text-foreground border border-border',
    primary: 'bg-primary-light text-primary border border-primary/20',
    accent: 'bg-accent-light text-primary border border-accent/30',
    highlight: 'bg-highlight-light text-highlight border border-highlight/30',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    outline: 'border border-border text-muted-foreground bg-surface',
    mono: 'bg-surface-subtle font-mono text-foreground border border-border',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md gap-1',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
