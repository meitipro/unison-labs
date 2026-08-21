"use client";

/**
 * The corner notice the design raises when the faucet lands.
 *
 * `role="status"` with `aria-live="polite"`, so a screen reader is told without
 * being interrupted mid-sentence. The container is always in the tree rather
 * than being mounted when the first toast arrives: a live region that appears
 * at the same moment as its content is frequently not announced at all, since
 * the reader has nothing to have been watching.
 *
 * Nothing here can carry an action. A toast that holds the only route to
 * something is a control on a four-second timer, so every action this app has
 * lives on the page and a toast only ever reports.
 */

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

export type Toast = {
  id: number;
  title: string;
  meta?: string;
  tone?: "gold" | "fail";
};

type ToastApi = { push: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastApi | null>(null);

const LIFETIME = 5000;

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const timers = useRef<number[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = next.current;
    next.current += 1;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    timers.current.push(
      window.setTimeout(() => {
        setToasts((list) => list.filter((entry) => entry.id !== id));
      }, LIFETIME),
    );
  }, []);

  useEffect(() => {
    const held = timers.current;
    return () => held.forEach((id) => window.clearTimeout(id));
  }, []);

  const api = useMemo<ToastApi>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ws-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="ws-toast" data-tone={toast.tone ?? "gold"}>
            <span className="ws-toast-icon" aria-hidden="true">
              {toast.tone === "fail" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M12 7v6" />
                  <path d="M12 17h.01" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className="ws-toast-body">
              <span className="ws-toast-title">{toast.title}</span>
              {toast.meta ? <span className="ws-toast-meta">{toast.meta}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  /* Callers outside the workspace get a no-op rather than a crash: a report
     that cannot raise a toast should still render. */
  return value ?? { push: () => {} };
}
