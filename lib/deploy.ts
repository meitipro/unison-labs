/**
 * Deploy the reviewed bytes, from the author's own wallet.
 *
 * The whole guarantee is one comparison, made twice. Before anything is
 * signed, the file is fetched again and has to hash to the report's digest, so
 * a branch that moved since the review, or a url that now serves something
 * else, is refused rather than deployed under a report that was never about it.
 * After the deploy finalizes, the new contract's code is read back off the chain
 * and hashed again, so the page says whether what is running is what was
 * reviewed instead of assuming it.
 *
 * What goes on chain is the normalised source, the exact string the digest was
 * taken over, so the second comparison can never be a near miss explained away
 * by a trailing newline.
 */

import { createClient } from "genlayer-js";

import { addressArg } from "./calldataAddress";
import { chainIdHex, labelForChainId, type DeployTarget } from "./networks";
import { wrongNetwork } from "./copy";
import type { Eip1193Provider as EthereumProvider } from "./eip6963";
import { digest as digestOf, normalise } from "./gate";
import {
  chainOf,
  follow,
  leaderOf,
  namedMismatch,
  readableError,
  refusalOf,
  type Stage,
  type Tx,
} from "./writes";
import type { InitParam, Report } from "./types";

export type DeployStage =
  | "fetching"
  | "checking"
  | "signing"
  | "sent"
  | "accepted"
  | "finalized"
  | "verifying";

/**
 * `matches` keeps three states apart, as every read in this product does: the
 * bytes match, the bytes do not match, or the chain did not answer the read
 * back. A rate-limited node rendered as "they do not match" would be a claim
 * about the deployment that nothing on this page had evidence for.
 */
export type DeployOutcome =
  | { ok: true; address: string; hash: string; matches: boolean | null }
  | { ok: false; why: string; hash?: string };

/**
 * A client pointed at the network the author picked, not at this site's.
 *
 * Studio Next runs the newer consensus, and the sdk that reaches it cannot
 * read the older networks, so both are installed and the import is chosen
 * here. Doing it lazily also keeps the second copy out of the bundle of
 * everybody who deploys where the review was run.
 *
 * The chain object comes from the sdk, so nothing about fees or encoding is
 * invented here, and only its rpc is replaced: Asimov and Bradbury share chain
 * id 4221, and the node a transaction is submitted to is the only thing that
 * decides which of the two it lands on.
 */
type DeployClient = {
  deployContract: (args: Record<string, unknown>) => Promise<unknown>;
  /** Only the newer sdk has this, and only the newer networks charge. */
  estimateTransactionFees?: () => Promise<unknown>;
};

function withRpc(base: unknown, rpc: string): unknown {
  const chain = base as { rpcUrls: { default: { http: string[] } } };
  return {
    ...(base as object),
    rpcUrls: { ...chain.rpcUrls, default: { ...chain.rpcUrls.default, http: [rpc] } },
  };
}

async function clientFor(
  target: DeployTarget,
  account: `0x${string}`,
  provider?: EthereumProvider,
): Promise<DeployClient> {
  const rest = provider ? { provider } : {};
  if (target.runtime === "v06") {
    const [sdk, chains] = await Promise.all([
      import("genlayer-js-next"),
      import("genlayer-js-next/chains"),
    ]);
    const base = (chains as unknown as Record<string, unknown>).studioDevnet;
    return sdk.createClient({
      chain: withRpc(base, target.rpc) as never,
      account,
      ...rest,
    }) as unknown as DeployClient;
  }
  const chains = await import("genlayer-js/chains");
  const known: Record<string, unknown> = {
    studionet: chains.studionet,
    asimov: chains.testnetAsimov,
    bradbury: chains.testnetBradbury,
  };
  const base = known[target.id] ?? chains.studionet;
  return createClient({
    chain: withRpc(base, target.rpc) as never,
    account,
    ...rest,
  }) as unknown as DeployClient;
}

export type ArgKind = "text" | "number" | "bool" | "address" | "json";

