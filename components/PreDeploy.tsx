"use client";

/**
 * Before you deploy.
 *
 * The whole milestone in one section: a contract is reviewed before it goes on
 * chain, the review says what to change, and the same page deploys the bytes
 * that were reviewed, from the author's own wallet.
 *
 * None of the three parts invents anything. A suggestion is two published
 * anchors either side of a mark. A rule finding was computed by the contract
 * over the agreed bytes and stored on the report. The deploy fetches the file
 * again and refuses to sign unless it hashes to the report's digest, then reads
 * the new contract back and says whether its bytes match.
 */

import { useMemo, useState } from "react";

import * as copy from "../lib/copy";
import {
  DEPLOY_TARGETS,
  DEFAULT_TARGET_ID,
  addChainParams,
  chainIdHex,
  explorerAddressOn,
  targetById,
  type DeployTarget,
} from "../lib/networks";
import { useWallet } from "../lib/wallet";
import { readableError } from "../lib/voice";
import { suggestionsFor } from "../lib/suggest";
import { deployReviewed, kindOf, missingArgs, type DeployStage } from "../lib/deploy";
import type { Report, Rubric, RuleCheck } from "../lib/types";

type Phase =
  | { at: "idle" }
  | { at: "working"; stage: DeployStage }
  | { at: "refused"; why: string }
  /* The target is carried on the result rather than read from the picker,
     so changing the picker afterwards cannot relabel a deploy that already
     happened or point its link at the wrong explorer. */
  | { at: "done"; address: string; matches: boolean | null; target: DeployTarget };

const STAGES: Record<DeployStage, string> = {
  fetching: "Fetching the file again",
  checking: "Checking it hashes to this report",
  signing: "Waiting for your wallet",
  sent: "Sent, and waiting for the network",
  accepted: "Accepted, waiting for finality",
  finalized: "Finalized",
  verifying: "Reading the deployed bytes back",
};

const FIELD: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  background: "transparent",
  border: "1px solid var(--line-2)",
  borderRadius: 10,
  color: "var(--text)",
  font: "inherit",
  fontSize: 13.5,
};

const PLACEHOLDER: Record<ReturnType<typeof kindOf>, string> = {
  text: "text",
  number: "a whole number",
  bool: "",
  address: "0x address",
  json: "JSON",
};

function sentence(fix: string): string {
  return fix.charAt(0).toUpperCase() + fix.slice(1);
}

