"use client";

import { useEffect, useState } from "react";

/**
 * Swaps the hero between the cyan planet and the pink ringed one.
 *
 * The choice lives in a `data-hero` attribute on <html> rather than in
 * React state: the backdrop, the ambient glow, the headline gradient
 * and the click-to-reveal stars all need to react to it, and they sit
 * in different subtrees under a server component. One attribute lets
 * plain CSS drive all of them without threading context through.
 *
 * `data-hero-bloom` is set for the length of the flash and then cleared,
 * which is what starts (and re-arms) the bloom keyframes on each press.
 */
const BLOOM_MS = 1150;

export default function HeroPlanetToggle() {
  // Seeded from the attribute rather than hardcoded false: it lives on
  // <html> and survives client-side navigation, while this component
  // remounts with fresh state. Without this, leaving the page and
  // coming back would show a pink hero behind a button that still said
  // "Heat it up". Safe for hydration — on a full load the attribute is
  // always absent, so server and client both start false.
  const [pink, setPink] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-hero") === "pink",
  );

  // Clear the bloom flag once the flash has run so the next press can
  // restart the animation.
  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-hero-bloom")) return;
    const t = window.setTimeout(
      () => root.removeAttribute("data-hero-bloom"),
      BLOOM_MS,
    );
    return () => window.clearTimeout(t);
  }, [pink]);

  const toggle = () => {
    const root = document.documentElement;
    const next = !pink;
    setPink(next);
    if (next) root.setAttribute("data-hero", "pink");
    else root.removeAttribute("data-hero");
    // Re-arm: drop it first so a rapid second press replays the flash.
    root.removeAttribute("data-hero-bloom");
    // Force a reflow so removing and re-adding counts as a restart.
    void root.offsetWidth;
    root.setAttribute("data-hero-bloom", "");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={pink}
      className="hero-toggle"
    >
      <span aria-hidden="true" className="hero-toggle-dot" />
      {pink ? "Cool it down" : "Heat it up"}
    </button>
  );
}
