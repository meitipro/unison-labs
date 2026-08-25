/**
 * Appeal one criterion on a report, from the command line.
 *
 *   npm run contest -- --report=8801 --criterion=necessity
 *   npm run contest -- --report=8801 --criterion=boundary   # must be refused
 *
 * The appeal route is a public method with no button on it, which left the one
 * part of the product a rejected author would reach with nothing in the
 * repository that exercises it. This is that thing.
 *
 * What it does, in order: reads the report so a typo in the id fails before a
 * signature, sends `contest`, waits for finality by polling the node, and then
 * reads the appeal note back OFF THE CHAIN rather than out of the receipt.
 *
 * Two outcomes are both correct and this prints which one happened:
 *
 *   REFUSED   the criterion is counted from the same bytes the appeal
 *             re-fetches, so a re-mark cannot reach a different answer and the
 *             report's one appeal is deliberately left unspent
 *   HEARD     a fresh jury re-marked it, and the note says whether the original
 *             stands or was superseded
 */

import { getAddress } from "viem";

import { Abort, clientFor, die, flag, leaderOf, refusalOf, requireKey, waitFinal } from "./chain.mjs";

async function main() {
  const key = requireKey("UNISONLABS_DEPLOYER_KEY");
  const raw = flag("contract", process.env.NEXT_PUBLIC_UNISONLABS_ADDRESS || "");
  if (!raw) die("No contract. Pass --contract=0x... or set NEXT_PUBLIC_UNISONLABS_ADDRESS.");

  // Studio matches an address literally, and the lowercase form of a real
  // contract answers "not found", so this is checksummed rather than trusted.
  let address;
  try {
    address = getAddress(raw.trim());
  } catch {
    die(`${raw} is not an address.`);
  }

  const reportId = Number(flag("report", ""));
  const criterion = String(flag("criterion", "")).trim().toLowerCase();
  if (!Number.isInteger(reportId)) die("Pass --report=8801.");
  if (!criterion) die("Pass --criterion=necessity.");

  const { client, account, chain } = clientFor(key);
  console.log(`\n  contract   ${address}`);
  console.log(`  network    ${chain.name ?? "studionet"}`);
  console.log(`  appellant  ${account.address}`);
  console.log(`  appealing  ${criterion} on report ${reportId}\n`);

  const before = await client.readContract({ address, functionName: "report", args: [reportId] });
  if (!before || before === '""') die(`There is no report ${reportId} on that contract.`);
  const record = JSON.parse(before);
  const marks = record.subjects.flatMap((s) => s.marks);
  const mark = marks.find((m) => m.id === criterion);
  if (!mark) {
    die(
      [
        `Report ${reportId} carries no mark for ${criterion}.`,
        "",
        `  It has: ${marks.map((m) => m.id).join(", ")}`,
      ].join("\n"),
    );
  }
  console.log(`  it currently scores ${mark.score} of 2`);
  console.log(`  "${mark.reason}"\n`);

  const hash = await client.writeContract({
    address,
    functionName: "contest",
    args: [reportId, criterion],
    value: 0n,
  });
  console.log(`  sent  ${hash}\n`);

  /* `waitFinal` polls the node directly. Reading the status back through the
     client returns a shape this script guessed wrong the first time, and an
     appeal it announced as timed out had in fact already finalized, with the
     refusal this whole script exists to show sitting in the receipt. */
  const receipt = await waitFinal(client, hash, "appeal");

  const leader = leaderOf(receipt);
  const votes = Object.values(receipt?.consensus_data?.votes ?? {}).reduce(
    (all, v) => ({ ...all, [v]: (all[v] ?? 0) + 1 }),
    {},
  );
  console.log(`  ${receipt.status}  votes ${JSON.stringify(votes)}`);

  // Only the leader's execution_result answers "did the code run". `status` is
  // FINALIZED on a refusal too, because refusing is a successful transaction.
  if (leader?.execution_result !== "SUCCESS") {
    console.log("\n  REFUSED, and the contract said why:\n");
    console.log(`    ${refusalOf(receipt)}\n`);
    return;
  }

  const after = JSON.parse(
    await client.readContract({ address, functionName: "report", args: [reportId] }),
  );
  const note = after.contest;
  if (!note) {
    console.log("\n  HEARD, but no appeal note came back. Read the transaction before retrying.");
    return;
  }
  console.log(`\n  HEARD, and ${note.outcome}: ${note.was} of 2 -> ${note.now} of 2\n`);
  console.log(`    "${note.reason}"\n`);
  if (note.outcome === "superseded") {
    console.log("  The report was rewritten and keeps the previous score on the note.");
  } else {
    console.log("  The original mark stands, and this report's appeal is still unspent.");
  }
}

main().catch((error) => {
  if (error instanceof Abort) {
    console.error(`\n  ${error.message}\n`);
    process.exit(1);
  }
  throw error;
});
