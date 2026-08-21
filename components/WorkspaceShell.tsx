"use client";

/**
 * The workspace shell: the rail, the handle that resizes it, and the header row
 * every pane shares.
 *
 * THE PANES ARE ROUTES, not a `pane` flag in state. `/app`, `/app/reports`,
 * `/app/validators` and `/app/settings` each get a url, a back button, a
 * bookmark and a shareable link, none of which a state toggle has. It also
 * means the rail can mark the current one with `aria-current` for free, and
 * each pane can be a server component that reads the chain.
 *
 * The rail has two modes and THE STYLESHEET decides which:
 *
 *   wide    a column whose width is dragged, double-click to reset, remembered
 *           across visits. The handle is a real button, so the width is also
 *           reachable with the arrow keys.
 *   narrow  a sheet over the content behind a scrim, closed by the scrim, by
 *           escape, and by following any link inside it.
 *
 * React owns exactly one bit of that -- whether the sheet is open. An earlier
 * version kept the breakpoint itself in state, from `matchMedia` in an effect,
 * and rendered the rail CLOSED on a 1280px viewport whenever the first
 * measurement happened before the surface had a width. The `change` event that
 * would have corrected it never fires, because nothing changed as far as the
 * query is concerned. See the note in `app/workspace.css`.
 *
 * The width is written to a CSS variable rather than to a style prop on the
 * column, so dragging does not re-render the entire pane on every pointer move.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
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

import ThemeSwitch from "./ThemeSwitch";
import WalletCard from "./WalletCard";
import { Toaster } from "./Toaster";
import { NETWORK_LABEL } from "../lib/chain";

const MIN = 232;
const MAX = 430;
const DEFAULT = 288;
const WIDTH_KEY = "unison.railw";

type Shell = { openRail: () => void; closeRail: () => void };

const ShellContext = createContext<Shell>({
  openRail: () => {},
  closeRail: () => {},
});

export function useShell(): Shell {
  return useContext(ShellContext);
}

const NAV = [
  {
    href: "/app",
    label: "Home",
    icon: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>
    ),
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </>
    ),
  },
  {
    href: "/app/validators",
    label: "Validators",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.76l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.6 1.6 0 0 0 15 19.4a1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.06A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.76.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.13A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.33-1.76l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6h.06A1.6 1.6 0 0 0 10 3.13V3a2 2 0 1 1 4 0v.13A1.6 1.6 0 0 0 15 4.6a1.6 1.6 0 0 0 1.76-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.06a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.13a1.6 1.6 0 0 0-1.47 1z" />
      </>
    ),
  },
];

export default function WorkspaceShell({
  children,
  recents,
}: {
  children: ReactNode;
  /** Report ids and their marks, newest first, read on the server. */
  recents: Array<{ id: number; label: string; tag: string; split: boolean }>;
}) {
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef(DEFAULT);

  const applyWidth = useCallback((width: number) => {
    widthRef.current = width;
    shellRef.current?.style.setProperty("--rail-w", `${width}px`);
  }, []);

  /* Restore the stored width. Whether it is USED is the stylesheet's business:
     below the breakpoint the rail is a fixed-width sheet and this is ignored. */
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(stored) && stored >= MIN && stored <= MAX) applyWidth(stored);
    } catch {
      /* Site data is blocked; the default width is fine. */
    }
  }, [applyWidth]);

  /* The sheet closes on escape and whenever the route changes. */
  useEffect(() => setRailOpen(false), [pathname]);

  useEffect(() => {
    if (!railOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRailOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen]);

  const store = useCallback((width: number) => {
    try {
      localStorage.setItem(WIDTH_KEY, String(width));
    } catch {
      /* as above */
    }
  }, []);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const x0 = event.clientX;
      const w0 = widthRef.current;
      setDragging(true);
      const move = (moveEvent: PointerEvent) => {
        applyWidth(Math.max(MIN, Math.min(MAX, w0 + (moveEvent.clientX - x0))));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDragging(false);
        store(widthRef.current);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [applyWidth, store],
  );

  /* The same column width, from the keyboard. Without this the rail is only
     resizable by people who can hold and drag a 5px target. */
  const onHandleKey = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? 32 : 8;
      let next = widthRef.current;
      if (event.key === "ArrowLeft") next -= step;
      else if (event.key === "ArrowRight") next += step;
      else if (event.key === "Home") next = MIN;
      else if (event.key === "End") next = MAX;
      else if (event.key === "Enter" || event.key === " ") next = DEFAULT;
      else return;
      event.preventDefault();
      const clamped = Math.max(MIN, Math.min(MAX, next));
      applyWidth(clamped);
      store(clamped);
    },
    [applyWidth, store],
  );

  const shell = useMemo<Shell>(
    () => ({
      openRail: () => setRailOpen(true),
      closeRail: () => setRailOpen(false),
    }),
    [],
  );

  return (
    <ShellContext.Provider value={shell}>
      <Toaster>
        <div className="ws" ref={shellRef}>
          <button
            type="button"
            className="ws-scrim"
            data-open={railOpen}
            aria-label="Close the workspace menu"
            aria-hidden={!railOpen}
            tabIndex={railOpen ? 0 : -1}
            onClick={() => setRailOpen(false)}
          />

          <div className="ws-railbox" data-open={railOpen}>
            <aside className="ws-rail" aria-label="Workspace">
              <div className="ws-brand">
                <span className="ws-brand-mark" aria-hidden="true">
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--ai)" }}>
                    unison
                  </span>
                  <span className="ws-eyebrow" style={{ fontSize: 9, letterSpacing: "0.2em", whiteSpace: "nowrap" }}>
                    review workspace
                  </span>
                </span>
              </div>

              <Link href="/app" className="ws-new">
                New review
              </Link>

              <div>
                <div className="ws-eyebrow" style={{ padding: "0 11px" }}>
                  Dashboard
                </div>
                <nav className="ws-nav">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {item.icon}
                      </svg>
                      <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div>
                <div className="ws-eyebrow">Recent reports</div>
                {recents.length ? (
                  <div className="ws-recent">
                    {recents.map((report) => (
                      <Link
                        key={report.id}
                        href={`/r/${report.id}`}
                        aria-current={pathname === `/r/${report.id}` ? "page" : undefined}
                      >
                        {report.label}
                        <span
                          className="tagpill"
                          style={report.split ? { color: "var(--afail)" } : undefined}
                        >
                          {report.tag}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--am)" }}>
                    Nothing has been marked on {NETWORK_LABEL} yet.
                  </p>
                )}
              </div>

              <div className="ws-foot">
                <WalletCard />
                <Link href="/" className="ws-quiet" style={{ padding: "0 2px" }}>
                  &#8592; Back to the site
                </Link>
              </div>
            </aside>
          </div>

          <button
              type="button"
              className="ws-handle"
              data-dragging={dragging}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the rail. Arrow keys adjust, enter resets."
              title="Drag to resize, enter to reset"
              onPointerDown={startResize}
              onDoubleClick={() => {
                applyWidth(DEFAULT);
                store(DEFAULT);
              }}
              onKeyDown={onHandleKey}
            >
              <span aria-hidden="true">
                <b>
                  <i />
                  <i />
                  <i />
                </b>
              </span>
          </button>

          <main className="ws-main">
            <div className="ws-inner">{children}</div>
          </main>
        </div>
      </Toaster>
    </ShellContext.Provider>
  );
}

/**
 * The header row every pane shares: the burger where the rail is a sheet, the
 * title and lede, the two chips, and the theme switch.
 */
export function WorkspaceHeader({
  title,
  lede,
  standard,
}: {
  title: string;
  lede: string;
  standard?: string;
}) {
  const { openRail } = useShell();
  return (
    <div className="ws-head">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
        {/* Rendered always, shown by the stylesheet only where the rail is a
            sheet. Deciding this in JavaScript is what made the rail render
            closed on a wide viewport. */}
        <button type="button" className="ws-burger" aria-label="Open the workspace menu" onClick={openRail}>
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 className="ws-title">{title}</h1>
          <p className="ws-sub">{lede}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="ws-chip" data-gold="true">
          dapp
        </span>
        {standard ? <span className="ws-chip">Rubric {standard}</span> : null}
        <ThemeSwitch />
      </div>
    </div>
  );
}
