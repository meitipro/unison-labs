import type { Metadata } from "next";
import Link from "next/link";

import { WorkspaceHeader } from "../../../../components/WorkspaceShell";
import * as copy from "../../../../lib/copy";
import * as fmt from "../../../../lib/format";
import { IS_LIVE, NETWORK_LABEL } from "../../../../lib/chain";
import { getRecentReports, getSplitTable, getStats } from "../../../../lib/unison";

export const metadata: Metadata = {
  title: "Reports - Unison",
  description: "Every report this contract has issued, newest first.",
};

export const revalidate = 60;

/**
 * The design's Reports pane, reading the chain.
 *
 * The mockup lists three: two finalized and one "suspended" at review 8809. A
 * suspended review is not a row this contract can produce -- `assay` either
 * settles and writes a report or the transaction refuses, and nothing is filed
 * under an id in between. What IS recorded is the criterion the network could
 * not settle, so the split table is shown below the reports as its own thing
 * rather than mixed in as a fake report.
 *
 * Three states, kept apart: real reports, an empty contract, and the node not
 * answering. Rendering the third as the second is a claim about the chain that
 * this page has no evidence for.
 */
export default async function ReportsPane() {
  const stats = await getStats();
  const reports = stats ? await getRecentReports(stats, 12) : [];
  const splits = await getSplitTable();
  const contested = splits?.filter((row) => row.splits > 0) ?? [];

  return (
    <>
      <WorkspaceHeader
        title={copy.PANE_REPORTS_TITLE}
        lede={copy.PANE_REPORTS_LEDE}
        standard={stats?.rubric}
      />

      {!IS_LIVE ? (
        <div className="ws-panel">
          <p className="ws-note" style={{ margin: 0 }}>
            No contract is configured for {NETWORK_LABEL}, so there is nothing to list. Deploy one
            and set NEXT_PUBLIC_UNISONLABS_ADDRESS.
          </p>
        </div>
      ) : stats === null ? (
        <div className="ws-panel">
          <p className="ws-note" style={{ margin: 0 }}>
            The node did not answer, so this is unknown rather than empty.
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div className="ws-panel">
          <p className="ws-note" style={{ margin: 0 }}>
            {copy.NO_REPORTS_YET}
          </p>
        </div>
      ) : (
        <div className="ws-panel ws-list" style={{ padding: "8px 22px 14px" }}>
          {reports.map((report) => {
            const contract = report.subjects.find((subject) => subject.kind === "contract");
            const site = report.subjects.find((subject) => subject.kind === "site");
            return (
              <Link key={report.id} href={`/r/${report.id}`}>
                <div className="mono" style={{ fontSize: 13, color: "var(--ai)" }}>
                  {report.id}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--ai)" }}>
                    {contract ? `Contract, ${contract.band}` : "Site only"}
                    {site ? `, site ${fmt.score(site.total)}` : ""}
                  </div>
                  <div className="mono" style={{ marginTop: 4, fontSize: 11.5, color: "var(--am)" }}>
                    {fmt.joinMono([
                      fmt.reportDate(report.created_at),
                      fmt.digest(report.digest),
                      report.contest ? `contested on ${report.contest.criterion}` : null,
                    ])}
                  </div>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    color: "var(--ag)",
                  }}
                >
                  {contract ? fmt.score(contract.total) : "-"}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {contested.length ? (
        <>
          <h2
            className="ws-eyebrow"
            style={{ marginTop: 30, marginBottom: 0, fontSize: 10, letterSpacing: "0.18em" }}
          >
            Anchors that would not settle
          </h2>
          <div className="ws-panel ws-list" style={{ marginTop: 12, padding: "8px 22px 14px" }}>
            {contested.map((row) => (
              <div key={`${row.kind}-${row.id}`}>
                <div className="mono" style={{ fontSize: 13, color: "var(--ai)" }}>
                  {row.splits}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--ai)" }}>
                    {row.name}
                  </div>
                  <div className="mono" style={{ marginTop: 4, fontSize: 11.5, color: "var(--am)" }}>
                    {row.kind} - reads as {row.reads_as}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 12, whiteSpace: "nowrap", color: "var(--am)" }}>
                  {row.splits === 1 ? "1 split" : `${row.splits} splits`}
                </div>
              </div>
            ))}
          </div>
          <p className="ws-note">{copy.PANE_REPORTS_NOTE}</p>
        </>
      ) : null}
    </>
  );
}
