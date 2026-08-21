"use client";

/**
 * Two things the workspace remembers: which theme it is in, and whether the
 * magnetic pointer is drawn.
 *
 * Both are stored, and both are applied to <html> BEFORE FIRST PAINT by
 * `PREFS_BOOT`, an inline script `app/layout.tsx` renders in <head>. A
 * preference restored inside an effect paints the default first and corrects
 * itself a frame later, which is a full white flash in the face of somebody who
 * chose dark. There is no way around this in React alone: the server does not
 * know what this browser stored.
 *
 * The theme is deliberately NOT taken from `prefers-color-scheme`. The site is
 * black in every case -- it is one long dark page and the design is built on
 * that -- so a system preference would flip only half the product and leave the
 * two surfaces disagreeing. The workspace defaults to dark to match the site,
 * and switching is a decision the person makes here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

const THEME_KEY = "unison.theme";
const POINTER_KEY = "unison.pointer";

/**
 * Runs in <head>, before the body exists.
 *
 * Wrapped in its own try/catch because localStorage throws outright in a
 * browser with site data blocked, and an exception here would abort the rest of
 * the document's head scripts.
 */
export const PREFS_BOOT = [
  "(function(){try{",
  "var t=localStorage.getItem('unison.theme');",
  "document.documentElement.setAttribute('data-app-theme',t==='light'?'light':'dark');",
  "var p=localStorage.getItem('unison.pointer');",
  "if(p==='system')document.documentElement.setAttribute('data-pointer','system');",
  "}catch(e){document.documentElement.setAttribute('data-app-theme','dark');}})();",
].join("");

type Prefs = {
  theme: Theme;
  /** The magnetic pointer is wanted. It may still not be drawn -- see the
   *  component, which has guards of its own. */
  magnetic: boolean;
  /** Counts theme changes, so the switch can replay its burst on each one. */
  flips: number;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setMagnetic: (on: boolean) => void;
};

const PrefsContext = createContext<Prefs | null>(null);

function read(): { theme: Theme; magnetic: boolean } {
  if (typeof document === "undefined") return { theme: "dark", magnetic: true };
  const attr = document.documentElement.getAttribute("data-app-theme");
  return {
    theme: attr === "light" ? "light" : "dark",
    magnetic: document.documentElement.getAttribute("data-pointer") !== "system",
  };
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  /* Starts at the default so server and first client render agree; the effect
     below reconciles with whatever the boot script already put on <html>, which
     is a state change with no repaint because the attribute is already right. */
  const [theme, setThemeState] = useState<Theme>("dark");
  const [magnetic, setMagneticState] = useState(true);
  const [flips, setFlips] = useState(0);

  useEffect(() => {
    const stored = read();
    setThemeState(stored.theme);
    setMagneticState(stored.magnetic);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setFlips((n) => n + 1);
    document.documentElement.setAttribute("data-app-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* Site data is blocked. The theme still applies for this visit. */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(read().theme === "light" ? "dark" : "light");
  }, [setTheme]);

  const setMagnetic = useCallback((on: boolean) => {
    setMagneticState(on);
    if (on) document.documentElement.removeAttribute("data-pointer");
    else document.documentElement.setAttribute("data-pointer", "system");
    try {
      localStorage.setItem(POINTER_KEY, on ? "custom" : "system");
    } catch {
      /* as above */
    }
  }, []);

  const value = useMemo<Prefs>(
    () => ({ theme, magnetic, flips, setTheme, toggleTheme, setMagnetic }),
    [theme, magnetic, flips, setTheme, toggleTheme, setMagnetic],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return value;
}
