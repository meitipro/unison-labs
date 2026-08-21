import type { Metadata } from "next";

import { WorkspaceHeader } from "../../../../components/WorkspaceShell";
import * as copy from "../../../../lib/copy";
import { NETWORK_LABEL } from "../../../../lib/chain";
import { getStats } from "../../../../lib/touchstone";
import {
  POOL_IS_READABLE,
  commitment,
  displayModel,
  getPool,
  modelLabel,
} from "../../../../lib/validators";

export const metadata: Metadata = {
  title: "Validators - Unison",
  description:
    "The pool this network draws a jury from, and what each node is running. No per-validator mark exists to show.",
};

export const revalidate = 60;

/**
 * The pool, as the network reports it.
 *
 * THE ONE THING THIS PANE DOES NOT DO is the thing the design does: draw five
 * nodes each with its own mark out of ten. That number exists nowhere. Under
 * Optimistic Democracy a validator returns one bit -- it agrees with the
 * leader's result or it does not -- and the receipt carries the aggregate.
 * Five nines on this screen would be the product inventing the exact quantity
 * it exists to establish.
 *
 * What can be shown is real: every validator's address, stake, provider and
 * model, from `sim_getAllValidators`.
 *
 * THE DISTINCTION THIS PANE EXISTS TO MAKE is between a node that NAMES the
 * model it runs and a node that names a ROUTING POLICY. Four of Studio's twenty
 * do the former. The other sixteen carry `policy:prd-...`, whose `policy_ir`
 * lists two or three candidate families and lets the router pick one per call
 * on price, latency and success rate -- so `policy:prd-grok` may run grok-4.3,
 * gpt-5.4 or gemini-3-flash-preview and nothing published says which it ran.
 *
 * Collapsing those policy names to families, which this page used to do, read
 * as a pool of twelve independent models when the truth is four commitments
 * and sixteen nodes that may all have landed on the same model.
 */
export default async function ValidatorsPane() {
  const [pool, stats] = await Promise.all([getPool(), getStats()]);
  const counts = pool ? commitment(pool) : { named: 0, routed: 0 };

  return (
    <>
      <WorkspaceHeader
        title={copy.PANE_VALIDATORS_TITLE}
        lede={copy.PANE_VALIDATORS_LEDE}
        standard={stats?.rubric}
      />

      {!POOL_IS_READABLE ? (
        <div className="ws-panel">
          <p className="ws-note" style={{ margin: 0 }}>
            {NETWORK_LABEL} does not publish its validator set to this page, so the pool is not
            listed here rather than guessed at.
          </p>
        </div>
      ) : pool === null ? (
        <div className="ws-panel">
          <p className="ws-note" style={{ margin: 0 }}>
            {copy.POOL_UNREADABLE}
          </p>
        </div>
      ) : (
        <>
          <div className="ws-figs" style={{ marginTop: 26 }}>
            <div>
              <div className="ws-fig-n">{pool.validators.length.toLocaleString("en-US")}</div>
              <div className="ws-fig-l">In the pool</div>
            </div>
            {/* The figure that matters is how many nodes NAME a model. The
                rest carry `policy:prd-...`, a routing policy whose policy_ir
                lists two or three families and which picks one per call. A
                count of "distinct models" that included those would be
                counting policies as though they were commitments. */}
            <div>
              <div className="ws-fig-n">{counts.named}</div>
              <div className="ws-fig-l">Name the model they run</div>
            </div>
            <div>
              <div className="ws-fig-n">{counts.routed}</div>
              <div className="ws-fig-l">Run a routing policy</div>
            </div>
            <div>
              <div className="ws-fig-n">2n + 1</div>
              <div className="ws-fig-l">Widened on appeal</div>
            </div>
          </div>

          <p className="ws-note">{copy.VALIDATORS_NO_MARKS}</p>

          <div className="ws-pool">
            {pool.validators.map((validator) => (
              <div key={validator.address}>
                <div
                  className="ws-eyebrow"
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9.5, letterSpacing: "0.16em" }}
                >
                  <span className="ws-live" aria-hidden="true" />
                  <span className="mono" style={{ textTransform: "none", letterSpacing: 0 }}>
                    {validator.address.slice(0, 6)}
                    {"..."}
                    {validator.address.slice(-4)}
                  </span>
                </div>
                <div
                  className="mono"
                  style={{ marginTop: 14, fontSize: 13.5, lineHeight: 1.4, letterSpacing: "-0.01em", color: "var(--ai)", overflowWrap: "anywhere" }}
                >
                  {validator.namesAModel
                    ? displayModel(validator.model)
                    : modelLabel(validator.model) || "not published"}
                </div>
                {/* A policy is not a model, and the node is not hiding it -- it
                    genuinely does not know until the router picks. Naming the
                    candidates is the most this page can honestly say. */}
                {!validator.namesAModel && validator.candidates.length ? (
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: "var(--am)" }}>
                    routing policy, picks one of {validator.candidates.join(", ")}
                  </div>
                ) : null}
                <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 12.5, color: "var(--am)" }}>
                  <span>{validator.provider || "unknown provider"}</span>
                  <span style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                    stake {validator.stake}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="ws-note">
            Which of these read a given contract is chosen by the protocol per transaction, and a
            contract cannot see the selection. What a receipt carries is how many agreed.
          </p>
        </>
      )}
    </>
  );
}
