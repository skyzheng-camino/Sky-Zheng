"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "../lib/data";

const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/experience", label: "Experience" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? "border-border bg-background/80 shadow-lg shadow-black/20 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="animate-fade-down bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 bg-clip-text drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] text-lg font-semibold tracking-tight text-transparent transition-opacity hover:opacity-80"
        >
          {SITE.name}
        </Link>

        <ul className="hidden items-center gap-1 sm:flex">
          {links.map((link, i) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li
                key={link.href}
                className="animate-fade-down"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <Link
                  href={link.href}
                  className={`relative rounded-full bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 bg-clip-text drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] px-4 py-2 text-sm font-medium text-transparent transition-opacity ${
                    active ? "opacity-100" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 -z-10 rounded-full bg-accent/10 ring-1 ring-accent/30" />
                  )}
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground sm:hidden"
        >
          <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <ul className="flex flex-col gap-1 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-md sm:hidden">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 bg-clip-text drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] px-3 py-2 text-sm font-medium text-transparent transition-opacity ${
                    active
                      ? "rounded-md ring-1 ring-accent/30 opacity-100"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
