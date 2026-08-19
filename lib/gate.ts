/**
 * The gate, in the browser. Step one, and it costs nothing.
 *
 * This is a deliberate twin of `normalise`, `digest_of` and `gate_of` in
 * contracts/touchstone.py. It exists so a refusal never becomes a transaction:
 * a file with no runner header and no non-deterministic call is not an
 * Intelligent Contract, and finding that out should not cost a validator an
 * inference.
 *
 * THE TWIN IS THE RISK, so three things hold it in place.
 *
 *  1. Substrings only. Every probe is plain containment, case sensitive, with
 *     no regular expressions on either side -- the one text operation that
 *     cannot drift between Python and JavaScript.
 *  2. The spec is published. `gate_spec()` on the contract returns the probes
 *     themselves, so `runGate` takes a spec argument and the app passes the
 *     chain's. SPEC below is the compiled-in copy for a cold start, and
 *     tests/parity pins it against the Python one character for character.
 *  3. The contract runs the gate again, on the bytes the validators agreed on.
 *     A browser running a softer gate gets a refusal from the chain instead of
 *     a mark.
 */

export type GateCheck = {
  id: string;
  name: string;
  required: boolean;
  /** "all" -> every probe must be present. "any" -> at least one. */
  mode: "all" | "any";
  /** "head" -> the first `head_chars`. "all" -> the whole source. */
  scope: "head" | "all";
  probes: string[];
};

export type GateSpec = {
  head_chars: number;
  checks: GateCheck[];
};

export type GateRow = {
  id: string;
  name: string;
  required: boolean;
  passed: boolean;
};

export type GateResult = {
  rows: GateRow[];
  passed: number;
  total: number;
  /** Required ids that missed. Non-empty means refused before scoring. */
  missing: string[];
  eligible: boolean;
};

/**
 * The compiled-in copy of the published gate.
 *
 * Kept only so the first paint of a cold page can run the gate before the
 * chain has answered. Anything authoritative uses the spec the contract
 * published; tests/parity/gate.test.mjs fails if this drifts from it.
 */
export const SPEC: GateSpec = {
  head_chars: 400,
  checks: [
    {
      id: "header",
      name: "Declares a py-genlayer dependency header",
      required: true,
      mode: "all",
      scope: "head",
      probes: ['"Depends"', "py-genlayer"],
    },
    {
      id: "contract",
      name: "Declares a class the network can load",
      required: true,
      mode: "any",
      scope: "all",
      probes: ["(gl.Contract)", "( gl.Contract )", "(gl.Contract,", "(gl.Contract )"],
    },
    {
      id: "nondet",
      name: "Reaches outside the deterministic world at all",
      required: true,
      mode: "any",
      scope: "all",
      probes: [
        "gl.nondet.exec_prompt",
        "gl.nondet.web.",
        "gl.vm.run_nondet",
        "gl.eq_principle.",
      ],
    },
    {
      id: "agreement",
      name: "Declares how validators are meant to agree",
      required: true,
      mode: "any",
      scope: "all",
      probes: [
        "gl.eq_principle.strict_eq",
        "gl.eq_principle.prompt_comparative",
        "gl.eq_principle.prompt_non_comparative",
        "gl.vm.run_nondet",
      ],
    },
    {
      id: "errors",
      name: "Raises at least one error a human could read",
      required: false,
      mode: "any",
      scope: "all",
      probes: ["gl.vm.UserError", "gl.advanced.user_error_immediate"],
    },
    {
      id: "storage",
      name: "Keeps its state in a persistent collection",
      required: false,
      mode: "any",
      scope: "all",
      probes: ["DynArray[", "TreeMap["],
    },
  ],
};

/**
 * Exactly these characters are trimmed, written out one by one.
 *
 * NOT `String.prototype.trim()`, and not Python's argument-less `str.strip()`
 * either. The two disagree about which characters count -- U+FEFF is trimmed by
 * one and kept by the other -- and a file that begins with a byte order mark
 * would then get two different digests, so the browser would look up a report
 * the chain had filed under a different key. Naming the set removes the
 * question.
 */
const TRIM = " \t\n\v\f\r";

function trimExact(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && TRIM.includes(text[start])) start += 1;
  while (end > start && TRIM.includes(text[end - 1])) end -= 1;
  return text.slice(start, end);
}

/** The canonical form of a source. The digest and the gate are both taken over this. */
export function normalise(text: string): string {
  let out = text.startsWith("﻿") ? text.slice(1) : text;
  out = out.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return trimExact(out);
}

/** sha256 of the normalised source, lower case hex. Matches `digest_of`. */
export async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashed = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Run the gate. Pass the chain's spec whenever it is loaded. */
export function runGate(source: string, spec: GateSpec = SPEC): GateResult {
  const text = normalise(source);
  const head = text.slice(0, spec.head_chars);

  const rows: GateRow[] = spec.checks.map((check) => {
    const haystack = check.scope === "head" ? head : text;
    let hits = 0;
    for (const probe of check.probes) if (haystack.includes(probe)) hits += 1;
    const passed = check.mode === "all" ? hits === check.probes.length : hits > 0;
    return { id: check.id, name: check.name, required: check.required, passed };
  });

  const missing = rows.filter((r) => r.required && !r.passed).map((r) => r.id);
  return {
    rows,
    passed: rows.filter((r) => r.passed).length,
    total: rows.length,
    missing,
    eligible: missing.length === 0,
  };
}

/**
 * The refusal sentence, built the way chapter five of the spec builds one:
 * what happened, then the exact identifiers, then the consequence. No apology
 * and no suggestion to try again.
 */
export function refusalSentence(result: GateResult): string {
  return (
    `Refused before scoring — missing ${result.missing.join(", ")}. ` +
    "This is not an Intelligent Contract, so no fee is charged and no validator " +
    "spends inference on it."
  );
}
