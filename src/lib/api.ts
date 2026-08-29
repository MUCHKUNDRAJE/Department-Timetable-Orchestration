/**
 * api.ts — Axios-based API client for the Timetable Orchestration Backend.
 * All responses follow: { success: boolean, data: T } | { success: false, error: string }
 */

import axios, { AxiosRequestConfig } from 'axios';
import type {
  CollegeClass,
  Lab,
  Room,
  Faculty,
  Subject,
  Assignment,
  ConflictCheckResult,
} from '@/types/timetable';

// ─── Base Client ──────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── Response Interceptor: unwrap or throw ────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.success === false) {
      const err = new Error(response.data.error || 'API Error');
      (err as any).details = response.data.details || [];
      throw err;
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Network error — is the backend running?';
    const err = new Error(message);
    (err as any).details = error.response?.data?.details || [];
    (err as any).status  = error.response?.status;
    return Promise.reject(err);
  }
);

/**
 * Generic fetch helper — returns `data` field of the response envelope.
 */
async function apiFetch<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.request<{ success: true; data: T }>({ url: path, ...config });
  return res.data.data;
}

// ─── Classes ──────────────────────────────────────────────────────────
export const classesApi = {
  list:   ()                                     => apiFetch<CollegeClass[]>('/classes'),
  create: (data: Omit<CollegeClass, 'id'>)       => apiFetch<CollegeClass>('/classes', { method: 'POST', data }),
  update: (id: string, data: Partial<CollegeClass>) => apiFetch<CollegeClass>(`/classes/${id}`, { method: 'PUT', data }),
  delete: (id: string)                           => apiFetch<{ id: string }>(`/classes/${id}`, { method: 'DELETE' }),
};

// ─── Labs ─────────────────────────────────────────────────────────────
export const labsApi = {
  list:   ()                              => apiFetch<Lab[]>('/labs'),
  create: (data: Omit<Lab, 'id'>)        => apiFetch<Lab>('/labs', { method: 'POST', data }),
  update: (id: string, data: Partial<Lab>) => apiFetch<Lab>(`/labs/${id}`, { method: 'PUT', data }),
  delete: (id: string)                   => apiFetch<{ id: string }>(`/labs/${id}`, { method: 'DELETE' }),
};

// ─── Rooms ────────────────────────────────────────────────────────────
export const roomsApi = {
  list:   ()                               => apiFetch<Room[]>('/rooms'),
  create: (data: Omit<Room, 'id'>)         => apiFetch<Room>('/rooms', { method: 'POST', data }),
  update: (id: string, data: Partial<Room>) => apiFetch<Room>(`/rooms/${id}`, { method: 'PUT', data }),
  delete: (id: string)                    => apiFetch<{ id: string }>(`/rooms/${id}`, { method: 'DELETE' }),
};

// ─── Subjects ─────────────────────────────────────────────────────────
export const subjectsApi = {
  list:   ()                                  => apiFetch<Subject[]>('/subjects'),
  create: (data: Omit<Subject, 'id'>)         => apiFetch<Subject>('/subjects', { method: 'POST', data }),
  update: (id: string, data: Partial<Subject>) => apiFetch<Subject>(`/subjects/${id}`, { method: 'PUT', data }),
  delete: (id: string)                        => apiFetch<{ id: string }>(`/subjects/${id}`, { method: 'DELETE' }),
};

// ─── Faculty ──────────────────────────────────────────────────────────
export const facultyApi = {
  list:   ()                                   => apiFetch<Faculty[]>('/faculty'),
  create: (data: Omit<Faculty, 'id'>)          => apiFetch<Faculty>('/faculty', { method: 'POST', data }),
  update: (id: string, data: Partial<Faculty>) => apiFetch<Faculty>(`/faculty/${id}`, { method: 'PUT', data }),
  delete: (id: string)                         => apiFetch<{ id: string }>(`/faculty/${id}`, { method: 'DELETE' }),
};

// ─── Assignments ──────────────────────────────────────────────────────
export interface ConflictCheckParams {
  id?: string;
  day: string;
  startSlot: number;
  duration: 1 | 2;
  targetType: string;
  targetId: string;
  facultyId: string;
  subjectId: string;
  roomId?: string;
  labId?: string;
  classId?: string;
  labBatches?: Array<{ id: 'A1' | 'A2' | 'A3' | 'A4'; facultyId: string; subjectId: string; labId?: string }>;
}

export const assignmentsApi = {
  list:   ()                                        => apiFetch<Assignment[]>('/assignments'),
  create: (data: Omit<Assignment, 'id'>)            => apiFetch<Assignment>('/assignments', { method: 'POST', data }),
  update: (id: string, data: Partial<Assignment>)   => apiFetch<Assignment>(`/assignments/${id}`, { method: 'PUT', data }),
  delete: (id: string)                              => apiFetch<{ id: string }>(`/assignments/${id}`, { method: 'DELETE' }),
  clearForTarget: (type: string, targetId: string)  => apiFetch<{ deleted: number }>(`/assignments/target/${type}/${targetId}`, { method: 'DELETE' }),
  checkConflict: (params: ConflictCheckParams)      => apiFetch<ConflictCheckResult>('/assignments/check-conflict', { method: 'POST', data: params }),
};

// ─── Data Utilities ───────────────────────────────────────────────────
export interface FullState {
  classes:     CollegeClass[];
  labs:        Lab[];
  rooms:       Room[];
  faculty:     Faculty[];
  subjects:    Subject[];
  assignments: Assignment[];
}

export const dataApi = {
  export: ()                      => apiFetch<FullState>('/data/export'),
  import: (state: FullState)      => apiFetch<{ imported: Record<string, number> }>('/data/import', { method: 'POST', data: state }),
  reset:  ()                      => apiFetch<{ message: string }>('/data/reset', { method: 'POST' }),
};
