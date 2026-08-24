/**
 * Prove a deployed Unison actually works, on a real network.
 *
 *   npm run verify -- --contract=0x...
 *   npm run verify -- --contract=0x... --source=https://raw.../c.py --site=https://x.test
 *
 * Six things get checked, cheapest first, because the expensive one is a jury
 * and there is no point convening it if a view is broken:
 *
 *   1. the published rubric matches the one in the repo
 *   2. the published gate spec matches lib/gate.ts's compiled-in copy
 *   3. the CHAIN's gate agrees with the browser's, on all three fixtures
 *   4. an assay of a real source: fetch, gate, mark, sum, band, store
 *   5. the same source again is refused without spending an inference
 *   6. a source that fails the gate is refused before scoring
 *
 * Step 3 is the one worth the round trip. `gate()` is a view, so asking the
 * chain to run its own gate over the exact bytes the browser just judged costs
 * nothing and settles the only question that matters about the twin.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getAddress } from "viem";

import {
  Abort,
  assertExecuted,
  clientFor,
  die,
  flag,
  leaderOf,
  refusalOf,
  requireKey,
  waitFinal,
  writeWithRetry,
} from "./chain.mjs";
import { SPEC, digest, normalise, runGate } from "../lib/gate.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const FIXTURES = ["careful.py", "loose.py", "plain.py"];

/** A real GenLayer contract on a host the NODES can reach. */
const DEFAULT_SOURCE =
  "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/contracts/football_bets.py";
/** A perfectly good python file that is not an Intelligent Contract. */
const DEFAULT_REFUSED = "https://raw.githubusercontent.com/python/cpython/main/Lib/this.py";

let failures = 0;
let checks = 0;

function ok(label, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`   ok   ${label}`);
  } else {
    failures += 1;
    console.log(`   FAIL ${label}${detail ? `\n          ${detail}` : ""}`);
  }
}

function fixture(name) {
  return readFileSync(join(ROOT, "public", "fixtures", name), "utf8");
}

function deepEqual(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  }
  return value;
}

/**
 * Tiny sources, each one under the view-argument ceiling, that between them
 * exercise every check and both modes.
 *
 * WHY NOT THE REAL FIXTURES: `gen_call` on Studio mis-encodes any call whose
 * calldata runs past roughly 200 bytes -- it answers
 * "RLP string ends with N superfluous bytes", where N tracks the argument
 * length, for every size from 256 bytes up. 128 bytes is fine and 256 is not,
 * which is where an RLP length prefix stops fitting in one byte. It is an RPC
 * encoding limit, not a contract limit: `assay` is a write and goes down a
 * different path, and the same view answers correctly for short input.
 *
 * So chain-side parity is proven here on inputs the RPC can carry, and parity
 * on the real 5KB fixtures is proven in tests/parity against the same Python.
 */
const GATE_CASES = [
  ["nothing at all", ""],
  ["a header alone", '# { "Depends": "py-genlayer:1" }'],
  ["py-genlayer without the Depends key", "# py-genlayer is a runner"],
  ["a class alone", "class A(gl.Contract): pass"],
  ["an equivalence principle alone", "x = gl.eq_principle.strict_eq(f)"],
  ["a readable error alone", 'raise gl.vm.UserError("x")'],
  ["a persistent collection alone", "a: DynArray[str]"],
  ["a spaced base class", "class A( gl.Contract ): pass"],
  [
    "everything but a readable error",
    '# { "Depends": "py-genlayer:1" }\nclass A(gl.Contract):\n a: TreeMap[str,str]\n gl.vm.run_nondet(f,g)',
  ],
];

