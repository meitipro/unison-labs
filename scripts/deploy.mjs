/**
 * Deploy one Touchstone contract.
 *
 *   $env:TOUCHSTONE_DEPLOYER_KEY = "0x..."     # PowerShell
 *   npm run deploy -- --yes
 *
 * The rubric and the gate are compiled into contracts/touchstone.py and no
 * method anywhere in it can edit a criterion, an anchor, a probe or a band.
 * "Published before anyone was scored" has to mean something, and what it means
 * is that this transaction is the last moment any of it can change.
 *
 * So everything checkable is checked before the send: the runner header is
 * pinned, the pure half's own suite passes, and the gate the browser will run
 * matches the gate the chain will run.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import {
  Abort,
  addressFrom,
  assertExecuted,
  clientFor,
  deployWithRetry,
  die,
  requireKey,
  waitFinal,
} from "./chain.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CONTRACT = join(ROOT, "contracts", "touchstone.py");

function python() {
  return process.platform === "win32" ? "python" : "python3";
}

async function main() {
  const key = requireKey("TOUCHSTONE_DEPLOYER_KEY");
  const code = readFileSync(CONTRACT, "utf8");

  if (!code.startsWith('# { "Depends": "py-genlayer:')) {
    die(
      "contracts/touchstone.py does not start with a pinned runner header.\n" +
        "  Every GenLayer network rejects test, latest and unversioned runners.",
    );
  }
  if (/py-genlayer:(test|latest)"/.test(code)) {
    die("The runner is pinned to a local-only alias. Networks reject those.");
  }

  console.log("\n  checking the pure half before spending anything...");
  try {
    execFileSync(python(), [join(ROOT, "contracts", "test_helpers.py")], {
      stdio: "inherit",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
  } catch {
    die("The contract's own suite fails. Nothing was deployed.");
  }

  const { chain, account, client } = clientFor(key);

  console.log("  contract     contracts/touchstone.py");
  console.log(`  bytes        ${code.length.toLocaleString("en-US")}`);
  console.log(`  network      ${chain.name} (chain ${chain.id})`);
  console.log(`  rpc          ${chain.rpcUrls.default.http[0]}`);
  console.log(`  deployer     ${account.address}`);
  console.log("");
  console.log("  The rubric, the anchors, the gate probes and the bands are frozen");
  console.log("  by this transaction. There is no admin method that edits any of them.");
  console.log("");

  if (!process.argv.includes("--yes")) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("  Deploy this? Type yes to continue: ");
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") die("Nothing was deployed.");
  }

  console.log("\n  deploying...");
  const hash = await deployWithRetry(client, code, []);
  console.log(`  tx           ${hash}`);

  const receipt = await waitFinal(client, hash, "  contract");
  assertExecuted(receipt, "The deployment");

  const address = addressFrom(receipt);
  if (!address) {
    die(`The deploy finalized but carried no contract address.\n  Check ${hash}`);
  }

  // Copy the address EXACTLY as printed. Studio matches the string literally,
  // and the lowercase form of a real contract answers "not found".
  console.log(`\n  contract     ${address}\n`);
  console.log("  Point the site at it, then restart the dev server:");
  console.log(`    NEXT_PUBLIC_TOUCHSTONE_ADDRESS=${address}`);
  console.log("");
  console.log("  NEXT_PUBLIC_ variables are inlined at build time, so setting this in");
  console.log("  a hosting dashboard does nothing until the next redeploy.");
  console.log("");
  console.log("  Then prove it works end to end:");
  console.log(`    npm run verify -- --contract=${address}`);
  console.log("");
}

main().catch((error) => {
  if (error instanceof Abort) console.error(`\n  ${error.message}\n`);
  else console.error(`\n  ${error?.shortMessage ?? error?.message ?? error}\n`);
  process.exitCode = 1;
});
