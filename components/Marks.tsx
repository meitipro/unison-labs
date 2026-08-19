"use client";

/**
 * The marks table, and the consensus strip.
 *
 * Two pips per criterion, because a criterion is worth two points. The numeral
 * is gold inside the criterion name and the pips repeat it, so the score
 * survives greyscale: check four is "greyscale the result screen" and the band
 * word, the numeral and the pips still have to tell you everything.
 *
 * A reason points at the source. It never gives advice, which is the failure
 * mode of every code review tool, and the contract enforces the shape -- one
 * line, under the cap, no angle brackets -- before it stores one.
 */

import { useEffect, useState } from "react";

import type { Mark, ReportSubject } from "../lib/types";
import type { Votes } from "../lib/writes";
import * as copy from "../lib/copy";

function Pips({ score }: { score: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {[0, 1].map((i) => (
        <span key={i} className={`pip${i < score ? " on" : ""}`} />
      ))}
    </span>
  );
}

function MarkRow({ mark, name }: { mark: Mark; name: string }) {
  return (
    <div className="mark-row">
      <div className="mark-head">
        <span className="h3">{name}</span>
        <span className="mark-score">{mark.score}</span>
      </div>
      <p className="body" style={{ margin: "10px 0 0" }}>{mark.reason}</p>
      <Pips score={mark.score} />
      <span className="sr-only">
        {mark.id}, {mark.score} out of 2
      </span>
    </div>
  );
}

export function MarksTable({
  subject,
  names,
}: {
  subject: ReportSubject;
  /** Criterion id to its published name, from the contract's rubric. */
  names: Record<string, string>;
}) {
  return (
    <div className="card-sm" style={{ marginTop: 12 }}>
      <div
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--dim)" }}
      >
        {subject.kind}
      </div>
      {subject.marks.map((mark) => (
        <MarkRow key={mark.id} mark={mark} name={names[mark.id] || mark.id} />
      ))}
    </div>
  );
}

/**
 * Five bars that fill left to right as the votes come in.
 *
 * The count is read out of the receipt, never assumed: a contract gets one bit
 * per validator, aggregated, and cannot count its own jury. Where the receipt
 * carries no votes the strip is not drawn at all rather than drawn empty.
 */
export function Consensus({ votes, startAfterMs = 0 }: { votes: Votes; startAfterMs?: number }) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    // 130ms stagger, starting as the draw ends. The only other motion in the
    // product, and it happens in the same three seconds as the draw.
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (let i = 1; i <= votes.agreed; i += 1) {
      timers.push(setTimeout(() => setFilled(i), startAfterMs + i * 130));
    }
    return () => timers.forEach(clearTimeout);
  }, [votes.agreed, startAfterMs]);

  return (
    <div
      style={{
        marginTop: 22,
        paddingTop: 16,
        borderTop: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        fontSize: 13.5,
        color: "var(--muted)",
      }}
    >
      <span style={{ display: "flex", gap: 5 }} aria-hidden="true">
        {Array.from({ length: votes.of }, (_, i) => (
          <span key={i} className={`pip${i < filled ? " on" : ""}`} style={{ width: 16, height: 6 }} />
        ))}
      </span>
      <span>{copy.consensus(votes.agreed, votes.of)}</span>
    </div>
  );
}
