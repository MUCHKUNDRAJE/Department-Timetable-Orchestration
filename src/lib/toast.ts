'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const duration = toast.duration ?? 4000;
    const newToast: ToastItem = {
      ...toast,
      id,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // Keep max 5 visible at once
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),
}));

export const toast = {
  success: (title: string, message?: string, duration = 4000) => {
    return useToastStore.getState().addToast({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration = 5000) => {
    return useToastStore.getState().addToast({ type: 'error', title, message, duration });
  },
  warning: (title: string, message?: string, duration = 4500) => {
    return useToastStore.getState().addToast({ type: 'warning', title, message, duration });
  },
  info: (title: string, message?: string, duration = 4000) => {
    return useToastStore.getState().addToast({ type: 'info', title, message, duration });
  },
  promise: async <T>(
    promise: Promise<T>,
    {
      loading = 'Processing...',
      success = 'Action completed successfully!',
      error = 'Something went wrong.',
    }: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((err: any) => string);
    }
  ): Promise<T> => {
    const id = useToastStore.getState().addToast({
      type: 'info',
      title: loading,
      duration: 0, // Persistent until resolved
    });

    try {
      const data = await promise;
      useToastStore.getState().removeToast(id);
      const successMsg = typeof success === 'function' ? success(data) : success;
      toast.success(successMsg);
      return data;
    } catch (err: any) {
      useToastStore.getState().removeToast(id);
      const errorMsg = typeof error === 'function' ? error(err) : err.message || error;
      toast.error(errorMsg);
      throw err;
    }
  },
};