/** How the form should read a parameter, from the annotation the contract recorded. */
export function kindOf(type: string): ArgKind {
  const t = (type || "").replace(/\s+/g, "");
  if (t === "bool") return "bool";
  if (t === "Address" || t.endsWith(".Address")) return "address";
  if (/^(u|i)\d+$/.test(t) || t === "int" || t === "bigint") return "number";
  if (t === "str" || t === "") return "text";
  return "json";
}

/** Required parameters with nothing entered, by name. */
export function missingArgs(params: InitParam[], values: Record<string, string>): string[] {
  return params.filter((p) => !p.optional && !(values[p.name] ?? "").trim()).map((p) => p.name);
}

/** One form value as the calldata the recorded annotation asks for. */
function coerce(param: InitParam, raw: string): unknown {
  const value = raw.trim();
  switch (kindOf(param.type)) {
    case "number":
      if (!/^-?\d+$/.test(value)) throw new Error(`${param.name} has to be a whole number.`);
      return BigInt(value);
    case "bool":
      return value === "true";
    case "address":
      if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
        throw new Error(`${param.name} has to be an address, 0x followed by 40 hex characters.`);
      }
      // A hex string would arrive as a str the constructor's annotation
      // refuses. calldataAddress.ts builds the tagged twenty bytes instead.
      return addressArg(value);
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        throw new Error(`${param.name} has to be written as JSON.`);
      }
    default:
      return value;
  }
}

/** Positional and keyword arguments, leaving optional ones out when empty. */
function buildArgs(params: InitParam[], values: Record<string, string>) {
  const args: unknown[] = [];
  const kwargs: Record<string, unknown> = {};
  let skipped = false;
  for (const p of params) {
    const raw = values[p.name] ?? "";
    if (!raw.trim()) {
      if (!p.optional) throw new Error(`${p.name} is required.`);
      if (!p.keyword) skipped = true;
      continue;
    }
    // Once an optional positional has been left out, anything after it would
    // land in the wrong slot, so it is passed by name instead.
    if (p.keyword || skipped) kwargs[p.name] = coerce(p, raw);
    else args.push(coerce(p, raw));
  }
  return { args, kwargs };
}

function addressFrom(tx: Tx | null): string | null {
  const t = (tx ?? {}) as Record<string, unknown>;
  const data = (t.data ?? {}) as Record<string, unknown>;
  const found = data.contract_address ?? t.contract_address ?? t.contractAddress;
  return typeof found === "string" && found ? found : null;
}

/** Wei on the chosen network, or 0n where the node did not answer. */
async function balanceOn(rpc: string, address: string): Promise<bigint> {
  try {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
    });
    const body = await response.json();
    const raw = body?.result;
    return typeof raw === "string" ? BigInt(raw) : 0n;
  } catch {
    return 0n;
  }
}

/** The deployed source, read back off the chain, or null if the node did not answer. */
async function readBack(address: string, rpc: string): Promise<string | null> {
  try {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractCode", params: [address] }),
    });
    const body = await response.json();
    const out = body?.result;
    if (typeof out !== "string" || !out) return null;
    // Studio answers with base64 through some paths and plain text through
    // others. A Python source opens with a comment, so its first characters are
    // never all base64, which is what tells the two apart.
    if (/^[A-Za-z0-9+/=\s]+$/.test(out.slice(0, 256))) {
      try {
        const bin = atob(out.replace(/\s+/g, ""));
        return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      } catch {
        return out;
      }
    }
    return out;
  } catch {
    return null;
  }
}

