"use client";

/**
 * The slab, ported from the design's `stone.js`.
 *
 * A three.js block of stone with a streak rubbed across it and three reference
 * streaks of known purity below, which is the object the whole product is named
 * after. The streak draws once on load and the slab sways very slightly with the
 * pointer; nothing else on the page moves.
 *
 * Three changes from the design file, all deliberate:
 *
 *  1. `three` is a dependency rather than a jsdelivr module import. The page
 *     asks no third party for anything at paint time -- the same reason the
 *     fonts are self-hosted -- and a CDN import would also break under a strict
 *     content policy.
 *  2. It is a React component rather than a custom element, so it unmounts
 *     cleanly with the route instead of leaking a render loop.
 *  3. The colours default to Unison's, and every one is a prop, so the palette
 *     lives in one place rather than in an attribute string.
 *
 * WebGL can be unavailable (a blocked context, a headless browser, an old
 * machine). This renders nothing rather than throwing, and the hero behind it is
 * a flat panel that reads perfectly well without it.
 */

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";

export type StoneSlabProps = {
  /** Sway with the pointer and drift. Off under reduced motion regardless. */
  motion?: boolean;
  /** The three reference streaks below the sample. */
  references?: boolean;
  distance?: number;
  stone?: string;
  edge?: string;
  streakA?: string;
  streakB?: string;
  streakC?: string;
  streakD?: string;
  glowRgb?: string;
};

