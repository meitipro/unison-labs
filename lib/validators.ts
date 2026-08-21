/**
 * The pool, as the network actually reports it.
 *
 * The design's Validators screen shows five nodes, each with its own mark out
 * of ten and the word "undisclosed" where its model would be. The marks cannot
 * be real and the models need not be:
 *
 *   PER-VALIDATOR MARKS DO NOT EXIST, anywhere, at any layer. A validator's
 *   vote under Optimistic Democracy is one bit -- it agrees with the leader's
 *   result or it does not -- and that aggregate is all the contract or the
 *   receipt ever carries. There is no number to show per node, and drawing five
 *   nines would be inventing the one thing this whole product is about.
 *
 *   THE MODELS ARE PUBLISHED. `sim_getAllValidators` returns every validator's
 *   address, stake, provider and model. So the screen shows what the network
 *   says about itself, and the honest note is that the assignment of nodes to a
 *   given review is not something a contract can see.
 *
 * Studio only. Bradbury has no `sim_` namespace, and the screen says so rather
 * than showing an empty pool as though the pool were empty.
 */

import { cache } from "react";

import { IS_STUDIO, RPC_URL } from "./chain";

export type Validator = {
  address: string;
  stake: number;
  provider: string;
  model: string;
};

export type Pool = {
  validators: Validator[];
  /** Distinct models across the pool -- the number that matters, since two
   *  nodes on one model are not two independent readings. */
  models: string[];
  providers: string[];
};

export const POOL_IS_READABLE = IS_STUDIO;

/**
 * The pool, or null when the node did not answer.
 *
 * Null and empty are kept apart all the way to the screen. A rate-limited read
 * rendered as "no validators" is a claim about the network that this page has
 * no evidence for.
 */
export const getPool = cache(async function getPool(): Promise<Pool | null> {
  if (!POOL_IS_READABLE) return null;
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sim_getAllValidators", params: [] }),
      next: { revalidate: 60 },
    });
    const json = (await response.json()) as { result?: unknown };
    if (!Array.isArray(json.result)) return null;

    const validators: Validator[] = json.result
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => ({
        address: typeof row.address === "string" ? row.address : "",
        stake: typeof row.stake === "number" ? row.stake : 0,
        provider: typeof row.provider === "string" ? row.provider : "",
        model: typeof row.model === "string" ? row.model : "",
      }))
      .filter((validator) => validator.address.length > 0);

    return {
      validators,
      models: [...new Set(validators.map((v) => v.model).filter(Boolean))].sort(),
      providers: [...new Set(validators.map((v) => v.provider).filter(Boolean))].sort(),
    };
  } catch {
    return null;
  }
});

/**
 * `policy:prd-gpt-5-4` -> `prd-gpt-5-4`, `anthropic/claude-sonnet-4.6` -> the
 * whole thing. Studio names a routing policy with a `policy:` prefix, which is
 * an implementation detail of the router rather than a model name.
 */
export function modelLabel(model: string): string {
  return model.startsWith("policy:") ? model.slice("policy:".length) : model;
}
