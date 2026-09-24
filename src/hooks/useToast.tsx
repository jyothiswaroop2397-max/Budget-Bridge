import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global fallback event emitter for non-component calls (e.g. background listeners)
type ToastListener = (message: string, type: ToastType) => void;
const globalListeners: Set<ToastListener> = new Set();

export const showGlobalToast = (message: string, type: ToastType = 'info') => {
  globalListeners.forEach((listener) => listener(message, type));
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (!message) return;
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    setToasts((prev) => [...prev.slice(-3), newToast]); // keep at most 4 toasts to avoid screen clutter

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  // Register global listener for non-react module calls
  React.useEffect(() => {
    const listener: ToastListener = (msg, type) => {
      showToast(msg, type);
    };
    globalListeners.add(listener);
    return () => {
      globalListeners.delete(listener);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* FIXED TOAST NOTIFICATION CONTAINER (TOP-CENTERED WITH HIGH CONTRAST) */}
      <div
        id="budget-bridge-toast-container"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 pointer-events-none flex flex-col gap-2 items-center"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const isError = t.type === 'error';
            const isSuccess = t.type === 'success';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`pointer-events-auto w-full flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
                  isError
                    ? 'bg-rose-950/95 text-rose-100 border-rose-500/40 shadow-rose-950/40'
                    : isSuccess
                    ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/40'
                    : 'bg-slate-900/95 text-slate-100 border-slate-700/60 shadow-slate-950/40'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {!isError && !isSuccess && <Info className="w-4 h-4 text-cyan-400" />}
                </div>

                <div className="flex-1 text-xs font-medium leading-relaxed break-words">
                  {t.message}
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 text-slate-400 hover:text-white transition-colors p-0.5 -mr-1 -mt-0.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if called outside provider
    return {
      showToast: showGlobalToast,
      dismissToast: () => {},
    };
  }
  return context;
};
