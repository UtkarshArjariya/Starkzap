"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration?: number;
}

type ToastContextValue = {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) => void;
  error: (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) => void;
  info: (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) => void;
  warning: (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = toast.duration ?? 5000;

      setToasts((prev) => {
        // Max 3 toasts — drop oldest if necessary
        const next = prev.length >= 3 ? prev.slice(1) : prev;
        return [...next, { ...toast, id }];
      });

      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
      addToast({ type: "success", title, ...opts }),
    [addToast],
  );
  const error = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
      addToast({ type: "error", title, ...opts }),
    [addToast],
  );
  const info = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
      addToast({ type: "info", title, ...opts }),
    [addToast],
  );
  const warning = useCallback(
    (title: string, opts?: Partial<Omit<ToastItem, "id" | "type" | "title">>) =>
      addToast({ type: "warning", title, ...opts }),
    [addToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, addToast, removeToast, success, error, info, warning }),
    [toasts, addToast, removeToast, success, error, info, warning],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
