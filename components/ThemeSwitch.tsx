"use client";

/**
 * The workspace's light/dark switch, drawn as a physical object.
 *
 * A `role="switch"` button rather than a decorated div, so it is reachable by
 * keyboard, announces its state, and toggles on space as well as enter. The
 * design's own markup already carries `role="switch"` and `aria-checked`, which
 * is unusually careful for a mockup and worth keeping exactly.
 *
 * `aria-checked` answers "is it dark", matching the label, because a switch
 * whose checked state is unnamed reads as "switch, on" and says nothing.
 */

import { usePrefs } from "../lib/prefs";

export default function ThemeSwitch() {
  const { theme, flips, toggleTheme } = usePrefs();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to the light workspace" : "Switch to the dark workspace"}
      className="ws-switch"
      onClick={toggleTheme}
    >
      <span className="groove" aria-hidden="true" />
      <span className="faces" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sunc)" strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 420ms ease" }}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--moonc)" strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 420ms ease" }}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
      <span className="knob" aria-hidden="true">
        <span className="sheen" />
        {/* Keyed on the flip count so the burst restarts on every press; an
            animation that has already run does not run again by itself. */}
        <span
          key={flips}
          className="burst"
          style={{
            animation:
              flips === 0
                ? "none"
                : `${flips % 2 === 1 ? "burstA" : "burstB"} 700ms cubic-bezier(.22,1,.36,1) both`,
          }}
        />
        {dark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E0B551" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A6410" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </svg>
        )}
      </span>
    </button>
  );
}
