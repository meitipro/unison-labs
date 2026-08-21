import type { Metadata } from "next";

import { WorkspaceHeader } from "../../../../components/WorkspaceShell";
import SettingsRows from "../../../../components/SettingsRows";
import * as copy from "../../../../lib/copy";
import { getStats } from "../../../../lib/touchstone";

export const metadata: Metadata = {
  title: "Settings - Unison",
  description: "The rubric, the network, the wallet and how this workspace looks.",
};

export const revalidate = 60;

export default async function SettingsPane() {
  const stats = await getStats();
  return (
    <>
      <WorkspaceHeader
        title={copy.PANE_SETTINGS_TITLE}
        lede={copy.PANE_SETTINGS_LEDE}
        standard={stats?.rubric}
      />
      <SettingsRows rubric={stats?.rubric ?? ""} reports={stats?.reports ?? null} />
    </>
  );
}
