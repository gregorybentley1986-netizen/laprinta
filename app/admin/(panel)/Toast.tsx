"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Tone = "ok" | "error";
type ToastFn = (message: string, tone?: Tone) => void;

const Ctx = createContext<ToastFn>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; tone: Tone }[]>([]);
  const seq = useRef(0);
  const push = useCallback<ToastFn>((message, tone = "ok") => {
    const id = ++seq.current;
    setItems((cur) => [...cur.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), tone === "error" ? 6000 : 2600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
