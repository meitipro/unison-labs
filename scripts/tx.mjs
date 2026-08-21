/**
 * Read one transaction straight off the node.
 *
 *   node scripts/tx.mjs 0x<hash>
 *
 * Exists because genlayer-js's waitForTransactionReceipt gives up long before a
 * jury has finished, and the error it throws ("Timed out waiting ... to reach
 * status ACCEPTED") reads exactly like a failed transaction while the thing is
 * still settling on a validator.
 *
 * Prints the three fields that get confused for each other, in the order they
 * should be read: the transaction's own status, the consensus outcome, and then
 * the only one that answers "did the contract's code work".
 */
import { pickChain, refusalOf, leaderOf } from "./chain.mjs";

const hash = process.argv[2];
if (!hash) {
  console.error("usage: node scripts/tx.mjs 0x<hash>");
  process.exit(1);
}

const rpc = pickChain().rpcUrls.default.http[0];

const response = await fetch(rpc, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getTransactionByHash",
    params: [hash],
  }),
});
const tx = (await response.json())?.result;

if (!tx) {
  console.log("  the node has never heard of that hash");
  process.exit(1);
}

const leader = leaderOf(tx);

console.log("");
console.log(`  transaction   ${tx.status_name ?? tx.status}   (status ${tx.status})`);
console.log(`  consensus     ${tx.result_name ?? tx.result ?? "-"}`);
console.log(`  leader ran    ${leader?.execution_result ?? "-"}   <- the only one that means "my code worked"`);
console.log(`  rounds        ${[].concat(tx.consensus_data?.leader_receipt ?? []).length}`);

const why = refusalOf(tx);
if (why) console.log(`\n  it said       ${why}`);

const stderr = leader?.genvm_result?.stderr;
if (stderr) console.log(`\n  stderr        ${String(stderr).slice(0, 2000)}`);

const stdout = leader?.genvm_result?.stdout;
if (stdout) console.log(`\n  stdout        ${String(stdout).slice(0, 1200)}`);

if (process.argv.includes("--raw")) {
  console.log(`\n${JSON.stringify(tx, null, 2).slice(0, 6000)}`);
}
