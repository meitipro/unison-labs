/**
 * Where a reviewed contract may be deployed.
 *
 * A review says nothing about which network the author wants to run on, so the
 * deploy asks. Every id below was read from the network itself with
 * `eth_chainId` rather than copied from a table: studionet answered 0xf22f,
 * Studio Next 0xf22d, and Asimov and Bradbury both answered 0x107d.
 *
 * That last one is the fact worth carrying. Asimov and Bradbury share chain id
 * 4221, so a wallet cannot tell them apart and the switch prompt is identical
 * for both. What separates them is the node the transaction is submitted to,
 * which is why a target carries its own rpc and every call takes it from here
 * rather than from the network the site itself runs on.
 *
 * Studio Next runs the newer consensus, and the sdk that can talk to it cannot
 * read the older networks. Both are installed, and `runtime` is what picks
 * between them.
 *
 * A leaf module with no relative imports, so tests/parity runs it directly.
 */

/** Which GenVM consensus a network runs, and so which sdk reaches it. */
export type Runtime = "v05" | "v06";

export type DeployTarget = {
  id: string;
  label: string;
  chainId: number;
  /** The node a deploy is submitted to, and read back from afterwards. */
  rpc: string;
  /** "" where there is no explorer to link a new address to. */
  explorer: string;
  runtime: Runtime;
  /** The one thing somebody choosing this network needs to know first. */
  note: string;
};

const GEN = { name: "GEN Token", symbol: "GEN", decimals: 18 } as const;

export const DEPLOY_TARGETS: readonly DeployTarget[] = [
  {
    id: "studionet",
    label: "Studio",
    chainId: 61999,
    rpc: "https://studio.genlayer.com/api",
    explorer: "https://explorer-studio.genlayer.com",
    runtime: "v05",
    note: "Charges nothing, and the network this review was run on.",
  },
  {
    id: "studio-next",
    label: "Studio Next",
    chainId: 61997,
    rpc: "https://studio-next.genlayer.com/api",
    explorer: "https://explorer-studio-dev.genlayer.com",
    runtime: "v06",
    note: "The newer consensus, with fees on. It runs a different runtime, so a contract pinned to the older one is refused by the network rather than by this page.",
  },
  {
    id: "asimov",
    label: "Asimov testnet",
    chainId: 4221,
    rpc: "https://rpc-asimov.genlayer.com",
    explorer: "https://explorer-asimov.genlayer.com",
    runtime: "v05",
    note: "A public testnet, so the account needs a balance before it can deploy.",
  },
  {
    id: "bradbury",
    label: "Bradbury testnet",
    chainId: 4221,
    rpc: "https://rpc-bradbury.genlayer.com",
    explorer: "https://explorer-bradbury.genlayer.com",
    runtime: "v05",
    note: "Shares chain id 4221 with Asimov, so a wallet cannot tell the two apart. The node this deploy is sent to is what decides which one it lands on.",
  },
];

export const DEFAULT_TARGET_ID = "studionet";

export function targetById(id: string): DeployTarget | null {
  return DEPLOY_TARGETS.find((t) => t.id === id) ?? null;
}

/** The target a chain id names, or null where two of them share it. */
export function targetByChainId(chainId: number): DeployTarget | null {
  const found = DEPLOY_TARGETS.filter((t) => t.chainId === chainId);
  return found.length === 1 ? found[0] : null;
}

export function chainIdHex(target: DeployTarget): string {
  return `0x${target.chainId.toString(16)}`;
}

export function explorerAddressOn(target: DeployTarget, address: string): string {
  return target.explorer ? `${target.explorer.replace(/\/+$/, "")}/address/${address}` : "";
}

export function explorerTxOn(target: DeployTarget, hash: string): string {
  return target.explorer ? `${target.explorer.replace(/\/+$/, "")}/tx/${hash}` : "";
}

/** What a wallet needs to add a network it has never heard of. */
export function addChainParams(target: DeployTarget) {
  return {
    chainId: chainIdHex(target),
    chainName: `GenLayer ${target.label}`,
    rpcUrls: [target.rpc],
    nativeCurrency: { ...GEN },
    ...(target.explorer ? { blockExplorerUrls: [target.explorer] } : {}),
  };
}
