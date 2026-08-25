import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'interactive' | 'dashed';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface border border-border rounded-2xl shadow-subtle',
      flat: 'bg-surface border border-border rounded-2xl',
      interactive:
        'bg-surface border border-border rounded-2xl shadow-subtle hover:border-accent/60 hover:shadow-card transition-all duration-200 cursor-pointer',
      dashed:
        'bg-surface/50 border-2 border-dashed border-border rounded-2xl hover:border-accent hover:bg-accent-light/30 transition-all duration-200',
    };

    return (
      <div ref={ref} className={cn(variants[variant], className)} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
