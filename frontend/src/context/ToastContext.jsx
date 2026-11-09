import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircleIcon, AlertIcon, InfoIcon, CloseIcon } from "../components/Icons.jsx";

const ToastContext = createContext(null);

const TONES = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircleIcon,
  },
  error: { wrap: "border-red-200 bg-red-50 text-red-800", icon: AlertIcon },
  info: { wrap: "border-slate-200 bg-white text-slate-700", icon: InfoIcon },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "success") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => {
          const tone = TONES[toast.type] || TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${tone.wrap}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 hover:bg-black/5"
                aria-label="Dismiss"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
