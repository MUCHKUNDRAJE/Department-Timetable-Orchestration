'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  code?: string;
  badge?: string;
  badgeColor?: string;
  disabled?: boolean;
  disabledReason?: string;
  disabledDetail?: string;
  isAvailable?: boolean;
  meta?: React.ReactNode;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option…',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  className,
  emptyMessage = 'No options found.',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.code && opt.code.toLowerCase().includes(q)) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery('');
          }
        }}
        className={cn(
          'flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border/90 bg-surface px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 hover:border-border-strong hover:bg-surface-hover/20 transition-all duration-150 text-left',
          isOpen && 'border-primary ring-2 ring-primary/20 bg-surface'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedOption.code && (
                <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md shrink-0 border border-primary/20">
                  {selectedOption.code}
                </span>
              )}
              <span className="truncate font-semibold text-foreground text-sm">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline font-normal">
                  — {selectedOption.subLabel}
                </span>
              )}
              {selectedOption.badge && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 ml-auto shrink-0 font-bold">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm truncate font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ml-2',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-border bg-surface text-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search Bar Input */}
          <div className="p-2.5 border-b border-border bg-surface-hover/30">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const isItemDisabled = !!opt.disabled;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isItemDisabled}
                    onClick={() => {
                      if (!isItemDisabled) {
                        onValueChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl text-sm flex flex-col gap-1 transition-all',
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                        : isItemDisabled
                        ? 'opacity-60 cursor-not-allowed hover:bg-transparent'
                        : 'text-foreground hover:bg-surface-subtle font-medium'
                    )}
                  >
                    <div className="flex items-center gap-2 w-full min-w-0">
                      {opt.isAvailable !== undefined && (
                        <span
                          className={cn(
                            'text-sm font-black shrink-0',
                            opt.isAvailable ? 'text-emerald-600' : 'text-rose-500'
                          )}
                        >
                          {opt.isAvailable ? '✓' : '✕'}
                        </span>
                      )}
                      {opt.code && (
                        <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md shrink-0 border border-primary/20">
                          {opt.code}
                        </span>
                      )}
                      <span className="truncate flex-1 font-semibold text-sm">{opt.label}</span>
                      {opt.meta}
                      {opt.badge && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0 font-bold">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0 ml-1.5 font-bold" />
                      )}
                    </div>

                    {opt.subLabel && (
                      <div className="text-xs text-muted-foreground pl-6 truncate font-normal">
                        {opt.subLabel}
                      </div>
                    )}

                    {isItemDisabled && (opt.disabledReason || opt.disabledDetail) && (
                      <div className="text-xs text-rose-600 font-medium pl-6 leading-tight">
                        {opt.disabledReason || 'Unavailable'}{' '}
                        {opt.disabledDetail ? `(${opt.disabledDetail})` : ''}
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-5 text-center text-sm text-muted-foreground italic">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
