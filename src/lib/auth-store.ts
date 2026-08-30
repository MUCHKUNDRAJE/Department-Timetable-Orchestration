'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import type { AuthUser, LoginPayload, SignupPayload } from '@/types/auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.login(payload);
          if (typeof window !== 'undefined') {
            localStorage.setItem('timetable_token', res.token);
            localStorage.setItem('timetable_user', JSON.stringify(res.user));
          }
          set({
            token: res.token,
            user: res.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          set({
            error: err.message || 'Failed to sign in. Please check your credentials.',
            isLoading: false,
          });
          throw err;
        }
      },

      signup: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.signup(payload);
          if (typeof window !== 'undefined') {
            localStorage.setItem('timetable_token', res.token);
            localStorage.setItem('timetable_user', JSON.stringify(res.user));
          }
          set({
            token: res.token,
            user: res.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          set({
            error: err.message || 'Registration failed. Please try again.',
            isLoading: false,
          });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('timetable_token');
          localStorage.removeItem('timetable_user');
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkSession: async () => {
        const { token } = get();
        if (!token) {
          get().logout();
          return false;
        }
        try {
          const res = await authApi.getMe();
          set({ user: res.user, isAuthenticated: true });
          return true;
        } catch (err) {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'timetable_auth_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: !!state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.isAuthenticated = true;
          if (typeof window !== 'undefined') {
            localStorage.setItem('timetable_token', state.token);
          }
        }
      },
    }
  )
);
