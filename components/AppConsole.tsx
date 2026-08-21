"use client";

/**
 * The workspace's Home pane: source in, and everything a submission turns into.
 *
 * The design's compose screen, wired to the real thing.
 *
 * ONE PATH, AND IT ALWAYS ENDS IN A SIGNATURE. The design offers a paste box
 * beside the url, and this carried it for a while as a free local check. It
 * had to go: it looked like the other half of the same feature and was not,
 * so people pasted a contract, watched the gate tick six boxes, and concluded
 * they had been reviewed when no transaction had been sent and no validator
 * had seen anything.
 *
 * Pasting cannot be reviewed, for reasons that are not ours to route around.
 * Validators fetch the file themselves -- that is the whole claim -- so text
 * in one browser is reachable by none of them. Putting the source in the
 * calldata instead would mean the jury taking the submitter's word for what it
 * is, and Studio rejects a write argument somewhere between 5,000 and 20,000
 * characters anyway, which most real contracts exceed.
 *
 * WHAT RUNS WHERE: this browser fetches the source, runs the published gate,
 * hashes it and asks the chain whether those exact bytes already hold a
 * report. A refusal stops there and costs nothing. Everything past that point
 * is one transaction, signed in the visitor's own wallet.
 *
 * The rail, the header chips and the theme switch belong to `WorkspaceShell`;
 * this renders the pane and its own title, which follows the phase the way the
 * design's `appTitle` does.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import Streak from "./Streak";
import { WorkspaceHeader } from "./WorkspaceShell";
import * as copy from "../lib/copy";
import * as fmt from "../lib/format";
import { IS_LIVE, NETWORK_LABEL, SAMPLES_ARE_REACHABLE, SAMPLE_BASE } from "../lib/chain";
import {
  SPEC,
  digest as digestOf,
  normalise,
  runGate,
  type GateResult,
  type GateSpec,
} from "../lib/gate";
import { getGateSpec, getReportByDigest, getSplitForDigest } from "../lib/unison";
import { rawSourceUrl, isGithubPage } from "../lib/sourceUrl";
import { useWallet } from "../lib/wallet";
import { readableError } from "../lib/voice";
import { assay, type Outcome, type Stage, type Votes } from "../lib/writes";
import type { Report } from "../lib/types";

type Phase =
  | { at: "idle" }
  /* Between the press and the wallet. The browser is fetching the file,
     running the gate and asking the chain whether these bytes already carry a
     report -- a few seconds of real work that used to happen behind a screen
     that looked idle, so the wallet appeared to pop up out of nowhere. */
  | { at: "preparing" }
  /* The wallet has been asked and has not answered. Nothing is shown about
     the source here: a gate verdict on screen while somebody is deciding
     whether to sign reads as the result, and the result is not in yet. */
  | { at: "signing"; gate: GateResult }
  | { at: "gated"; gate: GateResult }
  | { at: "unreadable"; why: string }
  | { at: "working"; gate: GateResult; stage: Stage }
  | { at: "already"; gate: GateResult; reportId: number }
  | { at: "split"; gate: GateResult; why: string; criterion: string }
  | { at: "refused"; gate: GateResult | null; why: string }
  | { at: "scored"; gate: GateResult; report: Report; votes: Votes | null; provisional: boolean };

