import type { DailyRecord, Site } from "@/types";
import { mulberry32 } from "@/lib/utils";
import type { Scenario } from "./sites";

/** Demo data window: 180 days ending the day before "today" in the demo. */
export const DEMO_DAYS = 180;
export const DEMO_END = "2026-11-20";

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86_400_000);
}
export const DEMO_START = addDays(DEMO_END, -(DEMO_DAYS - 1));

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Box–Muller normal sample from a uniform PRNG. */
function normal(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Monthly mean plane-of-array irradiance (kWh/m²/day) for southern / northern Nigeria.
const IRR_SOUTH = [5.0, 5.3, 5.4, 5.3, 5.0, 4.4, 3.9, 3.8, 4.1, 4.6, 5.0, 4.9];
const IRR_NORTH = [5.6, 6.0, 6.3, 6.4, 6.2, 5.7, 5.1, 4.8, 5.3, 5.8, 5.9, 5.6];
const CLOUD_SOUTH = [38, 40, 48, 55, 62, 74, 82, 84, 78, 64, 46, 38];
const CLOUD_NORTH = [12, 10, 15, 25, 38, 52, 66, 72, 58, 30, 14, 12];
const TEMP_SOUTH = [28, 29, 29, 28.5, 28, 26.5, 25.5, 25.5, 26, 27, 28, 28];
const TEMP_NORTH = [24, 27, 31, 33, 32, 29, 27, 26, 27, 28, 27, 24];

export interface WeatherDay {
  date: string;
  irradianceKwhM2: number;
  ambientTempC: number;
  cloudCoverPct: number;
}

/** Synthetic daily weather for a location (deterministic per site). */
export function simulateWeather(site: Site, start: string, days: number): WeatherDay[] {
  const rand = mulberry32(hashString(site.id + "weather"));
  const w = Math.min(1, Math.max(0, (site.location.lat - 6) / 6)); // 0 = south, 1 = far north
  const out: WeatherDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const m = new Date(date + "T00:00:00Z").getUTCMonth();
    const baseIrr = IRR_SOUTH[m] * (1 - w) + IRR_NORTH[m] * w;
    const baseCloud = CLOUD_SOUTH[m] * (1 - w) + CLOUD_NORTH[m] * w;
    const baseTemp = TEMP_SOUTH[m] * (1 - w) + TEMP_NORTH[m] * w;
    const cloud = Math.min(98, Math.max(2, baseCloud + normal(rand) * 14));
    // Cloudier-than-normal days reduce irradiance; occasional heavy storm days.
    const storm = rand() < (baseCloud > 60 ? 0.08 : 0.02) ? 0.45 + rand() * 0.25 : 1;
    const irr = Math.max(0.8, baseIrr * (1 - (cloud - baseCloud) / 160) * storm * (1 + normal(rand) * 0.04));
    out.push({
      date,
      irradianceKwhM2: +irr.toFixed(2),
      ambientTempC: +(baseTemp + normal(rand) * 1.6).toFixed(1),
      cloudCoverPct: Math.round(cloud),
    });
  }
  return out;
}

/**
 * SIMULATED weather-adjusted performance model.
 * Stand-in for the SageMaker endpoint: expected = capacity × POA irradiance × target PR × temperature derate.
 */
export function simulatedExpectedKwh(site: Site, w: Pick<WeatherDay, "irradianceKwhM2" | "ambientTempC">, date: string) {
  const cfg = site.expected;
  if (cfg.method === "monthly-profile" && cfg.monthlyKwh?.length === 12) {
    const d = new Date(date + "T00:00:00Z");
    const m = d.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0)).getUTCDate();
    const monthMeanIrr = (IRR_SOUTH[m] + IRR_NORTH[m]) / 2;
    return +((cfg.monthlyKwh[m] / daysInMonth) * (w.irradianceKwhM2 / monthMeanIrr)).toFixed(1);
  }
  const cellTemp = w.ambientTempC + 0.028 * (w.irradianceKwhM2 * 1000) / 5; // NOCT-style rise
  const tempDerate = 1 - 0.0035 * (cellTemp - 25);
  const ageYears = Math.max(0, (new Date(date).getTime() - new Date(site.installDate).getTime()) / (365.25 * 86_400_000));
  const degradation = 1 - (cfg.annualDegradationPct / 100) * ageYears;
  const pr = cfg.targetPr / 0.93; // targetPr already includes typical temperature losses
  return +(site.capacityKw * w.irradianceKwhM2 * pr * tempDerate * degradation).toFixed(1);
}

function healthFactor(sc: Scenario, i: number, rand: () => number): number {
  switch (sc.kind) {
    case "healthy":
      return 1;
    case "mild-underperformance":
      return sc.factor;
    case "inverter-trip":
      return i >= sc.day ? sc.factor : 1;
    case "string-outage":
      return i >= sc.day ? sc.factor : 1;
    case "soiling":
      return i >= sc.day ? Math.max(sc.floor, 1 - sc.slopePerDay * (i - sc.day)) : 1;
    case "intermittent":
      return i >= sc.day && rand() < sc.probability ? 0.45 + rand() * 0.3 : 1;
    case "zero-days":
      return i >= sc.day && rand() < sc.probability ? rand() * 0.06 : 1;
    case "repaired-soiling":
      if (i >= sc.repairDay) return 1;
      return i >= sc.day ? Math.max(0.8, 1 - sc.slopePerDay * (i - sc.day)) : 1;
    case "repaired-inverter":
      if (i >= sc.repairDay) return 1;
      return i >= sc.day ? sc.factor : 1;
  }
}

/** Generate the demo daily series for one site. */
export function generateSiteRecords(site: Site, scenario: Scenario = { kind: "healthy" }, start = DEMO_START, days = DEMO_DAYS): DailyRecord[] {
  const weather = simulateWeather(site, start, days);
  const rand = mulberry32(hashString(site.id + "gen"));
  const bias = 0.985 + rand() * 0.03; // per-site model bias
  return weather.map((w, i) => {
    const expected = simulatedExpectedKwh(site, w, w.date);
    const hf = healthFactor(scenario, i, rand);
    const noise = 1 + normal(rand) * 0.022;
    const missing = rand() < 0.006; // occasional telemetry gap
    return {
      date: w.date,
      actualKwh: missing ? null : +Math.max(0, expected * bias * hf * noise).toFixed(1),
      actualSource: "demo-meter",
      expectedKwh: expected,
      expectedSource: "simulated-model",
      irradianceKwhM2: w.irradianceKwhM2,
      ambientTempC: w.ambientTempC,
      cloudCoverPct: w.cloudCoverPct,
      weatherSource: "demo-weather",
    };
  });
}
