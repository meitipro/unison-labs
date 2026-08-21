"use client";

/**
 * The magnetic pointer, ported from the design project's `magnetic-cursor.js`.
 *
 * A white dot under `mix-blend-mode: exclusion` that follows the pointer,
 * stretches into an I-beam over running text, wraps whatever button or link it
 * is over, and springs that element a little way toward the pointer. All of the
 * constants -- 26px, 10px of padding, 0.22 pull, k 0.14, damp 0.72 -- are the
 * design's.
 *
 * FOUR THINGS THIS DOES THAT THE SOURCE SCRIPT DOES NOT, all of them because a
 * live page is not a mockup:
 *
 *  1. It can be turned off, in Settings, and the choice is remembered. The
 *     custom pointer replaces a control the operating system provides; anyone
 *     who relies on a system cursor -- a large one, a high-contrast one, one
 *     with a trail -- must be able to have it back, and the guards below cannot
 *     detect that case.
 *  2. `cursor: none` is applied only while the dot is actually being drawn,
 *     via `data-magcursor` on <body>, which is set here rather than in CSS.
 *     The design's stylesheet hides the native cursor from the first paint, so
 *     a browser where this script fails to run has no pointer at all.
 *  3. It tears down. The source is a page-lifetime IIFE; this unmounts, which
 *     means removing the dot, the attribute, four listeners and the frame loop.
 *     Without that a route change leaves an orphan dot animating forever.
 *  4. It clears `will-change` when it lets an element go. The source sets it on
 *     every element the pointer ever touched and never takes it off, which is a
 *     compositor layer per button by the end of a long page.
 *
 * The `<select>` exemption is in the stylesheet rather than here: the dot hides
 * over form fields, and a select with neither a dot nor a native cursor is a
 * control you cannot see yourself pointing at.
 */

import { useEffect, useRef } from "react";

import { usePrefs } from "../lib/prefs";

const SIZE = 26;
const PAD = 10;
const PULL = 0.22;
const SNAP = 'button, a, [data-magnetic], [role="switch"], summary';
const TEXT = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE"]);
const FIELD = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const lerp = (a: number, b: number, n: number) => a + (b - a) * n;

