/**
 * The balance in the rail, and the faucet beside it.
 *
 * The design draws a static `250 GEN` and a Faucet button that adds 100 to it.
 * Both are real here, because on Studio both can be:
 *
 *   balance   `eth_getBalance`, which reports correctly for a key-derived
 *             account. It answers `0x0` for an address the ledger has never
 *             seen, which is a true zero rather than a failure.
 *   faucet    `sim_fundAccount`, Studio's programmatic faucet. Bradbury has no
 *             such method; there the button becomes a link to the real faucet
 *             page, which is the honest equivalent.
 *
 * TWO MEASURED FACTS, both of which would otherwise become bugs:
 *
 *  1. `sim_fundAccount` CREDITS THE ACCOUNT AND THEN ERRORS if the amount is
 *     passed as a hex string -- it answers
 *     `-32603  '<=' not supported between instances of 'str' and 'int'`
 *     while the balance goes up by the full amount. So the amount is a JSON
 *     number, and an error from this method is never reported as "nothing
 *     happened": a retry loop on that error funds the account again each time.
 *     Verified against studio.genlayer.com on 2026-08-21.
 *  2. 100 GEN is 1e20 wei, which is past `Number.MAX_SAFE_INTEGER` but is
 *     still exact in a float64 (it is 2^20 x 5^20). Any amount is checked for
 *     that before it is sent rather than assumed.
 *  3. IT ANSWERS WITH A TRANSACTION HASH FOR AN ADDRESS STUDIO DOES NOT HOLD,
 *     and credits nothing. Studio's ledger only knows accounts it has seen, so
 *     an address it has never met stays at zero across a call that looks like
 *     it worked. A hash from this method is therefore NOT evidence of a
 *     credit, and no caller may report one from it. `components/WalletCard.tsx`
 *     reads the balance before and after and says whichever is true.
 *
 * Studio charges no gas, so a balance there is worth showing and is not worth
 * gating anything on. `REQUIRES_GAS` in `lib/chain.ts` is the flag that says
 * which of those two worlds we are in.
 */

import { IS_STUDIO, RPC_URL, CHAIN } from "./chain";

export const DECIMALS = CHAIN.nativeCurrency?.decimals ?? 18;
export const SYMBOL = CHAIN.nativeCurrency?.symbol ?? "GEN";

/** Studio is the only network with a faucet this app can call itself. */
export const HAS_PROGRAMMATIC_FAUCET = IS_STUDIO;

/** What one press of the faucet asks for. */
export const FAUCET_GEN = 100;

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "The node refused the request.");
  return json.result;
}

/** Wei held by an address, or null when the node did not answer. */
export async function balanceOf(address: string): Promise<bigint | null> {
  try {
    const raw = await rpc("eth_getBalance", [address, "latest"]);
    if (typeof raw !== "string") return null;
    return BigInt(raw);
  } catch {
    return null;
  }
}

/**
 * `1,240.5` - a balance, at the precision a person reads.
 *
 * Whole units below a thousandth are not shown as `0`: a dust balance reads
 * `under 0.001` so nobody concludes the faucet did nothing.
 */
export function formatUnits(wei: bigint): string {
  const base = 10n ** BigInt(DECIMALS);
  const whole = wei / base;
  const rest = wei % base;
  if (rest === 0n) return whole.toLocaleString("en-US");
  const thousandths = (rest * 1000n) / base;
  if (whole === 0n && thousandths === 0n) return "under 0.001";
  const fraction = thousandths.toString().padStart(3, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}.${fraction || "0"}`;
}

export type FaucetResult = { hash: string } | { credited: true };

/**
 * Ask Studio for testnet GEN.
 *
 * Resolves with the funding transaction's hash. The `credited` shape is the
 * case described above: the node reported an error of a kind that is only ever
 * raised AFTER the credit, so the balance is refreshed rather than the person
 * being invited to press again.
 */
export async function requestFunds(address: string, gen = FAUCET_GEN): Promise<FaucetResult> {
  if (!HAS_PROGRAMMATIC_FAUCET) {
    throw new Error("This network has no faucet this page can call.");
  }
  const wei = BigInt(gen) * 10n ** BigInt(DECIMALS);
  /* The amount crosses the wire as a JSON number, so it has to survive the
     round trip through a float exactly. 1e20 does; something like 1e20 + 1
     would not, and would fund a different amount than the one on the button. */
  if (BigInt(Number(wei)) !== wei) {
    throw new Error("That amount cannot be sent exactly, so it was not sent at all.");
  }
  try {
    const hash = await rpc("sim_fundAccount", [address, Number(wei)]);
    return { hash: typeof hash === "string" ? hash : "" };
  } catch (error) {
    const message = String((error as Error)?.message ?? "");
    if (message.includes("'<=' not supported")) return { credited: true };
    throw error;
  }
}
