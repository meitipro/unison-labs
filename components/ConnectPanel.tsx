"use client";

/**
 * The connect screen, from the design's `isAuth` view.
 *
 * The design has three states -- connect, signing, ready -- driven by a
 * 1900ms timer. Here they are driven by the wallet, which means two states the
 * design does not have and cannot have:
 *
 *   no wallet    the browser has no extension at all. Told plainly, with what
 *                still works, instead of three buttons that do nothing.
 *   wrong chain  connected, but pointed at another network. Offered the switch
 *                rather than let through to a workspace whose every write will
 *                fail somewhere nobody can look.
 *
 * And one state that behaves differently: `signing` lasts exactly as long as
 * the wallet takes, which may be a second or may be until somebody comes back
 * to their desk. Cancel abandons this page's interest in the request; it does
 * NOT cancel the wallet's own prompt, which only the wallet can dismiss, and
 * the button says so.
 *
 * THE WALLET BUTTONS ARE REAL. Each one is an extension that announced itself
 * over EIP-6963, with its own name and icon, and pressing it connects that
 * wallet. See `lib/eip6963.ts` for why the design's fixed three could not be.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import * as copy from "../lib/copy";
import { NETWORK_LABEL } from "../lib/chain";
import { shortAddress, useWallet } from "../lib/wallet";
import type { DiscoveredWallet } from "../lib/eip6963";

export default function ConnectPanel() {
  const wallet = useWallet();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  /* Whether the wallet was ALREADY connected when this page opened, as opposed
     to being connected by pressing a button on it. The two want opposite
     things: somebody who connected here should see it confirmed, and somebody
     who connected last week should not be asked to confirm it again. */
  const arrived = useRef<boolean | null>(null);

  /* Prefetch the workspace while somebody is reading this, so Continue is
     immediate rather than a second wait after the wallet's own. */
  useEffect(() => {
    router.prefetch("/app");
  }, [router]);

  useEffect(() => {
    if (!wallet.ready || arrived.current !== null) return;
    arrived.current = Boolean(wallet.address);
    /* Straight through, but only when there is nothing left to decide: on the
       wrong network there is, and it is decided here rather than three screens
       later when a write fails. */
    if (wallet.address && wallet.onRightChain) router.replace("/app");
  }, [router, wallet.address, wallet.onRightChain, wallet.ready]);

  const connect = useCallback(
    async (choice?: DiscoveredWallet) => {
      setAsking(true);
      await wallet.connect(choice);
      setAsking(false);
    },
    [wallet],
  );

  const connected = Boolean(wallet.address);
  const signing = asking || wallet.connecting;
  const step = connected ? "ready" : signing ? "signing" : "connect";

  return (
    <div className="auth" data-step={step}>
      <div className="auth-dots" data-layer="white" aria-hidden="true" />
      <div className="auth-dots" data-layer="gold" aria-hidden="true" />
      <div className="auth-veil" data-layer="radial" aria-hidden="true" />
      <div className="auth-veil" data-layer="linear" aria-hidden="true" />

      <header className="auth-top">
        <div className="auth-pill">
          <span className="ws-brand-mark" style={{ width: 26, height: 26, background: "#ffffff", boxShadow: "none" }} aria-hidden="true">
            <span style={{ width: 13, gap: 2 }}>
              <i style={{ height: 2 }} />
              <i style={{ height: 2 }} />
              <i style={{ height: 2 }} />
            </span>
          </span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap", color: "var(--dim)" }}>
            {copy.CONNECT_EYEBROW}
          </span>
          <Link href="/" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
            {copy.CONNECT_BACK}
          </Link>
        </div>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          {step === "connect" ? <ConnectStep onConnect={connect} /> : null}
          {step === "signing" ? <SigningStep onCancel={() => setAsking(false)} /> : null}
          {step === "ready" ? <ReadyStep /> : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function ConnectStep({ onConnect }: { onConnect: (choice?: DiscoveredWallet) => void }) {
  const wallet = useWallet();

  /* Only say "no wallet" once the provider has finished looking. Extensions
     inject late, and a page that decides in the first frame tells people with
     a wallet that they have none. */
  const none = wallet.ready && !wallet.available && wallet.wallets.length === 0;

  if (none) {
    return (
      <>
        <h1 className="auth-h">{copy.CONNECT_NO_WALLET_TITLE}</h1>
        <p className="auth-p">{copy.CONNECT_NO_WALLET}</p>
        <div className="auth-actions">
          <Link href="/app" className="auth-primary" style={{ display: "block", textAlign: "center", color: "#000000" }}>
            Open the workspace anyway
          </Link>
          <Link href="/rubric" className="ws-quiet" style={{ marginTop: 6, color: "var(--dim)" }}>
            Read the rubric it marks against
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="auth-h">{copy.CONNECT_TITLE}</h1>
      <p className="auth-p">{copy.CONNECT_LEDE}</p>

      <div className="auth-actions">
        <button type="button" className="auth-primary" onClick={() => onConnect()}>
          Connect wallet
        </button>

        {/* The row the design fills with three fixed names, filled instead with
            whatever really announced itself. One wallet gets one button; none
            leaves the row out rather than drawing an empty frame. */}
        {wallet.wallets.length > 0 ? (
          <>
            <div className="auth-or">
              <span aria-hidden="true" />
              {copy.CONNECT_PICK}
              <span aria-hidden="true" />
            </div>
            <div className="auth-wallets">
              {wallet.wallets.map((found) => (
                <button key={found.info.rdns} type="button" onClick={() => onConnect(found)}>
                  {found.info.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={found.info.icon} alt="" aria-hidden="true" />
                  ) : null}
                  {found.info.name}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <Link href="/app" className="ws-quiet" style={{ marginTop: 6, color: "var(--dim)" }}>
          {copy.CONNECT_SKIP}
        </Link>
      </div>

      {wallet.problem ? (
        <p className="auth-fine" style={{ color: "var(--fail)" }} role="alert">
          {wallet.problem}
        </p>
      ) : (
        <p className="auth-fine">{copy.CONNECT_FINE}</p>
      )}
    </>
  );
}

function SigningStep({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <h1 className="auth-h" style={{ animation: "none" }}>
        {copy.CONNECT_SIGNING_TITLE}
      </h1>
      <p className="auth-p" style={{ animation: "none" }}>
        {copy.CONNECT_SIGNING_LEDE}
      </p>
      <div className="auth-ring" role="status" aria-label={copy.CONNECT_SIGNING_STATUS} />
      <div className="auth-status">{copy.CONNECT_SIGNING_STATUS}</div>
      {/* Stops this page waiting. The wallet's own prompt is the wallet's to
          close, and pretending otherwise leaves somebody looking for a cancel
          that never happened. */}
      <button type="button" className="ws-quiet" style={{ marginTop: 26, color: "var(--dim)" }} onClick={onCancel}>
        Stop waiting. The wallet closes its own prompt.
      </button>
    </>
  );
}

function ReadyStep() {
  const wallet = useWallet();

  if (!wallet.onRightChain) {
    return (
      <>
        <h1 className="auth-h">{copy.WRONG_CHAIN_TITLE}</h1>
        <p className="auth-p">
          {shortAddress(wallet.address ?? "")} is connected, on another network. A review sent
          from here would go somewhere this contract is not.
        </p>
        <div className="auth-actions">
          <button type="button" className="auth-primary" onClick={() => void wallet.switchChain()}>
            Switch to {NETWORK_LABEL}
          </button>
          <Link href="/app" className="ws-quiet" style={{ marginTop: 6, color: "var(--dim)" }}>
            {copy.CONNECT_SKIP}
          </Link>
        </div>
        {wallet.problem ? (
          <p className="auth-fine" style={{ color: "var(--fail)" }} role="alert">
            {wallet.problem}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <h1 className="auth-h">{copy.CONNECT_READY_TITLE}</h1>
      <p className="auth-p mono" style={{ fontSize: 12.5 }}>
        {shortAddress(wallet.address ?? "")} on genlayer {NETWORK_LABEL}
      </p>
      <div className="auth-tick" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <Link
        href="/app"
        className="auth-primary"
        style={{ display: "block", marginTop: 40, textAlign: "center", color: "#000000" }}
      >
        {copy.CONNECT_CONTINUE}
      </Link>
    </>
  );
}
