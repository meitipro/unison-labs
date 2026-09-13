/**
 * Suggestions, pinned.
 *
 * Every suggestion is the pair of published anchors either side of a mark, so
 * the thing worth pinning is that nothing is invented: the text comes out of the
 * rubric verbatim, a full mark produces nothing, and the order puts first the
 * criteria a change to the source is certain to move.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { suggestionsFor } from "../../lib/suggest.ts";

const rubric = {
  version: "v3",
  max_score: 2,
  max_total: 10,
  bands: [],
  subjects: [
    {
      kind: "contract",
      criteria: [
        { id: "agreement", name: "The agreement rule fits", anchors: ["a0", "a1", "a2"], decided_by: "facts" },
        { id: "necessity", name: "Needs GenLayer at all", anchors: ["n0", "n1", "n2"], decided_by: "judgment" },
        { id: "boundary", name: "The boundary is drawn once", anchors: ["b0", "b1", "b2"], decided_by: "facts" },
        { id: "failure", name: "The failure branches exist", anchors: ["f0", "f1", "f2"], decided_by: "facts" },
      ],
    },
    {
      kind: "site",
      criteria: [{ id: "overreach", name: "No claim outruns the contract", anchors: ["o0", "o1", "o2"], decided_by: "judgment" }],
    },
  ],
  limits: { reason_chars: 120, source_bytes: 160000, prompt_source_chars: 80000, prompt_site_chars: 24000 },
};

const contract = {
  kind: "contract",
  target: "https://raw.githubusercontent.com/o/r/abc/c.py",
  total: 3,
  band: "unfit",
  marks: [
    { id: "agreement", score: 2, reason: "two pairs run" },
    { id: "necessity", score: 0, reason: "records values only" },
    { id: "boundary", score: 1, reason: "no copy to memory" },
    { id: "failure", score: 0, reason: "nothing raises" },
  ],
};

test("a full mark has nothing to suggest", () => {
  const ids = suggestionsFor(contract, rubric).map((s) => s.id);
  assert.equal(ids.includes("agreement"), false);
});

test("each suggestion is the anchor matched and the one above it, verbatim", () => {
  const boundary = suggestionsFor(contract, rubric).find((s) => s.id === "boundary");
  assert.equal(boundary.now, "b1");
  assert.equal(boundary.next, "b2");
  const necessity = suggestionsFor(contract, rubric).find((s) => s.id === "necessity");
  assert.equal(necessity.now, "n0");
  assert.equal(necessity.next, "n1");
});

test("the recorded reason and the published name travel with it", () => {
  const failure = suggestionsFor(contract, rubric).find((s) => s.id === "failure");
  assert.equal(failure.reason, "nothing raises");
  assert.equal(failure.name, "The failure branches exist");
});

test("counted criteria come first, lowest mark first within them", () => {
  assert.deepEqual(
    suggestionsFor(contract, rubric).map((s) => s.id),
    ["failure", "boundary", "necessity"],
  );
});

test("the site is read against the site's own criteria", () => {
  const site = { kind: "site", target: "https://x.test", total: 1, band: "unfit", marks: [{ id: "overreach", score: 1, reason: "r" }] };
  const [only] = suggestionsFor(site, rubric);
  assert.equal(only.next, "o2");
  assert.equal(only.decidedBy, "judgment");
});

test("no rubric means no suggestions rather than invented ones", () => {
  assert.deepEqual(suggestionsFor(contract, null), []);
});

test("a criterion the rubric does not publish is skipped, not guessed at", () => {
  const odd = { ...contract, marks: [{ id: "unheard_of", score: 0, reason: "x" }] };
  assert.deepEqual(suggestionsFor(odd, rubric), []);
});

test("a score outside 0 and 1 produces nothing", () => {
  const bad = { ...contract, marks: [{ id: "boundary", score: 7, reason: "x" }, { id: "failure", score: -1, reason: "x" }] };
  assert.deepEqual(suggestionsFor(bad, rubric), []);
});
