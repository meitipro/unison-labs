"use client";

/**
 * The dApp: sidebar, source, and everything a submission turns into.
 *
 * The design's `New assay` screen, wired to the real thing. Two inputs rather
 * than one, because they do different jobs and the design's single paste box
 * cannot do the second:
 *
 *   a raw file URL  the validators fetch it themselves, agree on the bytes and
 *                   mark it. This is what produces a report.
 *   pasted source   runs the gate here, free, and stops. A mark has to be
 *                   checkable by every validator, and text in this browser is
 *                   reachable by none of them, so pasting cannot be marked.
 *                   Said on the screen rather than discovered.
 *
 * WHAT RUNS WHERE, for the URL path: this browser fetches the source, runs the
 * published gate, hashes it and asks the chain whether those exact bytes
 * already hold a report — all free, and a refusal stops there. Only then does
 * anything ask for a signature.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import Mark from "./Mark";
import Streak from "./Streak";
import WalletButton from "./WalletButton";
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
import { getGateSpec, getReportByDigest, getSplitForDigest } from "../lib/touchstone";
import { useWallet } from "../lib/wallet";
import { readableError } from "../lib/voice";
import { assay, type Outcome, type Stage, type Votes } from "../lib/writes";
import type { Report } from "../lib/types";

type Mode = "url" | "paste";

type Phase =
  | { at: "idle" }
  | { at: "gated"; gate: GateResult }
  | { at: "unreadable"; why: string }
  | { at: "working"; gate: GateResult; stage: Stage }
  | { at: "already"; gate: GateResult; reportId: number }
  | { at: "split"; gate: GateResult; why: string; criterion: string }
  | { at: "refused"; gate: GateResult | null; why: string }
  | { at: "scored"; gate: GateResult; report: Report; votes: Votes | null; provisional: boolean };

export default function AppConsole({ names }: { names: Record<string, string> }) {
  const wallet = useWallet();
  const [mode, setMode] = useState<Mode>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [pasted, setPasted] = useState("");
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

  const busy = phase.at === "working";

  const submit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();

      /* ---- paste: the gate, free, and no transaction ------------------- */
      if (mode === "paste") {
        const text = pasted.trim();
        if (!text) {
          setPhase({ at: "refused", gate: null, why: copy.EMPTY_SUBMIT });
          return;
        }
        setPhase({ at: "gated", gate: runGate(text, spec) });
        return;
      }

      /* ---- url: the whole thing ---------------------------------------- */
      const url = sourceUrl.trim();
      if (!url) {
        setPhase({ at: "refused", gate: null, why: copy.EMPTY_SUBMIT });
        return;
      }

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
      // the whole screen behind a wallet: the gate above was free and useful.
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
        outcome = await assay(account, url, siteUrl.trim(), (stage) =>
          setPhase((current) => (current.at === "working" ? { ...current, stage } : current)),
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
    [mode, pasted, sourceUrl, siteUrl, spec, wallet],
  );

  const gate = "gate" in phase ? phase.gate : null;

  return (
    <div className="app">
      {/* ---------------- sidebar ---------------------------------------- */}
      <aside className="app-aside">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: "50%", background: "var(--white)" }}>
            <Mark size={34} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--white)" }}>unison</span>
          <span className="tag" style={{ marginLeft: "auto", fontSize: 9.5, padding: "3px 8px" }}>
            dapp
          </span>
        </div>

        <nav className="app-nav" aria-label="dApp">
          <span aria-current="page">
            <span className="dot" />
            New assay
          </span>
          <a href="/#record">
            <span className="dot-off" />
            Reports
          </a>
          <a href="/rubric">
            <span className="dot-off" />
            Rubric v1
          </a>
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: 12 }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--dim)" }}>
            Network
          </div>
          <div className="mono" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--dim)" }}>
            <span className="dot blink" />
            genlayer {NETWORK_LABEL}
          </div>
          <a href="/" className="link-quiet" style={{ textAlign: "left" }}>
            ← Back to the site
          </a>
        </div>
      </aside>

      {/* ---------------- main ------------------------------------------- */}
      <main className="app-main">
        <div style={{ maxWidth: 940, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.5rem, 2.4vw, 2rem)", lineHeight: 1.08, fontWeight: 500, letterSpacing: "-0.032em", color: "var(--white)" }}>
                {copy.APP_TITLE}
              </h1>
              <p className="body" style={{ margin: "10px 0 0", maxWidth: "52ch", color: "var(--dim)" }}>
                {copy.APP_LEDE}
              </p>
            </div>
            {/* The design's static address chip, made real. */}
            <WalletButton />
          </div>

          <form className="card-sm" style={{ marginTop: 26 }} onSubmit={submit}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--dim)" }}>
                {copy.APP_SOURCE_LABEL}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  aria-pressed={mode === "url"}
                  onClick={() => setMode("url")}
                  disabled={busy}
                >
                  URL
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  aria-pressed={mode === "paste"}
                  onClick={() => setMode("paste")}
                  disabled={busy}
                >
                  Paste
                </button>
              </div>
            </div>

            {mode === "url" ? (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <label>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--dim)" }}>
                    {copy.APP_URL_LABEL}
                  </span>
                  <input
                    className="app-input"
                    style={{ marginTop: 8 }}
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    placeholder={copy.HERO_PLACEHOLDER}
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--dim)" }}>
                    {copy.APP_SITE_LABEL}
                  </span>
                  <input
                    className="app-input"
                    style={{ marginTop: 8 }}
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    placeholder={copy.PLACEHOLDER_SITE}
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
            ) : (
              <>
                <textarea
                  className="app-textarea"
                  spellCheck={false}
                  aria-label={copy.APP_SOURCE_LABEL}
                  placeholder={copy.APP_PASTE_PLACEHOLDER}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  disabled={busy}
                />
                <p className="body" style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--dim)" }}>
                  {copy.APP_PASTE_NOTE}
                </p>
              </>
            )}

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-glow" disabled={busy} style={{ fontSize: 14, padding: "12px 26px" }}>
                {busy ? "Running" : mode === "paste" ? "Run the gate" : copy.BUTTON}
              </button>
              {mode === "paste" ? (
                <span className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                  {copy.charCount(pasted.length)}
                </span>
              ) : (
                <div className="samples" style={{ gap: 4 }}>
                  <span>{copy.SAMPLES_LEAD}</span>
                  {copy.SAMPLES.map((sample, index) => (
                    <span key={sample.file} className={index > 0 ? "dot-sep" : undefined}>
                      {index > 0 ? <span style={{ margin: "0 6px", color: "var(--dim)" }}>·</span> : null}
                      <button
                        type="button"
                        className="link-quiet"
                        onClick={() => {
                          setSourceUrl(`${SAMPLE_BASE}/${sample.file}`);
                          setPhase({ at: "idle" });
                        }}
                        disabled={busy}
                      >
                        {sample.label}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!SAMPLES_ARE_REACHABLE && mode === "url" ? (
              <p className="notice" style={{ marginTop: 14 }}>
                {copy.SAMPLES_UNREACHABLE}
              </p>
            ) : null}
          </form>

          {/* ---------------- running ------------------------------------ */}
          {phase.at === "working" ? (
            <div className="card-sm" style={{ marginTop: 18, borderColor: "rgba(200,149,28,.28)" }}>
              <div className="mono" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--gold-lt)" }}>
                <span className="spinner" />
                {phase.stage === "scoring" || phase.stage === "accepted" || phase.stage === "finalized"
                  ? copy.STAGE_SCORING
                  : copy.STAGE_FETCHING}
              </div>
              <p className="body" style={{ marginTop: 12, fontSize: 12.5 }}>
                Every validator fetches the source and marks it. Rotations are normal;
                this can take minutes rather than seconds.
              </p>
            </div>
          ) : null}

          {/* ---------------- the gate ----------------------------------- */}
          <div ref={resultRef}>
            {gate ? (
              <div className="card-sm" style={{ marginTop: 18 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--dim)" }}>
                  The gate
                </div>
                <div style={{ marginTop: 14 }}>
                  {gate.rows.map((row) => (
                    <div key={row.id} className="gate-row">
                      <span className={`gate-glyph ${row.passed ? "pass" : "miss"}`} aria-hidden="true">
                        {row.passed ? "✓" : "✗"}
                      </span>
                      <span>
                        {row.name.toLowerCase()}
                        <span className="sr-only">{row.passed ? " — passed" : " — missing"}</span>
                      </span>
                      <span className="gate-req">{row.required ? "REQ" : ""}</span>
                    </div>
                  ))}
                </div>
                <div className={`verdict${gate.eligible ? "" : " bad"}`}>
                  {gate.eligible
                    ? `eligible, ${gate.passed} of ${gate.total} present`
                    : `refused at the gate, missing ${fmt.ids(gate.missing)}`}
                </div>
              </div>
            ) : null}

            {phase.at === "refused" ? (
              <div className="notice warn" style={{ marginTop: 18 }}>
                {phase.why}
              </div>
            ) : null}
            {phase.at === "unreadable" ? (
              <div className="notice" style={{ marginTop: 18 }}>
                {phase.why}
              </div>
            ) : null}
            {phase.at === "already" ? (
              <div className="notice" style={{ marginTop: 18 }}>
                This exact source was already reviewed, see{" "}
                <a href={`/r/${phase.reportId}`} style={{ color: "var(--gold-lt)" }}>
                  report {phase.reportId}
                </a>
                .
              </div>
            ) : null}
            {phase.at === "split" ? (
              <div className="notice" style={{ marginTop: 18, borderLeftColor: "var(--gold)" }}>
                {phase.criterion ? copy.nodesDisagreed(phase.criterion) : copy.NODES_DISAGREED_UNNAMED}
              </div>
            ) : null}
            {phase.at === "gated" && gate?.eligible ? (
              <div className="notice" style={{ marginTop: 18 }}>
                {copy.APP_PASTE_NOTE}
              </div>
            ) : null}
          </div>

          {/* ---------------- the report --------------------------------- */}
          {phase.at === "scored" ? (
            <>
              {phase.provisional ? (
                <div className="mono" style={{ marginTop: 18, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-lt)" }}>
                  accepted, provisional
                </div>
              ) : null}

              <div className="card-sm" style={{ marginTop: 12, padding: 26 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--dim)" }}>
                  Report {phase.report.id}
                </div>
                {phase.report.subjects.map((subject, index) => (
                  <div key={subject.kind} style={{ marginTop: index === 0 ? 18 : 34 }}>
                    <Streak
                      score={subject.total}
                      kind={subject.kind}
                      band={subject.band}
                      drawAfterMs={200 + index * 900}
                      contested={Boolean(
                        phase.report.contest &&
                          subject.marks.some((m) => m.id === phase.report.contest?.criterion),
                      )}
                    />
                  </div>
                ))}

                {phase.votes ? (
                  <div className="mono" style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-lt)" }}>
                    {copy.consensus(phase.votes.agreed, phase.votes.of)}
                  </div>
                ) : null}

                <div className="kv" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "14px 24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 12 }}>
                    <span className="kv-key">digest</span>
                    <span className="kv-val">{fmt.digest(phase.report.digest)}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 12 }}>
                    <span className="kv-key">rubric</span>
                    <span className="kv-val">{phase.report.rubric}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 12 }}>
                    <span className="kv-key">gate</span>
                    <span className="kv-val">
                      {phase.report.gate.passed} of {phase.report.gate.total}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 12 }}>
                    <span className="kv-key">source</span>
                    <span className="kv-val">{fmt.url(phase.report.source_url, 40)}</span>
                  </div>
                </div>

                <p className="body" style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)", fontSize: 13.5, color: "var(--dim)" }}>
                  {copy.CARD_2_BODY}
                </p>

                <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <a className="btn btn-quiet" href={`/r/${phase.report.id}`}>
                    Open the permalink
                  </a>
                  <a className="btn btn-quiet" href="/rubric">
                    {copy.ACTION_READ_RUBRIC}
                  </a>
                </div>
              </div>

              {/* Every mark, with the name the contract published for it. */}
              {phase.report.subjects.map((subject) => (
                <div key={subject.kind} className="card-sm" style={{ marginTop: 12 }}>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--dim)" }}>
                    {subject.kind}
                  </div>
                  {subject.marks.map((mark) => (
                    <div key={mark.id} className="mark-row">
                      <div className="mark-head">
                        <span className="h3">{names[mark.id] || mark.id}</span>
                        <span className="mark-score">{mark.score}</span>
                      </div>
                      <p className="body" style={{ margin: "10px 0 0" }}>
                        {mark.reason}
                      </p>
                      <span className="pips" aria-hidden="true">
                        <span className={`pip${mark.score > 0 ? " on" : ""}`} />
                        <span className={`pip${mark.score > 1 ? " on" : ""}`} />
                      </span>
                      <span className="sr-only">
                        {mark.id}, {mark.score} out of 2
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
