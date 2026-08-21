/**
 * The landing, from the Nocturne design.
 *
 * Section for section: hero over the slab, the named-model strip, story,
 * consensus, machinery, result, record, close, footer.
 *
 * WHERE THIS DEPARTS FROM THE DESIGN, and why. The mockup fills its result and
 * record panels with a sample - 9/10, report 8812, digest 4f2a91c0, contract
 * 0x71c3 - and climbs its counters to `4 min`, `96.4%` and `148,206`. All of
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
import { allModels, commitment, getPool } from "../lib/validators";

export const revalidate = 60;

/** The list laid end to end `times` over, so one marquee copy outruns a
 *  normal desktop and keeps its designed gap rather than being stretched. */
function repeat<T>(items: T[], times: number): T[] {
  return Array.from({ length: times }, () => items).flat();
}

export default async function LandingPage() {
  const [rubric, stats, pool] = await Promise.all([getRubric(), getStats(), getPool()]);
  const newest = await getNewestReport(stats);
  const unreachable = IS_LIVE && stats === null;

  const contractCriteria = rubric?.subjects.find((s) => s.kind === "contract")?.criteria ?? [];

  /* Every criterion the rubric actually publishes, rather than subjects x 5.
     The multiplication was right only because both subjects happen to carry
     five, and would have quietly lied the first time one of them did not. */
  const criteriaCount = rubric
    ? rubric.subjects.reduce((total, subject) => total + subject.criteria.length, 0)
    : null;

  const poolSize = pool ? pool.validators.length : null;
  const models = pool ? allModels(pool) : [];
  const counts = pool ? commitment(pool) : { named: 0, routed: 0 };
  const routed = counts.routed;
  const agreement = rubric?.agreement ?? null;

  const counters: Counter[] = [
    {
      value: stats ? stats.reports : null,
      label: stats && stats.reports === 1 ? copy.COUNTER_REPORTS_ONE : copy.COUNTER_REPORTS,
    },
    { value: criteriaCount, label: copy.COUNTER_CRITERIA },
    { value: 0, label: copy.COUNTER_REFUSAL },
    /* The pool the app is really talking to, read with the same call the
       Validators screen uses, so the two can never disagree. */
    { value: poolSize, label: copy.COUNTER_POOL },
  ];

  return (
    <>
      <div className="rail" aria-hidden="true">
        <span />
      </div>

      <Hero counters={counters} />

      {/* ---------------- the models the pool commits to -------------------
          This was a scrolling marquee of twelve "model families", which was
          wrong twice over. Sixteen of the twenty nodes carry `policy:prd-...`,
          a ROUTING POLICY that picks among two or three families per call --
          so a chip reading "Grok" stood for a node that may well have run
          GPT-5.4, and the strip was asserting a diversity nobody published.

          Only the four nodes that name a concrete model are represented here.
          That is a short list, so it is set large and still rather than
          padded out and slid past.                                          */}
      {/* ---------------- the model strip ---------------------------------
          Every model the pool can draw on, read from the chain: the four nodes
          that name one, plus every candidate family inside the sixteen routing
          policies. Nothing here is a family this page inferred -- an earlier
          version collapsed `policy:prd-grok` to "Grok", which stood for a node
          that may well have run GPT-5.4.                                     */}
      {models.length ? (
        <div className="pool-strip">
          <div className="eyebrow" style={{ textAlign: "center" }}>
            {copy.POOL_LABEL}
          </div>
          <div className="marquee" aria-hidden="true">
            {[0, 1].map((copyIndex) => (
              <div key={copyIndex} className="marquee-copy">
                {repeat(models, 2).map((name, i) => (
                  <span key={`${name}-${i}`} className="model-chip">
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {/* The names are readable to a screen reader here rather than in the
              duplicated, animated strip above. */}
          <p className="pool-foot">
            <span className="sr-only">{models.join(", ")}. </span>
            {copy.poolFoot(routed, counts.named)}
          </p>
        </div>
      ) : null}

      {/* ---------------- story ------------------------------------------ */}
      <section id="story" className="shell section on-view">
        <div className="split">
          <div>
            <div className="eyebrow">{copy.HOW_EYEBROW}</div>
            {/* Heading and lede were the wrong way round here: the section's
                sentence-long lede was set as the h2 and its four-word heading
                as the lede, so the eye landed on the smallest line. */}
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "22ch" }}>
              {copy.HOW_HEADING}
            </h2>
            <p className="lede" style={{ marginTop: 16, maxWidth: "40ch" }}>
              {copy.HOW_LEDE}
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
              {copy.consensusHeading(poolSize)}
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

          {/*
            WHAT USED TO BE HERE: five cards labelled node 01 to node 05, each
            showing a large question mark over an empty bar. They came from the
            design, where each held a 9. We cannot hold a 9 -- a validator's
            vote under Optimistic Democracy is one bit, so no per-node mark
            exists to read -- and five question marks in a row told the reader
            nothing at all while occupying the middle of the page.

            What goes there instead is the thing the heading above just claimed:
            the rule the contract publishes for what "agree" means. It is read
            from the chain, it was fixed by the deploying transaction, and it is
            the one part of this mechanism a reader most needs in order to
            believe the sentence next to it.
          */}
          {agreement ? (
            <div className="card">
              <div className="eyebrow">{copy.AGREEMENT_EYEBROW}</div>
              <ul
                style={{
                  margin: "18px 0 0",
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gap: 14,
                }}
              >
                {[
                  copy.agreementGap(
                    agreement.max_point_gap,
                    agreement.max_divergent_criteria,
                  ),
                  ...(agreement.band_must_match ? [copy.AGREEMENT_BAND] : []),
                  ...(agreement.reasons_compared ? [] : [copy.AGREEMENT_REASONS]),
                  copy.agreementCounted(
                    agreement.counted_criteria.length,
                    agreement.judged_criteria.length,
                  ),
                ].map((line) => (
                  <li
                    key={line}
                    style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 12 }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        marginTop: 7,
                        width: 10,
                        height: 2,
                        borderRadius: 2,
                        background: "var(--gold)",
                      }}
                    />
                    <span className="body" style={{ fontSize: 14 }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className="mono"
                style={{
                  margin: "20px 0 0",
                  paddingTop: 16,
                  borderTop: "1px solid var(--line)",
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  color: "var(--dim)",
                }}
              >
                {copy.AGREEMENT_NOTE}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---------------- machinery -------------------------------------- */}
      <Machinery criteria={contractCriteria} stats={stats} />

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
          <a className="btn btn-glow" href="/app/connect" style={{ fontSize: 14.5, padding: "14px 30px" }}>
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
              <a href="/app/connect">Launch the dApp</a>
              <a href="/#story">Story</a>
              <a href="/#record">Reports</a>
            </div>
          </div>
          <div>
            {/* The design's footer calls this column "Standard"; the contract
                publishes it as `rubric` and the route is /rubric, so the
                product uses one word for it throughout. */}
            <div className="eyebrow">Rubric</div>
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
