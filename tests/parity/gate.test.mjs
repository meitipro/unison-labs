/**
 * The browser gate and the contract gate must be the same gate.
 *
 *   npm test
 *
 * lib/gate.ts refuses submissions on its own authority, before any transaction
 * exists. If it disagrees with contracts/touchstone.py by one character, one of
 * two things happens and both are bad: it refuses work the chain would have
 * marked, or it waves through work the chain refuses after somebody has already
 * signed for it.
 *
 * So nothing here is written by hand. contracts/test_helpers.py --json prints
 * every answer the Python half gives -- the spec, the digests, the gate rows,
 * the band table, the normalisation edge cases -- and this file re-derives all
 * of them in TypeScript and compares.
 *
 * Node 24 strips types from .ts on import, so the real module is under test
 * rather than a copy of it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SPEC, digest, normalise, runGate } from "../../lib/gate.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

/** The Python half's answers, taken once. */
const REPORT = JSON.parse(
  execFileSync(
    process.platform === "win32" ? "python" : "python3",
    [join(ROOT, "contracts", "test_helpers.py"), "--json"],
    { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  ),
);

const FIXTURES = ["careful.py", "loose.py", "plain.py"];

function fixture(name) {
  return readFileSync(join(ROOT, "public", "fixtures", name), "utf8");
}

test("the compiled-in spec matches the one the contract publishes", () => {
  assert.deepEqual(SPEC, REPORT.spec);
});

test("no probe would be unmatchable after normalisation", () => {
  for (const check of SPEC.checks) {
    for (const probe of check.probes) {
      assert.ok(probe.length > 0, `${check.id} has an empty probe`);
      assert.ok(!/[\r\n]/.test(probe), `${check.id} probe carries a line ending`);
    }
  }
});

test("normalisation agrees on every edge case Python was asked about", () => {
  const cases = {
    crlf: "a\r\nb",
    bom: "﻿x",
    nbsp_kept: " x ",
    vtab_trimmed: "\vx\v",
    blank_lines: "\n\n  x  \n\n",
    inner_kept: "a  \n  b",
    empty: "",
    only_space: "   ",
  };
  for (const [name, input] of Object.entries(cases)) {
    assert.equal(
      normalise(input),
      REPORT.edges[name],
      `normalise disagrees on ${name}`,
    );
  }
});

test("a non-breaking space is kept by both halves", () => {
  // The trap this pins: JavaScript's trim() and Python's argument-less strip()
  // take DIFFERENT character sets. Both would drop U+00A0 and one would drop
  // U+FEFF, so both sides name the set they trim instead of asking the runtime.
  assert.equal(normalise(" x "), " x ");
  assert.equal(REPORT.edges.nbsp_kept, " x ");
});

test("sha256 agrees with Python on known vectors", async () => {
  assert.equal(await digest("abc"), REPORT.vectors.abc);
  assert.equal(await digest(""), REPORT.vectors.empty);
  assert.equal(
    await digest("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("the digest of every normalisation edge case agrees", async () => {
  for (const [name, expected] of Object.entries(REPORT.edge_digests)) {
    assert.equal(await digest(REPORT.edges[name]), expected, `digest differs for ${name}`);
  }
});

for (const name of FIXTURES) {
  test(`${name}: the gate and the digest agree with the contract`, async () => {
    const source = fixture(name);
    const expected = REPORT.fixtures[name];

    assert.equal(
      normalise(source).length,
      expected.normalised_chars,
      "the two halves normalised to different lengths",
    );
    assert.equal(await digest(normalise(source)), expected.digest);

    const got = runGate(source);
    assert.equal(got.passed, expected.gate.passed);
    assert.equal(got.total, expected.gate.total);
    assert.equal(got.eligible, expected.gate.eligible);
    assert.deepEqual(got.missing, expected.gate.missing);
    assert.deepEqual(
      got.rows.map((r) => [r.id, r.passed, r.required]),
      expected.gate.rows.map((r) => [r.id, r.passed, r.required]),
      "the two halves disagree row by row",
    );
  });
}

test("the three fixtures are the three shapes chapter thirteen fixes", () => {
  const careful = runGate(fixture("careful.py"));
  const loose = runGate(fixture("loose.py"));
  const plain = runGate(fixture("plain.py"));

  assert.equal(careful.passed, 6, "a careful contract passes every check");
  assert.ok(careful.eligible);

  assert.equal(loose.passed, 5, "one that settles too loosely passes five");
  assert.ok(loose.eligible, "and is still marked, because the miss is not required");

  assert.equal(plain.passed, 2, "one that isn't an Intelligent Contract passes two");
  assert.equal(plain.eligible, false, "and is refused before scoring");
  assert.deepEqual(plain.missing, ["header", "nondet", "agreement"]);
});

test("the refusal sentence is built the way chapter five builds one", async () => {
  const { refusalSentence } = await import("../../lib/gate.ts");
  const sentence = refusalSentence(runGate(fixture("plain.py")));

  assert.match(sentence, /^Refused before scoring - missing header, nondet, agreement\./);
  assert.match(sentence, /no fee is charged and no validator spends inference on it\.$/);
  assert.ok(!sentence.includes("!"), "no exclamation marks anywhere in the product");
  assert.ok(!/\byou\b|\byour\b/i.test(sentence), "no sentence addresses the reader");
  assert.ok(!/try again/i.test(sentence), "and none suggests trying again");
});

test("running a gate twice on the same source gives the same answer", () => {
  const source = fixture("loose.py");
  assert.deepEqual(runGate(source), runGate(normalise(source)));
});

test("the band table agrees for every reachable total", () => {
  // Bands live in the contract; the site only ever renders them. This pins the
  // arithmetic anyway, because a band is what a report asserts about a project.
  const bands = REPORT.bands;
  const bandOf = (total) => {
    for (const { floor, name } of bands) if (total >= floor) return name;
    return bands[bands.length - 1].name;
  };
  for (let total = 0; total <= 10; total += 1) {
    assert.equal(bandOf(total), REPORT.band_of[String(total)], `band differs at ${total}`);
  }
});
