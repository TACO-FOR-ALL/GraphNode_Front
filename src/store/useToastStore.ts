import uuid from "@/utils/uuid";
import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "error" | "success" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = uuid();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // 5초 후 자동 제거
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
