"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from "./icons";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ShowToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

export type ToastApi = {
  show: (input: ShowToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const toneIcon = {
  success: CheckCircleIcon,
  error: AlertCircleIcon,
  info: InfoIcon,
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ title, description, tone = "info", duration = 5200 }: ShowToastInput) => {
      const id = createToastId();
      setToasts((current) => [...current.slice(-3), { id, title, description, tone }]);
      const timer = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, description) => show({ title, description, tone: "success" }),
      error: (title, description) => show({ title, description, tone: "error", duration: 7000 }),
      info: (title, description) => show({ title, description, tone: "info" }),
    }),
    [show, dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = toneIcon[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn("toast", `toast--${toast.tone}`)}
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <span className="toast__icon">
                <Icon size={15} />
              </span>
              <div className="toast__content">
                <p className="toast__title">{toast.title}</p>
                {toast.description ? <p className="toast__body">{toast.description}</p> : null}
              </div>
              <button
                className="toast__close"
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <XIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