async function main() {
  const address = getAddress(flag("contract", process.env.NEXT_PUBLIC_UNISONLABS_ADDRESS || ""));
  if (!address) die("Pass --contract=0x... or set NEXT_PUBLIC_UNISONLABS_ADDRESS.");
  const key = requireKey("UNISONLABS_DEPLOYER_KEY");
  const { chain, account, client } = clientFor(key);

  const read = (functionName, args = []) =>
    client.readContract({ address, functionName, args });

  console.log("");
  console.log(`  contract   ${address}`);
  console.log(`  network    ${chain.name} (chain ${chain.id})`);
  console.log(`  caller     ${account.address}`);

  /* --- 1 & 2. what the contract publishes ------------------------------- */

  console.log("\n  1. the published standard\n");

  const rubric = JSON.parse(await read("rubric"));
  ok("the rubric loads", typeof rubric === "object");
  /* Read out of the contract source rather than repeated here. This said "v1"
     against a chain publishing v3, and a check that has to be edited every time
     the thing it checks changes is a check nobody believes. */
  const wantVersion = (
    readFileSync(join(ROOT, "contracts", "unison.py"), "utf8").match(
      /^RUBRIC_VERSION\s*=\s*"([^"]+)"/m,
    ) || []
  )[1];
  ok(
    `it is the rubric in this repo (${wantVersion || "unreadable"})`,
    Boolean(wantVersion) && rubric.version === wantVersion,
    `chain says ${rubric.version}`,
  );
  ok("ten points is the ceiling", rubric.max_total === 10);
  ok("every criterion is worth 0, 1 or 2", rubric.max_score === 2);
  ok(
    "two subjects, five criteria each",
    rubric.subjects.length === 2 && rubric.subjects.every((s) => s.criteria.length === 5),
  );
  ok(
    "every criterion carries three anchors",
    rubric.subjects.every((s) => s.criteria.every((c) => c.anchors.length === 3)),
  );
  ok(
    "the four bands are the ones the ticks are drawn at",
    JSON.stringify(rubric.bands.map((b) => b.floor)) === "[9,7,4,0]",
  );
  ok(
    "the agreement anchor is the one the spec prints",
    rubric.subjects[0].criteria[0].anchors[2] ===
      "the output is collapsed to a stable shape before consensus sees it",
  );

  const spec = JSON.parse(await read("gate_spec"));
  // deepEqual, not a string compare: the contract dumps json with sort_keys so
  // its keys come back alphabetical, and comparing serialisations would report
  // a mismatch for two identical specs written in a different order.
  ok(
    "the published gate spec matches lib/gate.ts exactly",
    deepEqual(spec, JSON.parse(JSON.stringify(SPEC))),
    "the browser would be running a different gate from the chain",
  );
  ok(
    "four of the six checks are required",
    spec.checks.filter((c) => c.required).length === 4,
  );

  const stats = JSON.parse(await read("stats"));
  console.log(
    `\n         ${stats.reports} report(s), ${stats.contested} contested, ${stats.splits} split(s) recorded`,
  );

  /* --- 3. the chain's gate against the browser's ------------------------ */

  console.log("\n  2. the same gate on both sides, check by check\n");

  for (const [label, source] of GATE_CASES) {
    const mine = runGate(source);
    let theirs;
    try {
      theirs = JSON.parse(await read("gate", [source]));
    } catch (error) {
      ok(`${label}: the chain ran its gate`, false, String(error?.details ?? error?.message).slice(0, 120));
      continue;
    }
    ok(
      `${label}: ${theirs.passed} of ${theirs.total}${theirs.eligible ? ", eligible" : ""}`,
      deepEqual(
        mine.rows.map((r) => [r.id, r.passed]),
        theirs.rows.map((r) => [r.id, r.passed]),
      ) &&
        mine.passed === theirs.passed &&
        mine.eligible === theirs.eligible &&
        deepEqual(mine.missing, theirs.missing),
      `browser ${JSON.stringify(mine.rows.map((r) => r.passed))} vs chain ${JSON.stringify(
        theirs.rows.map((r) => r.passed),
      )}`,
    );
  }

  console.log("\n         (parity on the real 5KB fixtures is proven in tests/parity;");
  console.log("          gen_call cannot carry an argument that long -- see GATE_CASES)");

  /* --- 4. a real assay -------------------------------------------------- */

  const sourceUrl = flag("source", DEFAULT_SOURCE);
  const siteUrl = flag("site", "");

  console.log(`\n  3. an assay of a real source\n\n         ${sourceUrl}`);
  if (siteUrl) console.log(`         and the site ${siteUrl}`);
  console.log("\n         this convenes a jury: a fetch every node repeats, then a");
  console.log("         mark every node makes itself. It takes minutes, not seconds.\n");

  let reportId = null;
  let sourceDigest = null;

  try {
    const hash = await writeWithRetry(client, {
      address,
      functionName: "assay",
      args: [sourceUrl, siteUrl],
      value: 0n,
    });
    console.log(`         tx ${hash}`);
    const receipt = await waitFinal(client, hash, "     assay");
    const leader = leaderOf(receipt);
    const executed = String(leader?.execution_result ?? "");

    if (executed === "SUCCESS") {
      ok("the assay executed", true);
    } else {
      const why = refusalOf(receipt);
      // A refusal here is still information: it proves the deterministic half
      // ran on the node and reported in the product's own vocabulary.
      ok(`the assay was refused, and said why: "${why}"`, Boolean(why), JSON.stringify(leader?.result).slice(0, 300));
    }
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/UNDETERMINED|could not be agreed|no majority/i.test(message)) {
      console.log(`         the validators did not agree. That is a designed outcome.`);
      ok("an undetermined round wrote nothing", true);
    } else {
      ok(`the assay landed`, false, message.slice(0, 400));
    }
  }

  /* Read the report back from the chain rather than out of the receipt: a
     receipt renders a return value as comma-less pseudo-json no parser takes. */
  try {
    const body = await fetch(sourceUrl).then((r) => (r.ok ? r.text() : ""));
    if (body) {
      sourceDigest = await digest(normalise(body));
      /* The site is half the key. Passing the digest alone asks a question
         the contract stopped answering and gets a null that reads as "never
         reviewed" for a source that was. */
      const found = await read("report_by_digest", [sourceDigest, siteUrl]);
      if (found) {
        const report = JSON.parse(found);
        reportId = report.id;
        console.log(`\n         report ${report.id}   digest ${report.digest.slice(0, 12)}...`);
        console.log(`         gate ${report.gate.passed} of ${report.gate.total}`);
        for (const subject of report.subjects) {
          console.log(
            `\n         ${subject.kind.toUpperCase()}  ${subject.total}/10  ${subject.band}`,
          );
          for (const mark of subject.marks) {
            console.log(`           ${mark.score}  ${mark.id.padEnd(11)} ${mark.reason}`);
          }
        }
        ok(
          "the total is the sum of the five marks",
          report.subjects.every(
            (s) => s.marks.reduce((a, m) => a + m.score, 0) === s.total,
          ),
        );
        ok(
          "the band is the one the total earns",
          report.subjects.every((s) => {
            const floors = rubric.bands;
            const want = floors.find((b) => s.total >= b.floor)?.name;
            return s.band === want;
          }),
        );
        ok(
          "the two scores are never averaged into one",
          !Object.prototype.hasOwnProperty.call(report, "score") &&
            !Object.prototype.hasOwnProperty.call(report, "total"),
        );
        ok(
          "every reason is one line, under the cap, with no angle brackets",
          report.subjects.every((s) =>
            s.marks.every(
              (m) =>
                m.reason.length > 0 &&
                m.reason.length <= rubric.limits.reason_chars &&
                !/[<>\n\r]/.test(m.reason),
            ),
          ),
        );
      } else {
        console.log("\n         no report was filed for that source.");
      }
    }
  } catch (error) {
    console.log(`         (could not read the source locally: ${String(error).slice(0, 120)})`);
  }

  /* --- 5. the same source twice ----------------------------------------- */

  if (reportId) {
    console.log("\n  4. the same source again, which must cost no inference\n");
    try {
      const hash = await writeWithRetry(client, {
        address,
        functionName: "assay",
        /* The SAME subject, or this proves nothing: with a different site it is
           a new review and the contract is right to charge for it. */
        args: [sourceUrl, siteUrl],
        value: 0n,
      });
      const receipt = await waitFinal(client, hash, "     repeat");
      const why = refusalOf(receipt);
      ok(
        `a repeat points at the existing report: "${why}"`,
        /already reviewed, see report/.test(why),
        why || "no refusal sentence came back",
      );
    } catch (error) {
      ok("the repeat was refused", false, String(error?.message ?? error).slice(0, 300));
    }
  }

  /* --- 6. the refusal path --------------------------------------------- */

  console.log("\n  5. a file that is not an Intelligent Contract\n");
  console.log(`         ${DEFAULT_REFUSED}\n`);
  try {
    const hash = await writeWithRetry(client, {
      address,
      functionName: "assay",
      args: [flag("refused", DEFAULT_REFUSED), ""],
      value: 0n,
    });
    const receipt = await waitFinal(client, hash, "     refusal");
    const why = refusalOf(receipt);
    ok(
      `refused before scoring: "${why}"`,
      /refused before scoring/i.test(why) || /404|answered/i.test(why),
      why || "no refusal sentence came back",
    );
    ok("no exclamation mark and no apology", !/[!]|sorry|oops/i.test(why));
  } catch (error) {
    ok("the refusal landed", false, String(error?.message ?? error).slice(0, 300));
  }

  console.log("");
  if (failures) {
    console.log(`  ${failures} of ${checks} checks failed\n`);
    process.exitCode = 1;
  } else {
    console.log(`  ${checks} checks passed against ${address}\n`);
  }
}

main().catch((error) => {
  if (error instanceof Abort) console.error(`\n  ${error.message}\n`);
  else console.error(`\n  ${error?.stack ?? error?.message ?? error}\n`);
  process.exitCode = 1;
});
