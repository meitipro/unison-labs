"use client";

/**
 * The wallet, in one place.
 *
 * The dApp needs the connected account in two places at once -- the header
 * chip and the assay button -- so it lives in a context rather than being
 * re-derived. Everything here is EIP-1193 against `window.ethereum`; no
 * connector library, no third party, and no key ever reaches this app.
 *
 * Four things this handles that a naive connect button does not:
 *
 *  1. It restores silently on load with `eth_accounts`, which returns the
 *     already-authorised account WITHOUT prompting. `eth_requestAccounts` on
 *     mount would throw a wallet popup at every visitor who ever connected.
 *  2. It follows `accountsChanged` and `chainChanged`. A wallet switched in
 *     another tab otherwise leaves the page showing an address that is no
 *     longer signing.
 *  3. It knows when the wallet is on the wrong chain and offers to switch,
 *     falling back to `wallet_addEthereumChain` on 4902 (chain unknown). A
 *     write sent to the wrong network fails in a way nobody can act on.
 *  4. Disconnect is local, and says so. EIP-1193 has no "revoke" -- the site
 *     forgets the account, the wallet does not -- and a button that implies
 *     otherwise is a lie about who holds the permission.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ADD_CHAIN_PARAMS, CHAIN, CHAIN_ID_HEX, NETWORK_LABEL } from "./chain";
import { readableError } from "./voice";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export type WalletState = {
  /** True once the browser has been checked, so the UI can avoid a flash. */
  ready: boolean;
  /** A wallet is present in this browser. */
  available: boolean;
  address: `0x${string}` | null;
  /** The chain the wallet is actually on, as reported. */
  chainId: string | null;
  /** The wallet is on the network this site reads and writes. */
  onRightChain: boolean;
  connecting: boolean;
  /** Set when a connect or switch failed, in the product's voice. */
  problem: string;
  connect: () => Promise<`0x${string}` | null>;
  switchChain: () => Promise<boolean>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

function provider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [problem, setProblem] = useState("");

  /* Restore without prompting, then follow the wallet. */
  useEffect(() => {
    let alive = true;
    let detach: (() => void) | undefined;

    /**
     * A wallet extension injects `window.ethereum` asynchronously, and often
     * after this effect has already run. Checking once on mount is the reason
     * a page sometimes says "no wallet" to somebody who plainly has one.
     *
     * So: check now, listen for the announcement EIP-1193 providers fire, and
     * re-check once more shortly after. Whichever arrives first wins, and the
     * "no wallet" message is only shown once all three have come up empty.
     */
    const attach = () => {
      const eth = provider();
      if (!eth || !alive || detach) return false;
      setAvailable(true);
      detach = start(eth);
      return true;
    };

    if (!attach()) {
      const onAnnounce = () => attach();
      window.addEventListener("ethereum#initialized", onAnnounce, { once: true });
      const late = setTimeout(() => {
        if (!attach() && alive) setReady(true);
      }, 500);
      return () => {
        alive = false;
        clearTimeout(late);
        window.removeEventListener("ethereum#initialized", onAnnounce);
        detach?.();
      };
    }

    return () => {
      alive = false;
      detach?.();
    };

    /** Read the wallet silently, then follow it. Returns its detach. */
    function start(eth: Eip1193): () => void {
      void (async () => {
        try {
          // eth_accounts is the silent one: it answers with the already
          // authorised account and never opens the wallet.
          const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
          const id = (await eth.request({ method: "eth_chainId" })) as string;
          if (!alive) return;
          if (accounts?.length) setAddress(accounts[0] as `0x${string}`);
          setChainId(typeof id === "string" ? id.toLowerCase() : null);
        } catch {
          /* A wallet that will not answer is the same as no wallet here. */
        } finally {
          if (alive) setReady(true);
        }
      })();

      const onAccounts = (...args: never[]) => {
        const accounts = args[0] as unknown as string[];
        setAddress(accounts?.length ? (accounts[0] as `0x${string}`) : null);
        setProblem("");
      };
      const onChain = (...args: never[]) => {
        const id = args[0] as unknown as string;
        setChainId(typeof id === "string" ? id.toLowerCase() : null);
        setProblem("");
      };

      eth.on?.("accountsChanged", onAccounts);
      eth.on?.("chainChanged", onChain);

      return () => {
        eth.removeListener?.("accountsChanged", onAccounts);
        eth.removeListener?.("chainChanged", onChain);
      };
    }
  }, []);

  const connect = useCallback(async (): Promise<`0x${string}` | null> => {
    const eth = provider();
    if (!eth) {
      setProblem(
        "No wallet is available in this browser, so nothing can be signed. The gate still runs here and costs nothing.",
      );
      return null;
    }
    setConnecting(true);
    setProblem("");
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) {
        setProblem("No account was shared, so nothing was connected.");
        return null;
      }
      const id = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(typeof id === "string" ? id.toLowerCase() : null);
      setAddress(accounts[0] as `0x${string}`);
      return accounts[0] as `0x${string}`;
    } catch (error) {
      setProblem(readableError(error));
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchChain = useCallback(async (): Promise<boolean> => {
    const eth = provider();
    if (!eth) return false;
    setProblem("");
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
      return true;
    } catch (error) {
      // 4902 means the wallet has never heard of this chain, which is the
      // normal case for a testnet: add it, then it is switched to.
      const code = (error as { code?: number })?.code;
      if (code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [ADD_CHAIN_PARAMS],
          });
          return true;
        } catch (addError) {
          setProblem(readableError(addError));
          return false;
        }
      }
      setProblem(readableError(error));
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    // EIP-1193 has no revoke. This forgets the account here; the wallet keeps
    // its permission, and the button copy says so rather than implying more.
    setAddress(null);
    setProblem("");
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      ready,
      available,
      address,
      chainId,
      onRightChain: chainId === null ? true : chainId === CHAIN_ID_HEX.toLowerCase(),
      connecting,
      problem,
      connect,
      switchChain,
      disconnect,
    }),
    [ready, available, address, chainId, connecting, problem, connect, switchChain, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside <WalletProvider>");
  return value;
}

/** `0x8f2c…41ab`, the way the design writes an address. */
export function shortAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export { CHAIN, NETWORK_LABEL };
