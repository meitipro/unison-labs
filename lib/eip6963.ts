/**
 * Which wallets are actually installed in this browser.
 *
 * The design's connect screen offers MetaMask, WalletConnect and Coinbase as
 * three buttons. Wired naively all three would call the same injected provider,
 * so a person with only MetaMask would be shown a Coinbase button that opens
 * MetaMask -- a lie told three times, and the sort a mockup cannot tell.
 *
 * EIP-6963 is the answer and needs no library. The page dispatches
 * `eip6963:requestProvider`; every wallet extension answers with
 * `eip6963:announceProvider` carrying its own name, icon, rdns and provider
 * object. So the row of buttons is built from what is really there: one button
 * per wallet, its real name, its real icon, and clicking it connects THAT
 * wallet. Where nothing announces, the screen falls back to `window.ethereum`
 * (older extensions) and then to saying there is no wallet here.
 *
 * WalletConnect is deliberately absent unless a WalletConnect-compatible
 * extension announces itself: it is a relay protocol needing a project id and
 * an SDK, neither of which this app has, and a button that cannot work is
 * worse than no button.
 */

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

export type WalletInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type DiscoveredWallet = {
  info: WalletInfo;
  provider: Eip1193Provider;
};

type AnnounceEvent = CustomEvent<DiscoveredWallet>;

/**
 * Subscribe to the announcements. Returns the unsubscribe.
 *
 * Wallets announce on request AND unprompted at their own load, which can be
 * after this runs, so the listener stays attached rather than collecting once.
 * Duplicates are keyed by rdns: an extension that announces twice is one
 * wallet, and rendering it twice looks like two.
 */
export function discoverWallets(onChange: (wallets: DiscoveredWallet[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const found = new Map<string, DiscoveredWallet>();

  const onAnnounce = (event: Event) => {
    const detail = (event as AnnounceEvent).detail;
    if (!detail?.info?.rdns || typeof detail.provider?.request !== "function") return;
    if (found.has(detail.info.rdns)) return;
    found.set(detail.info.rdns, detail);
    onChange([...found.values()]);
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
}
