/**
 * Deploy a throwaway contract and call it, to settle one question about the
 * real GenVM that no amount of local linting can answer.
 *
 *   node scripts/probe.mjs <path-to-contract.py> [<view-method> <arg>...]
 *
 * `genvm-lint validate` loads a contract against the SDK in HOST python, where
 * every stdlib module obviously exists. It says nothing about what the wasm
 * CPython on a node actually carries. The only way to find out is to run it
 * there, and Studio charges nothing, so finding out is free.
 *
 * A generated key is fine: Studio is gasless and this contract is disposable.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const [file, method, ...args] = process.argv.slice(2);
if (!file) {
  console.error("usage: node scripts/probe.mjs <contract.py> [view-method] [args...]");
  process.exit(1);
}

const code = readFileSync(resolve(file), "utf8");
const key = process.env.UNISONLABS_DEPLOYER_KEY || `0x${randomBytes(32).toString("hex")}`;
const account = createAccount(key);
const client = createClient({ chain: studionet, account });

console.log(`  contract   ${file} (${code.length} bytes)`);
console.log(`  deployer   ${account.address}`);

const hash = await client.deployContract({ code, args: [] });
console.log(`  tx         ${hash}`);

await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.FINALIZED,
});

const leader = [].concat(receipt?.consensus_data?.leader_receipt ?? [])[0];
console.log(`  deploy     ${leader?.execution_result ?? "?"}`);
if (leader?.execution_result !== "SUCCESS") {
  console.log(JSON.stringify(leader?.result ?? leader, null, 2).slice(0, 2000));
  process.exit(1);
}

const address =
  receipt?.data?.contract_address ?? receipt?.contract_address ?? receipt?.contractAddress;
console.log(`  address    ${address}`);

if (method) {
  try {
    const out = await client.readContract({ address, functionName: method, args });
    console.log(`\n  ${method}(${args.join(", ")}) ->`);
    console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  } catch (e) {
    console.log(`\n  ${method} threw: ${e?.message ?? e}`);
    process.exit(1);
  }
}
