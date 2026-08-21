import type { Metadata } from "next";

import { WorkspaceHeader } from "../../../../components/WorkspaceShell";
import * as copy from "../../../../lib/copy";
import { NETWORK_LABEL } from "../../../../lib/chain";
import { getStats } from "../../../../lib/touchstone";
import { POOL_IS_READABLE, familiesOf, getPool, modelLabel } from "../../../../lib/validators";

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
 * What can be shown is real and is more interesting: every validator's address,
 * stake, provider and model, from `sim_getAllValidators`. The figure worth
 * reading is the count of distinct model FAMILIES, because two nodes running
 * one model are not two independent readings of anything -- and Studio lists
 * `openai/gpt-5.4` and `policy:prd-gpt-5-4` as separate entries while both are
 * the same model behind different routing.
 */
export default async function ValidatorsPane() {
  const [pool, stats] = await Promise.all([getPool(), getStats()]);
  const families = pool ? familiesOf(pool) : [];

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
            {/* Model STRINGS and model FAMILIES are different counts and the
                difference matters here: Studio lists `openai/gpt-5.4` and
                `policy:prd-gpt-5-4` separately, but two nodes on the same
                underlying model are not two independent readings. Showing only
                the larger number would overstate how much the jury disagrees
                with itself by construction. */}
            <div>
              <div className="ws-fig-n">{families.length}</div>
              <div className="ws-fig-l">
                Model families, across {pool.models.length} entries
              </div>
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
                  {modelLabel(validator.model) || "not published"}
                </div>
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
