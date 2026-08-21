/**
 * Screen 4. The rubric.
 *
 * This page is the proof. It is linked from every score and from the header,
 * because a product that scores people against a rubric it will not show has no
 * argument, and a standard that is hard to reach is a standard nobody checks.
 *
 * Ten blocks, five for the contract and five for the site, under two headings.
 * NO ACCORDIONS, NO TABS, NOTHING COLLAPSED -- the point of the page is that all
 * of it is visible at once.
 *
 * Everything on it is read from the contract rather than from a copy in this
 * repo. A rubric the site keeps its own copy of is a rubric that can drift away
 * from the one being applied, and then "published before anyone was scored"
 * means nothing.
 */

import type { Metadata } from "next";

import SiteHeader from "../../components/SiteHeader";

import * as copy from "../../lib/copy";
import { IS_LIVE, CONTRACT, explorerAddress, HAS_EXPLORER, NETWORK_LABEL } from "../../lib/chain";
import * as fmt from "../../lib/format";
import { getRubric, getSplitTable, getStats } from "../../lib/unison";

export const metadata: Metadata = {
  title: "The rubric - Unison",
  description:
    "Every score point has an anchor, published before anyone was scored, and read straight from the contract.",
};

// The rubric is frozen at deployment, so a long cache is honest. The split
// table is not, which is why the page revalidates rather than being static.
export const revalidate = 60;

