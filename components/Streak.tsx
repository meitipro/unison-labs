"use client";

/**
 * A mark, drawn to length and printed as a numeral beside it.
 *
 * Everything is derived from the score — the width, the variant, the band word,
 * the label a screen reader hears — so no caller can draw a streak that
 * disagrees with its own number.
 *
 * The band word always sits beside the numeral. Nothing here is carried by
 * colour alone: greyscale the panel and the number, the word and the notches at
 * 4, 7 and 9 still say everything.
 */

import { useEffect, useState } from "react";

/** The reference marks, at 40%, 70% and 90%. */
const NOTCHES = [40, 70, 90];

/**
 * The band, from the total, by a pure function.
 *
 * The contract holds the one that counts and every report carries the band it
 * issued; this is for a streak drawn before a report has loaded.
 */
export function bandOf(score: number): string {
  if (score >= 9) return "exemplary";
  if (score >= 7) return "strong";
  if (score >= 4) return "workable";
  return "unfit";
}

export type StreakProps = {
  /** 0 to 10. */
  score: number;
  /** "contract" or "site". Names the row and the screen reader label. */
  kind: string;
  /** The band the contract issued. Falls back to the pure function. */
  band?: string;
  /** Delay before the draw starts, so two streaks draw in order. */
  drawAfterMs?: number;
  /** A criterion the submitter disputed. Marks the numeral; never hides it. */
  contested?: boolean;
};

export default function Streak({
  score,
  kind,
  band,
  drawAfterMs = 0,
  contested = false,
}: StreakProps) {
  const clamped = Math.max(0, Math.min(10, Math.round(score)));
  const name = band || bandOf(clamped);
  const low = clamped < 4;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    // Under reduced motion the CSS collapses the transition, so the mark simply
    // appears at full width. The timing goes; the element does not.
    const timer = setTimeout(() => setDrawn(true), Math.max(0, drawAfterMs));
    return () => clearTimeout(timer);
  }, [drawAfterMs]);

  return (
    <div>
      <div className="streak-head">
        <span className="h3" style={{ textTransform: "capitalize" }}>
          {kind}
        </span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontSize: 12.5,
              color: low ? "var(--fail)" : clamped >= 7 ? "var(--gold-lt)" : "var(--muted)",
            }}
          >
            {name}
          </span>
          <span className="streak-num">
            {clamped}
            {contested ? (
              <span style={{ fontSize: 18, verticalAlign: "super", color: "var(--dim)" }}>*</span>
            ) : null}
            <small>/10</small>
          </span>
        </span>
      </div>

      {/* One image with one label: announced once, when it lands. */}
      <div
        className="streak-track"
        role="img"
        aria-label={`${kind} score ${clamped} out of 10, ${name}`}
      >
        <div
          className={`streak-fill${low ? " low" : ""}`}
          style={{ width: drawn ? `${clamped * 10}%` : 0 }}
        />
        {NOTCHES.map((at) => (
          <span key={at} className="streak-notch" style={{ left: `${at}%` }} />
        ))}
      </div>

      <div className="streak-scale" aria-hidden="true">
        {NOTCHES.map((at) => (
          <span key={at} style={{ left: `${at}%` }}>
            {at / 10}
          </span>
        ))}
      </div>
    </div>
  );
}
