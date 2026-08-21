/**
 * The three things a person can actually do from this site: ask for a mark,
 * have the network name an anchor that would not settle, and contest a mark on
 * a report they submitted. Everything else is a read.
 *
 * Every write here reads the receipt properly, which on GenLayer means not
 * trusting the two fields that look like success on a refused call:
 *
 *   receipt.status        FINALIZED   the TRANSACTION's state. A refusal
 *                                     finalizes perfectly well.
 *   receipt.result        MAJORITY_AGREE  the CONSENSUS outcome. Validators
 *                                     agreeing that a call failed is agreement.
 *   leader.execution_result  SUCCESS  the answer.
 *
 * Stopping at the first green tick is how a refused assay hands somebody an
 * empty report and sends the next call somewhere there is no bug.
 */

import { createClient } from "genlayer-js";
import type { Hash } from "genlayer-js/types";

import { CHAIN, RPC_URL, TOUCHSTONE } from "./chain";
import type { Eip1193Provider as EthereumProvider } from "./eip6963";

// Pure text, kept apart so its rules can be tested without an RPC client.
export { readableError } from "./voice";

export type Stage = "sending" | "sent" | "fetching" | "scoring" | "accepted" | "finalized";

/**
 * How long to follow a transaction before giving up on it.
 *
 * An assay is a fetch every validator repeats, then a mark every validator
 * makes itself. When the marks land one integer apart the round ends without a
 * majority and rotates to a new leader. Rotations are normal, not exceptional:
 * the first assay this project ever ran took two leaders and twelve minutes to
 * settle -- into a disagreement, which is a result.
 */
const WAIT_BUDGET_MS = 20 * 60 * 1000;
const POLL_EVERY_MS = 4000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Tx = {
  status?: string | number;
  status_name?: string;
  result?: unknown;
  result_name?: string;
  consensus_data?: { leader_receipt?: unknown };
};

/**
 * How the jury voted, read out of the receipt.
 *
 * `consensus_data.votes` is a map of validator address to "agree", "disagree"
 * or "idle". This is the only place the real count can come from -- a contract
 * receives one bit per validator, aggregated, and can never count the votes
 * itself, so a consensus strip built from anything else would be decoration.
 *
 * An idle validator is left out of the total. A node that never voted did not
 * disagree, and counting it as one would understate an agreement that held.
 */
export type Votes = { agreed: number; of: number };

export function votesOf(tx: Tx | null): Votes | null {
  const raw = (tx?.consensus_data as Record<string, unknown> | undefined)?.votes;
  if (!raw || typeof raw !== "object") return null;
  const values = Object.values(raw as Record<string, string>).map((v) => String(v));
  const counted = values.filter((v) => v !== "idle");
  if (counted.length === 0) return null;
  return { agreed: counted.filter((v) => v === "agree").length, of: counted.length };
}

/** The outcome of a settled assay, in the product's own vocabulary. */
export type Outcome =
  | { kind: "scored"; hash: string; votes: Votes | null; provisional: boolean }
  | { kind: "refused"; hash: string; why: string }
  | { kind: "already"; hash: string; reportId: number; why: string }
  | { kind: "split"; hash: string; why: string; votes: Votes | null }
  | { kind: "slow"; hash: string; why: string };

async function pollTx(hash: string): Promise<Tx | null> {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [hash],
      }),
    });
    const body = await response.json();
    return (body?.result as Tx) ?? null;
  } catch {
    // The network dropped a request. That says nothing about the transaction,
    // which is running on a validator and does not care about this browser.
    return null;
  }
}

function leaderOf(tx: Tx | null): Record<string, unknown> | null {
  const raw = tx?.consensus_data?.leader_receipt;
  const rounds = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // Pick the round whose mode is leader rather than index 0: later rounds are
  // validators, and "cancelled after quorum" there is normal.
  const leader =
    rounds.find((r) => (r as Record<string, unknown>)?.mode === "leader") ?? rounds[0];
  return (leader as Record<string, unknown>) ?? null;
}

function fromBase64(value: string): string {
  try {
    if (typeof atob !== "function") return "";
    return atob(value);
  } catch {
    return "";
  }
}

/**
 * The contract's own sentence, dug out of a failed leader receipt.
 *
 * Worth the effort because a UserError message here is the one part of a failure
 * written for a person to read: "refused before scoring - missing header,
 * nondet, agreement" rather than a revert code. The receipt puts it in a
 * different shape depending on the outcome, so all of them are tried.
 */
