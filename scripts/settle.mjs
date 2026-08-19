/**
 * Measure whether the marking round actually settles.
 *
 *   node scripts/settle.mjs --contract=0x… [--source=…] [--times=3]
 *
 * The one question a rubric judged by a jury has to answer about itself. Five
 * independent 0/1/2 judgments matching EXACTLY is five coin flips, and the
 * spec's consensus line ("5 of 5 agreed, exactly, on every criterion") only
 * means anything if that happens most of the time rather than occasionally.
 *
 * Prints the three receipt fields that get confused for each other on every
 * attempt, because a disagreement and a broken contract look identical in two
 * of them.
 */
import { getAddress } from "viem";
import {
  Abort, clientFor, die, flag, outcomeOf, requireKey, waitFinal, writeWithRetry,
} from "./chain.mjs";

const address = getAddress(flag("contract", process.env.NEXT_PUBLIC_TOUCHSTONE_ADDRESS || ""));
const source = flag(
  "source",
  "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/main/contracts/football_bets.py",
);
const site = flag("site", "");
const times = Number(flag("times", "3"));
if (!address) die("Pass --contract=0x…");

const { client } = clientFor(requireKey("TOUCHSTONE_DEPLOYER_KEY"));
const results = [];

console.log(`\n  marking ${source}\n  against ${address}\n`);

for (let attempt = 1; attempt <= times; attempt += 1) {
  console.log(`  attempt ${attempt}`);
  try {
    const hash = await writeWithRetry(client, {
      address, functionName: "assay", args: [source, site], value: 0n,
    });
    const receipt = await waitFinal(client, hash, `    assay ${attempt}`);
    const out = outcomeOf(receipt);
    results.push(out);
    console.log(
      `    status ${out.status} / consensus ${out.consensus} / leader ${out.executed}` +
        ` / ${out.rounds} round(s)`,
    );
    if (out.why) console.log(`    it said: ${out.why}`);
  } catch (error) {
    console.log(`    ${String(error?.message ?? error).slice(0, 200)}`);
    results.push({ status: "threw", consensus: "-", executed: "-", rounds: 0, why: "" });
  }
  console.log("");
}

const settled = results.filter((r) => r.executed === "SUCCESS" && r.consensus === "MAJORITY_AGREE");
const alreadyThere = results.filter((r) => /already reviewed/.test(r.why));
console.log(`  settled with agreement   ${settled.length} of ${results.length}`);
console.log(`  refused as a repeat      ${alreadyThere.length}`);
console.log(
  `  disagreed                ${results.filter((r) => /DISAGREE|NO_MAJORITY/.test(r.consensus)).length}\n`,
);
