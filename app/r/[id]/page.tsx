/**
 * Screen 5. The report permalink.
 *
 * The one job of this page: be worth handing to somebody else. So everything
 * needed to check it independently is on it -- the source url, the digest, the
 * rubric version, the contract address and the network -- and all of it is read
 * back from the chain rather than passed through a link.
 *
 * A report is immutable once issued. A contest is held in a separate map on the
 * contract and merged in when read, so the score stands, the streak is drawn
 * unchanged, and the dispute is recorded beside it.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import SiteHeader from "../../../components/SiteHeader";
import Streak from "../../../components/Streak";
import { MarksTable } from "../../../components/Marks";
import CopyLink from "./CopyLink";
import Appeal from "./Appeal";
import * as copy from "../../../lib/copy";
import * as fmt from "../../../lib/format";
import {
  IS_LIVE,
  NETWORK_LABEL,
  CONTRACT,
  explorerAddress,
  HAS_EXPLORER,
} from "../../../lib/chain";
import { getReport, getRubric } from "../../../lib/unison";

export const revalidate = 30;

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = Number(params.id);
  const report = Number.isFinite(id) ? await getReport(id) : null;
  if (!report) return { title: "Report not found - Unison" };

  const contract = report.subjects.find((s) => s.kind === "contract");
  const headline = contract ? `${fmt.score(contract.total)} ${contract.band}` : "report";
  return {
    title: `Report ${report.id} - ${headline} - Unison`,
    description: `${fmt.url(report.source_url)} - judged against rubric ${report.rubric} by the network's own validators.`,
  };
}

export default async function ReportPage({ params }: Params) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [report, rubric] = await Promise.all([getReport(id), getRubric()]);

  if (!IS_LIVE) {
    return (
      <section className="shell section">
        <h1 className="h2">
          Report {params.id}
        </h1>
        <p className="notice">{copy.NOT_LIVE}</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="shell section">
        <p className="eyebrow">Report {params.id}</p>
        <h1 className="h2">
          No report {params.id}
        </h1>
        <p className="lede" style={{ marginTop: 22, maxWidth: "60ch" }}>
          The contract holds no report with that id. Report ids start at 8801 and
          are issued in order, so a gap means the assay did not settle rather
          than that a report was removed.
        </p>
        <div className="actions" style={{ marginTop: 32 }}>
          <a className="btn btn-quiet" href="/">
            Read a streak
          </a>
          <a className="btn btn-quiet" href="/rubric">
            {copy.ACTION_READ_RUBRIC}
          </a>
        </div>
      </section>
    );
  }

  const names: Record<string, string> = {};
  for (const subject of rubric?.subjects ?? []) {
    for (const criterion of subject.criteria) names[criterion.id] = criterion.name;
  }

  const contest = report.contest;
  const contested = contest?.criterion;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "clamp(16px, 2.4vh, 28px) clamp(14px, 3vw, 32px) 0",
        }}
      >
        <SiteHeader current="Reports" />
      </div>
      <section className="shell section" style={{ paddingBottom: 96 }}>
      <div className="kv" style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", paddingBottom: 16 }}>
        <span>
          {fmt.joinMono([
            `report ${report.id}`,
            fmt.reportDate(report.created_at),
            // A report read back from the chain is on the chain, so it is past
            // acceptance. Finality is a property of the transaction that wrote
            // it, and the assay screen is where the provisional state is shown.
            "finalized",
          ])}
        </span>
        <span className="dim">rubric {report.rubric}</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {report.subjects.map((subject, index) => (
          <div key={subject.kind} style={index > 0 ? { marginTop: 44 } : undefined}>
            <Streak
              score={subject.total}
              kind={subject.kind}
              band={subject.band}
              drawAfterMs={index === 0 ? 300 : 1500}
              /*
               * Only the subject that actually carries the disputed criterion.
               * A contract criterion under dispute says nothing about the site's
               * mark, and marking both would assert a dispute that was never
               * made -- on the one screen built to be handed to somebody else.
               */
              contested={Boolean(
                contested && subject.marks.some((m) => m.id === contested),
              )}
            />
          </div>
        ))}
      </div>

      {contest ? (
        <p className="body" style={{ marginTop: 16 }}>
          {copy.contested(contest)}
        </p>
      ) : null}

      <div className="kv" style={{ marginTop: 32 }}>
        <div className="kv-row">
          <span className="kv-key">source</span>
          <span className="kv-val">
            <a href={report.source_url} target="_blank" rel="noreferrer">
              {fmt.url(report.source_url, 64)}
            </a>
          </span>
        </div>
        {/* Whether the url above can be followed back to these bytes. The
            digest is the identity and never moves; a branch does, so a reader
            is told which kind of citation they are holding. */}
        {report.revision ? (
          <div className="kv-row">
            <span className="kv-key">revision</span>
            <span className="kv-val">
              {copy.revisionNote(report.revision, report.revision_ref ?? "")}
            </span>
          </div>
        ) : null}
        <div className="kv-row">
          <span className="kv-key">digest</span>
          <span className="kv-val">{fmt.digest(report.digest)}</span>
        </div>
        {report.site_url ? (
          <div className="kv-row">
            <span className="kv-key">site</span>
            <span className="kv-val">
              <a href={report.site_url} target="_blank" rel="noreferrer">
                {fmt.url(report.site_url, 64)}
              </a>
            </span>
          </div>
        ) : null}
        <div className="kv-row">
          <span className="kv-key">gate</span>
          <span className="kv-val">
            {fmt.consensus(report.gate.passed, report.gate.total)} present
          </span>
        </div>
        <div className="kv-row">
          <span className="kv-key">contract</span>
          <span className="kv-val">
            {HAS_EXPLORER ? (
              <a href={explorerAddress(CONTRACT)} target="_blank" rel="noreferrer">
                {fmt.address(CONTRACT)}
              </a>
            ) : (
              fmt.address(CONTRACT)
            )}{" "}
            <span className="dim"> - {NETWORK_LABEL}</span>
          </span>
        </div>
      </div>

      {report.subjects.map((subject) => (
        <MarksTable key={subject.kind} subject={subject} names={names} />
      ))}

      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
        <div className="card-sm">
          <p className="eyebrow-gold" style={{ margin: "0 0 10px" }}>{copy.CARD_1_TITLE}</p>
          <p className="body" style={{ margin: 0 }}>{copy.CARD_1_BODY}</p>
        </div>
        <div className="warn-card">
          <p className="eyebrow-gold" style={{ margin: "0 0 10px" }}>{copy.CARD_2_TITLE}</p>
          <p className="body" style={{ margin: 0 }}>{copy.CARD_2_BODY}</p>
        </div>
      </div>

      {/*
        The appeal, on the page it is about.

        `contest` was reachable only by cloning the repository and running a
        node script, which is recourse a contract author never finds. The
        criteria offered are the ones this report actually carries a mark for,
        so nothing here can ask the chain a question about a criterion that is
        not on it.
      */}
      <Appeal
        id={report.id}
        criteria={report.subjects.flatMap((subject) => subject.marks.map((m) => m.id))}
        names={names}
        alreadyContested={report.contest?.outcome === "superseded"}
      />

      <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <CopyLink id={report.id} />
        <a className="btn btn-quiet" href="/rubric">
          {copy.ACTION_READ_RUBRIC}
        </a>
        <a className="btn btn-quiet" href="/app/connect">
          Run another
        </a>
      </div>
      </section>
    </>
  );
}
