import type { ReactNode } from "react";

import WorkspaceShell from "../../../components/WorkspaceShell";
import * as fmt from "../../../lib/format";
import { getRecentReports, getStats } from "../../../lib/unison";

/**
 * The shell around every workspace pane.
 *
 * `/app/connect` sits OUTSIDE this group on purpose: it is a full-bleed screen
 * with nothing to navigate yet, and wrapping it in a rail that offers Reports
 * and Settings to somebody who has not connected is an interface promising
 * things it will then refuse.
 *
 * The recents are read here rather than in the rail, so they come off the chain
 * on the server once per navigation instead of from the browser on every route
 * change. `revalidate` is a minute because a report is permanent once written
 * and the only thing that changes is whether there is a newer one.
 */

export const revalidate = 60;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const stats = await getStats();
  const reports = await getRecentReports(stats, 3);

  const recents = reports.map((report) => {
    const contract = report.subjects.find((subject) => subject.kind === "contract");
    return {
      id: report.id,
      label: String(report.id),
      tag: contract ? fmt.score(contract.total) : "no mark",
      split: false,
    };
  });

  return <WorkspaceShell recents={recents}>{children}</WorkspaceShell>;
}
