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
 * `...` is a real Python literal and `gl.Contract` is a real base class, so the
 * typographic rules do not reach inside them. Named explicitly rather than
 * pattern-matched, so adding a third one is a decision somebody makes on
 * purpose instead of a rule quietly widening.
 */
const CODE_SAMPLES = new Set(["APP_PASTE_PLACEHOLDER", "PLACEHOLDER_PASTE"]);

test("the copy deck itself obeys the voice rules it sets", () => {
  const strings = Object.entries(copy).filter(([, v]) => typeof v === "string");
  assert.ok(strings.length > 20, "expected the deck to be loaded");

  for (const [key, value] of strings) {
    assert.ok(!value.includes("!"), `${key} contains an exclamation mark`);
    assert.ok(!/\b(sorry|oops|unfortunately)/i.test(value), `${key} apologises`);
    if (CODE_SAMPLES.has(key)) continue;
    // The ellipsis is ONE character and only ever inside a hash or a url.
    assert.ok(!value.includes("..."), `${key} uses three periods rather than an ellipsis`);
  }
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
  assert.match(refused, /— missing header, nondet, agreement\./, "which part, after an em dash");
  assert.match(refused, /no fee is charged and no validator spends inference on it\.$/, "what follows");
  assertVoice(refused, "the refusal");
});
