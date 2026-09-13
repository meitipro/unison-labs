/**
 * What to change before deploying, read off the rubric the contract published.
 *
 * A suggestion here is never written by this file. For every criterion that
 * scored below two, it pairs the anchor the mark matched with the anchor one
 * step up, both taken verbatim from `rubric()`. So a suggestion can only ever
 * ask for what the published standard already asks for, and the day an anchor
 * changes on chain, every suggestion changes with it without a line of this
 * file moving.
 *
 * Pure, so tests/parity pins it without a browser or a node.
 */

import type { ReportSubject, Rubric } from "./types";

export type Suggestion = {
  id: string;
  /** The criterion's published name. */
  name: string;
  /** 0 or 1. A full mark has nothing to suggest. */
  score: number;
  /** The anchor this mark matched. */
  now: string;
  /** The anchor one step up, which is the suggestion. */
  next: string;
  /** Why it scored what it did, as the report recorded it. */
  reason: string;
  /**
   * "facts" is settled by a count over the source, so changing the source is
   * certain to move it. "judgment" is the jury's, and a change is an argument.
   */
  decidedBy: "facts" | "judgment";
};

export function suggestionsFor(subject: ReportSubject, rubric: Rubric | null): Suggestion[] {
  if (!rubric) return [];
  const published = rubric.subjects.find((s) => s.kind === subject.kind);
  if (!published) return [];
  const byId = new Map(published.criteria.map((c) => [c.id, c]));

  const out: Suggestion[] = [];
  for (const mark of subject.marks) {
    const criterion = byId.get(mark.id);
    const score = Math.floor(Number(mark.score));
    if (!criterion || !(score === 0 || score === 1)) continue;
    out.push({
      id: mark.id,
      name: criterion.name,
      score,
      now: criterion.anchors[score],
      next: criterion.anchors[score + 1],
      reason: mark.reason,
      decidedBy: criterion.decided_by === "facts" ? "facts" : "judgment",
    });
  }

  // Counted criteria first, since the same bytes always give the same mark and
  // a change is certain to register. Within each, the lowest mark first, since
  // that is where a single change is worth the most.
  return out.sort((a, b) => {
    if (a.decidedBy !== b.decidedBy) return a.decidedBy === "facts" ? -1 : 1;
    return a.score - b.score;
  });
}
