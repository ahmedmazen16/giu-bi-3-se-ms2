// src/context/ToastContext.jsx — lightweight toast notifications (success / error / info).
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    if (!message) return;
    const id = ++counter;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  // Stable object so it can be safely used in handlers/effects.
  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
            <span className="toast-ico">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</span>
            <span className="toast-msg">{t.message}</span>
            <span className="toast-close">✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
