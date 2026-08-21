import type { Metadata } from "next";

import ConnectPanel from "../../../components/ConnectPanel";

export const metadata: Metadata = {
  title: "Connect a wallet - Unison",
  description:
    "Every report is requested by a wallet and recorded against it. Connecting shares an address and signs nothing.",
};

/**
 * Where Launch dApp lands.
 *
 * Outside the `(workspace)` group, so it gets no rail: there is nothing to
 * navigate to from here yet, and offering Reports and Settings to somebody who
 * has not connected is an interface promising what it will then refuse.
 */
export default function ConnectPage() {
  return <ConnectPanel />;
}
