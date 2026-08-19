/**
 * The single place that decides which GenLayer network the whole app talks to.
 *
 * Touchstone runs on the Studio network. Flip it with one env var:
 *
 *   NEXT_PUBLIC_GENLAYER_NETWORK=bradbury
 *
 * Everything below derives from genlayer-js's own chain objects rather than
 * being retyped, so chain id, RPC url and native currency cannot drift out of
 * sync with the SDK.
 *
 * Three Studio facts change behaviour here rather than being trivia:
 *
 *  1. Studio is gasless. `eth_gasPrice` answers 0 and `eth_getBalance` answers
 *     0 for an account whose writes then succeed, so a pre-flight "you have no
 *     GEN" guard is correct on Bradbury and refuses every assay on Studio.
 *  2. Studio's explorer is explorer-studio.genlayer.com. genlayer-js carries
 *     genlayer-explorer.vercel.app for studionet, which answers 503 on every
 *     request, so that one url is hardcoded and everything else still derives.
 *  3. `gen_call` mis-encodes a view whose calldata runs past roughly 200 bytes,
 *     answering "RLP string ends with N superfluous bytes". Nothing here passes
 *     a long argument to a view: the gate runs in this browser, and the only
 *     long text the chain ever sees is fetched by the validators themselves.
 */

import { studionet, testnetBradbury } from "genlayer-js/chains";
import { getAddress } from "viem";

export type NetworkId = "studionet" | "bradbury";

const RAW = (process.env.NEXT_PUBLIC_GENLAYER_NETWORK || "studionet").trim().toLowerCase();

export const NETWORK: NetworkId =
  RAW === "bradbury" || RAW === "testnet_bradbury" || RAW === "testnetbradbury"
    ? "bradbury"
    : "studionet";

export const IS_STUDIO = NETWORK === "studionet";

/** The chain object to hand to createClient(). */
export const CHAIN = IS_STUDIO ? studionet : testnetBradbury;

export const NETWORK_LABEL = IS_STUDIO ? "studio" : "bradbury";

export const CHAIN_ID_HEX = `0x${CHAIN.id.toString(16)}` as const;

export const RPC_URL = CHAIN.rpcUrls.default.http[0];

const EXPLORER_BASE = (
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER ??
  (IS_STUDIO
    ? "https://explorer-studio.genlayer.com"
    : CHAIN.blockExplorers?.default?.url || "")
).replace(/\/+$/, "");

export const HAS_EXPLORER = EXPLORER_BASE.length > 0;

export function explorerTx(hash: string): string {
  return EXPLORER_BASE ? `${EXPLORER_BASE}/tx/${hash}` : "";
}

export function explorerAddress(address: string): string {
  return EXPLORER_BASE ? `${EXPLORER_BASE}/address/${address}` : "";
}

/** True only where an account actually needs a balance to write. */
export const REQUIRES_GAS = !IS_STUDIO;

/** Null where the network has no faucet url. Studio's is a button inside
 * studio.genlayer.com that funds Studio's own accounts, not a page. */
export const FAUCET_URL: string | null = IS_STUDIO
  ? null
  : "https://testnet-faucet.genlayer.foundation/";

export const ADD_CHAIN_PARAMS = {
  chainId: CHAIN_ID_HEX,
  chainName: CHAIN.name,
  rpcUrls: [...CHAIN.rpcUrls.default.http],
  nativeCurrency: CHAIN.nativeCurrency,
  ...(EXPLORER_BASE ? { blockExplorerUrls: [EXPLORER_BASE] } : {}),
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * The canonical form of an address, or "".
 *
 * EIP-55 CHECKSUMMED, AND THAT IS LOAD BEARING. Studio's `gen_call` and
 * `gen_getContractSchema` look a contract up by the exact string they are
 * given: the checksummed address answers and the lowercase form of the same
 * contract answers "not found", which reads exactly like a failed deployment.
 * Lowercasing an address for tidiness silently breaks every read on the site.
 */
export function toAddress(value: string | undefined | null): string {
  const text = (value || "").trim();
  if (!ADDRESS_RE.test(text)) return "";
  try {
    return getAddress(text);
  } catch {
    return "";
  }
}

/** The deployed Touchstone. Empty until one is deployed. */
export const TOUCHSTONE = toAddress(process.env.NEXT_PUBLIC_TOUCHSTONE_ADDRESS);

/**
 * False until a contract is configured.
 *
 * Every screen that would otherwise show a mark then says so, rather than
 * displaying sample data dressed as chain state. On a product whose entire
 * claim is "the marks are judged on chain", an invented mark is worse than an
 * empty panel.
 *
 * A contract address is PER NETWORK: flipping the network env var without
 * redeploying points the app at an address that does not exist there.
 */
export const IS_LIVE = TOUCHSTONE.length > 0;

const VERCEL_PRODUCTION_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const ORIGIN = (
  process.env.NEXT_PUBLIC_ORIGIN ||
  (VERCEL_PRODUCTION_URL ? `https://${VERCEL_PRODUCTION_URL}` : "http://localhost:4400")
).replace(/\/+$/, "");

/**
 * Where the three samples live.
 *
 * The VALIDATORS fetch these, not this browser. A localhost origin is a
 * different machine from a node, so on a dev server the samples are unreachable
 * and the contract refuses them by name rather than failing consensus in a way
 * nobody can act on. Point this at any public origin to demo locally.
 */
export const SAMPLE_BASE = (
  process.env.NEXT_PUBLIC_SAMPLE_BASE || `${ORIGIN}/fixtures`
).replace(/\/+$/, "");

export const SAMPLES_ARE_REACHABLE = !/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[?::1)/i.test(
  SAMPLE_BASE,
);
