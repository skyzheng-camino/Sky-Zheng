"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type Direction = "up" | "left" | "right" | "scale";

type RevealProps = {
  children: ReactNode;
  /** Direction the element animates in from. */
  direction?: Direction;
  /** Stagger delay in milliseconds. */
  delay?: number;
  /** Render as a different element (e.g. "li", "section"). Defaults to "div". */
  as?: ElementType;
  className?: string;
};

/**
 * Wraps content and fades/slides it into view the first time it enters the
 * viewport, using IntersectionObserver. CSS for the states lives in globals.css.
 */
export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  as: Tag = "div",
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-direction={direction}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
