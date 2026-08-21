/**
 * The shared half of every script that talks to a node.
 *
 * Deliberately mirrors lib/chain.ts's network switch, so a deploy cannot land
 * on a network the site does not read.
 */
import { createAccount, createClient } from "genlayer-js";
import { studionet, testnetBradbury } from "genlayer-js/chains";

export class Abort extends Error {}

export function die(message) {
  throw new Abort(message);
}

export function flag(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The one canonical form of the contract source, used by BOTH deploy and match.
 *
 * Two things make a naive byte comparison unusable, and neither is a difference
 * in the contract:
 *
 *   line endings   git's core.autocrlf rewrites the file to CRLF on a Windows
 *                  checkout and leaves it LF everywhere else, so the same
 *                  commit would put different bytes on chain depending on who
 *                  ran the deploy.
 *   trailing "\n"  the deploy pipeline drops it, so a file that ends with a
 *                  newline can never match what comes back, however it was
 *                  written.
 *
 * Normalising in one place and deploying exactly what is compared means
 * `npm run match` answers the question it claims to: are the bytes running on
 * chain the bytes in this file.
 */
export function canonicalSource(text) {
  return text.split("\r\n").join("\n").replace(/\n+$/, "");
}

export function pickChain() {
  const raw = (process.env.NEXT_PUBLIC_GENLAYER_NETWORK || "studionet").trim().toLowerCase();
  const bradbury =
    raw === "bradbury" || raw === "testnet_bradbury" || raw === "testnetbradbury";
  return bradbury ? testnetBradbury : studionet;
}

export function requireKey(name) {
  const key = process.env[name];
  if (!key) {
    die(
      [
        `${name} is not set.`,
        "",
        `  PowerShell:  $env:${name} = "0x..."`,
        `  bash:        export ${name}=0x...`,
        "",
        "  A throwaway key is fine on Studio, which charges nothing:",
        `    node -e "console.log('0x'+require('crypto').randomBytes(32).toString('hex'))"`,
      ].join("\n"),
    );
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) die(`${name} is not a 32 byte hex private key.`);
  return key;
}

export function clientFor(key) {
  const chain = pickChain();
  const account = createAccount(key);
  return { chain, account, client: createClient({ chain, account }) };
}

/**
 * genlayer-js estimates gas itself, and when that one rpc call drops it falls
 * back to a hardcoded 200_000 rather than retrying. For a contract this size
 * that is not enough, the chain answers "intrinsic gas too low" before
 * consensus, and nothing is spent. Retrying the whole call is the only lever
 * from outside; a real contract error looks nothing like this and propagates.
 */
export async function deployWithRetry(client, code, args, attempts = 20) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await client.deployContract({ code, args });
    } catch (error) {
      const message = String(error?.message ?? error);
      const retryable =
        /intrinsic gas too low|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|unknown rpc error/i.test(
          message,
        );
      if (retryable && i < attempts) {
        // Studio is rate limited to roughly 30 requests a minute and answers a
        // burst with "unknown RPC error" or a dropped socket rather than a 429,
        // so the backoff has to be long enough to actually leave the window.
        console.log(`    attempt ${i} dropped before consensus, nothing spent - retrying...`);
        await sleep(Math.min(4000 * i, 20000));
        continue;
      }
      throw error;
    }
  }
}

export async function writeWithRetry(client, call, attempts = 5) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await client.writeContract(call);
    } catch (error) {
      const message = String(error?.message ?? error);
      const retryable =
        /fetch failed|unknown rpc error|ECONNRESET|ETIMEDOUT|socket hang up|intrinsic gas too low/i.test(
          message,
        );
      if (retryable && i < attempts) {
        console.log(`    attempt ${i} dropped before submission, retrying...`);
        await sleep(2500 * i);
        continue;
      }
      throw error;
    }
  }
}

export function leaderOf(receipt) {
  const raw = receipt?.consensus_data?.leader_receipt;
  const rounds = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // Later rounds are validators, and "cancelled after quorum" is normal there.
  return rounds.find((r) => r?.mode === "leader") ?? rounds[0] ?? null;
}

/**
 * The contract's own sentence, dug out of a receipt.
 *
 * Three fields on a receipt look like success on a refused call. `status` is
 * the transaction's state and a refusal finalizes perfectly well; `result` is
 * the consensus outcome and validators agreeing that a call failed is still
 * agreement. Only the leader's `execution_result` answers "did the code work",
 * and the message sits one level below it as plain text.
 */
