"use client";

/**
 * Settings: five rows, every one of them a real fact or a real control.
 *
 * The design has Standard, Network, Wallet, Faucet and Appearance. Two changes,
 * both for the same reason -- a setting that cannot be acted on is not a
 * setting:
 *
 *   THE RUBRIC ROW LINKS TO THE RUBRIC. The design prints an address and stops.
 *   There is a page that reads the whole thing off the chain, and the address
 *   without it is a string nobody can check.
 *
 *   A POINTER ROW IS ADDED. The magnetic cursor replaces something the
 *   operating system provides, and anyone who needs their own cursor back has
 *   to be able to say so. It is the one preference this product genuinely owes
 *   somebody, and the design has no row for it because a mockup has no
 *   accessibility surface.
 *
 * Disconnect is here rather than in the rail. It is the sort of control that
 * should take a deliberate trip to find, and its wording is "forget" because
 * that is exactly what EIP-1193 allows: the site stops using the account and
 * the wallet keeps its permission.
 */

import Link from "next/link";
import { useCallback, useState } from "react";

import { useToast } from "./Toaster";
import { NETWORK_LABEL, REQUIRES_GAS, CONTRACT, explorerAddress, HAS_EXPLORER } from "../lib/chain";
import { FAUCET_GEN, HAS_PROGRAMMATIC_FAUCET, SYMBOL, formatUnits, requestFunds } from "../lib/funds";
import { usePrefs } from "../lib/prefs";
import { readableError } from "../lib/voice";
import { shortAddress, useWallet } from "../lib/wallet";

export default function SettingsRows({
  rubric,
  reports,
}: {
  rubric: string;
  reports: number | null;
}) {
  const wallet = useWallet();
  const prefs = usePrefs();
  const toast = useToast();
  const [funding, setFunding] = useState(false);

  const faucet = useCallback(async () => {
    if (!wallet.address || funding) return;
    setFunding(true);
    try {
      await requestFunds(wallet.address, FAUCET_GEN);
      await wallet.refreshBalance();
      toast.push({
        title: `${FAUCET_GEN} ${SYMBOL} credited to this account.`,
        meta: `${shortAddress(wallet.address)} on ${NETWORK_LABEL}`,
      });
    } catch (error) {
      toast.push({ title: readableError(error), tone: "fail" });
    } finally {
      setFunding(false);
    }
  }, [funding, toast, wallet]);

  return (
    <div className="ws-set">
      <div className="ws-set-row">
        <div>
          <h2>Rubric</h2>
          <p>
            {rubric ? `Rubric ${rubric}, ten criteria under two headings, bands at 4, 7 and 9.` : "Not read from the chain."}{" "}
            Frozen by the deploying transaction, with no method that edits it.
          </p>
        </div>
        <Link href="/rubric" className="ws-ghost">
          Read the rubric
        </Link>
      </div>

      <div className="ws-set-row">
        <div>
          <h2>Contract</h2>
          <p>
            {CONTRACT
              ? `Reports are written to and read from this contract${reports === null ? "." : `, which has issued ${reports}.`}`
              : "No contract is configured, so every panel that would show a mark says so instead."}
          </p>
        </div>
        <div className="mono" style={{ fontSize: 11.5, whiteSpace: "nowrap", color: "var(--ag)" }}>
          {CONTRACT ? (
            HAS_EXPLORER ? (
              <a href={explorerAddress(CONTRACT)} target="_blank" rel="noreferrer noopener" style={{ color: "var(--ag)" }}>
                {shortAddress(CONTRACT)}
              </a>
            ) : (
              shortAddress(CONTRACT)
            )
          ) : (
            "not set"
          )}
        </div>
      </div>

      <div className="ws-set-row">
        <div>
          <h2>Network</h2>
          <p>
            GenLayer {NETWORK_LABEL}
            {REQUIRES_GAS ? ", which charges gas for a review." : ", which charges no gas."}
          </p>
        </div>
        <div className="mono" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, whiteSpace: "nowrap", color: "var(--am)" }}>
          <span className="ws-live" aria-hidden="true" />
          {NETWORK_LABEL}
        </div>
      </div>

      <div className="ws-set-row">
        <div>
          <h2>Wallet</h2>
          <p>
            {wallet.address
              ? "Every review is charged to this address and recorded against it. Forgetting it here does not revoke anything: the wallet keeps its permission."
              : "Nothing is connected. The gate runs without a wallet; submitting a review does not."}
          </p>
        </div>
        {wallet.address ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11.5, whiteSpace: "nowrap", color: "var(--ai2)" }}>
              {shortAddress(wallet.address)}
            </span>
            <button type="button" className="ws-ghost" onClick={wallet.disconnect}>
              Forget this account
            </button>
          </div>
        ) : (
          <Link href="/app/connect" className="ws-ghost">
            Connect a wallet
          </Link>
        )}
      </div>

      {HAS_PROGRAMMATIC_FAUCET ? (
        <div className="ws-set-row">
          <div>
            <h2>Faucet</h2>
            <p>
              Testnet {SYMBOL} for this account
              {wallet.balance === null
                ? ", balance not read."
                : `, balance ${formatUnits(wallet.balance)} ${SYMBOL}.`}
            </p>
          </div>
          <button
            type="button"
            className="ws-gold-btn"
            style={{ padding: "10px 16px", fontSize: 10 }}
            onClick={() => void faucet()}
            disabled={funding || !wallet.address}
          >
            {wallet.address ? `Request ${FAUCET_GEN} ${SYMBOL}` : "Connect first"}
          </button>
        </div>
      ) : null}

      <div className="ws-set-row">
        <div>
          <h2>Appearance</h2>
          <p>
            {prefs.theme === "dark"
              ? "The workspace is dark, matching the site."
              : "The workspace is light. The site stays dark either way."}
          </p>
        </div>
        <button
          type="button"
          className="ws-ghost"
          onClick={() => prefs.setTheme(prefs.theme === "dark" ? "light" : "dark")}
        >
          {prefs.theme === "dark" ? "Use light" : "Use dark"}
        </button>
      </div>

      <div className="ws-set-row">
        <div>
          <h2>Pointer</h2>
          <p>
            A drawn pointer that wraps whatever it is over. Turning it off gives back this
            browser&rsquo;s own cursor everywhere on the site.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.magnetic}
          className="ws-ghost"
          onClick={() => prefs.setMagnetic(!prefs.magnetic)}
        >
          {prefs.magnetic ? "Use the system cursor" : "Use the drawn pointer"}
        </button>
      </div>
    </div>
  );
}