export default async function RubricPage() {
  const [rubric, splits, stats] = await Promise.all([
    getRubric(),
    getSplitTable(),
    getStats(),
  ]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "clamp(16px, 2.4vh, 28px) clamp(14px, 3vw, 32px) 0",
        }}
      >
        <SiteHeader current="Rubric" />
      </div>
      <section className="shell section" style={{ paddingBottom: 96 }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        {copy.RUBRIC_EYEBROW}
      </p>
      <h1 className="h2" style={{ marginTop: 22 }}>
        {copy.RUBRIC_HEADING}
      </h1>
      <p className="lede" style={{ maxWidth: "68ch", marginTop: 22 }}>
        {copy.RUBRIC_LEDE}
      </p>

      {!rubric ? (
        <p className="notice">{copy.NOT_LIVE}</p>
      ) : (
        <>
          <div className="kv" style={{ marginTop: 32 }}>
            <div className="kv-row">
              <span className="kv-key">rubric</span>
              <span className="kv-val">
                {/* "10 criteria - 10 per subject" read as ten criteria in each
                    subject, which would be twenty. Say which side of the
                    subject each figure is on, and count the criteria the
                    rubric actually publishes rather than subjects x 5. */}
                {fmt.joinMono([
                  rubric.version,
                  `${rubric.subjects.reduce((n, s) => n + s.criteria.length, 0)} criteria in all`,
                  `${rubric.subjects[0]?.criteria.length ?? 0} per subject`,
                  `0 to ${rubric.max_score} each`,
                  `${rubric.max_total} points per subject`,
                ])}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-key">contract</span>
              <span className="kv-val">
                {HAS_EXPLORER && IS_LIVE ? (
                  <a href={explorerAddress(CONTRACT)} target="_blank" rel="noreferrer">
                    {CONTRACT}
                  </a>
                ) : (
                  CONTRACT || "not configured"
                )}{" "}
                <span className="dim"> - {NETWORK_LABEL}</span>
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-key">bands</span>
              <span className="kv-val">
                {fmt.joinMono(
                  rubric.bands
                    .slice()
                    .reverse()
                    .map((band) => `${band.floor}+ ${band.name}`),
                )}
              </span>
            </div>
          </div>

          {/*
            The tolerance, published for the same reason the anchors are. This
            one decides whether a report exists at all, and a rule nobody can
            read is worth no more than a standard nobody can read.
          */}
          {rubric.agreement ? (
            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
              <div className="card-sm">
                <p className="eyebrow-gold" style={{ margin: "0 0 10px" }}>What agreement means</p>
                <p className="body" style={{ margin: 0 }}>
                  Two validators mark the same source independently. They count
                  as agreeing when no criterion differs by more than{" "}
                  {rubric.agreement.max_point_gap}, at most{" "}
                  {rubric.agreement.max_divergent_criteria} criterion differs at
                  all, and the band is identical. The total is summed by{" "}
                  {rubric.agreement.summed_by}. The reasons are not compared -
                  two validators reading the same code write the same judgment
                  in different words.
                </p>
              </div>
              {/*
                Said on the page rather than buried in the contract. A criterion
                a count can settle is settled by the count, identically on every
                node, and a submitter is entitled to know which of their marks
                was counted and which was judged.
              */}
              <div className="card-sm">
                <p className="eyebrow-gold" style={{ margin: "0 0 10px" }}>Counted, or judged</p>
                <p className="body" style={{ margin: 0 }}>
                  {rubric.agreement.counted_criteria.length} of these criteria
                  are counted from the source in deterministic code - {" "}
                  {fmt.joinMono(rubric.agreement.counted_criteria)} - so every
                  validator derives the same score and the same reason without
                  asking a model. The rest are judged:{" "}
                  {fmt.joinMono(rubric.agreement.judged_criteria)}. Every mark
                  below says which it is.
                </p>
              </div>
            </div>
          ) : null}

          {rubric.subjects.map((subject) => (
            <div key={subject.kind}>
              <h2 className="h2" style={{ margin: "72px 0 24px" }}>
                {subject.kind === "contract" ? "The contract" : "The site"}
              </h2>
              {subject.criteria.map((criterion) => (
                <div key={criterion.id} style={{ marginBottom: 40 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                    <span className="h3">{criterion.name}</span>
                    <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-lt)", whiteSpace: "nowrap" }}>{criterion.id}</span>
                    {criterion.decided_by ? (
                      <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--dim)", whiteSpace: "nowrap" }}>
                        {criterion.decided_by === "facts" ? "counted" : "judged"}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    {criterion.anchors.map((anchor, score) => (
                      <div className="anchor" key={score}>
                        <span className="anchor-score">{score}</span>
                        <span>{anchor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* ---- the split rate, at the foot of the page ------------------ */}
          <h2 className="h2" style={{ margin: "72px 0 24px" }}>When validators disagree</h2>
          <p className="lede" style={{ maxWidth: "68ch" }}>
            {copy.SPLIT_NOTE_BODY}
          </p>

          {splits && splits.length ? (
            <div className="table-scroll">
              <table className="splits">
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th>Subject</th>
                    <th>Splits</th>
                    <th>Reads as</th>
                  </tr>
                </thead>
                <tbody>
                  {splits.map((row) => (
                    <tr key={`${row.kind}-${row.id}`}>
                      <td>{row.id}</td>
                      <td>{row.kind}</td>
                      {/* A counted criterion has no split count to report, and a
                          0 in this column would read as agreement the network
                          never actually reached. */}
                      <td>{row.reads_as === "counted" ? "-" : row.splits}</td>
                      <td className={row.reads_as === "counted" ? "faint" : undefined}>
                        {row.reads_as === "counted" ? "counted, never judged" : row.reads_as}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="notice">
              Nothing has split yet. A criterion at the top of this table is an
              anchor that needs rewriting, and publishing it is how the rubric
              improves instead of the scores drifting.
            </p>
          )}

          {stats ? (
            <p className="body" style={{ marginTop: 32, color: "var(--dim)" }}>
              {fmt.joinMono([
                `${stats.reports} report${stats.reports === 1 ? "" : "s"}`,
                `${stats.contested} contested`,
                `${stats.splits} split${stats.splits === 1 ? "" : "s"} recorded`,
                `rubric ${stats.rubric}`,
              ])}
            </p>
          ) : null}
        </>
      )}
      </section>
    </>
  );
}
