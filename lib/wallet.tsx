"use client";

/**
 * The wallet, in one place.
 *
 * The dApp needs the connected account in four places at once -- the connect
 * screen, the rail's card, the settings sheet and the assay button -- so it
 * lives in a context rather than being re-derived. Everything here is EIP-1193
 * and EIP-6963 against the browser's own extensions; no connector library, no
 * third party, and no key ever reaches this app.
 *
 * Six things this handles that a naive connect button does not:
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
 *  5. It DISCOVERS wallets rather than assuming one. The design's connect
 *     screen offers three named wallets; EIP-6963 says which are really
 *     installed, so each button is that wallet and opens that wallet. See
 *     `lib/eip6963.ts`.
 *  6. It carries the balance, refreshed on demand, because the rail shows one
 *     and the faucet changes it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ADD_CHAIN_PARAMS, CHAIN, CHAIN_ID_HEX, NETWORK_LABEL } from "./chain";
import { discoverWallets, type DiscoveredWallet, type Eip1193Provider } from "./eip6963";
import { balanceOf } from "./funds";
import { readableError } from "./voice";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type WalletState = {
  /** True once the browser has been checked, so the UI can avoid a flash. */
  ready: boolean;
  /** A wallet is present in this browser. */
  available: boolean;
  /** Every wallet that announced itself, for the connect screen's buttons. */
  wallets: DiscoveredWallet[];
  /** The name of the wallet actually connected, where it announced one. */
  walletName: string;
  address: `0x${string}` | null;
  /** The chain the wallet is actually on, as reported. */
  chainId: string | null;
  /** The wallet is on the network this site reads and writes. */
  onRightChain: boolean;
  connecting: boolean;
  /** Wei held by the connected account; null until read, or unreadable. */
  balance: bigint | null;
  /** Set when a connect or switch failed, in the product's voice. */
  problem: string;
  /** The provider that will actually be asked to sign. Handed to genlayer-js
   *  so a write opens the wallet the person picked, not whichever extension
   *  won the race to set `window.ethereum`. */
  provider: Eip1193Provider | null;
  connect: (wallet?: DiscoveredWallet) => Promise<`0x${string}` | null>;
  switchChain: () => Promise<boolean>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [walletName, setWalletName] = useState("");
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [problem, setProblem] = useState("");

  /* The provider actually in use: whichever announced wallet was picked, or
     the injected one. Held in a ref because every request goes through it and
     re-rendering on a change of provider identity would be noise. */
  const active = useRef<Eip1193Provider | null>(null);

  const pick = useCallback((): Eip1193Provider | null => {
    if (active.current) return active.current;
    if (typeof window === "undefined") return null;
    return window.ethereum ?? null;
  }, []);

  /* Listen for the announcements, and ask for them. Wallets answer the request
     and also announce unprompted at their own load, so the listener stays. */
  useEffect(() => {
    return discoverWallets((found) => {
      setWallets(found);
      if (found.length) setAvailable(true);
    });
  }, []);

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
      const eth = typeof window === "undefined" ? null : window.ethereum ?? null;
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
    function start(eth: Eip1193Provider): () => void {
      void (async () => {
        try {
          // eth_accounts is the silent one: it answers with the already
          // authorised account and never opens the wallet.
          const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
          const id = (await eth.request({ method: "eth_chainId" })) as string;
          if (!alive) return;
          if (accounts?.length) {
            active.current = eth;
            setAddress(accounts[0] as `0x${string}`);
          }
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
        setBalance(null);
        setProblem("");
      };
      const onChain = (...args: never[]) => {
        const id = args[0] as unknown as string;
        setChainId(typeof id === "string" ? id.toLowerCase() : null);
        setBalance(null);
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

  const connect = useCallback(
    async (wallet?: DiscoveredWallet): Promise<`0x${string}` | null> => {
      const eth = wallet?.provider ?? pick();
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
        active.current = eth;
        setWalletName(wallet?.info?.name ?? "");
        setChainId(typeof id === "string" ? id.toLowerCase() : null);
        setAddress(accounts[0] as `0x${string}`);
        setBalance(null);
        return accounts[0] as `0x${string}`;
      } catch (error) {
        setProblem(readableError(error));
        return null;
      } finally {
        setConnecting(false);
      }
    },
    [pick],
  );

  const switchChain = useCallback(async (): Promise<boolean> => {
    const eth = pick();
    if (!eth) return false;
    setProblem("");

    /**
     * Read the chain back rather than assuming the switch was observed.
     *
     * A successful `wallet_switchEthereumChain` is normally followed by a
     * `chainChanged` event, and the listener above picks it up. Normally. It
     * is not guaranteed by EIP-1193, wallets differ on whether they fire it
     * for a switch they were asked for, and there is a race either way. If it
     * does not arrive, the switch really happened and the screen still says
     * "wrong network" -- somebody pressing the button, watching their wallet
     * change, and seeing nothing move here.
     *
     * One extra call closes that. It is idempotent, and the event handler
     * setting the same value again is harmless.
     */
    const confirm = async () => {
      try {
        const id = (await eth.request({ method: "eth_chainId" })) as string;
        if (typeof id === "string") setChainId(id.toLowerCase());
      } catch {
        /* The event is the fallback if this is the call that fails. */
      }
    };

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
      await confirm();
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
          await confirm();
          return true;
        } catch (addError) {
          setProblem(readableError(addError));
          return false;
        }
      }
      setProblem(readableError(error));
      return false;
    }
  }, [pick]);

  const disconnect = useCallback(() => {
    // EIP-1193 has no revoke. This forgets the account here; the wallet keeps
    // its permission, and the button copy says so rather than implying more.
    setAddress(null);
    setBalance(null);
    setWalletName("");
    setProblem("");
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setBalance(await balanceOf(address));
  }, [address]);

  /* Read it once whenever the account or the network changes. */
  useEffect(() => {
    if (!address) return;
    let alive = true;
    void (async () => {
      const wei = await balanceOf(address);
      if (alive) setBalance(wei);
    })();
    return () => {
      alive = false;
    };
  }, [address, chainId]);

  const value = useMemo<WalletState>(
    () => ({
      ready,
      available,
      wallets,
      walletName,
      address,
      chainId,
      /*
       * An unknown chain is not the right chain.
       *
       * This read `chainId === null ? true : ...`, so a wallet whose network
       * could not be determined reported as correctly configured, and every one
       * of the five consumers took the reassuring branch: AppConsole skipped the
       * switch and asked for a signature anyway, ConnectPanel redirected into
       * the workspace, and the two wallet surfaces hid their warning. The null
       * arrives easily, since `chainChanged` sets it for any payload that is not
       * a string.
       *
       * Fixing it here rather than at each caller is the point. A guard that
       * fails open in one place fails open everywhere that trusts it, and the
       * honest answer to "are you on the right chain" when the chain is unknown
       * is no.
       */
      onRightChain: chainId === CHAIN_ID_HEX.toLowerCase(),
      connecting,
      balance,
      problem,
      provider: active.current,
      connect,
      switchChain,
      disconnect,
      refreshBalance,
    }),
    [
      ready,
      available,
      wallets,
      walletName,
      address,
      chainId,
      connecting,
      balance,
      problem,
      connect,
      switchChain,
      disconnect,
      refreshBalance,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside <WalletProvider>");
  return value;
}

/** `0x8f2c...41ab`, the way the design writes an address. */
export function shortAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export { CHAIN, NETWORK_LABEL };