function num(value: string, fallback: number): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function MagneticCursor() {
  const { magnetic } = usePrefs();
  const wanted = useRef(magnetic);
  wanted.current = magnetic;

  useEffect(() => {
    if (!magnetic) return;
    if (typeof window === "undefined" || !window.matchMedia) return;

    /* The design's own guards: a coarse pointer has nothing to draw, and a
       touch device would leave the dot stranded wherever the last tap was. */
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || navigator.maxTouchPoints > 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dot = document.createElement("div");
    dot.className = "magdot";
    dot.setAttribute("aria-hidden", "true");
    Object.assign(dot.style, {
      width: `${SIZE}px`,
      height: `${SIZE}px`,
      opacity: "0",
      transition: "opacity 240ms ease",
    });

    const cur = { x: -100, y: -100, w: SIZE, h: SIZE, r: SIZE / 2 };
    const tgt = { x: -100, y: -100, w: SIZE, h: SIZE, r: SIZE / 2 };
    const pull = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    let seen = false;
    let held: HTMLElement | null = null;
    let heldRect: DOMRect | null = null;
    let raf = 0;
    const timers: number[] = [];

    function release() {
      if (!held) return;
      const el = held;
      held = null;
      heldRect = null;
      pull.tx = 0;
      pull.ty = 0;
      tgt.w = SIZE;
      tgt.h = SIZE;
      tgt.r = SIZE / 2;
      /* Let the spring settle before handing the element back to CSS, or the
         transform is cleared mid-flight and it snaps. */
      timers.push(
        window.setTimeout(() => {
          if (held !== el && Math.abs(pull.x) < 0.4 && Math.abs(pull.y) < 0.4) {
            el.style.transform = "";
            el.style.willChange = "";
          }
        }, 600),
      );
    }

    function grab(el: HTMLElement) {
      if (held === el) return;
      release();
      held = el;
      heldRect = el.getBoundingClientRect();
      const radius = getComputedStyle(el).borderRadius.split(" ")[0];
      tgt.w = heldRect.width + PAD * 2;
      tgt.h = heldRect.height + PAD * 2;
      tgt.r =
        radius.indexOf("%") > -1
          ? Math.min(tgt.w, tgt.h) / 2
          : Math.min(num(radius, 8) + PAD, Math.min(tgt.w, tgt.h) / 2);
      el.style.willChange = "transform";
    }

    function onMove(event: PointerEvent) {
      const px = event.clientX;
      const py = event.clientY;
      if (!seen) {
        seen = true;
        cur.x = px;
        cur.y = py;
        dot.style.opacity = "1";
      }
      tgt.x = px;
      tgt.y = py;

      const node = event.target instanceof Element ? event.target : null;
      const hit = node ? (node.closest(SNAP) as HTMLElement | null) : null;
      const field =
        node instanceof HTMLElement && (FIELD.has(node.tagName) || node.isContentEditable);

      if (field) {
        release();
        dot.style.opacity = "0";
        return;
      }
      dot.style.opacity = "1";

      if (hit && !hit.hasAttribute("data-no-magnetic")) {
        grab(hit);
        /* Re-read every move: the rect already includes the spring's own
           transform, so the untransformed centre is it minus the offset. */
        heldRect = hit.getBoundingClientRect();
        const cx = heldRect.left + heldRect.width / 2 - pull.x;
        const cy = heldRect.top + heldRect.height / 2 - pull.y;
        pull.tx = (px - cx) * PULL;
        pull.ty = (py - cy) * PULL;
      } else {
        release();
        if (node && (TEXT.has(node.tagName) || getComputedStyle(node).cursor === "text")) {
          tgt.w = 9;
          tgt.h = 32;
          tgt.r = 6;
        }
      }
    }

    function frame() {
      const ease = reduced ? 1 : 0.18;
      cur.x = lerp(cur.x, tgt.x, ease);
      cur.y = lerp(cur.y, tgt.y, ease);
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;

      cur.w = lerp(cur.w, tgt.w, 0.22);
      cur.h = lerp(cur.h, tgt.h, 0.22);
      cur.r = lerp(cur.r, tgt.r, 0.22);

      let ox = cur.x;
      let oy = cur.y;
      let sx = 1;
      let sy = 1;
      let rot = 0;

      if (held && heldRect) {
        /* Sit on the element's current visual centre, so the dot travels with
           it while it is being pulled. */
        ox = heldRect.left + heldRect.width / 2;
        oy = heldRect.top + heldRect.height / 2;
        cur.x = ox;
        cur.y = oy;
      } else if (!reduced) {
        const speed = Math.min(Math.hypot(dx, dy) * 0.014, 0.42);
        sx = 1 + speed;
        sy = 1 - speed * 0.7;
        rot = (Math.atan2(dy, dx) * 180) / Math.PI;
      }

      dot.style.width = `${cur.w}px`;
      dot.style.height = `${cur.h}px`;
      dot.style.borderRadius = `${cur.r}px`;
      dot.style.transform = `translate(${ox - cur.w / 2}px,${oy - cur.h / 2}px) rotate(${rot}deg) scale(${sx},${sy})`;

      const k = 0.14;
      const damp = 0.72;
      pull.vx = (pull.vx + (pull.tx - pull.x) * k) * damp;
      pull.vy = (pull.vy + (pull.ty - pull.y) * k) * damp;
      pull.x += pull.vx;
      pull.y += pull.vy;
      if (held) {
        held.style.transform = `translate(${pull.x.toFixed(2)}px,${pull.y.toFixed(2)}px)`;
      }

      raf = requestAnimationFrame(frame);
    }

    const onDown = () => {
      tgt.w = cur.w * 0.86;
      tgt.h = cur.h * 0.86;
    };
    const onLeave = () => {
      dot.style.opacity = "0";
      release();
    };
    const onEnter = () => {
      dot.style.opacity = "1";
    };
    const onScroll = () => {
      if (held) heldRect = held.getBoundingClientRect();
    };

    document.body.appendChild(dot);
    document.body.setAttribute("data-magcursor", "");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      if (held) {
        held.style.transform = "";
        held.style.willChange = "";
      }
      document.body.removeAttribute("data-magcursor");
      dot.remove();
    };
  }, [magnetic]);

  return null;
}