export async function deployReviewed(opts: {
  report: Report;
  account: `0x${string}`;
  provider?: EthereumProvider;
  values: Record<string, string>;
  /** The network the author chose to deploy on. */
  target: DeployTarget;
  onStage: (stage: DeployStage) => void;
}): Promise<DeployOutcome> {
  const { report, account, provider, values, target, onStage } = opts;
  const params = Array.isArray(report.init_params) ? report.init_params : [];

  onStage("fetching");
  let text = "";
  try {
    const response = await fetch(report.source_url, { headers: { Accept: "text/plain, */*" } });
    if (!response.ok) {
      return { ok: false, why: `The source url answered ${response.status}, so nothing was signed.` };
    }
    text = await response.text();
  } catch {
    return { ok: false, why: "This browser could not fetch the source again, so nothing was signed." };
  }

  onStage("checking");
  const code = normalise(text);
  if ((await digestOf(code)) !== report.digest) {
    return {
      ok: false,
      why: "The file at that url no longer hashes to the bytes this report is about, so it was not deployed under this report. Review the version it serves now first.",
    };
  }

  let built: { args: unknown[]; kwargs: Record<string, unknown> };
  try {
    built = buildArgs(params, values);
  } catch (error) {
    return { ok: false, why: (error as Error).message };
  }

  /*
   * A network with fees refuses a transaction that carries none, and it does
   * that AFTER the wallet has been opened and signed: `FeeValueMustBeNonZero`
   * on a deploy sent to Studio Next with an empty account. Both of the things
   * that avoids are here, before anything is signed.
   */
  const client = await clientFor(target, account, provider);
  let fees: unknown = undefined;
  if (target.runtime === "v06") {
    const balance = await balanceOn(target.rpc, account);
    if (balance === 0n) {
      return {
        ok: false,
        why: `This account holds no GEN on ${target.label}, and that network charges fees, so nothing was signed. Fund it there first.`,
      };
    }
    if (typeof client.estimateTransactionFees === "function") {
      try {
        // Quoted by the network rather than written down here, so a change in
        // its prices cannot strand this button.
        fees = await client.estimateTransactionFees();
      } catch {
        return {
          ok: false,
          why: `${target.label} did not quote a fee for this deploy, so nothing was signed. That is the network not answering rather than a refusal.`,
        };
      }
    }
  }

  /* Read from the wallet itself, now, rather than from what a screen was
     told when it rendered: the network can be changed in another tab between
     the two. A wallet that does not answer is not treated as wrong. */
  const on = await chainOf(provider);
  if (on && on !== chainIdHex(target).toLowerCase()) {
    return { ok: false, why: wrongNetwork(labelForChainId(on), target.label) };
  }

  onStage("signing");
  let hash: string;
  try {
    hash = String(
      await client.deployContract({
        code,
        args: built.args,
        kwargs: built.kwargs,
        leaderOnly: false,
        ...(fees ? { fees } : {}),
      }),
    );
  } catch (error) {
    const named = namedMismatch(String((error as Error)?.message ?? error));
    return { ok: false, why: named ? named.message : readableError(error) };
  }
  onStage("sent");

  const { tx, settled } = await follow(
    hash,
    (stage: Stage) => {
      if (stage === "accepted" || stage === "finalized") onStage(stage);
    },
    target.rpc,
  );
  if (settled === "SLOW") {
    return {
      ok: false,
      why: "The deploy has not settled yet. That is a wait that timed out rather than a failed deploy, so check the transaction before sending another.",
      hash,
    };
  }
  if (settled !== "FINALIZED") {
    return { ok: false, why: `The deploy ended ${settled.toLowerCase()} and created no contract.`, hash };
  }
  // FINALIZED is the transaction's state and a refused constructor finalizes
  // too. Only the leader's execution result says a contract was created.
  if (String(leaderOf(tx)?.execution_result ?? "") !== "SUCCESS") {
    return {
      ok: false,
      why: refusalOf(tx) || "The deploy finalized without creating a contract, because the constructor refused.",
      hash,
    };
  }
  const address = addressFrom(tx);
  if (!address) {
    return { ok: false, why: "The deploy finalized but carried no contract address. Check the transaction.", hash };
  }

  onStage("verifying");
  const back = await readBack(address, target.rpc);
  const matches = back === null ? null : (await digestOf(normalise(back))) === report.digest;
  return { ok: true, address, hash, matches };
}