export default function AppConsole({
  names,
  rubric,
}: {
  names: Record<string, string>;
  /** The rubric version the contract publishes, for the header chip. */
  rubric: string;
}) {
  const wallet = useWallet();
  const [sourceUrl, setSourceUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const [spec, setSpec] = useState<GateSpec>(SPEC);
  const resultRef = useRef<HTMLDivElement | null>(null);

  /* Run the gate the CHAIN publishes, not this browser's copy of it. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const published = await getGateSpec();
      if (!alive) return;
      if (published && Array.isArray(published.checks) && published.checks.length) {
        setSpec(published as unknown as GateSpec);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (phase.at === "scored" || phase.at === "split" || phase.at === "already") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [phase.at]);

  const submit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();

      // A GitHub page url serves markup, not source. Convert it here, before
      // this browser fetches and before the chain records anything: the report
      // has to be filed under the url that was actually read.
      const url = rawSourceUrl(sourceUrl);
      if (!url) {
        setPhase({ at: "refused", gate: null, why: copy.EMPTY_SUBMIT });
        return;
      }

      setPhase({ at: "preparing" });

      let text = "";
      try {
        const response = await fetch(url, { headers: { Accept: "text/plain, */*" } });
        if (!response.ok) {
          setPhase({
            at: "unreadable",
            why: `The source url answered ${response.status} from this browser, so the gate could not run here.`,
          });
          return;
        }
        text = await response.text();
      } catch {
        // A cross-origin refusal here says nothing about whether a NODE can
        // read the url, and the contract runs the same gate anyway.
        setPhase({
          at: "unreadable",
          why: "This browser was not allowed to read that url, so the free gate could not run here. The validators fetch it themselves and the contract runs the same gate.",
        });
        return;
      }

      const gate = runGate(text, spec);
      if (!gate.eligible) {
        setPhase({ at: "refused", gate, why: copy.refused(fmt.ids(gate.missing)) });
        return;
      }

      if (!IS_LIVE) {
        setPhase({ at: "unreadable", why: copy.NOT_LIVE });
        return;
      }

      const digest = await digestOf(normalise(text));
      const existing = await getReportByDigest(digest);
      if (existing) {
        setPhase({ at: "already", gate, reportId: existing.id });
        return;
      }

      // Only now is a signature needed. Connect on demand rather than gating
      // the whole screen behind a wallet: everything above was free.
      setPhase({ at: "signing", gate });

      let account = wallet.address;
      if (!account) {
        account = await wallet.connect();
        if (!account) {
          setPhase({ at: "refused", gate, why: wallet.problem || copy.APP_WALLET_NEEDED });
          return;
        }
      }
      if (!wallet.onRightChain) {
        const switched = await wallet.switchChain();
        if (!switched) {
          setPhase({
            at: "refused",
            gate,
            why: `The wallet is on another network, so nothing was submitted. Switch it to ${NETWORK_LABEL} and run this again.`,
          });
          return;
        }
      }

      setPhase({ at: "working", gate, stage: "sending" });

      let outcome: Outcome;
      try {
        outcome = await assay(
          account,
          url,
          siteUrl.trim(),
          (stage) =>
            setPhase((current) => (current.at === "working" ? { ...current, stage } : current)),
          wallet.provider ?? undefined,
        );
      } catch (error) {
        setPhase({ at: "refused", gate, why: readableError(error) });
        return;
      }

      if (outcome.kind === "already") {
        setPhase({ at: "already", gate, reportId: outcome.reportId });
        return;
      }
      if (outcome.kind === "refused" || outcome.kind === "slow") {
        setPhase({ at: "refused", gate, why: outcome.why });
        return;
      }
      if (outcome.kind === "split") {
        const criterion = await getSplitForDigest(digest);
        setPhase({ at: "split", gate, why: outcome.why, criterion });
        return;
      }

      const report = await getReportByDigest(digest);
      if (!report) {
        setPhase({
          at: "refused",
          gate,
          why: "The assay settled but no report can be read back yet. Check the transaction before submitting again.",
        });
        return;
      }
      setPhase({
        at: "scored",
        gate,
        report,
        votes: outcome.votes,
        provisional: outcome.provisional,
      });
    },
    [sourceUrl, siteUrl, spec, wallet],
  );

  const gate = "gate" in phase ? phase.gate : null;
  const ready = sourceUrl.trim().length > 0;

  /* Everything from asking the wallet to the transaction actually leaving.
     The gate result stays off screen for all of it: a row of green ticks
     while somebody decides whether to sign reads as the verdict, and there
     is no verdict yet. */
  const awaitingSignature =
    phase.at === "signing" || (phase.at === "working" && phase.stage === "sending");

  /* The header follows the phase, the way the design's `appTitle` does. */
  const title =
    phase.at === "working"
      ? copy.APP_HOME_RUNNING_TITLE
      : phase.at === "scored"
        ? `Report ${phase.report.id}`
        : phase.at === "split"
          ? copy.APP_HOME_SPLIT_TITLE
          : copy.APP_TITLE;
  const lede =
    phase.at === "working"
      ? copy.APP_HOME_RUNNING_LEDE
      : phase.at === "scored"
        ? copy.APP_HOME_DONE_LEDE
        : phase.at === "split"
          ? copy.APP_HOME_SPLIT_LEDE
          : copy.APP_LEDE;

  return (
    <>
      <WorkspaceHeader title={title} lede={lede} standard={rubric || undefined} />

      {/* ---------------- compose ------------------------------------- */}
      {/* The form steps aside for anything in flight: preparing, waiting on
          the signature, and the run itself. */}
      {phase.at !== "working" && phase.at !== "preparing" && phase.at !== "signing" ? (
        <form className="ws-panel" onSubmit={submit}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
              {copy.APP_SOURCE_LABEL}
            </div>
            <div className="ws-mono-quiet" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span>
                {sourceUrl.trim() ? "one raw file" : "no url yet"}
              </span>
              {ready ? (
                <button
                  type="button"
                  className="ws-quiet"
                  style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}
                  onClick={() => {
                    setSourceUrl("");
                    setSiteUrl("");
                    setPhase({ at: "idle" });
                  }}
                >
                  clear
                </button>
              ) : null}
            </div>
          </div>

          <label>
            <span className="sr-only">{copy.APP_URL_LABEL}</span>
            <input
              className="ws-field"
              type="url"
              inputMode="url"
              spellCheck={false}
              placeholder={copy.HERO_PLACEHOLDER}
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </label>

          {/* Shown the moment a GitHub page url is recognised, because the
              thing that gets fetched and recorded is not the thing that was
              typed, and that should never be a surprise on a permanent
              report. */}
          {isGithubPage(sourceUrl) ? (
            <p className="ws-converted">
              <span>{copy.GITHUB_CONVERTED}</span>
              <span className="mono">{rawSourceUrl(sourceUrl)}</span>
            </p>
          ) : (
            <p className="ws-note" style={{ marginTop: 12 }}>
              {copy.SOURCE_NOTE}
            </p>
          )}

          {/* The site is a second subject with its own ten, not an extra field
              on the first. It reads as an afterthought when it sits flush
              against the source input, so it gets its own labelled block. */}
          <div className="ws-subject">
            <div className="ws-eyebrow" style={{ fontSize: 9.5, letterSpacing: "0.18em" }}>
              {copy.SITE_EYEBROW}
            </div>
            <label>
              <span className="sr-only">{copy.APP_SITE_LABEL}</span>
              <input
                className="ws-field"
                style={{ marginTop: 10 }}
                type="url"
                inputMode="url"
                spellCheck={false}
                placeholder={copy.PLACEHOLDER_SITE}
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
              />
            </label>
            <p className="ws-note" style={{ marginTop: 10 }}>
              {copy.SITE_NOTE}
            </p>
          </div>

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button type="submit" className="ws-run" disabled={!ready}>
              {copy.BUTTON}
            </button>
            <span className="ws-mono-quiet" style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "normal" }}>
                <span>{copy.SAMPLES_LEAD}</span>
                {copy.SAMPLES.map((sample, index) => (
                  <span key={sample.file} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {index > 0 ? <span aria-hidden="true">-</span> : null}
                    <button
                      type="button"
                      className="ws-quiet"
                      style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}
                      onClick={() => {
                        setSourceUrl(`${SAMPLE_BASE}/${sample.file}`);
                        setPhase({ at: "idle" });
                      }}
                    >
                      {sample.label}
                    </button>
                  </span>
                ))}
            </span>
            <span className="ws-mono-quiet" style={{ marginLeft: "auto" }}>
              {ready ? "or press cmd + enter" : "nothing to review yet"}
            </span>
          </div>

          {!SAMPLES_ARE_REACHABLE ? (
            <p className="ws-note">{copy.SAMPLES_UNREACHABLE}</p>
          ) : null}
        </form>
      ) : null}

      {/* ---------------- what happens next --------------------------- */}
      {phase.at === "idle" ? (
        <div className="ws-cards">
          {copy.HOW_CARDS.map((card) => (
            <div key={card.kicker}>
              <div className="ws-kicker">{card.kicker}</div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, color: "var(--ai2)" }}>
                {card.body}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ---------------- running ------------------------------------- */}
      {phase.at === "preparing" ? <PreparingPanel /> : null}
      {/* `sending` is the stage where the wallet is holding the signature
          request, so it belongs with signing rather than with the run: the
          transaction does not exist until it is signed. */}
      {awaitingSignature ? <SigningPanel /> : null}
      {phase.at === "working" && phase.stage !== "sending" ? (
        <RunningPanel stage={phase.stage} />
      ) : null}

      {/* ---------------- the gate ------------------------------------ */}
      <div ref={resultRef}>
        {gate && !awaitingSignature ? (
          <div className="ws-panel">
            <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
              The gate
            </div>
            <div className="ws-rowlist">
              {gate.rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "11px 0",
                  }}
                >
                  <span aria-hidden="true" style={{ color: row.passed ? "var(--ag)" : "var(--afail)" }}>
                    {row.passed ? "✓" : "✗"}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--ai2)" }}>
                    {row.name.toLowerCase()}
                    <span className="sr-only">{row.passed ? ", passed" : ", missing"}</span>
                  </span>
                  <span className="ws-mono-quiet">{row.required ? "REQ" : ""}</span>
                </div>
              ))}
            </div>
            <div
              className="mono"
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--al)",
                fontSize: 11.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: gate.eligible ? "var(--ag)" : "var(--afail)",
              }}
            >
              {gate.eligible
                ? `eligible, ${gate.passed} of ${gate.total} present`
                : `refused at the gate, missing ${fmt.ids(gate.missing)}`}
            </div>

            {/*
              WITHOUT THIS LINE, "eligible, 6 of 6 present" reads as a verdict.
              It is not one. The gate looks for six strings and finds them, and
              a comment containing the word `gl.nondet` passes it just as well
              as real code does. Someone who runs this and sees a row of ticks
              appear instantly, before any wallet or transaction, is entitled
              to think a score just happened, and the asymmetry has to be on
              the screen where the check runs rather than only on the landing.
            */}
            <p
              style={{
                margin: "12px 0 0",
                maxWidth: "62ch",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--am)",
              }}
            >
              {gate.eligible ? copy.GATE_PASSED_MEANS : copy.GATE_FAILED_MEANS}
            </p>

            {/* Only where a submission is still ahead: after a report exists,
                or a refusal, this would be describing something that already
                happened. */}
            {gate.eligible && (phase.at === "gated" || phase.at === "refused") ? (
              <p
                style={{
                  margin: "10px 0 0",
                  maxWidth: "62ch",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--ai2)",
                }}
              >
                {copy.SUBMIT_MEANS}
              </p>
            ) : null}
          </div>
        ) : null}

        {phase.at === "refused" ? (
          <div className="ws-panel" data-tone="fail" role="alert">
            <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--afail)" }}>
              Not submitted
            </div>
            <p style={{ margin: "14px 0 0", maxWidth: "58ch", fontSize: 14.5, lineHeight: 1.62, color: "var(--ai2)" }}>
              {phase.why}
            </p>
            {/*
              "Connect a wallet to submit" with nothing to click is a dead end.
              This is the only refusal with a next step, so it is the only one
              that gets a button: everything else here is the gate saying no,
              and the fix for that is a different contract, not another press.
            */}
            {!wallet.address && wallet.available ? (
              <button
                type="button"
                className="ws-run"
                style={{ marginTop: 18 }}
                disabled={wallet.connecting}
                onClick={() => void submit()}
              >
                {wallet.connecting ? copy.CONNECTING : copy.CONNECT_AND_SUBMIT}
              </button>
            ) : null}
          </div>
        ) : null}

        {phase.at === "unreadable" ? (
          <div className="ws-panel">
            <p style={{ margin: 0, maxWidth: "58ch", fontSize: 14.5, lineHeight: 1.62, color: "var(--ai2)" }}>
              {phase.why}
            </p>
          </div>
        ) : null}

        {phase.at === "already" ? (
          <div className="ws-panel">
            <p style={{ margin: 0, maxWidth: "58ch", fontSize: 14.5, lineHeight: 1.62, color: "var(--ai2)" }}>
              This exact source was already reviewed, see{" "}
              <Link href={`/r/${phase.reportId}`} style={{ color: "var(--ag)" }}>
                report {phase.reportId}
              </Link>
              .
            </p>
          </div>
        ) : null}

        {phase.at === "split" ? <SplitPanel why={phase.why} criterion={phase.criterion} /> : null}

        {phase.at === "scored" ? (
          <ReportPanel
            report={phase.report}
            votes={phase.votes}
            provisional={phase.provisional}
            names={names}
          />
        ) : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------ */

const STAGE_ORDER: Stage[] = ["sending", "sent", "fetching", "scoring", "accepted", "finalized"];

/**
 * The design's five-row stage list, driven by the real transaction.
 *
 * The six stages a write reports collapse to five rows, because `accepted` and
 * `finalized` are the same row from a reader's point of view: the report is
 * being written either way, and the difference between them is whether it can
 * still be revised, which is said on the report itself where it matters.
 *
 * This is a stage line and not a progress bar. Nothing reports how far into a
 * step consensus is, so nothing here pretends to.
 */
/**
 * The few seconds between the press and the wallet.
 *
 * Fetching the file, running the gate and asking the chain whether these bytes
 * already carry a report is real work over a real network, and it used to
 * happen behind a screen that still looked like a form. The wallet then
 * appeared to pop up on its own, several seconds after the press, with no
 * stated connection to it.
 */
function PreparingPanel() {
  return (
    <div className="ws-panel ws-await">
      <span className="ws-await-ring" aria-hidden="true" />
      <div>
        <div className="ws-await-title">{copy.PREPARING_TITLE}</div>
        <p className="ws-await-note">{copy.PREPARING_NOTE}</p>
      </div>
    </div>
  );
}

/**
 * Waiting on the signature, and showing nothing else.
 *
 * THE GATE RESULT IS DELIBERATELY ABSENT HERE. A row of green ticks and the
 * word ELIGIBLE, on screen while somebody is deciding whether to sign, reads
 * as the verdict -- and the verdict does not exist yet. It appears with the
 * report, where it is one part of a result rather than the whole of one.
 */
function SigningPanel() {
  return (
    <div className="ws-panel" data-tone="gold">
      <div className="ws-await">
        <span className="ws-await-ring" data-gold="true" aria-hidden="true" />
        <div>
          <div className="ws-await-title">{copy.SIGNING_TITLE}</div>
          <p className="ws-await-note">{copy.SIGNING_NOTE}</p>
        </div>
      </div>
    </div>
  );
}

function RunningPanel({ stage }: { stage: Stage }) {
  const at = Math.min(Math.max(STAGE_ORDER.indexOf(stage), 0), 4);
  return (
    <div className="ws-panel" data-tone="gold">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
          {copy.RUN_EYEBROW}
        </div>
        <div className="ws-mono-quiet" style={{ color: "var(--ag)" }} role="status">
          step {at + 1} of {copy.RUN_STAGES.length}
        </div>
      </div>
      <div className="ws-steps">
        {copy.RUN_STAGES.map((text, index) => (
          <div
            key={text}
            className="ws-step"
            data-at={index < at ? "done" : index === at ? "now" : "waiting"}
          >
            <i aria-hidden="true" />
            <span>{text}</span>
          </div>
        ))}
      </div>
      <p className="ws-note">{copy.RUN_NOTE}</p>
    </div>
  );
}

function SplitPanel({ why, criterion }: { why: string; criterion: string }) {
  return (
    <div className="ws-panel" data-tone="fail">
      <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--afail)" }}>
        {copy.APP_HOME_SPLIT_TITLE}
      </div>
      <h2
        style={{
          margin: "14px 0 0",
          maxWidth: "30ch",
          fontSize: "clamp(1.3rem, 2.2vw, 1.75rem)",
          lineHeight: 1.1,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "var(--ai)",
        }}
      >
        Validators did not land on the same marks, so nothing was recorded
      </h2>
      <p style={{ margin: "14px 0 0", maxWidth: "58ch", fontSize: 14.5, lineHeight: 1.62, color: "var(--ai2)" }}>
        {criterion ? copy.nodesDisagreed(criterion) : copy.NODES_DISAGREED_UNNAMED}
      </p>
      {why ? <p className="ws-note">{why}</p> : null}
    </div>
  );
}

