"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";

type ToastKind = "success" | "warning" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

type Listener = (t: Toast) => void;
let listeners: Listener[] = [];
let counter = 0;

export function toast(message: string, kind: ToastKind = "info") {
  const t = { id: ++counter, message, kind };
  listeners.forEach((l) => l(t));
}

const styles: Record<ToastKind, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  error: "border-red-500/40 bg-red-500/10 text-red-200",
  info: "border-slate-500/40 bg-slate-500/10 text-slate-200",
};

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 5000);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${styles[t.kind]}`}
        >
          <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
          <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
