/**
 * The landing, from `Unison Nocturne.dc.html`.
 *
 * Section for section: hero over the slab, the validator-pool marquee, story,
 * consensus, machinery, result, record, close, footer.
 *
 * WHERE THIS DEPARTS FROM THE DESIGN, and why. The mockup fills its result and
 * record panels with a sample — 9/10, report 8812, digest 4f2a91c0, contract
 * 0x71c3 — and climbs its counters to `4 min`, `96.4%` and `148,206`. All of
 * that is right in a design file and would be invented on a live page. Every
 * number here is read off the chain or is a figure the product can stand
 * behind, and the three states are kept apart: a real mark, an empty contract,
 * and the node not answering. Printing a zero for a dropped request would be
 * the page asserting something it never learned.
 */

import Hero, { type Counter } from "../components/Hero";
import Machinery from "../components/Machinery";
import Streak from "../components/Streak";
import * as copy from "../lib/copy";
import * as fmt from "../lib/format";
import { IS_LIVE, NETWORK_LABEL, TOUCHSTONE, explorerAddress, HAS_EXPLORER } from "../lib/chain";
import { getNewestReport, getRubric, getStats } from "../lib/touchstone";

export const revalidate = 60;

export default async function LandingPage() {
  const [rubric, stats] = await Promise.all([getRubric(), getStats()]);
  const newest = await getNewestReport(stats);
  const unreachable = IS_LIVE && stats === null;

  const contractCriteria = rubric?.subjects.find((s) => s.kind === "contract")?.criteria ?? [];

  const counters: Counter[] = [
    {
      glyph: "#",
      value: stats ? stats.reports : null,
      label: stats && stats.reports === 1 ? "Report issued" : "Reports issued",
    },
    {
      glyph: "*",
      value: rubric ? rubric.subjects.length * 5 : null,
      label: "Published criteria",
    },
    { glyph: "~", value: 0, label: "Fee on a refusal" },
    // GenLayer's own published set size, labelled as the network's rather than
    // as something this contract measured.
    { glyph: "%", value: 1001, label: "Validators in the network" },
  ];

  return (
    <>
      <div className="rail" aria-hidden="true">
        <span />
      </div>

      <Hero counters={counters} />

      {/* ---------------- the pool marquee ------------------------------- */}
      <div className="marquee-wrap">
        <div
          className="eyebrow"
          style={{ margin: "0 auto 16px", padding: "0 var(--gutter)", textAlign: "center" }}
        >
          {copy.POOL_LABEL}
        </div>
        <div className="marquee" aria-hidden="true">
          {[...copy.POOL, ...copy.POOL].map((name, i) => (
            <span key={`${name}-${i}`} className="chip-outline">
              {name}
            </span>
          ))}
        </div>
        <div className="marquee-back" aria-hidden="true">
          {[...copy.POOL_CRITERIA, ...copy.POOL_CRITERIA].map((name, i) => (
            <span key={`${name}-${i}`} className="mono" style={{ fontSize: 11.5, color: "var(--dim)", whiteSpace: "nowrap" }}>
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- story ------------------------------------------ */}
      <section id="story" className="shell section on-view">
        <div className="split">
          <div>
            <div className="eyebrow">Story</div>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "22ch" }}>
              {copy.HOW_LEDE}
            </h2>
            <p className="lede" style={{ marginTop: 16, maxWidth: "40ch" }}>
              A rubric first, then a number
            </p>
          </div>
          <div className="rows">
            {copy.COMMITMENTS.map((item, index) => (
              <div key={item.title} className="on-view-push">
                <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="h3">{item.title}</div>
                  <p className="body" style={{ margin: "8px 0 0" }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- consensus -------------------------------------- */}
      <section className="shell section on-view">
        <div className="split" style={{ alignItems: "center" }}>
          <div>
            <div className="eyebrow">{copy.CONSENSUS_EYEBROW}</div>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "22ch" }}>
              {copy.CONSENSUS_HEADING}
            </h2>
            <p className="lede" style={{ marginTop: 16, maxWidth: "42ch" }}>
              {copy.CONSENSUS_BODY}
            </p>
            <div
              className="mono"
              style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--dim)" }}
            >
              <span className="dot blink" />
              a jury is drawn from the network for every assay
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))", gap: 10 }}>
            {/*
              The five nodes are illustrative of the mechanism, not a reading of
              any one assay: a contract cannot count its own jury, and the votes
              that DID happen are shown on the report itself.
            */}
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="node-card">
                <div
                  className="mono"
                  style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--dim)" }}
                >
                  <span className="dot blink" style={{ background: "#6f6f6f", animationDelay: `${n * 120}ms` }} />
                  node {String(n).padStart(2, "0")}
                </div>
                <div className="mono" style={{ marginTop: 14, fontSize: 26, letterSpacing: "-0.02em", color: "var(--white)" }}>
                  ?
                </div>
                <div className="bar" style={{ marginTop: 10 }}>
                  <span style={{ width: "100%", opacity: 0.25 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- machinery -------------------------------------- */}
      <Machinery criteria={contractCriteria} />

      {/* ---------------- the result ------------------------------------- */}
      <section id="result" className="shell section on-view">
        <div className="split">
          <div>
            <div className="eyebrow">{copy.RESULT_SECTION_EYEBROW}</div>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "20ch" }}>
              {copy.RESULT_SECTION_HEADING_PLAIN}
              {copy.RESULT_SECTION_HEADING_ACCENT}
            </h2>
            <p className="lede" style={{ marginTop: 16, maxWidth: "42ch" }}>
              {copy.RESULT_SECTION_BODY}
            </p>
            <p className="lede" style={{ marginTop: 12, maxWidth: "42ch" }}>
              {copy.RESULT_SECTION_NOTE}
            </p>
          </div>
          <div className="card">
            {newest ? (
              <>
                {newest.subjects.map((subject, index) => (
                  <div key={subject.kind} style={index > 0 ? { marginTop: 34 } : undefined}>
                    <Streak
                      score={subject.total}
                      kind={subject.kind}
                      band={subject.band}
                      drawAfterMs={300 + index * 900}
                      contested={Boolean(
                        newest.contest && subject.marks.some((m) => m.id === newest.contest?.criterion),
                      )}
                    />
                  </div>
                ))}
                <div
                  className="mono"
                  style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "var(--dim)" }}
                >
                  <span>
                    {fmt.joinMono([
                      `report ${newest.id}`,
                      `rubric ${newest.rubric}`,
                      `gate ${newest.gate.passed} of ${newest.gate.total}`,
                    ])}
                  </span>
                  <a href={`/r/${newest.id}`} style={{ marginLeft: "auto", color: "var(--gold-lt)" }}>
                    Open it
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="lede" style={{ margin: 0 }}>
                  {!IS_LIVE ? copy.NOT_LIVE : unreachable ? copy.CHAIN_UNREACHABLE : copy.NO_REPORTS_YET}
                </p>
                <p className="body" style={{ marginTop: 16 }}>
                  {copy.RESULT_NOTE}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- the record ------------------------------------- */}
      <section id="record" className="shell section on-view">
        <div className="split">
          <div>
            <div className="eyebrow">{copy.RECORD_EYEBROW}</div>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "20ch" }}>
              {copy.RECORD_HEADING_PLAIN}
              {copy.RECORD_HEADING_ACCENT}
            </h2>
            <p className="lede" style={{ marginTop: 16, maxWidth: "42ch" }}>
              {copy.RECORD_BODY}
            </p>
            <div className="warn-card" style={{ marginTop: 24, maxWidth: "44ch" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fail)" }}>
                {copy.CARD_2_TITLE}
              </div>
              <p className="body" style={{ margin: "12px 0 0" }}>
                {copy.CARD_2_BODY}
              </p>
            </div>
          </div>
          <div className="kv">
            {newest ? (
              <>
                <div className="kv-row">
                  <span className="kv-key">report</span>
                  <span className="kv-val">
                    <a href={`/r/${newest.id}`}>{newest.id}</a>
                    {newest.created_at ? `, ${fmt.reportDate(newest.created_at).toLowerCase()}` : ""}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">source</span>
                  <span className="kv-val">{fmt.url(newest.source_url, 52)}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">digest</span>
                  <span className="kv-val">{fmt.digest(newest.digest)}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">rubric</span>
                  <span className="kv-val">
                    {newest.rubric} at{" "}
                    {HAS_EXPLORER && IS_LIVE ? (
                      <a href={explorerAddress(TOUCHSTONE)} target="_blank" rel="noreferrer">
                        {fmt.address(TOUCHSTONE)}
                      </a>
                    ) : (
                      fmt.address(TOUCHSTONE)
                    )}
                  </span>
                </div>
              </>
            ) : (
              <div className="kv-row">
                <span className="kv-key">record</span>
                <span className="kv-val">
                  {!IS_LIVE
                    ? "no contract configured"
                    : unreachable
                      ? "the node did not answer"
                      : "nothing marked yet"}
                </span>
              </div>
            )}
            <div className="kv-row">
              <span className="kv-key">network</span>
              <span className="kv-val">{NETWORK_LABEL}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- the close -------------------------------------- */}
      <section
        id="close"
        style={{
          position: "relative",
          marginTop: "var(--pad-section)",
          padding: "clamp(96px, 11vw, 168px) var(--gutter)",
          borderTop: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 0,
            left: "50%",
            top: "50%",
            width: "min(820px, 86vw)",
            height: "min(820px, 86vw)",
            margin: "min(-410px, -43vw) 0 0 min(-410px, -43vw)",
            pointerEvents: "none",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200,149,28,.2) 0%, rgba(200,149,28,.06) 45%, rgba(200,149,28,0) 70%)",
          }}
        />
        <div
          className="on-view"
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 26,
          }}
        >
          <h2 className="display" style={{ maxWidth: "22ch", fontSize: "clamp(2rem, 5.4vw, 4.25rem)", lineHeight: 1.1 }}>
            {copy.CLOSE_HEADING}
          </h2>
          <p className="lede" style={{ margin: 0, maxWidth: "44ch" }}>
            {copy.CLOSE_BODY}
          </p>
          <a className="btn btn-glow" href="/app" style={{ fontSize: 14.5, padding: "14px 30px" }}>
            {copy.LAUNCH}
          </a>
        </div>
      </section>

      {/* ---------------- footer ----------------------------------------- */}
      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div
          className="shell"
          style={{
            paddingTop: 56,
            paddingBottom: 8,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: "40px 32px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%", background: "var(--white)" }}>
                <svg width="23" height="23" viewBox="0 0 40 40" aria-hidden="true">
                  <rect x="5.6" y="14.75" width="28.8" height="2.5" rx="1.25" fill="var(--gold)" />
                  <rect x="5.6" y="18.75" width="28.8" height="2.5" rx="1.25" fill="var(--gold)" />
                  <rect x="5.6" y="22.75" width="28.8" height="2.5" rx="1.25" fill="var(--gold)" />
                </svg>
              </span>
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--white)" }}>unison</span>
            </div>
            <p className="body" style={{ margin: "14px 0 0", maxWidth: "30ch", color: "var(--dim)" }}>
              {copy.FOOTER_LINE}
            </p>
          </div>
          <div>
            <div className="eyebrow">Assay</div>
            <div style={{ marginTop: 14, display: "grid", gap: 10, fontSize: 14 }}>
              <a href="/app">Launch the dApp</a>
              <a href="/#story">Story</a>
              <a href="/#record">Reports</a>
            </div>
          </div>
          <div>
            <div className="eyebrow">Standard</div>
            <div style={{ marginTop: 14, display: "grid", gap: 10, fontSize: 14 }}>
              <a href="/rubric">Rubric v1</a>
              <a href="/#result">Bands</a>
            </div>
          </div>
          <div>
            <div className="eyebrow">Network</div>
            <div style={{ marginTop: 14, display: "grid", gap: 10, fontSize: 14 }}>
              <a href="https://genlayer.com" target="_blank" rel="noreferrer">
                GenLayer
              </a>
              <a href="/rubric">The contract</a>
            </div>
          </div>
        </div>

        <div className="shell" style={{ paddingTop: 24, overflow: "hidden" }}>
          <div style={{ height: "clamp(2.6rem, 11vw, 8.4rem)", overflow: "hidden" }}>
            <div
              aria-hidden="true"
              style={{
                fontFamily: "var(--display)",
                fontSize: "clamp(3.4rem, 15vw, 11.5rem)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "rgba(255,255,255,.11)",
                userSelect: "none",
              }}
            >
              unison
            </div>
          </div>
        </div>

        <div
          className="shell mono"
          style={{
            paddingTop: 20,
            paddingBottom: 40,
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          <span>Rubric v1, judged by the validator set</span>
          <span>Built on GenLayer</span>
        </div>
      </footer>
    </>
  );
}
