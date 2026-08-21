"use client";

/**
 * The rail's wallet card: who is signing, on what network, with what balance,
 * and the faucet beside it.
 *
 * The design draws this connected, always, with `0x8f2c...41ab` and 250 GEN.
 * Four states are needed instead, and every one of them is reachable:
 *
 *   no wallet    nothing to connect to. Says so, and points at what still works.
 *   disconnected offers the connect screen rather than a fake address.
 *   wrong chain  offers the switch. The address is real but useless as it is.
 *   connected    the real address, the real balance, and the faucet.
 *
 * The faucet button says what it does after it has done it, because
 * `sim_fundAccount` finalizes fast enough that a spinner would be a flicker,
 * and because the balance is re-read afterwards rather than incremented by the
 * number on the button. Adding 100 locally would show a balance the chain does
 * not hold if the funding did not land.
 */

import { useCallback, useState } from "react";
import Link from "next/link";

import { useToast } from "./Toaster";
import { NETWORK_LABEL, REQUIRES_GAS, FAUCET_URL } from "../lib/chain";
import {
  FAUCET_GEN,
  HAS_PROGRAMMATIC_FAUCET,
  SYMBOL,
  balanceOf,
  formatUnits,
  requestFunds,
} from "../lib/funds";
import { shortAddress, useWallet } from "../lib/wallet";
import { readableError } from "../lib/voice";

export default function WalletCard() {
  const wallet = useWallet();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);

  const copy = useCallback(() => {
    if (!wallet.address) return;
    const value = wallet.address;
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done, () => {
        toast.push({ title: "This browser would not let the page copy.", meta: value, tone: "fail" });
      });
    } else {
      toast.push({ title: "This browser has no clipboard for a page to write to.", meta: value, tone: "fail" });
    }
  }, [toast, wallet.address]);

  /**
   * Ask for testnet GEN, then say what actually happened.
   *
   * `sim_fundAccount` ANSWERS WITH A TRANSACTION HASH FOR AN ADDRESS STUDIO
   * DOES NOT HAVE IN ITS LEDGER, and credits nothing. Measured: a connected
   * account sat at 0 GEN across a successful call, while the panel announced
   * "100 GEN credited to this account". A hash is not a receipt here.
   *
   * So the balance is read before and after and the message is derived from
   * the difference, never from the call returning. Studio finalizes funding in
   * a couple of seconds but not instantly, so a flat reading is re-checked
   * before it is believed.
   */
  const faucet = useCallback(async () => {
    if (!wallet.address || funding) return;
    const address = wallet.address;
    setFunding(true);
    try {
      const before = (await balanceOf(address)) ?? 0n;
      await requestFunds(address, FAUCET_GEN);

      let after = before;
      for (let attempt = 0; attempt < 4 && after <= before; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        after = (await balanceOf(address)) ?? before;
      }
      await wallet.refreshBalance();

      if (after > before) {
        toast.push({
          title: `${formatUnits(after - before)} ${SYMBOL} credited to this account.`,
          meta: `${shortAddress(address)} on ${NETWORK_LABEL}`,
        });
      } else {
        toast.push({
          title: "The faucet accepted the request, but this balance has not moved.",
          meta: `${shortAddress(address)} is not an account ${NETWORK_LABEL} funds. A review still costs no gas here.`,
          tone: "fail",
        });
      }
    } catch (error) {
      toast.push({ title: readableError(error), tone: "fail" });
    } finally {
      setFunding(false);
    }
  }, [funding, toast, wallet]);

  /* ---- not connected ------------------------------------------------- */
  if (!wallet.address) {
    return (
      <div className="ws-card">
        <div className="ws-card-row" style={{ display: "grid", gap: 10 }}>
          <span className="ws-eyebrow">Wallet</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--am)" }}>
            {wallet.ready && !wallet.available
              ? "No wallet in this browser. The gate still runs here, and costs nothing."
              : "Nothing is connected, so nothing can be signed yet."}
          </span>
          {wallet.available ? (
            <Link href="/app/connect" className="ws-gold-btn" style={{ justifyContent: "center" }}>
              Connect a wallet
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const wrongChain = !wallet.onRightChain;

  return (
    <div className="ws-card">
      <div className="ws-card-row">
        <span className="ws-avatar" aria-hidden="true" />
        <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span className="mono" style={{ fontSize: 11.5, letterSpacing: "0.02em", whiteSpace: "nowrap", color: "var(--ai)" }}>
            {shortAddress(wallet.address)}
          </span>
          <span className="ws-eyebrow" style={{ fontSize: 9, letterSpacing: "0.16em" }}>
            {wallet.walletName ? wallet.walletName : "Connected"}
          </span>
        </span>
        <button
          type="button"
          className="ws-icon-btn"
          data-done={copied}
          aria-label={copied ? "Address copied" : "Copy the wallet address"}
          onClick={copy}
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h8" />
            </svg>
          )}
        </button>
      </div>

      <div className="ws-card-row">
        <span className="ws-live" aria-hidden="true" />
        <span style={{ fontSize: 12, whiteSpace: "nowrap", color: "var(--ai2)" }}>
          GenLayer {NETWORK_LABEL}
        </span>
        <span className="ws-eyebrow" style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.14em" }}>
          Testnet
        </span>
      </div>

      {wrongChain ? (
        <div className="ws-card-row" style={{ display: "grid", gap: 10 }}>
          <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--am)" }}>
            This wallet is on another network, so a review sent from it would go somewhere
            this contract is not.
          </span>
          <button type="button" className="ws-gold-btn" style={{ justifyContent: "center" }} onClick={() => void wallet.switchChain()}>
            Switch to {NETWORK_LABEL}
          </button>
        </div>
      ) : (
        <div
          className="ws-card-row"
          style={{ alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 13 }}
        >
          <span style={{ display: "grid", gap: 3 }}>
            <span className="ws-eyebrow" style={{ fontSize: 9, letterSpacing: "0.16em" }}>
              Balance
            </span>
            <span
              key={String(wallet.balance)}
              className="mono"
              style={{
                fontSize: 17,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                color: "var(--ai)",
                animation: "countUp 420ms cubic-bezier(.22,1,.36,1) both",
              }}
            >
              {wallet.balance === null ? "not read" : formatUnits(wallet.balance)}{" "}
              <span style={{ fontSize: 11, color: "var(--am)" }}>{SYMBOL}</span>
            </span>
          </span>

          {HAS_PROGRAMMATIC_FAUCET ? (
            <button type="button" className="ws-gold-btn" onClick={() => void faucet()} disabled={funding}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="M7 10l5 5 5-5" />
                <path d="M4 20h16" />
              </svg>
              {funding ? "Asking" : "Faucet"}
            </button>
          ) : FAUCET_URL ? (
            <a className="ws-gold-btn" href={FAUCET_URL} target="_blank" rel="noreferrer noopener">
              Faucet
            </a>
          ) : null}
        </div>
      )}

      {!REQUIRES_GAS && !wrongChain ? (
        <div className="ws-card-row" style={{ paddingTop: 9, paddingBottom: 11 }}>
          <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--am)" }}>
            {NETWORK_LABEL} charges no gas, so a review runs whatever this says.
          </span>
        </div>
      ) : null}
    </div>
  );
}
