"use client";

import { useEffect, useRef } from "react";

/**
 * Pixelated panda particle animation (ported from the standalone
 * "Pixelated Panda" page). Samples /panda.png into pixel particles
 * rendered on a canvas with 3D tilt following the cursor, a repel
 * field around it, and a tap-to-burst that flings particles to the
 * edge before they spring back home.
 */
export default function PandaParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1000;
    const H = 640;
    canvas.width = W;
    canvas.height = H;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const img = new Image();
    img.src = "/panda.png";
    img.onload = () => {
      if (!disposed) cleanup = start(canvas, ctx, img, W, H);
    };

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    // width/height must match the internal resolution set in the effect:
    // they give the canvas its correct aspect ratio before hydration, so
    // the page doesn't grow ~200px mid-load (which breaks the browser's
    // scroll restoration on reload).
    <canvas
      ref={canvasRef}
      width={1000}
      height={640}
      aria-hidden
      className="block h-auto w-full"
    />
  );
}

function start(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
) {
  // Sample the panda image
  const offscreen = document.createElement("canvas");
  offscreen.width = W;
  offscreen.height = H;
  const octx = offscreen.getContext("2d")!;
  const drawSize = 600;
  octx.drawImage(img, (W - drawSize) / 2, (H - drawSize) / 2, drawSize, drawSize);
  const data = octx.getImageData(0, 0, W, H).data;

  const gap = 2;
  const FOCAL = 550;
  const THICKNESS = 100;
  // Horizontal center of the panda on screen: centered in the blank
  // space left of the text overlay (which covers the right ~36%).
  const CX = W * 0.32;

  // Flat typed arrays for performance (tens of thousands of particles)
  const tmp: {
    ox: number;
    oy: number;
    oz: number;
    size: number;
    cr: number;
    cg: number;
    cb: number;
  }[] = [];
  for (let y = 0; y < H; y += gap) {
    for (let x = 0; x < W; x += gap) {
      const idx = (y * W + x) * 4;
      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2],
        a = data[idx + 3];
      if (a < 128) continue;
      const brightness = (r + g + b) / 3;
      const isDark = brightness < 200;
      const isCreamFur = brightness < 252 && r - b > 8;
      if (!isDark && !isCreamFur) continue;

      const lum = brightness / 255;
      // Contrast-mapped grey with warm tint on fur, cool on dark patches
      const grey = Math.round((0.14 + Math.pow(lum, 1.3) * 0.78) * 255);
      let cr, cg, cb;
      if (lum > 0.5) {
        cr = grey + 8;
        cg = grey + 3;
        cb = grey - 8;
      } else {
        cr = grey - 3;
        cg = grey;
        cb = grey + 9;
      }
      cr = Math.max(0, Math.min(255, cr));
      cg = Math.max(0, Math.min(255, cg));
      cb = Math.max(0, Math.min(255, cb));

      tmp.push({
        ox: x + gap * 0.5 - W / 2,
        oy: y + gap * 0.5 - H / 2,
        oz: (Math.random() - 0.5) * THICKNESS,
        size: 0.6 + Math.random() * 0.7,
        cr,
        cg,
        cb,
      });
    }
  }
  // Pre-sort back-to-front by rest depth once; overwrite = painter's algorithm
  tmp.sort((p, q) => q.oz - p.oz);

  const N = tmp.length;
  const px = new Float32Array(N),
    py = new Float32Array(N),
    pz = new Float32Array(N);
  const ox = new Float32Array(N),
    oy = new Float32Array(N),
    oz = new Float32Array(N);
  const vx = new Float32Array(N),
    vy = new Float32Array(N),
    vz = new Float32Array(N);
  const sz = new Float32Array(N);
  const colR = new Uint8Array(N),
    colG = new Uint8Array(N),
    colB = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const p = tmp[i];
    px[i] = ox[i] = p.ox;
    py[i] = oy[i] = p.oy;
    pz[i] = oz[i] = p.oz;
    sz[i] = p.size;
    colR[i] = p.cr;
    colG[i] = p.cg;
    colB[i] = p.cb;
  }

  // Pixel buffer rendering
  const imageData = ctx.createImageData(W, H);
  const buf32 = new Uint32Array(imageData.data.buffer);
  // Background tone for depth fade (matches the site background #0a0a0f)
  const bgR = 10,
    bgG = 10,
    bgB = 15;

  const mouse = { x: -9999, y: -9999, active: false };
  let tiltX = 0,
    tiltY = 0;
  let targetTiltX = 0,
    targetTiltY = 0;

  // Burst state: while now < releaseAt[i], the particle's spring target
  // is a point at the container edge; after, it returns home.
  const releaseAt = new Float32Array(N);
  const bx = new Float32Array(N),
    by = new Float32Array(N),
    bz = new Float32Array(N);
  const EDGE_R = Math.min(W, H) * 0.48;

  // The canvas is CSS-scaled to its container, so pointer coordinates
  // must be mapped back into the fixed internal resolution.
  const toCanvas = (e: PointerEvent | MouseEvent) => {
    const rct = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rct.left) * W) / rct.width,
      y: ((e.clientY - rct.top) * H) / rct.height,
    };
  };

  const onMove = (e: MouseEvent) => {
    const pt = toCanvas(e);
    mouse.x = pt.x;
    mouse.y = pt.y;
    mouse.active = true;
    targetTiltX = (pt.y / H - 0.5) * 2;
    targetTiltY = -(pt.x / W - 0.5) * 2;
  };
  const onLeave = () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
    targetTiltX = 0;
    targetTiltY = 0;
  };
  // Tap/click: dots fly to the container edge, then return staggered
  const onTap = () => {
    const now = performance.now();
    for (let i = 0; i < N; i++) {
      // Direction from center out through the particle's rest position
      let dx = ox[i],
        dy = oy[i],
        dz = oz[i];
      let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < 1) {
        const a = Math.random() * Math.PI * 2;
        dx = Math.cos(a);
        dy = Math.sin(a);
        dz = 0;
        d = 1;
      }
      const r = EDGE_R * (0.92 + Math.random() * 0.16);
      bx[i] = (dx / d) * r;
      by[i] = (dy / d) * r;
      bz[i] = (dz / d) * r * 0.5;
      // Hold at edge briefly, then all release together
      releaseAt[i] = now + 1600;
    }
  };
  canvas.addEventListener("pointerdown", onTap);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);

  const REPEL_RADIUS = 110;
  const REPEL_R2 = REPEL_RADIUS * REPEL_RADIUS;
  const REPEL_STRENGTH = 1100;
  const REPEL_Z = 400;
  const SPRING = 0.0015;
  const DAMPING = 0.95;
  const TILT_SPEED = 0.01;
  const MAX_TILT_ANGLE = 0.38;

  let raf = 0;
  const animate = () => {
    buf32.fill(0);

    tiltX += (targetTiltX * MAX_TILT_ANGLE - tiltX) * TILT_SPEED;
    tiltY += (targetTiltY * MAX_TILT_ANGLE - tiltY) * TILT_SPEED;

    const cosTX = Math.cos(tiltX),
      sinTX = Math.sin(tiltX);
    const cosTY = Math.cos(tiltY),
      sinTY = Math.sin(tiltY);
    const now = performance.now();

    const mAct = mouse.active;
    const mwx = mouse.x - CX;
    const mwy = mouse.y - H / 2;
    const mx = mouse.x,
      my = mouse.y;
    const halfH = H / 2;

    for (let i = 0; i < N; i++) {
      // Spring toward edge point while bursting, home otherwise
      const bursting = now < releaseAt[i];
      const tx = bursting ? bx[i] : ox[i];
      const ty = bursting ? by[i] : oy[i];
      const tz = bursting ? bz[i] : oz[i];
      const k = bursting ? SPRING * 1.5 : SPRING;
      vx[i] = (vx[i] + (tx - px[i]) * k) * DAMPING;
      vy[i] = (vy[i] + (ty - py[i]) * k) * DAMPING;
      vz[i] = (vz[i] + (tz - pz[i]) * k) * DAMPING;

      if (mAct) {
        const scale0 = FOCAL / (FOCAL + pz[i]);
        const mdx = px[i] * scale0 - mwx;
        const mdy = py[i] * scale0 - mwy;
        const d2 = mdx * mdx + mdy * mdy;
        if (d2 < REPEL_R2 && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          const force = REPEL_STRENGTH / d2;
          vx[i] += (mdx / dist) * force;
          vy[i] += (mdy / dist) * force;
          vz[i] += ((Math.random() - 0.5) * REPEL_Z) / (dist + 1);
        }
      }

      px[i] += vx[i];
      py[i] += vy[i];
      pz[i] += vz[i];

      // 3D rotation + projection
      const rx1 = px[i] * cosTY + pz[i] * sinTY;
      const rz1 = -px[i] * sinTY + pz[i] * cosTY;
      const ry1 = py[i] * cosTX - rz1 * sinTX;
      const rz2 = py[i] * sinTX + rz1 * cosTX;

      const scale = FOCAL / (FOCAL + rz2);
      const sx = rx1 * scale + CX;
      const sy = ry1 * scale + halfH;

      // Depth fade toward background tone
      let fade = (rz2 + THICKNESS) / (THICKNESS * 2); // 0 front .. 1 back
      if (fade < 0) fade = 0;
      else if (fade > 1) fade = 1;
      const mix = fade * 0.5;

      let cr: number = colR[i],
        cg: number = colG[i],
        cb: number = colB[i];

      // Glow near cursor
      if (mAct) {
        const gdx = sx - mx,
          gdy = sy - my;
        const gd2 = gdx * gdx + gdy * gdy;
        if (gd2 < REPEL_R2) {
          const glow = (1 - Math.sqrt(gd2) / REPEL_RADIUS) * 70;
          cr += glow;
          cg += glow;
          cb += glow;
        }
      }

      cr = cr + (bgR - cr) * mix;
      cg = cg + (bgG - cg) * mix;
      cb = cb + (bgB - cb) * mix;
      if (cr > 255) cr = 255;
      if (cg > 255) cg = 255;
      if (cb > 255) cb = 255;

      const color = 0xff000000 | (cb << 16) | (cg << 8) | cr;

      // Draw a small square block (2x2 or 3x3 by size)
      const s = sz[i] * scale;
      const w = s > 1 ? 3 : 2;
      const x0 = (sx - w * 0.5) | 0;
      const y0 = (sy - w * 0.5) | 0;
      for (let dy = 0; dy < w; dy++) {
        const yy = y0 + dy;
        if (yy < 0 || yy >= H) continue;
        const row = yy * W;
        for (let dx = 0; dx < w; dx++) {
          const xx = x0 + dx;
          if (xx < 0 || xx >= W) continue;
          buf32[row + xx] = color;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    raf = requestAnimationFrame(animate);
  };

  animate();

  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("mousemove", onMove);
    canvas.removeEventListener("mouseleave", onLeave);
    canvas.removeEventListener("pointerdown", onTap);
  };
}
