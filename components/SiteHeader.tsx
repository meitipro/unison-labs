"use client";

/**
 * The floating header: a white disc, a white pill nav, and Launch dApp.
 *
 * Under 720px the pill collapses into a burger that opens a white sheet, which
 * is the design's own breakpoint. Two things the design file leaves implicit
 * and a real page has to do:
 *
 *   the sheet traps nothing but does close on Escape and on the scrim, and the
 *   burger reports `aria-expanded` so a screen reader knows what it did;
 *
 *   the body stops scrolling while the sheet is open, otherwise the page
 *   drifts behind it on touch.
 */

import { useEffect, useState } from "react";

import Mark from "./Mark";

export type NavItem = { label: string; href: string };

const ITEMS: NavItem[] = [
  { label: "Story", href: "/#story" },
  { label: "Rubric", href: "/rubric" },
  { label: "Reports", href: "/#record" },
  { label: "Contact", href: "/#close" },
];

export default function SiteHeader({ current = "Story" }: { current?: string }) {
  const [wide, setWide] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const isWide = window.innerWidth > 720;
      setWide(isWide);
      if (isWide) setOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Stop the page drifting behind the sheet on touch.
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header className="topbar" style={{ animation: "slideDown 700ms cubic-bezier(.22,1,.36,1) both" }}>
        <a href="/" className="badge" aria-label="Unison, home">
          <Mark size={30} />
        </a>

        {wide ? (
          <>
            <nav className="pill-nav" aria-label="Primary">
              {ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-current={item.label === current ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <a className="launch" href="/app">
              Launch dApp
            </a>
          </>
        ) : (
          <button
            type="button"
            className="burger"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            style={{ background: open ? "#ffffff" : "var(--chip)" }}
          >
            <span
              style={{
                background: open ? "var(--nav-ink)" : "var(--white)",
                transform: open ? "translateY(6.5px) rotate(45deg)" : "none",
              }}
            />
            <span
              style={{
                background: open ? "var(--nav-ink)" : "var(--white)",
                opacity: open ? 0 : 1,
              }}
            />
            <span
              style={{
                background: open ? "var(--nav-ink)" : "var(--white)",
                transform: open ? "translateY(-6.5px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        )}
      </header>

      {open ? (
        <>
          <button
            type="button"
            className="menu-scrim"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="menu-card">
            <div style={{ display: "grid", gap: 4 }}>
              {ITEMS.map((item, index) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.label === current ? "page" : undefined}
                  style={{
                    animation: `linkIn 320ms cubic-bezier(.22,1,.36,1) ${60 + index * 60}ms both`,
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <a
              className="btn"
              href="/app"
              style={{
                marginTop: 14,
                width: "100%",
                height: 52,
                background: "var(--chip)",
                color: "var(--white)",
                fontSize: 15,
                fontWeight: 500,
                animation: "linkIn 320ms cubic-bezier(.22,1,.36,1) 300ms both",
              }}
            >
              Launch dApp
            </a>
          </div>
        </>
      ) : null}
    </>
  );
}
