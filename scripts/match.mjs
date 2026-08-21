/**
 * Is the deployed contract byte-for-byte the source on disk?
 *
 *   npm run match -- 0x...
 *
 * Worth one call before trusting anything a live contract says. Editing
 * contracts/unison.py invalidates the deployment silently -- the site keeps
 * reading the old address, every view still answers, and the answers are from
 * code that no longer exists in the repo.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalSource, pickChain } from "./chain.mjs";

const address = process.argv[2];

// The same normalisation deploy.mjs applies before sending, so this compares
// what was actually deployed rather than what a particular checkout happens to
// look like. See canonicalSource in chain.mjs.
const local = canonicalSource(readFileSync("contracts/unison.py", "utf8"));

const r = await fetch(pickChain().rpcUrls.default.http[0], {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractCode", params: [address] }),
});
const body = await r.json();
if (body.error) { console.log("rpc error:", JSON.stringify(body.error).slice(0, 200)); process.exit(1); }

const onChain = Buffer.from(String(body.result), "base64").toString("utf8");
const h = s => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

const chainCode = canonicalSource(onChain);
const identical = local === chainCode;

console.log(`  local     ${local.length} bytes  sha256 ${h(local)}`);
console.log(`  on chain  ${chainCode.length} bytes  sha256 ${h(chainCode)}`);
console.log(`  identical ${identical ? "YES" : "NO"}`);

if (!identical) {
  // Say where, not just that. A single differing line is a stale deployment;
  // a hundred is a different contract, and the two want different responses.
  const a = local.split("\n");
  const b = chainCode.split("\n");
  const differing = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) differing.push(i + 1);
  }
  console.log(`  differs   on ${differing.length} line${differing.length === 1 ? "" : "s"}` +
    (differing.length ? `, first at ${differing[0]}` : ""));
  console.log("  The deployed contract is not this source. Redeploy, or read the");
  console.log("  chain's copy before trusting any number this repository explains.");
}
if (local !== onChain) {
  console.log(`  deployed has split_table fix: ${/counted, never judged|"counted" if decided/.test(onChain)}`);
  console.log(`  deployed has word-boundary clip: ${onChain.includes("rfind")}`);
}
