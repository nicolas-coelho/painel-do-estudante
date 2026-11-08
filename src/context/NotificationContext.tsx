import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
  showConfirm: (options: ConfirmDialogOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogOptions | null>(null);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, type, title, message };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmModal(options);
  }, []);

  const handleConfirmAction = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  const handleCancelAction = () => {
    if (confirmModal) {
      if (confirmModal.onCancel) confirmModal.onCancel();
      setConfirmModal(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* ======================================================== */}
      {/* FLOATING TOAST NOTIFICATIONS (CANTO SUPERIOR DIREITO)     */}
      {/* ======================================================== */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slideInRight ${
                isSuccess
                  ? 'bg-emerald-50/95 dark:bg-[#16271e]/95 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : isError
                  ? 'bg-red-50/95 dark:bg-[#2c1517]/95 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
                  : isWarning
                  ? 'bg-amber-50/95 dark:bg-[#2b2210]/95 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                  : 'bg-stone-50/95 dark:bg-[#222222]/95 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                {!isSuccess && !isError && !isWarning && (
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h5 className="font-semibold text-xs md:text-sm leading-tight">{toast.title}</h5>
                {toast.message && (
                  <p className="text-[11px] md:text-xs opacity-85 mt-0.5 leading-snug">{toast.message}</p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* IN-APP CONFIRMATION MODAL (SUBSTITUI O WINDOW.CONFIRM)     */}
      {/* ======================================================== */}
      {confirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.danger !== false
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                }`}
              >
                {confirmModal.danger !== false ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base text-[#37352f] dark:text-white leading-tight">
                  {confirmModal.title}
                </h4>
                <p className="text-xs md:text-sm text-[#787774] dark:text-[#9b9a97] mt-1.5 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f0efec] dark:border-[#2d2d2d]">
              <button
                type="button"
                onClick={handleCancelAction}
                className="px-4 py-2 rounded-xl text-xs md:text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white shadow-sm transition-colors ${
                  confirmModal.danger !== false
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
