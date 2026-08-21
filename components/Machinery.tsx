"use client";

/**
 * "Four parts of the machinery": a tabbed panel over Gate, Anchors, Consensus
 * and Record.
 *
 * The design draws four buttons that swap a block. Built here as a real tablist
 * - roving `aria-selected`, arrow keys, `role="tabpanel"` - because four
 * unlabelled buttons that change content elsewhere on the page are unusable
 * without it, and it costs nothing.
 *
 * The Anchors tab shows a criterion the CONTRACT published rather than a copy
 * of one, so the panel cannot drift from the rubric being applied.
 */

import { useRef, useState } from "react";

import * as copy from "../lib/copy";
import { SPEC } from "../lib/gate";
import type { Criterion } from "../lib/types";

const TABS = copy.MACHINERY_TABS;

export default function Machinery({ criteria }: { criteria: Criterion[] }) {
  const [tab, setTab] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = TABS.length - 1;
    let next = tab;
    if (event.key === "ArrowRight") next = tab === last ? 0 : tab + 1;
    else if (event.key === "ArrowLeft") next = tab === 0 ? last : tab - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    setTab(next);
    refs.current[next]?.focus();
  };

  const anchorCriterion = criteria[0];

  return (
    <section id="machinery" className="shell section on-view">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <h2 className="h2" style={{ maxWidth: "20ch" }}>
          {copy.MACHINERY_HEADING}
        </h2>
        <div role="tablist" aria-label="The machinery" onKeyDown={onKeyDown} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((label, i) => (
            <button
              key={label}
              ref={(node) => {
                refs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`machinery-tab-${i}`}
              aria-controls="machinery-panel"
              aria-selected={tab === i}
              aria-pressed={tab === i}
              tabIndex={tab === i ? 0 : -1}
              className="btn btn-outline"
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        id="machinery-panel"
        role="tabpanel"
        aria-labelledby={`machinery-tab-${tab}`}
        tabIndex={0}
        className="card"
        style={{ marginTop: 28, minHeight: 210 }}
      >
        {tab === 0 ? (
          <div className="split" style={{ gap: "32px 56px" }}>
            <div>
              <div className="eyebrow-gold">Runs before any fee</div>
              <div style={{ marginTop: 14, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--white)" }}>
                The gate
              </div>
              <p className="lede" style={{ marginTop: 12, maxWidth: "44ch", fontSize: 15 }}>
                Presence checks only - passing them proves almost nothing, since anyone
                can type the words into a comment, but failing a required one proves a
                great deal and costs nothing to find out
              </p>
            </div>
            <div>
              {/* The real published gate, not a retyped list of it. */}
              {SPEC.checks.map((check) => (
                <div key={check.id} className="gate-row">
                  <span className="gate-glyph pass" aria-hidden="true">
                    ✓
                  </span>
                  <span>{check.name.toLowerCase()}</span>
                  <span className="gate-req">{check.required ? "REQ" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 1 ? (
          <div className="split" style={{ gap: "32px 56px" }}>
            <div>
              <div className="eyebrow-gold">Written before the first score</div>
              <div style={{ marginTop: 14, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--white)" }}>
                Anchors
              </div>
              <p className="lede" style={{ marginTop: 12, maxWidth: "44ch", fontSize: 15 }}>
                Every point on every criterion has a sentence attached to it - that is
                what makes exact agreement between different models reachable at all
              </p>
            </div>
            <div style={{ display: "grid", gap: 14, fontSize: 14.5, lineHeight: 1.62 }}>
              {anchorCriterion ? (
                anchorCriterion.anchors.map((anchor, score) => (
                  <div
                    key={score}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "22px 1fr",
                      gap: 14,
                      color: score === 2 ? "var(--white)" : score === 1 ? "var(--muted)" : "var(--dim)",
                    }}
                  >
                    <span className="mono" style={{ color: score === 2 ? "var(--gold-lt)" : undefined }}>
                      {score}
                    </span>
                    <span>{anchor}</span>
                  </div>
                ))
              ) : (
                <p className="notice">{copy.NOT_LIVE}</p>
              )}
            </div>
          </div>
        ) : null}

        {tab === 2 ? (
          <div className="split" style={{ gap: "32px 56px" }}>
            <div>
              <div className="eyebrow-gold">Agreed, or no report</div>
              <div style={{ marginTop: 14, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--white)" }}>
                Consensus
              </div>
              <p className="lede" style={{ marginTop: 12, maxWidth: "44ch", fontSize: 15 }}>
                Validators mark independently and the marks are compared criterion by
                criterion - a split does not average, it suspends the report and names
                the anchor that caused it
              </p>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="node-row">
                  <span>node {String(n).padStart(2, "0")}</span>
                  <span className="bar">
                    <span style={{ width: "100%", opacity: 0.3 }} />
                  </span>
                  <span style={{ color: "var(--white)" }}>?</span>
                </div>
              ))}
              <p className="body" style={{ marginTop: 4, fontSize: 13 }}>
                A contract receives one aggregated bit per validator and cannot count
                its own jury. The votes that actually happened are shown on the report.
              </p>
            </div>
          </div>
        ) : null}

        {tab === 3 ? (
          <div className="split" style={{ gap: "32px 56px" }}>
            <div>
              <div className="eyebrow-gold">Permanent after finality</div>
              <div style={{ marginTop: 14, fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--white)" }}>
                The record
              </div>
              <p className="lede" style={{ marginTop: 12, maxWidth: "44ch", fontSize: 15 }}>
                One permalink carrying the source, its digest, the rubric version and
                every mark, so the score can be checked by somebody who was not there
              </p>
            </div>
            <div className="kv" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 14 }}>
                <span className="kv-key">source</span>
                <span className="kv-val">the raw file every validator fetched</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 14 }}>
                <span className="kv-key">digest</span>
                <span className="kv-val">sha256 of the bytes they agreed on</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 14 }}>
                <span className="kv-key">rubric</span>
                <span className="kv-val">the version in force when it was marked</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 14 }}>
                <span className="kv-key">marks</span>
                <span className="kv-val">every criterion, its score and its reason</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
