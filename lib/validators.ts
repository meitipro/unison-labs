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
  /**
   * The model families this validator may actually run.
   *
   * MOST NODES DO NOT NAME A MODEL. Sixteen of the twenty in Studio's pool
   * carry `policy:prd-...`, which is a ROUTING POLICY, not a model: its
   * `policy_ir` lists two or three families and the router picks one per call
   * by price, latency and success rate. `policy:prd-grok` may run grok-4.3,
   * gpt-5.4 or gemini-3-flash-preview, and nothing published says which it ran.
   *
   * So this is the candidate set, and `namesAModel` says whether the node
   * committed to one. Rendering a policy name as though it were the model is
   * how the marquee came to claim a Grok node that might have been GPT.
   */
  candidates: string[];
  namesAModel: boolean;
};

/** Pull every `family_eq` out of a policy_ir tree. */
function familiesIn(node: unknown, found: string[] = []): string[] {
  if (!Array.isArray(node)) return found;
  if (node[0] === "family_eq" && typeof node[1] === "string") found.push(node[1]);
  for (const child of node) familiesIn(child, found);
  return found;
}

export type Pool = {
  validators: Validator[];
  /** Every distinct model string, policies included. */
  models: string[];
  /**
   * The models the pool actually commits to, in the form the network prints
   * them. These are the only names this product will put on a screen: a node
   * that names a routing policy has not told anybody what it runs.
   */
  named: string[];
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
      .map((row) => {
        const model = typeof row.model === "string" ? row.model : "";
        const config = (row.config ?? {}) as Record<string, unknown>;
        const candidates = [...new Set(familiesIn(config.policy_ir))].sort();
        return {
          address: typeof row.address === "string" ? row.address : "",
          stake: typeof row.stake === "number" ? row.stake : 0,
          provider: typeof row.provider === "string" ? row.provider : "",
          model,
          candidates,
          /* A policy names no model. Anything else is the node committing. */
          namesAModel: model.length > 0 && !model.startsWith("policy:"),
        };
      })
      .filter((validator) => validator.address.length > 0);

    return {
      validators,
      models: [...new Set(validators.map((v) => v.model).filter(Boolean))].sort(),
      named: [
        ...new Set(validators.filter((v) => v.namesAModel).map((v) => v.model)),
      ].sort(),
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

/**
 * `openai/gpt-5.4` -> `GPT-5.4`, `anthropic/claude-sonnet-4.6` -> `Claude
 * Sonnet 4.6`. The vendor prefix is routing, not identity.
 *
 * ONLY EVER CALLED ON A NAME THE NETWORK COMMITTED TO. There is deliberately
 * no mapping from a routing policy to a family here: `policy:prd-grok` may run
 * grok-4.3, gpt-5.4 or gemini-3-flash-preview and the network does not say
 * which, so any label for it would be this page guessing.
 */
export function displayModel(model: string): string {
  const bare = model.includes("/") ? model.slice(model.indexOf("/") + 1) : model;
  return bare
    .split("-")
    .map((part) => {
      if (/^v?[\d.]+$/i.test(part)) return part;
      if (part.length <= 3) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ")
    .replace(/Gpt/g, "GPT");
}

/**
 * The models this pool actually commits to, ready to print.
 *
 * Four of Studio's twenty nodes name one; the rest name a policy. So this is a
 * short list on purpose, and the interface shows it large rather than padding
 * it out with names nobody published.
 */
export function namedModels(pool: Pool): string[] {
  return pool.named.map(displayModel);
}

/** How many nodes committed to a model, and how many named a policy. */
export function commitment(pool: Pool): { named: number; routed: number } {
  const named = pool.validators.filter((v) => v.namesAModel).length;
  return { named, routed: pool.validators.length - named };
}
