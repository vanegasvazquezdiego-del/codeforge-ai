import { create } from 'zustand';
import type { Toast } from '@/lib/types';
import { uid } from '@/lib/cn';

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = uid('toast');
    set({ toasts: [...get().toasts.slice(-3), { ...toast, id }] });
    setTimeout(() => get().dismiss(id), toast.tone === 'err' ? 8000 : 4500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  info: (title: string, detail?: string) => useToasts.getState().push({ tone: 'info', title, detail }),
  ok: (title: string, detail?: string) => useToasts.getState().push({ tone: 'ok', title, detail }),
  warn: (title: string, detail?: string) => useToasts.getState().push({ tone: 'warn', title, detail }),
  err: (title: string, detail?: string) => useToasts.getState().push({ tone: 'err', title, detail }),
};