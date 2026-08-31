"use client";

import React, { useEffect } from "react";
import { QueryProvider } from "./QueryProvider";
import { useUIStore } from "@/stores/useUIStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AppProvidersProps {
  children: React.ReactNode;
}

function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClass = "border-blue-200 bg-blue-50 text-blue-900";
        let iconClass = "text-blue-600";

        if (toast.type === "success") {
          Icon = CheckCircle2;
          borderClass = "border-emerald-200 bg-emerald-50 text-emerald-900";
          iconClass = "text-emerald-600";
        } else if (toast.type === "error") {
          Icon = AlertCircle;
          borderClass = "border-rose-200 bg-rose-50 text-rose-900";
          iconClass = "text-rose-600";
        } else if (toast.type === "warning") {
          Icon = AlertTriangle;
          borderClass = "border-amber-200 bg-amber-50 text-amber-900";
          iconClass = "text-amber-600";
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${borderClass}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`} />
            <div className="flex-1 text-sm">
              {toast.title && <h4 className="font-semibold">{toast.title}</h4>}
              <p className="text-slate-700">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  const setToken = useAuthStore((state) => state.setToken);

  // Sync token from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, [setToken]);

  return (
    <QueryProvider>
      {children}
      <ToastContainer />
    </QueryProvider>
  );
}