/**
 * A refusal off the chain, in the product's typography.
 *
 * TWO SEPARATE JOBS, and they used to be one broken regex.
 *
 * The first is stripping the control bytes and stray high codepoints a receipt
 * carries around its message, keeping printable ASCII.
 *
 * The second is the connector. The DEPLOYED contract builds its refusal with an
 * em dash -- `refused before scoring [em dash] missing header, nondet` -- and
 * that string is frozen: it is inside the bytes at
 * 0x1B79011734cc652f68Fa3eAe312aC04C7cC29Ae4, editing the source would put
 * `npm run match` out of agreement with the live contract, and a redeploy for a
 * dash would strand every report already filed under that address. So the
 * chain says what it says and this converts it on the way to the screen, which
 * is what `lib/voice.ts` exists for anyway. Worth folding into the contract at
 * the next deploy that happens for a real reason.
 *
 * The nine codepoints are written as escapes, not literally, so this file does
 * not trip `scripts/check.mjs`.
 */
const BANNED_CHARS = new RegExp("[\\u2014\\u2013\\u2010\\u2012\\u2015\\u2212]", "g");

export function houseStyle(text: string): string {
  return text
    .replace(BANNED_CHARS, " - ")
    .replace(new RegExp("[\\u00b7\\u2022]", "g"), " - ")
    .replace(new RegExp("\\u2026", "g"), "...")
    // Anything left that is not printable ASCII is receipt framing, not words.
    .replace(/[^\x20-\x7e]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function refusalOf(tx: Tx | null): string {
  const leader = leaderOf(tx);
  if (!leader) return "";
  const candidates: string[] = [];
  const raw = leader.result;

  if (typeof raw === "string") {
    candidates.push(houseStyle(fromBase64(raw)));
  } else if (raw && typeof raw === "object") {
    const payload = (raw as Record<string, unknown>).payload;
    if (typeof payload === "string") candidates.push(payload);
    if (payload && typeof payload === "object") {
      const p = payload as Record<string, unknown>;
      if (typeof p.readable === "string") candidates.push(p.readable);
      if (typeof p.message === "string") candidates.push(p.message);
    }
  }
  const genvm = leader.genvm_result as Record<string, unknown> | undefined;
  if (typeof genvm?.stderr === "string" && genvm.stderr) candidates.push(genvm.stderr);

  for (const candidate of candidates) {
    // The prefixes are for validators, not for people, so they come off.
    const hit = /\[(?:EXPECTED|EXTERNAL|TRANSIENT|LLM_ERROR)\]\s*([^"\n]+)/.exec(candidate);
    // Every branch goes through houseStyle, not just the base64 one: the
    // payload and stderr shapes carry the same contract-authored sentence.
    if (hit) return houseStyle(hit[1]);
    if (candidate && candidate.length < 500) return houseStyle(candidate);
  }
  return "";
}

/**
 * Follow one transaction to a settled state.
 *
 * NOT `client.waitForTransactionReceipt`. That helper gives up long before a
 * jury that rotates has finished and throws "Timed out waiting ... to reach
 * status ACCEPTED", which would tell somebody their submission failed while it
 * was still being marked.
 */
async function follow(
  hash: string,
  onStage: (stage: Stage) => void,
): Promise<{ tx: Tx | null; settled: string }> {
  const started = Date.now();
  let sawAccepted = false;

  while (Date.now() - started < WAIT_BUDGET_MS) {
    const tx = await pollTx(hash);
    const status = String(tx?.status_name ?? tx?.status ?? "");

    if (!sawAccepted && (status === "ACCEPTED" || status === "FINALIZED")) {
      sawAccepted = true;
      onStage("accepted");
    }
    if (status === "FINALIZED" || status === "UNDETERMINED" || status === "CANCELED") {
      if (status === "FINALIZED") onStage("finalized");
      return { tx, settled: status };
    }
    await sleep(POLL_EVERY_MS);
  }
  return { tx: null, settled: "SLOW" };
}

/**
 * Handing createClient a bare address rather than a key puts genlayer-js in
 * browser-wallet mode: the visitor signs in their own wallet and no key ever
 * reaches this app.
 *
 * THE PROVIDER IS PASSED IN RATHER THAN LOOKED UP. Left to itself genlayer-js
 * signs through `window.ethereum`, which is only one of the wallets a browser
 * may have. With two installed, the one that lost the race to set that global
 * is still offered on the connect screen -- so somebody could pick wallet A,
 * see wallet A's address on every screen, and then have wallet B open asking
 * for the signature. The provider chosen at connect time is carried all the
 * way here, and `window.ethereum` is only the fallback for older extensions
 * that never announced themselves.
 */
function wallet(account: `0x${string}`, provider?: EthereumProvider) {
  return createClient({ chain: CHAIN, account, ...(provider ? { provider } : {}) });
}

const RETRYABLE =
  /fetch failed|unknown rpc error|ECONNRESET|ETIMEDOUT|socket hang up|intrinsic gas too low/i;

async function send(
  account: `0x${string}`,
  functionName: string,
  args: unknown[],
  provider?: EthereumProvider,
  attempts = 4,
): Promise<Hash> {
  const client = wallet(account, provider);
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await client.writeContract({
        address: TOUCHSTONE as `0x${string}`,
        functionName,
        args: args as never,
        // Nothing here is payable. The contract has no way to move value out
        // again, so anything sent with a call would be locked in it forever.
        value: 0n,
      });
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      // A dropped fetch means nothing was submitted, so re-sending cannot
      // double anything. A refusal from the contract looks nothing like this.
      if (RETRYABLE.test(message) && i < attempts) {
        await sleep(2000 * i);
        continue;
      }
      throw error;
    }
  }
  throw new Error("The node would not take the transaction.");
}

/**
 * Ask for a mark.
 *
 * One transaction. Inside it every validator fetches the source and must agree
 * on the bytes, then marks it against the published anchors and must agree on
 * all five integers.
 */
export async function assay(
  account: `0x${string}`,
  sourceUrl: string,
  siteUrl: string,
  onStage: (stage: Stage) => void,
  provider?: EthereumProvider,
): Promise<Outcome> {
  onStage("sending");
  const hash = await send(account, "assay", [sourceUrl, siteUrl], provider);
  onStage("sent");
  onStage("fetching");

  // Stage two starts once the fetch round can plausibly have finished. The
  // stage line says which of the two real steps is running; it is not a
  // progress bar and it never claims to know more than that.
  const toScoring = setTimeout(() => onStage("scoring"), 12_000);
  const { tx, settled } = await follow(hash, onStage);
  clearTimeout(toScoring);

  if (settled === "SLOW") {
    return {
      kind: "slow",
      hash,
      why: "This is taking longer than twenty minutes. The transaction may still land, so read it before submitting again.",
    };
  }

  if (settled === "UNDETERMINED") {
    return {
      kind: "split",
      hash,
      why: "No majority formed after every leader had rotated, so no report was issued.",
      votes: votesOf(tx),
    };
  }

  const leader = leaderOf(tx);
  const executed = String(leader?.execution_result ?? "");
  const consensus = String(tx?.result_name ?? "");

  // Validators denying the leader's ballot is the designed split, not an error.
  if (/DISAGREE|NO_MAJORITY/i.test(consensus) && executed === "SUCCESS") {
    return {
      kind: "split",
      hash,
      why: "The validators marked the source themselves and did not agree, so no report was issued.",
      votes: votesOf(tx),
    };
  }

  if (executed && executed !== "SUCCESS") {
    const why = refusalOf(tx);
    const already = /already reviewed, see report (\d+)/.exec(why);
    if (already) {
      return { kind: "already", hash, reportId: Number(already[1]), why };
    }
    return { kind: "refused", hash, why: why || `The assay finalized as ${executed}.` };
  }

  // Accepted but not yet final: the marks exist, and the report becomes
  // permanent when the window closes. Drawn identically either way, because the
  // marks are the same marks.
  const provisional = String(tx?.status_name ?? tx?.status ?? "") !== "FINALIZED";
  return { kind: "scored", hash, votes: votesOf(tx), provisional };
}

/**
 * Have the network name the anchor that would not settle for a source.
 *
 * NOT WIRED TO A SCREEN YET. The contract supports it and this is the call, but
 * nothing invokes it, so the "nodes disagreed" panel currently cannot name the
 * criterion -- `split_for_digest` only answers once a split has been recorded.
 * It costs a signature, so it belongs behind a control the reader chooses,
 * rather than firing automatically behind their back.
 */
export async function recordSplit(
  account: `0x${string}`,
  sourceUrl: string,
  onStage: (stage: Stage) => void,
  provider?: EthereumProvider,
): Promise<{ hash: string; criterion: string; why: string }> {
  onStage("sending");
  const hash = await send(account, "record_split", [sourceUrl], provider);
  onStage("sent");
  const { tx } = await follow(hash, onStage);
  const leader = leaderOf(tx);
  const executed = String(leader?.execution_result ?? "");
  if (executed && executed !== "SUCCESS") {
    return { hash, criterion: "", why: refusalOf(tx) };
  }
  // The criterion is read back from the chain rather than out of the receipt: a
  // receipt renders a return value as comma-less pseudo-json no parser accepts.
  return { hash, criterion: "", why: "" };
}

/**
 * Dispute one criterion on a report. It marks; it never hides.
 *
 * NOT WIRED TO A SCREEN YET. The contract enforces that only the submitter may
 * contest, and the report page already renders a contest when one exists -- what
 * is missing is the control that starts one.
 */
export async function contest(
  account: `0x${string}`,
  reportId: number,
  criterion: string,
  onStage: (stage: Stage) => void,
  provider?: EthereumProvider,
): Promise<{ hash: string; why: string }> {
  onStage("sending");
  const hash = await send(account, "contest", [reportId, criterion], provider);
  onStage("sent");
  const { tx } = await follow(hash, onStage);
  const leader = leaderOf(tx);
  const executed = String(leader?.execution_result ?? "");
  return { hash, why: executed && executed !== "SUCCESS" ? refusalOf(tx) : "" };
}
