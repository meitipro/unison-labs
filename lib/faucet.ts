/**
 * Asking a node for GEN.
 *
 * Both Studio networks fund an account on request through `sim_fundAccount`,
 * checked against each of them rather than assumed: Studio credited 10 GEN and
 * so did Studio Next. The public testnets do not, which is why a target's
 * faucet is either this or a page somebody has to visit.
 *
 * THE BALANCE IS READ ON BOTH SIDES, and that is the whole point. Studio has
 * answered this call with an error while crediting the account anyway, so the
 * answer to "did it work" cannot be the response: it is whether the balance
 * moved. A node that did not answer is reported as a node that did not answer,
 * never as a refusal.
 *
 * A leaf module with no relative imports, so tests/parity runs it directly.
 */

import { getAddress } from "viem";

/**
 * EIP-55, AND IT DECIDES WHETHER ANY OF THIS WORKS.
 *
 * `sim_fundAccount` given a lowercase address answers with a transaction hash,
 * reports no error, and credits nothing: the balance sits where it was. The
 * same address checksummed is credited in full. Measured against Studio and
 * Studio Next on 2026-09-16, and a wallet hands out the lowercase form, so
 * every address here goes through this on the way to a node.
 */
function canonical(address: string): string {
  const text = (address || "").trim();
  try {
    return getAddress(text as `0x${string}`);
  } catch {
    return text;
  }
}

/** Ten GEN, which covers a deploy on either Studio network many times over. */
export const FAUCET_AMOUNT_WEI = 10000000000000000000;

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  return (body as { result?: unknown })?.result;
}

export async function balanceOf(url: string, address: string): Promise<bigint | null> {
  try {
    const raw = await rpc(url, "eth_getBalance", [canonical(address), "latest"]);
    return typeof raw === "string" ? BigInt(raw) : null;
  } catch {
    return null;
  }
}

export type FaucetOutcome =
  | { ok: true; balance: bigint }
  | { ok: false; why: "unmoved" | "unreadable" };

export async function fundFromNode(
  url: string,
  address: string,
  amountWei: number = FAUCET_AMOUNT_WEI,
): Promise<FaucetOutcome> {
  const before = await balanceOf(url, address);
  try {
    await rpc(url, "sim_fundAccount", [canonical(address), amountWei]);
  } catch {
    /* Deliberately swallowed: the balance below is the answer, and this node
       has answered with an error while crediting the account anyway. */
  }
  const after = await balanceOf(url, address);
  if (after === null) return { ok: false, why: "unreadable" };
  if (before !== null && after <= before) return { ok: false, why: "unmoved" };
  return { ok: true, balance: after };
}

/** Wei as GEN, for a sentence rather than for arithmetic. */
export function gen(wei: bigint): string {
  const whole = wei / 1000000000000000000n;
  const rest = (wei % 1000000000000000000n) / 1000000000000000n;
  return rest === 0n ? `${whole}` : `${whole}.${String(rest).padStart(3, "0").replace(/0+$/, "")}`;
}
