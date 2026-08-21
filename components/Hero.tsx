"use client";

/**
 * The hero: the slab, the headline, and four counters that climb on load.
 *
 * THE COUNTERS ARE THE ONE PLACE THIS DEPARTS FROM THE DESIGN, and it is the
 * same departure as everywhere else. The mockup climbs to `4 min`, `96.4%`,
 * `1001` and `148,206` - right for a design file, and three of those are
 * numbers this product has never measured. A landing page that opens with an
 * invented statistic is exactly the thing the rest of the product refuses to
 * do.
 *
 * So the animation is the design's and every number is one that can be stood
 * behind: what the contract has issued, what the rubric publishes, what a
 * refusal costs, and the validator set size - which is GenLayer's own published
 * figure, labelled as the network's rather than as ours.
 *
 * A number the page cannot read shows an em dash rather than a zero. Zero is a
 * measurement; "the node did not answer" is not.
 */

import { useEffect, useRef, useState } from "react";

import SiteHeader from "./SiteHeader";
import StoneSlab from "./StoneSlab";
import * as copy from "../lib/copy";

export type Counter = {
  /** Null when the value could not be read. */
  value: number | null;
  suffix?: string;
  label: string;
};

/**
 * Climb from zero to the target.
 *
 * THE STATE STARTS AT THE TARGET, not at zero, and that is the important part.
 * `requestAnimationFrame` does not run in a background tab, so a counter that
 * starts at 0 and climbs on rAF shows a visitor who opened the page in another
 * tab "0 Published criteria" - a wrong number, presented as a measurement, for
 * as long as they leave it there. It is also what the server renders.
 *
 * So the truth is the default and the animation is the decoration: the effect
 * drops to zero and climbs only once it knows it can, and a safety timeout
 * snaps to the target if the frames never arrive.
 */
function useClimb(target: number | null, delay: number, duration: number) {
  const [value, setValue] = useState(target ?? 0);
  const raf = useRef(0);

  useEffect(() => {
    if (target === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    setValue(0);
    let done = false;

    const timer = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setValue(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf.current = requestAnimationFrame(step);
        else done = true;
      };
      raf.current = requestAnimationFrame(step);
    }, delay);

    // If the frames never came - a background tab, a throttled renderer - land
    // on the real number rather than sitting at zero.
    const safety = setTimeout(() => {
      if (!done) setValue(target);
    }, delay + duration + 400);

    return () => {
      clearTimeout(timer);
      clearTimeout(safety);
      cancelAnimationFrame(raf.current);
    };
  }, [target, delay, duration]);

  return value;
}

function Stat({ counter, index }: { counter: Counter; index: number }) {
  const value = useClimb(counter.value, 480 + index * 90, 1500 + index * 80);
  const shown =
    counter.value === null ? "-" : `${Math.round(value).toLocaleString("en-US")}${counter.suffix ?? ""}`;

  return (
    <div className="reveal" style={{ animationDelay: `${500 + index * 80}ms` }}>
      {/* The design sets a display glyph over each figure -- # * ~ % -- which
          reads as notation rather than decoration once the figures are real:
          a percent sign over a validator count looks like a percentage, and a
          tilde over an exact zero says "about". The label does the work. */}
      <div
        style={{
          marginTop: 8,
          fontSize: "clamp(18px, 2.2vw, 26px)",
          fontWeight: 500,
          letterSpacing: "-0.025em",
          fontVariantNumeric: "tabular-nums",
          color: "var(--white)",
        }}
      >
        {shown}
      </div>
      <div style={{ marginTop: 4, fontSize: "clamp(11px, 1.2vw, 12.5px)", color: "var(--dim)" }}>
        {counter.label}
      </div>
    </div>
  );
}

export default function Hero({ counters }: { counters: Counter[] }) {
  return (
    <div style={{ position: "relative", height: "100vh", maxHeight: "100dvh", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#000", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, animation: "softfade 1600ms ease 300ms both" }}>
          <StoneSlab
            references={false}
            distance={8.2}
            stone="#101011"
            edge="#1E1E20"
            streakA="#8A6410"
            streakB="#C8951C"
            streakC="#E0B551"
            streakD="#7A5A0C"
            glowRgb="200,149,28"
          />
        </div>
        {/* Two washes: one to sink the slab into the page, one to hold the
            copy legible at the top and bottom edges. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 76% 60% at 50% 46%, rgba(0,0,0,.06) 0%, rgba(0,0,0,.46) 58%, rgba(0,0,0,.86) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(0,0,0,.66) 0%, rgba(0,0,0,.06) 24%, rgba(0,0,0,.06) 64%, rgba(0,0,0,.74) 100%)",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "clamp(16px, 2.4vh, 28px) clamp(14px, 3vw, 32px)",
          overflow: "hidden",
        }}
      >
        <SiteHeader current="Story" />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            maxWidth: 900,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/*
            THE THREE DISCS ARE GONE. The design stacks three circles each
            holding the numeral 9 -- three readings landing on the same number.
            This carried the Unison mark in all three instead, which said
            nothing (why three logos?) and rendered a 100px mark inside a 42px
            circle, so the last disc covered the caption beside it.

            A 9 is not ours to draw either: it is a sample score. The caption
            says the same thing in words, and keeps the design's pill.
          */}
          <div
            className="reveal hero-pill"
            style={{ animationDelay: "50ms" }}
          >
            {copy.HERO_PILL}
          </div>

          <h1
            className="display h1"
            style={{
              marginBottom: "clamp(14px, 2.4vh, 24px)",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span style={{ display: "block", animation: "headlineFade 850ms cubic-bezier(.22,1,.36,1) 120ms both" }}>
              {copy.HERO_LINE_1}
            </span>
            <span style={{ display: "block", animation: "headlineFade 850ms cubic-bezier(.22,1,.36,1) 300ms both" }}>
              {copy.HERO_LINE_2}
            </span>
          </h1>

          <p
            className="reveal"
            style={{
              margin: "0 0 clamp(18px, 3vh, 30px)",
              maxWidth: "min(500px, 92%)",
              fontSize: "clamp(15.5px, calc(1.55vw + 2pt), 18.5px)",
              lineHeight: 1.55,
              color: "#d0d0d0",
              opacity: 0.8,
              animationDelay: "280ms",
            }}
          >
            {copy.HERO_LEDE}
          </p>

          <a
            className="btn btn-glow"
            href="/app/connect"
            style={{ animation: "revealPulse 850ms cubic-bezier(.22,1,.36,1) 400ms both" }}
          >
            {copy.LAUNCH}
          </a>
        </div>

        <div
          style={{
            flexShrink: 0,
            width: "100%",
            maxWidth: 920,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(45%, 200px), 1fr))",
            gap: "clamp(14px, 2.2vh, 26px) 16px",
            textAlign: "center",
          }}
        >
          {counters.map((counter, index) => (
            <Stat key={counter.label} counter={counter} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
