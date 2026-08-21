import type { Metadata } from "next";

import AppConsole from "../../../components/AppConsole";
import { getRubric } from "../../../lib/unison";

export const metadata: Metadata = {
  title: "New assay - Unison",
  description:
    "Give a raw file URL the validators can fetch. The gate runs in your browser and costs nothing.",
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
  /* The contract publishes its own source-size ceiling. Handing it to the
     console lets the browser refuse an oversized file for nothing, instead of
     letting a transaction go out and come back refused. */
  return (
    <AppConsole
      names={names}
      rubric={rubric?.version ?? ""}
      maxSourceBytes={rubric?.limits?.source_bytes ?? null}
    />
  );
}