function ReportPanel({
  report,
  votes,
  provisional,
  names,
}: {
  report: Report;
  votes: Votes | null;
  provisional: boolean;
  names: Record<string, string>;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      <div className="ws-panel" data-tone="gold">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
            Report {report.id}
            {provisional ? ", accepted and still revisable" : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="ws-ghost"
              onClick={() => {
                if (!navigator.clipboard?.writeText) return;
                void navigator.clipboard
                  .writeText(`${window.location.origin}/r/${report.id}`)
                  .then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  });
              }}
            >
              {copied ? copy.COPY_LINK_DONE : copy.COPY_LINK}
            </button>
            <Link href={`/r/${report.id}`} className="ws-ghost">
              Open the permalink
            </Link>
          </div>
        </div>

        {report.subjects.map((subject, index) => (
          <div key={subject.kind} style={{ marginTop: index === 0 ? 20 : 34 }}>
            <Streak
              score={subject.total}
              kind={subject.kind}
              band={subject.band}
              drawAfterMs={200 + index * 900}
              contested={Boolean(
                report.contest &&
                  subject.marks.some((mark) => mark.id === report.contest?.criterion),
              )}
            />
          </div>
        ))}

        {votes ? (
          <div
            className="mono"
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid var(--al)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ag)",
            }}
          >
            {copy.consensus(votes.agreed, votes.of)}
          </div>
        ) : null}

        <div className="ws-kv">
          <div>
            <span>digest</span>
            <span style={{ overflowWrap: "anywhere" }}>{fmt.digest(report.digest)}</span>
          </div>
          <div>
            <span>rubric</span>
            <span>{report.rubric}</span>
          </div>
          <div>
            <span>gate</span>
            <span>
              {report.gate.passed} of {report.gate.total}
            </span>
          </div>
          <div>
            <span>source</span>
            <span style={{ overflowWrap: "anywhere" }}>{fmt.url(report.source_url, 40)}</span>
          </div>
        </div>

        <p
          className="ws-note"
          style={{ maxWidth: "62ch", marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--al)" }}
        >
          {copy.CARD_2_BODY}
        </p>
      </div>

      {/* Every mark, with the name the contract published for it. */}
      {report.subjects.map((subject) => (
        <div key={subject.kind} className="ws-panel">
          <div className="ws-eyebrow" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
            {subject.kind}, criterion by criterion
          </div>
          <div className="ws-rowlist">
            {subject.marks.map((mark) => (
              <div key={mark.id}>
                <div className="ws-crit">
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--ai)" }}>
                      {names[mark.id] || mark.id}
                    </div>
                    <div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.55, color: "var(--am)" }}>
                      {mark.reason}
                    </div>
                  </div>
                  <div className="ws-pips" aria-hidden="true">
                    <i data-on="true" />
                    <i data-on={mark.score > 0} />
                    <i data-on={mark.score > 1} />
                  </div>
                  <div className="mono" style={{ textAlign: "right", fontSize: 15, color: "var(--ai)" }}>
                    {mark.score}
                  </div>
                </div>
                <span className="sr-only">
                  {mark.id}, {mark.score} out of 2
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
