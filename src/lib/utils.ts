import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmt = {
  num: (n: number, digits = 0) =>
    new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n),
  kwh: (n: number) =>
    n >= 1_000_000 ? `${fmt.num(n / 1_000_000, 2)} GWh` : n >= 10_000 ? `${fmt.num(n / 1000, 1)} MWh` : `${fmt.num(n)} kWh`,
  kw: (n: number) => (n >= 1000 ? `${fmt.num(n / 1000, 2)} MW` : `${fmt.num(n)} kW`),
  pct: (n: number, digits = 1) => `${fmt.num(n, digits)}%`,
  usd: (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n),
  date: (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
  shortDate: (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
};

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Deterministic PRNG so demo data is stable across reloads. */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
