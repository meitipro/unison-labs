"use client";

/**
 * The appeal, on the page the appeal is about.
 *
 * The contract has carried `contest` since it was written: it re-fetches the
 * bytes the report was filed against, refuses outright if they have moved, puts
 * the disputed criterion to a fresh jury against the same published anchors,
 * and supersedes the report if that jury lands somewhere else. It is open to
 * anyone on purpose, because the party with the strongest reason to dispute a
 * mark is whoever wrote the code, and they are rarely the account that paid for
 * the review.
 *
 * None of which is worth much if the only way to reach it is to clone the
 * repository and run a node script. Recourse a contract author cannot find is
 * not recourse, so it is a button, on the report, next to the mark it disputes.
 *
 * WHAT THIS DOES NOT DO. It does not decide anything. The browser sends one
 * transaction and reads the answer back off the chain; every mark, every
 * refusal and the whole re-marking happen on the network. A refusal is shown in
 * the contract's own words rather than reworded here.
 */

import { useCallback, useMemo, useState } from "react";

import * as copy from "../../../lib/copy";
import { NETWORK_LABEL } from "../../../lib/chain";
import { useWallet } from "../../../lib/wallet";
import { readableError } from "../../../lib/voice";
import { contest, type Stage } from "../../../lib/writes";

type Phase =
  | { at: "idle" }
  | { at: "working"; stage: Stage }
  | { at: "refused"; why: string }
  /* The report is re-read from the server on the next load, so the only thing
     this holds is that the round finished. Rendering the new mark from here
     would be this component asserting a score it did not receive from the
     chain. */
  | { at: "heard" };

const SAYING: Record<Stage, string> = {
  sending: "Waiting for your wallet",
  sent: "Sent, and waiting for the network",
  fetching: "The validators are fetching the source again",
  scoring: "A fresh jury is marking it",
  accepted: "Accepted, waiting for finality",
  finalized: "Finalized",
};

export default function Appeal({
  id,
  criteria,
  names,
  alreadyContested,
}: {
  id: number;
  /** Only the ids this report actually carries a mark for. */
  criteria: string[];
  names: Record<string, string>;
  /** A superseded report is not appealed a second time. */
  alreadyContested: boolean;
}) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [criterion, setCriterion] = useState(criteria[0] ?? "");
  const [phase, setPhase] = useState<Phase>({ at: "idle" });

  const busy = phase.at === "working";

  const send = useCallback(async () => {
    if (!criterion) return;
    setPhase({ at: "working", stage: "sending" });

    let account = wallet.address;
    if (!account) {
      account = await wallet.connect();
      if (!account) {
        setPhase({ at: "refused", why: wallet.problem || copy.APP_WALLET_NEEDED });
        return;
      }
    }
    if (!wallet.onRightChain) {
      const switched = await wallet.switchChain();
      if (!switched) {
        setPhase({
          at: "refused",
          why: `The wallet is on another network, so nothing was sent. Switch it to ${NETWORK_LABEL} and try again.`,
        });
        return;
      }
    }

    try {
      const { why } = await contest(
        account,
        id,
        criterion,
        (stage) => setPhase({ at: "working", stage }),
        wallet.provider ?? undefined,
      );
      // `why` is the contract's own sentence on a refusal, and empty when the
      // appeal was actually heard. A refusal here is a correct outcome rather
      // than a fault: appealing a criterion counted from bytes that cannot have
      // moved is refused, and the report's one appeal is left unspent.
      if (why) {
        setPhase({ at: "refused", why });
        return;
      }
      setPhase({ at: "heard" });
    } catch (error) {
      setPhase({ at: "refused", why: readableError(error) });
    }
  }, [criterion, id, wallet]);

  const rows = useMemo(
    () => criteria.map((c) => ({ id: c, name: names[c] ?? c })),
    [criteria, names],
  );

  if (alreadyContested) {
    return (
      <p className="body dim" style={{ marginTop: 24, maxWidth: "62ch" }}>
        {copy.APPEAL_SPENT}
      </p>
    );
  }

  if (phase.at === "heard") {
    return (
      <p className="body" style={{ marginTop: 24, maxWidth: "62ch" }}>
        {copy.APPEAL_HEARD}
      </p>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {!open ? (
        <button className="btn btn-quiet" type="button" onClick={() => setOpen(true)}>
          {copy.APPEAL_OPEN}
        </button>
      ) : (
        <div className="card-sm" style={{ maxWidth: "62ch" }}>
          <p className="eyebrow-gold" style={{ margin: "0 0 10px" }}>
            {copy.APPEAL_TITLE}
          </p>
          <p className="body" style={{ margin: "0 0 16px" }}>
            {copy.APPEAL_NOTE}
          </p>

          <label
            className="kv-key"
            htmlFor="appeal-criterion"
            style={{ display: "block", marginBottom: 8 }}
          >
            {copy.APPEAL_PICK}
          </label>
          <select
            id="appeal-criterion"
            className="ws-input"
            value={criterion}
            disabled={busy}
            onChange={(event) => setCriterion(event.target.value)}
            style={{ width: "100%", marginBottom: 16 }}
          >
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-quiet" type="button" onClick={() => void send()} disabled={busy}>
              {busy ? SAYING[phase.stage] : copy.APPEAL_SEND}
            </button>
            {!busy ? (
              <button className="btn btn-quiet" type="button" onClick={() => setOpen(false)}>
                {copy.APPEAL_CANCEL}
              </button>
            ) : null}
          </div>

          {phase.at === "refused" ? (
            <p className="body" style={{ marginTop: 16, marginBottom: 0 }}>
              {phase.why}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
