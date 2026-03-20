"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type UIMode = "classic" | "modern";

interface UIContextValue {
  mode: UIMode;
  toggle: () => void;
}

const UIContext = createContext<UIContextValue>({ mode: "classic", toggle: () => {} });

export function UIProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<UIMode>("classic");

  useEffect(() => {
    const stored = localStorage.getItem("ui-mode");
    if (stored === "modern") setMode("modern");
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "classic" ? "modern" : "classic";
      localStorage.setItem("ui-mode", next);
      return next;
    });
  }, []);

  return <UIContext.Provider value={{ mode, toggle }}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