export function refusalOf(receipt) {
  const leader = leaderOf(receipt);
  if (!leader) return "";
  const candidates = [];
  const raw = leader.result;

  if (typeof raw === "string") {
    try {
      candidates.push(
        Buffer.from(raw, "base64").toString("utf8").replace(/[^\x20-\x7e - ]+/g, " ").trim(),
      );
    } catch {
      /* not base64; nothing lost */
    }
  } else if (raw && typeof raw === "object") {
    const payload = raw.payload;
    if (typeof payload === "string") candidates.push(payload);
    if (payload && typeof payload === "object") {
      if (typeof payload.readable === "string") candidates.push(payload.readable);
      if (typeof payload.message === "string") candidates.push(payload.message);
    }
  }
  const stderr = leader?.genvm_result?.stderr;
  if (typeof stderr === "string" && stderr) candidates.push(stderr);

  for (const candidate of candidates) {
    const hit = /\[(?:EXPECTED|EXTERNAL|TRANSIENT|LLM_ERROR)\]\s*([^"\n]+)/.exec(candidate);
    if (hit) return hit[1].trim();
    if (candidate && candidate.length < 600) return candidate.trim();
  }
  return "";
}

/** One poll, straight at the node. A dropped fetch says nothing and returns null. */
async function pollTx(hash) {
  try {
    const response = await fetch(pickChain().rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [hash],
      }),
    });
    return (await response.json())?.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Follow a transaction to a settled state, polling the node directly.
 *
 * NOT `client.waitForTransactionReceipt`. That helper gives up long before a
 * marking round that rotates has finished, and throws
 *
 *     Timed out waiting for transaction 0x... to reach status "ACCEPTED"
 *
 * which reads exactly like a failed transaction. It is not one: the first assay
 * this project ever ran "timed out" that way and then finalized twelve minutes
 * later, having rotated through two leaders. Reporting that as a failure sends
 * the debugging somewhere there is no bug.
 *
 * Returns the receipt for every settled outcome, including the disagreements,
 * because "the validators would not agree" is an answer this product displays
 * rather than an error it swallows.
 */
export async function waitFinal(client, hash, label, budgetMs = 20 * 60 * 1000) {
  const started = Date.now();
  let sawAccepted = false;
  let lastStatus = "";

  while (Date.now() - started < budgetMs) {
    const tx = await pollTx(hash);
    const status = String(tx?.status_name ?? tx?.status ?? "");

    if (status && status !== lastStatus) {
      const elapsed = Math.round((Date.now() - started) / 1000);
      console.log(`    ${label} ${status.toLowerCase()}  (${elapsed}s)`);
      lastStatus = status;
    }
    if (!sawAccepted && (status === "ACCEPTED" || status === "FINALIZED")) sawAccepted = true;

    if (status === "FINALIZED") return tx;
    if (status === "UNDETERMINED") return tx;
    if (status === "CANCELED") return tx;

    await sleep(5000);
  }
  die(
    `${label} has not settled in ${Math.round(budgetMs / 60000)} minutes.\n` +
      `  It may still land. Read it before sending another:\n    node scripts/tx.mjs ${hash}`,
  );
}

/** What a settled transaction actually says, in the three fields that differ. */
export function outcomeOf(receipt) {
  const leader = leaderOf(receipt);
  return {
    status: String(receipt?.status_name ?? receipt?.status ?? ""),
    consensus: String(receipt?.result_name ?? receipt?.result ?? ""),
    executed: String(leader?.execution_result ?? ""),
    rounds: [].concat(receipt?.consensus_data?.leader_receipt ?? []).length,
    why: refusalOf(receipt),
  };
}

export function assertExecuted(receipt, what) {
  const leader = leaderOf(receipt);
  const executed = String(leader?.execution_result ?? "");
  if (!leader) return; // an unfamiliar receipt shape must not invent a failure
  if (executed && executed !== "SUCCESS") {
    die(refusalOf(receipt) || `${what} finalized as ${executed}.`);
  }
}

export function addressFrom(receipt) {
  return (
    receipt?.data?.contract_address ??
    receipt?.contract_address ??
    receipt?.contractAddress ??
    null
  );
}
