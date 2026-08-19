/**
 * Is the deployed contract byte-for-byte the source on disk?
 *
 *   npm run match -- 0x…
 *
 * Worth one call before trusting anything a live contract says. Editing
 * contracts/touchstone.py invalidates the deployment silently -- the site keeps
 * reading the old address, every view still answers, and the answers are from
 * code that no longer exists in the repo.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pickChain } from "./chain.mjs";

const address = process.argv[2];
const local = readFileSync("contracts/touchstone.py", "utf8");

const r = await fetch(pickChain().rpcUrls.default.http[0], {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractCode", params: [address] }),
});
const body = await r.json();
if (body.error) { console.log("rpc error:", JSON.stringify(body.error).slice(0, 200)); process.exit(1); }

const onChain = Buffer.from(String(body.result), "base64").toString("utf8");
const h = s => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

console.log(`  local     ${local.length} bytes  sha256 ${h(local)}`);
console.log(`  on chain  ${onChain.length} bytes  sha256 ${h(onChain)}`);
console.log(`  identical ${local === onChain ? "YES" : "NO"}`);
if (local !== onChain) {
  console.log(`  deployed has split_table fix: ${/counted, never judged|"counted" if decided/.test(onChain)}`);
  console.log(`  deployed has word-boundary clip: ${onChain.includes("rfind")}`);
}