export default function StoneSlab({
  motion = true,
  references = true,
  distance = 7.6,
  stone = "#201C18",
  edge = "#403830",
  streakA = "#8E3A1C",
  streakB = "#C4522A",
  streakC = "#E8875A",
  streakD = "#A34322",
  glowRgb = "196,82,42",
}: StoneSlabProps) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Client only, and awaited, so a server render never touches WebGL and the
    // whole of three stays out of the initial bundle.
    (async () => {
      let THREE: typeof THREE_NS;
      try {
        THREE = await import("three");
      } catch {
        return;
      }
      if (disposed || !element.isConnected) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const P = { a: streakA, b: streakB, c: streakC, d: streakD, glow: glowRgb };

      /** Grain and hairline cracks, so the slab is not a flat rectangle. */
      function noiseTexture() {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const x = c.getContext("2d")!;
        x.fillStyle = "#808080";
        x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 26000; i += 1) {
          const v = 128 + (Math.random() - 0.5) * 150;
          x.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
          const s = Math.random() * 2.4 + 0.4;
          x.fillRect(Math.random() * 256, Math.random() * 256, s, s);
        }
        for (let i = 0; i < 60; i += 1) {
          x.strokeStyle = "rgba(0,0,0,.12)";
          x.lineWidth = Math.random() * 1.6;
          x.beginPath();
          const y = Math.random() * 256;
          x.moveTo(0, y);
          x.bezierCurveTo(
            80, y + (Math.random() - 0.5) * 40,
            170, y + (Math.random() - 0.5) * 40,
            256, y + (Math.random() - 0.5) * 30,
          );
          x.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(3, 2);
        return t;
      }

      /** A streak: a gradient, then rubbed away at the edges and the tail. */
      function streakTexture(hot: boolean) {
        const w = 1024;
        const h = 128;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d")!;
        const g = x.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, P.a);
        g.addColorStop(0.38, P.b);
        g.addColorStop(0.72, hot ? P.c : P.b);
        g.addColorStop(1, P.d);
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);

        x.globalCompositeOperation = "destination-out";
        const edgeGrad = x.createLinearGradient(0, 0, 0, h);
        edgeGrad.addColorStop(0, "rgba(0,0,0,1)");
        edgeGrad.addColorStop(0.22, "rgba(0,0,0,0)");
        edgeGrad.addColorStop(0.78, "rgba(0,0,0,0)");
        edgeGrad.addColorStop(1, "rgba(0,0,0,1)");
        x.fillStyle = edgeGrad;
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i += 1) {
          x.fillStyle = "rgba(0,0,0," + Math.random() * 0.5 + ")";
          const s = Math.random() * 9 + 2;
          x.fillRect(Math.random() * w, Math.random() * h, s, s * 0.5);
        }
        const tail = x.createLinearGradient(w * 0.9, 0, w, 0);
        tail.addColorStop(0, "rgba(0,0,0,0)");
        tail.addColorStop(1, "rgba(0,0,0,.85)");
        x.fillStyle = tail;
        x.fillRect(w * 0.9, 0, w * 0.1, h);
        x.globalCompositeOperation = "source-over";
        return new THREE.CanvasTexture(c);
      }

      function glowTexture() {
        const w = 512;
        const h = 256;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d")!;
        const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(" + P.glow + ",.55)");
        g.addColorStop(0.35, "rgba(" + P.glow + ",.22)");
        g.addColorStop(1, "rgba(" + P.glow + ",0)");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        return new THREE.CanvasTexture(c);
      }

      /** A plane whose origin is its left edge, so scaling x draws it. */
      function bar(
        width: number,
        height: number,
        tex: THREE_NS.Texture,
        opacity: number,
        blending?: THREE_NS.Blending,
      ) {
        const geo = new THREE.PlaneGeometry(width, height, 1, 1);
        geo.translate(width / 2, 0, 0);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity,
          blending: blending ?? THREE.NormalBlending,
          depthWrite: false,
        });
        return new THREE.Mesh(geo, mat);
      }

      const w = element.clientWidth || 600;
      const h = element.clientHeight || 520;

      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        // No WebGL context. The hero reads fine without it.
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      element.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
      camera.position.set(0, 0, distance);

      const group = new THREE.Group();
      scene.add(group);

      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 3.35, 0.4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(stone),
          roughness: 0.94,
          metalness: 0.08,
          bumpMap: noiseTexture(),
          bumpScale: 0.035,
        }),
      );
      group.add(slab);

      group.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(slab.geometry),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(edge),
            transparent: true,
            opacity: 0.75,
          }),
        ),
      );

      const face = 0.202;
      const main = bar(3.55, 0.34, streakTexture(true), 1);
      main.position.set(-1.78, 0.42, face);
      group.add(main);

      const glow = bar(4.1, 1.15, glowTexture(), 0.75, THREE.AdditiveBlending);
      glow.position.set(-2.05, 0.42, face - 0.001);
      group.add(glow);

      // Reference streaks of known purity, dimmer, below the sample. This is
      // what a real unison carries, and what makes the sample readable.
      if (references) {
        const refs = new THREE.Group();
        const refTex = streakTexture(false);
        const rows: Array<[number, number]> = [
          [0.9, 0.34],
          [0.7, 0.26],
          [0.4, 0.19],
        ];
        rows.forEach((r, i) => {
          const m = bar(3.55 * r[0], 0.15, refTex, r[1]);
          m.position.set(-1.78, -0.28 - i * 0.42, face);
          refs.add(m);
          const tick = new THREE.Mesh(
            new THREE.PlaneGeometry(0.02, 0.24),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(edge),
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
            }),
          );
          tick.position.set(-1.78 + 3.55 * r[0], -0.28 - i * 0.42, face);
          refs.add(tick);
        });
        group.add(refs);
      }

      scene.add(new THREE.AmbientLight(0x8b9198, 0.5));
      const key = new THREE.DirectionalLight(0xe4e2dd, 1.15);
      key.position.set(-4, 5, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x5d646c, 0.6);
      rim.position.set(5, -2, -3);
      scene.add(rim);
      const warm = new THREE.PointLight(new THREE.Color(P.b), 1.5, 9, 2);
      warm.position.set(0.2, 0.6, 1.6);
      scene.add(warm);

      const pointer = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      const onMove = (event: PointerEvent) => {
        const r = element.getBoundingClientRect();
        target.x = ((event.clientX - r.left) / r.width - 0.5) * 2;
        target.y = ((event.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      const ro = new ResizeObserver(() => {
        const ww = element.clientWidth || w;
        const hh = element.clientHeight || h;
        if (!ww || !hh) return;
        camera.aspect = ww / hh;
        camera.updateProjectionMatrix();
        renderer.setSize(ww, hh, false);
      });
      ro.observe(element);

      const ease = (t: number) => 1 - Math.pow(1 - t, 3.2);
      const start = performance.now();
      const delay = 420;
      const draw = 1000;
      let raf = 0;

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        const elapsed = now - start;
        // Under reduced motion the streak is simply there at full length. The
        // timing goes; the element does not.
        let p = reduced ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / draw));
        p = reduced ? 1 : ease(p);
        main.scale.x = Math.max(0.0001, p);
        glow.scale.x = Math.max(0.0001, p);
        (glow.material as THREE_NS.MeshBasicMaterial).opacity = 0.75 * p;

        const t = elapsed / 1000;
        const sway = motion && !reduced ? 1 : 0;
        pointer.x += (target.x - pointer.x) * 0.045;
        pointer.y += (target.y - pointer.y) * 0.045;
        group.rotation.y = -0.34 + Math.sin(t * 0.24) * 0.055 * sway + pointer.x * 0.2 * sway;
        group.rotation.x = 0.13 + Math.sin(t * 0.31) * 0.03 * sway - pointer.y * 0.12 * sway;
        group.rotation.z = -0.035 + Math.sin(t * 0.19) * 0.012 * sway;
        group.position.y = Math.sin(t * 0.28) * 0.045 * sway;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [motion, references, distance, stone, edge, streakA, streakB, streakC, streakD, glowRgb]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
