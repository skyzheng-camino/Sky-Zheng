"use client";

import { useState } from "react";

/** Formats a string of digits into US phone format: (XXX) XXX-XXXX */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PhoneField({ className }: { className: string }) {
  const [value, setValue] = useState("");

  return (
    <input
      id="phone"
      name="phone"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(555) 555-5555"
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      className={className}
    />
  );
}
