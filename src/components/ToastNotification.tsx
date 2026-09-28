import React, { useEffect } from 'react';
import { CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    // If loading, do not auto dismiss until updated
    if (toast.type === 'loading' || toast.duration === 0) return;

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const borderClass =
    toast.type === 'success'
      ? 'border-emerald-500/40 bg-slate-950/95 text-slate-100 shadow-emerald-950/40'
      : toast.type === 'loading'
      ? 'border-sky-500/40 bg-slate-950/95 text-slate-100 shadow-sky-950/40'
      : toast.type === 'error'
      ? 'border-rose-500/40 bg-slate-950/95 text-slate-100 shadow-rose-950/40'
      : 'border-slate-800 bg-slate-950/95 text-slate-100 shadow-slate-950/40';

  const icon =
    toast.type === 'success' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
    ) : toast.type === 'loading' ? (
      <Loader2 className="h-4 w-4 text-sky-400 animate-spin shrink-0" />
    ) : toast.type === 'error' ? (
      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
    );

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 ease-out animate-in slide-in-from-bottom-2 ${borderClass}`}
    >
      <div className="mt-0.5">{icon}</div>

      <div className="flex-1 space-y-0.5">
        <p className="text-xs font-semibold tracking-tight text-slate-100">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition -mr-1 -mt-1 p-1 rounded-md"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
