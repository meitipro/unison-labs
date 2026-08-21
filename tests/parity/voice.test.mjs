/**
 * The product's voice, where a library would otherwise speak for it.
 *
 * A raw viem error reached the refusal panel during review:
 *
 *   User rejected the request. Details: stubbed: user rejected Version: viem@2.55.17
 *
 * Chapter four bans the shape outright and chapter five allows three parts and
 * no more. A dependency's version number on screen is the loudest possible
 * violation of both, so the mapping is pinned here rather than trusted.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { readableError } from "../../lib/voice.ts";
import * as copy from "../../lib/copy.ts";

/** Every string this product can put in front of a person. */
const VOICE = [
  ["no exclamation marks anywhere in the product", (s) => !s.includes("!")],
  ["no apology", (s) => !/\b(sorry|oops|unfortunately|apolog)/i.test(s)],
  ["no suggestion to try again", (s) => !/try again/i.test(s)],
  ["no dependency named", (s) => !/viem|genlayer-js|axios|fetch\(\)/i.test(s)],
  ["no library noise", (s) => !/Details:|Version:|\bat \w+\.\w+|0x[0-9a-f]{20}/i.test(s)],
  ["ends as a sentence", (s) => /[.?]$/.test(s.trim())],
];

function assertVoice(sentence, label) {
  for (const [rule, ok] of VOICE) {
    assert.ok(ok(sentence), `${label} breaks "${rule}": ${sentence}`);
  }
}

test("a rejected signature reads as a decision, not a failure", () => {
  const viemShape = Object.assign(
    new Error(
      "User rejected the request.\n\nDetails: user rejected\nVersion: viem@2.55.17",
    ),
    { code: 4001 },
  );
  const out = readableError(viemShape);

  assert.match(out, /Nothing was signed/);
  assert.ok(!out.includes("viem"), "the library's name must not reach the panel");
  assert.ok(!out.includes("Version:"), "nor its version banner");
  assertVoice(out, "the rejection sentence");
});

test("every mapped failure speaks in the product's voice", () => {
  const cases = [
    [Object.assign(new Error("User denied transaction signature."), { code: 4001 }), "denied"],
    [new Error("insufficient funds for intrinsic transaction cost"), "funds"],
    [new Error("An unknown RPC error occurred.\n\nDetails: fetch failed"), "rpc"],
    [new Error("chain mismatch: please switch network"), "chain"],
    [new Error("something nobody has ever seen before"), "unknown"],
  ];
  for (const [error, label] of cases) assertVoice(readableError(error), label);
});

test("an unrecognised error keeps its first sentence and drops the stack", () => {
  const out = readableError(
    new Error("The node refused the payload.\nDetails: nope\nVersion: viem@2.55.17\n    at foo.bar"),
  );
  assert.equal(out, "The node refused the payload.");
});

test("a wall of text is replaced rather than truncated mid-thought", () => {
  const out = readableError(new Error("x".repeat(400)));
  assert.ok(out.length < 220);
  assertVoice(out, "the fallback");
});

/**
 * Placeholders that are CODE, not prose.
 *
 * `gl.Contract` is a real base class and `from genlayer import *` a real
 * import, so nothing typographic reaches inside them. Named explicitly rather
 * than pattern-matched, so adding a third one is a decision somebody makes on
 * purpose instead of a rule quietly widening.
 */
const CODE_SAMPLES = new Set(["APP_PASTE_PLACEHOLDER", "PLACEHOLDER_PASTE"]);

/**
 * The nine characters house style bans outright.
 *
 * Built from escape sequences, never written literally: spelled out, this file
 * would contain every character it bans and `scripts/check.mjs` would report
 * the very test that enforces the rule.
 *
 * NOTE THE DIRECTION. The connector is a spaced hyphen and the ellipsis is
 * three periods, so `...` is CORRECT and U+2026 is not. This test asserted the
 * opposite until the rule was set, which is why `scripts/check.mjs` exists:
 * a convention nothing enforces drifts back within one session.
 */
const BANNED = new RegExp(
  "[\\u2014\\u2013\\u2010\\u2012\\u2015\\u2212\\u00b7\\u2022\\u2026]",
);

function bannedIn(value) {
  const found = value.match(BANNED);
  if (!found) return "";
  return `U+${found[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

test("the copy deck itself obeys the voice rules it sets", () => {
  const strings = Object.entries(copy).filter(([, v]) => typeof v === "string");
  assert.ok(strings.length > 20, "expected the deck to be loaded");

  for (const [key, value] of strings) {
    assert.ok(!value.includes("!"), `${key} contains an exclamation mark`);
    assert.ok(!/\b(sorry|oops|unfortunately)/i.test(value), `${key} apologises`);
    if (CODE_SAMPLES.has(key)) continue;
    const bad = bannedIn(value);
    assert.ok(
      !bad,
      `${key} uses ${bad}. The connector is a spaced hyphen, the ellipsis three periods.`,
    );
  }
});

test("every string in the deck obeys the rule, arrays and objects included", () => {
  /* HOW_CARDS and RUN_STAGES are an array of objects and an array of strings,
     and the loop above only reaches bare top-level strings. A rule half the
     deck is exempt from is not a rule. */
  let checked = 0;
  const walk = (value, path) => {
    if (typeof value === "string") {
      checked += 1;
      const bad = bannedIn(value);
      assert.ok(!bad, `${path} uses ${bad}: ${value}`);
      assert.ok(!value.includes("!"), `${path} contains an exclamation mark`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    } else if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) walk(entry, `${path}.${key}`);
    }
  };
  for (const [key, value] of Object.entries(copy)) {
    if (CODE_SAMPLES.has(key) || typeof value === "function") continue;
    walk(value, key);
  }
  assert.ok(checked > 40, `expected the whole deck to be walked, saw ${checked}`);
});

test("every code sample really is code", () => {
  for (const key of CODE_SAMPLES) {
    const value = copy[key];
    assert.equal(typeof value, "string", `${key} is exempted but does not exist`);
    assert.match(value, /gl\.Contract|genlayer|Depends/, `${key} is exempted but reads as prose`);
  }
});

test("the refusal is built from the three parts chapter five allows", () => {
  const refused = copy.refused("header, nondet, agreement");
  assert.match(refused, /^Refused before scoring/, "what happened, past tense, no subject pronoun");
  assert.match(refused, / - missing header, nondet, agreement\./, "which part, after the connector");
  assert.match(refused, /no fee is charged and no validator spends inference on it\.$/, "what follows");
  assertVoice(refused, "the refusal");
});
