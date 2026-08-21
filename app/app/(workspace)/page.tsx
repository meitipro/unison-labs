import type { Metadata } from "next";

import AppConsole from "../../../components/AppConsole";
import { getRubric } from "../../../lib/touchstone";

export const metadata: Metadata = {
  title: "New assay - Unison",
  description:
    "Paste an Intelligent Contract or give a raw file URL. The gate runs in your browser and costs nothing.",
};

export const revalidate = 60;

/**
 * The dApp. `Launch dApp` lands here.
 *
 * A route rather than the design's view flag: it gives the app a URL, a back
 * button and a shareable link, none of which a state toggle has. The criterion
 * names come from the contract so the marks table can label rows with the
 * published name rather than an id.
 */
export default async function AppPage() {
  const rubric = await getRubric();
  const names: Record<string, string> = {};
  for (const subject of rubric?.subjects ?? []) {
    for (const criterion of subject.criteria) names[criterion.id] = criterion.name;
  }
  return <AppConsole names={names} rubric={rubric?.version ?? ""} />;
}