export default function PreDeploy({
  report,
  rubric,
  ruleChecks,
}: {
  report: Report;
  rubric: Rubric | null;
  /** Null where the published checks could not be read. */
  ruleChecks: RuleCheck[] | null;
}) {
  const wallet = useWallet();
  const params = Array.isArray(report.init_params) ? report.init_params : [];
  /* A report from before the contract recorded `init_params` cannot say what
     the constructor needs, and sending no arguments to one that takes some
     fails inside __init__ after a signature. So the button waits for a
     report that knows. */
  const knowsCtor = Array.isArray(report.init_params);
  const findings = Array.isArray(report.rules) ? report.rules : null;
  const [targetId, setTargetId] = useState(DEFAULT_TARGET_ID);
  const target = targetById(targetId) ?? DEPLOY_TARGETS[0];
  const [values, setValues] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const busy = phase.at === "working";

  const suggestions = useMemo(
    () =>
      report.subjects.flatMap((subject) =>
        suggestionsFor(subject, rubric).map((s) => ({ ...s, kind: subject.kind })),
      ),
    [report, rubric],
  );
  const checkById = useMemo(() => new Map((ruleChecks ?? []).map((c) => [c.id, c])), [ruleChecks]);

  const deploy = async () => {
    const missing = missingArgs(params, values);
    if (missing.length) {
      setPhase({ at: "refused", why: copy.argsMissing(missing) });
      return;
    }
    setPhase({ at: "working", stage: "fetching" });

    let account = wallet.address;
    if (!account) {
      account = await wallet.connect();
      if (!account) {
        setPhase({ at: "refused", why: wallet.problem || copy.APP_WALLET_NEEDED });
        return;
      }
    }
    /* Against the chosen network, not against the one this site reads. Asimov
       and Bradbury share chain id 4221, so a wallet sitting on either counts
       as switched for both, and the node the deploy is submitted to is what
       decides where it lands. */
    const onTarget = (wallet.chainId ?? "").toLowerCase() === chainIdHex(target).toLowerCase();
    if (!onTarget) {
      const switched = await wallet.switchChain({
        chainIdHex: chainIdHex(target),
        addParams: addChainParams(target),
      });
      if (!switched) {
        setPhase({ at: "refused", why: wallet.problem || copy.switchRefused(target.label) });
        return;
      }
    }

    try {
      const outcome = await deployReviewed({
        report,
        account,
        provider: wallet.provider ?? undefined,
        values,
        target,
        onStage: (stage) => setPhase({ at: "working", stage }),
      });
      if (!outcome.ok) {
        setPhase({ at: "refused", why: outcome.why });
        return;
      }
      setPhase({ at: "done", address: outcome.address, matches: outcome.matches, target });
    } catch (error) {
      console.error("[unison] the deploy did not land:", error);
      setPhase({ at: "refused", why: readableError(error, target.label) });
    }
  };

  return (
    <section id="before-you-deploy" style={{ marginTop: 56, scrollMarginTop: 96 }}>
      <p className="eyebrow">{copy.PREDEPLOY_EYEBROW}</p>
      <h2 className="h2" style={{ margin: "10px 0 0", maxWidth: "24ch" }}>
        {copy.PREDEPLOY_HEADING}
      </h2>

      <div className="card-sm" style={{ marginTop: 22 }}>
        <p className="eyebrow-gold" style={{ margin: "0 0 8px" }}>
          {copy.SUGGEST_TITLE}
        </p>
        <p className="body dim" style={{ margin: "0 0 6px", maxWidth: "62ch" }}>
          {copy.SUGGEST_NOTE}
        </p>
        {suggestions.length === 0 ? (
          <p className="body" style={{ margin: "12px 0 0" }}>
            {copy.SUGGEST_NONE}
          </p>
        ) : (
          suggestions.map((s) => (
            <div key={`${s.kind}-${s.id}`} className="mark-row">
              <div className="mark-head" style={{ flexWrap: "wrap", rowGap: 4 }}>
                <span className="h3">{s.name}</span>
                <span className="mono dim" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                  {s.kind} - {s.decidedBy === "facts" ? copy.SUGGEST_COUNTED : copy.SUGGEST_JUDGED} -{" "}
                  {s.score} of 2
                </span>
              </div>
              <p className="body dim" style={{ margin: "8px 0 0" }}>
                {s.reason}
              </p>
              <p className="body" style={{ margin: "8px 0 0" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>
                  {copy.SUGGEST_NEXT}
                </span>{" "}
                {s.next}
              </p>
            </div>
          ))
        )}
      </div>

      {findings ? (
        <div className="card-sm" style={{ marginTop: 12 }}>
          <p className="eyebrow-gold" style={{ margin: "0 0 8px" }}>
            {copy.RULES_TITLE}
          </p>
          <p className="body dim" style={{ margin: "0 0 6px", maxWidth: "62ch" }}>
            {copy.RULES_NOTE}
          </p>
          {findings.length === 0 ? (
            <p className="body" style={{ margin: "12px 0 0" }}>
              {copy.RULES_NONE}
            </p>
          ) : (
            findings.map((f, i) => {
              const c = checkById.get(f.check);
              return (
                <div key={`${f.check}-${f.line}-${i}`} className="mark-row">
                  <div className="mark-head" style={{ flexWrap: "wrap", rowGap: 4 }}>
                    <span className="h3">{c ? c.title : f.check}</span>
                    {c ? (
                      <span className="mono dim" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {c.rule === "GenVM" ? "GenVM" : `rule ${c.rule}`}
                      </span>
                    ) : null}
                  </div>
                  <p className="mono dim" style={{ margin: "8px 0 0", fontSize: 12, overflowWrap: "anywhere" }}>
                    {copy.rulesWhere(f.line, f.name)}
                  </p>
                  {c ? (
                    <p className="body" style={{ margin: "8px 0 0" }}>
                      {sentence(c.fix)}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
          {ruleChecks === null && findings.length > 0 ? (
            <p className="body dim" style={{ margin: "14px 0 0" }}>
              {copy.RULES_UNREAD}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="card-sm" style={{ marginTop: 12 }}>
        <p className="eyebrow-gold" style={{ margin: "0 0 8px" }}>
          {copy.DEPLOY_TITLE}
        </p>
        <p className="body dim" style={{ margin: 0, maxWidth: "62ch" }}>
          {copy.DEPLOY_NOTE}
        </p>

        <div style={{ marginTop: 18 }}>
          <p className="kv-key" style={{ margin: "0 0 4px" }}>
            {copy.DEPLOY_NETWORK}
          </p>
          <p className="body dim" style={{ margin: "0 0 8px", maxWidth: "62ch" }}>
            {copy.DEPLOY_NETWORK_NOTE}
          </p>
          <select
            aria-label={copy.DEPLOY_NETWORK}
            style={{ ...FIELD, marginTop: 0, maxWidth: 340 }}
            value={targetId}
            disabled={busy}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {DEPLOY_TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="body dim" style={{ margin: "8px 0 0", maxWidth: "62ch" }}>
            {target.note}
          </p>
        </div>

        {params.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <p className="kv-key" style={{ margin: "0 0 10px" }}>
              {copy.DEPLOY_ARGS}
            </p>
            {params.map((param) => {
              const kind = kindOf(param.type);
              const value = values[param.name] ?? "";
              const set = (next: string) => setValues((all) => ({ ...all, [param.name]: next }));
              return (
                <label key={param.name} style={{ display: "block", marginBottom: 14 }}>
                  <span className="mono" style={{ fontSize: 12.5 }}>
                    {param.name}
                  </span>
                  <span className="mono dim" style={{ fontSize: 11 }}>
                    {" "}
                    {param.type || "any"}
                    {param.optional ? ", optional" : ""}
                  </span>
                  {kind === "bool" ? (
                    <select style={FIELD} value={value} disabled={busy} onChange={(e) => set(e.target.value)}>
                      <option value="">{param.optional ? "leave as is" : "choose"}</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      style={FIELD}
                      value={value}
                      disabled={busy}
                      placeholder={PLACEHOLDER[kind]}
                      spellCheck={false}
                      onChange={(e) => set(e.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
        ) : null}

        {phase.at === "done" ? (
          <div style={{ marginTop: 18 }}>
            <p className="body" style={{ margin: 0, overflowWrap: "anywhere" }}>
              {copy.DEPLOY_DONE_LEAD} {phase.target.label},{" "}
              {phase.target.explorer ? (
                <a
                  href={explorerAddressOn(phase.target, phase.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                >
                  {phase.address}
                </a>
              ) : (
                <span className="mono">{phase.address}</span>
              )}
            </p>
            <p
              className="body"
              style={{
                margin: "8px 0 0",
                color: phase.matches === null ? "var(--muted)" : phase.matches ? "var(--gold)" : "var(--fail)",
              }}
            >
              {phase.matches === null
                ? copy.DEPLOY_UNREAD
                : phase.matches
                  ? copy.DEPLOY_MATCH
                  : copy.DEPLOY_MISMATCH}
            </p>
          </div>
        ) : knowsCtor ? (
          <button
            className="btn btn-glow"
            type="button"
            style={{ marginTop: 18 }}
            disabled={busy}
            onClick={() => void deploy()}
          >
            {busy ? STAGES[phase.stage] : copy.deployButton(target.label)}
          </button>
        ) : (
          <p className="body dim" style={{ margin: "18px 0 0", maxWidth: "62ch" }}>
            {copy.DEPLOY_OLDER}
          </p>
        )}

        {phase.at === "refused" ? (
          <p className="body" style={{ margin: "14px 0 0", maxWidth: "62ch" }}>
            {phase.why}
          </p>
        ) : null}
      </div>
    </section>
  );
}
