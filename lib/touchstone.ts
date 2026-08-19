/**
 * Every read the site does.
 *
 * All of them go to the contract. The rubric page renders the rubric the
 * contract publishes rather than a copy in this repo, because a standard the
 * site keeps its own copy of is a standard that can drift away from the one
 * being applied -- and "published before anyone was scored" then means nothing.
 *
 * Reads are wrapped so a dropped request answers `null` rather than throwing.
 * A screen that cannot reach the chain says so; it never invents a mark.
 */

import { cache } from "react";

import { createClient } from "genlayer-js";

import { CHAIN, IS_LIVE, TOUCHSTONE } from "./chain";
import type { Report, Rubric, SplitRow, Stats } from "./types";

/** A read-only client. No account, so nothing here can ever sign anything. */
function reader() {
  return createClient({ chain: CHAIN });
}

/**
 * Studio is rate limited to roughly 30 requests a minute and answers a burst
 * with "unknown RPC error" rather than a 429, so a page that fires six reads at
 * once can fail for a reason that looks like a broken contract.
 */
const RETRYABLE =
  /unknown rpc error|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|429|rate/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function read(functionName: string, args: unknown[] = [], attempts = 3) {
  if (!IS_LIVE) return null;
  const client = reader();
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const out = await client.readContract({
        address: TOUCHSTONE as `0x${string}`,
        functionName,
        args: args as never,
      });
      return typeof out === "string" ? out : JSON.stringify(out);
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      if (RETRYABLE.test(message) && i < attempts) {
        await sleep(900 * i);
        continue;
      }
      return null;
    }
  }
  return null;
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** The published standard. This is the page that proves the standard existed first. */
export const getRubric = cache(async function getRubric(): Promise<Rubric | null> {
  return parse<Rubric>(await read("rubric"));
});

/** The gate, probes and all, so the browser runs the chain's gate rather than a copy. */
export async function getGateSpec() {
  return parse<{ head_chars: number; checks: unknown[] }>(await read("gate_spec"));
}

export const getReport = cache(async function getReport(id: number): Promise<Report | null> {
  const raw = await read("report", [id]);
  if (!raw || raw === '""' || raw === "") return null;
  return parse<Report>(raw);
});

/**
 * The report for a source, looked up by the digest this browser computed.
 *
 * The whole "already reviewed" state rests on this: the browser fetches the
 * source for the gate anyway, so it can hash it and ask whether the chain has
 * seen those exact bytes before spending anything.
 */
export async function getReportByDigest(digest: string): Promise<Report | null> {
  const raw = await read("report_by_digest", [digest]);
  if (!raw || raw === '""' || raw === "") return null;
  return parse<Report>(raw);
}

export async function getSplitTable(): Promise<SplitRow[] | null> {
  const parsed = parse<{ rows: SplitRow[] }>(await read("split_table"));
  return parsed ? parsed.rows : null;
}

/** The criterion the network named for a source it could not settle. */
export async function getSplitForDigest(digest: string): Promise<string> {
  const raw = await read("split_for_digest", [digest]);
  if (!raw) return "";
  // A view returning a bare string comes back json-quoted through some paths
  // and raw through others, so both are handled rather than guessed at.
  const unquoted = parse<string>(raw);
  return typeof unquoted === "string" ? unquoted : raw.replace(/^"|"$/g, "");
}

export const getStats = cache(async function getStats(): Promise<Stats | null> {
  return parse<Stats>(await read("stats"));
});

/**
 * The newest report the contract holds, or null.
 *
 * The landing shows a real mark where the design drew a sample one. There is no
 * `recent` view to ask -- `stats()` carries the count and the first id, and ids
 * are issued in order, so the newest is arithmetic rather than another scan.
 *
 * Takes the stats the caller already read. Asking for them again is a second
 * request against a 30-per-minute limit for an answer that is already in hand,
 * and a rate-limited read comes back null, which the page would then have to
 * tell apart from an empty contract.
 */
export async function getNewestReport(stats: Stats | null): Promise<Report | null> {
  if (!stats || !stats.reports) return null;
  return getReport(stats.first_report_id + stats.reports - 1);
}
