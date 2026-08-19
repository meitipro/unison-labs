"use client";

/**
 * Connect Wallet, for the dApp header.
 *
 * The design draws a static chip reading `0x8f2c…41ab`. This is that chip when
 * an account is connected, and the button that gets you there when it is not.
 *
 * Four states, because collapsing them is how a wallet button lies:
 *
 *   no wallet    say so plainly; the gate still runs and still costs nothing
 *   connect      the one action
 *   wrong chain  the address is real but a write would fail, so the chip says
 *                which network is wanted and offers the switch
 *   connected    the address, with disconnect behind it
 *
 * Disconnect is worded as "forget" because that is what it does. EIP-1193 has
 * no revoke: the site stops using the account, the wallet keeps the permission.
 */

import { useEffect, useRef, useState } from "react";

import { NETWORK_LABEL } from "../lib/chain";
import { shortAddress, useWallet } from "../lib/wallet";

export default function WalletButton() {
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Nothing until the browser has been checked, so the button does not flash
  // from "connect" to an address on every load.
  if (!wallet.ready) {
    return <span className="tag" style={{ opacity: 0.5 }} aria-hidden="true">wallet</span>;
  }

  if (!wallet.available) {
    return (
      <span className="tag" style={{ color: "var(--dim)", borderColor: "var(--line-2)" }}>
        no wallet in this browser
      </span>
    );
  }

  if (!wallet.address) {
    return (
      <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
        <button
          type="button"
          className="btn btn-glow"
          onClick={() => void wallet.connect()}
          disabled={wallet.connecting}
          style={{ fontSize: 13.5, padding: "11px 22px" }}
        >
          {wallet.connecting ? "Check your wallet" : "Connect wallet"}
        </button>
        {wallet.problem ? (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fail)", maxWidth: "36ch", textAlign: "right" }}>
            {wallet.problem}
          </span>
        ) : null}
      </div>
    );
  }

  if (!wallet.onRightChain) {
    return (
      <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => void wallet.switchChain()}
          style={{ fontSize: 13 }}
        >
          <span className="dot" style={{ background: "var(--fail)" }} />
          Switch to {NETWORK_LABEL}
        </button>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
          {shortAddress(wallet.address)} is on another network
        </span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="tag"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        style={{ background: "none", cursor: "pointer", color: "var(--gold-lt)" }}
      >
        <span className="dot" />
        {shortAddress(wallet.address)}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 30,
            minWidth: 220,
            background: "var(--panel-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 20px 50px rgba(0,0,0,.55)",
            display: "grid",
            gap: 10,
          }}
        >
          <div className="mono" style={{ fontSize: 10.5, color: "var(--dim)", overflowWrap: "anywhere" }}>
            {wallet.address}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
            <span className="dot" style={{ display: "inline-block", marginRight: 6 }} />
            {NETWORK_LABEL}
          </div>
          <button
            type="button"
            role="menuitem"
            className="btn btn-quiet"
            onClick={() => {
              wallet.disconnect();
              setMenuOpen(false);
            }}
            style={{ fontSize: 12.5, padding: "9px 14px" }}
          >
            Forget this account
          </button>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "var(--dim)" }}>
            This site stops using the account. The wallet keeps its permission
            until you remove it there.
          </p>
        </div>
      ) : null}
    </div>
  );
}
