/**
 * SIMULATED ANALYSIS ENGINE
 * -------------------------
 * Deterministic, explainable heuristics that stand in for the production models
 * planned on Amazon SageMaker AI (weather-adjusted performance regression +
 * anomaly detection). Everything in here is labelled "simulated" in the UI.
 *
 * Outputs never assert a specific equipment fault: they describe the observed
 * pattern and suggest what to check.
 */
import type {
  Accessibility,
  Anomaly,
  AnomalyStatus,
  AnomalyType,
  DailyRecord,
  MaintenanceRecord,
  PriorityWeights,
  Recommendation,
  RecommendationStatus,
  Severity,
  Site,
  SiteStatus,
} from "@/types";
import { addDays, daysBetween } from "@/data/generator";

export const MODEL_VERSION = "sim-pm-anomaly-0.4 (simulated)";

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const std = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function ratioSeries(records: DailyRecord[]) {
  return records
    .filter((r) => r.actualKwh !== null && r.expectedKwh > 0.5)
    .map((r) => ({ date: r.date, r: (r.actualKwh as number) / r.expectedKwh, rec: r }));
}

export function sliceByDate(records: DailyRecord[], from: string, to: string) {
  return records.filter((r) => r.date >= from && r.date <= to);
}

export interface SiteMetrics {
  actualKwh: number;
  expectedKwh: number;
  lossKwh: number;
  performanceIndex: number; // actual / expected × 100 (weather-adjusted)
  performanceRatio: number; // actual / (capacity × irradiance)
  specificYield: number; // kWh/kWp over window
  dataCompleteness: number; // 0..1
  days: number;
}

export function computeMetrics(site: Site, records: DailyRecord[]): SiteMetrics {
  const valid = records.filter((r) => r.actualKwh !== null);
  const actual = valid.reduce((a, r) => a + (r.actualKwh as number), 0);
  const expected = valid.reduce((a, r) => a + r.expectedKwh, 0);
  const loss = valid.reduce((a, r) => a + Math.max(0, r.expectedKwh - (r.actualKwh as number)), 0);
  const irr = valid.reduce((a, r) => a + r.irradianceKwhM2, 0);
  return {
    actualKwh: actual,
    expectedKwh: expected,
    lossKwh: loss,
    performanceIndex: expected > 0 ? (actual / expected) * 100 : NaN,
    performanceRatio: irr > 0 ? actual / (site.capacityKw * irr) : NaN,
    specificYield: actual / site.capacityKw,
    dataCompleteness: records.length ? valid.length / records.length : 0,
    days: records.length,
  };
}

export function siteStatus(pi: number, openSeverities: Severity[]): SiteStatus {
  if (Number.isNaN(pi)) return "No data";
  if (openSeverities.includes("Critical") || pi < 80) return "Critical";
  if (openSeverities.includes("High") || pi < 90) return "Underperforming";
  if (openSeverities.length || pi < 95) return "Watch";
  return "Healthy";
}

function severityFor(deficit: number, dailyLossKwh: number, capacityKw: number): Severity {
  const specificLoss = dailyLossKwh / capacityKw; // kWh/kWp/day
  if (deficit >= 0.28 || specificLoss >= 1.3) return "Critical";
  if (deficit >= 0.14 || specificLoss >= 0.65) return "High";
  if (deficit >= 0.07) return "Medium";
  return "Low";
}

const ACTIONS: Record<AnomalyType, string> = {
  "Unexpected generation drop":
    "Review inverter event logs and string-level telemetry remotely, then schedule a site inspection to confirm the cause before any repair.",
  "Potential equipment-related issue":
    "Check monitoring for inverter fault codes, isolator status or communication loss; dispatch a technician to verify on site. Cause is not confirmed.",
  "Persistent underperformance":
    "Plan an inspection covering visual condition (soiling, shading, vegetation), string currents and inverter derating. Compare with nearby sites.",
  "Irregular generation pattern":
    "Validate data quality first (meter gaps, logger resets), then review intra-day profiles for intermittent tripping before dispatching.",
  "Sudden performance change":
    "Compare string-level output before and after the change date and confirm whether any configuration, metering or site works occurred.",
};

function confidenceFor(magnitude: number, noise: number, days: number, base: number) {
  const snr = magnitude / Math.max(noise, 0.015);
  return +clamp(base + Math.min(snr, 8) * 0.035 + Math.min(days, 30) * 0.004, 0.52, 0.97).toFixed(2);
}

/**
 * Detect anomalies for one site over its record history, as of `asOf`.
 * Window: last 75 days.
 */
export function detectAnomalies(site: Site, records: DailyRecord[], asOf: string): Omit<Anomaly, "status">[] {
  const from = addDays(asOf, -74);
  const series = ratioSeries(sliceByDate(records, from, asOf));
  if (series.length < 25) return [];
  const out: Omit<Anomaly, "status">[] = [];
  const rs = series.map((s) => s.r);
  const n = rs.length;
  const baselineNoise = std(rs.slice(0, Math.min(30, n)).filter((x) => x > 0.6)) || 0.03;

  const make = (type: AnomalyType, startIdx: number, endIdx: number, summary: string, baseConf: number, magnitude: number) => {
    const win = series.slice(startIdx, endIdx + 1);
    const expected = win.reduce((a, s) => a + s.rec.expectedKwh, 0);
    const actual = win.reduce((a, s) => a + (s.rec.actualKwh as number), 0);
    const loss = win.reduce((a, s) => a + Math.max(0, s.rec.expectedKwh - (s.rec.actualKwh as number)), 0);
    const deficit = expected > 0 ? 1 - actual / expected : 0;
    const days = Math.max(1, win.length);
    out.push({
      id: `${site.id}:${type.split(" ")[0].toLowerCase()}:${win[0].date}`,
      siteId: site.id,
      type,
      detectedAt: addDays(win[0].date, Math.min(3, days - 1)),
      windowStart: win[0].date,
      windowEnd: win[win.length - 1].date,
      severity: severityFor(deficit, loss / days, site.capacityKw),
      expectedKwh: Math.round(expected),
      actualKwh: Math.round(actual),
      lossKwh: Math.round(loss),
      deficitPct: +deficit.toFixed(3),
      confidence: confidenceFor(magnitude, baselineNoise, days, baseConf),
      summary,
      suggestedAction: ACTIONS[type],
      modelVersion: MODEL_VERSION,
    });
  };

  // 1) Step change detection (robust median split).
  let bestT = -1;
  let bestDelta = 0;
  for (let t = 14; t <= n - 4; t++) {
    const pre = median(rs.slice(Math.max(0, t - 14), t));
    const post = median(rs.slice(t, Math.min(n, t + 14)));
    const d = pre - post;
    if (d > bestDelta) {
      bestDelta = d;
      bestT = t;
    }
  }
  // Distinguish an abrupt step from a gradual decline that a median split also catches.
  const trendSlope = (() => {
    const tail = rs.slice(-45);
    const xs = tail.map((_, i) => i);
    const mx = mean(xs);
    const my = mean(tail);
    return xs.reduce((a, x, i) => a + (x - mx) * (tail[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  })();
  // Largest 3-day-vs-3-day jump near the split point (the split itself can land a few days early).
  let localJump = 0;
  let jumpT = bestT;
  for (let t = Math.max(3, bestT - 7); t <= Math.min(n - 3, bestT + 7); t++) {
    const j = median(rs.slice(t - 3, t)) - median(rs.slice(t, t + 3));
    if (j > localJump) {
      localJump = j;
      jumpT = t;
    }
  }
  if (localJump >= 0.06) bestT = jumpT;
  const isGradual = trendSlope < -0.0015 && localJump < 0.06;

  let stepFlagged = false;
  if (bestT > 0 && bestDelta >= 0.07 && !isGradual) {
    const postAll = median(rs.slice(bestT));
    const pre = median(rs.slice(Math.max(0, bestT - 14), bestT));
    // Must persist until the end of the window (otherwise it was recovered/repaired).
    if (pre - postAll >= 0.06 && median(rs.slice(-5)) < pre - 0.05) {
      stepFlagged = true;
      const pct = Math.round((pre - postAll) * 100);
      if (pre - postAll >= 0.2) {
        make(
          "Unexpected generation drop",
          bestT,
          n - 1,
          `Output fell by about ${pct}% relative to weather-adjusted expectation on ${series[bestT].date} and has not recovered.`,
          0.66,
          pre - postAll,
        );
      } else {
        make(
          "Sudden performance change",
          bestT,
          n - 1,
          `A step reduction of roughly ${pct}% in weather-adjusted performance began around ${series[bestT].date} and has persisted.`,
          0.6,
          pre - postAll,
        );
      }
    }
  }

  // 2) Near-zero output on productive days → potential equipment-related issue.
  const last21 = series.slice(-21);
  const zeroIdx = last21.map((s, i) => ({ s, i })).filter(({ s }) => s.r < 0.12 && s.rec.irradianceKwhM2 > 3);
  if (zeroIdx.length >= 2) {
    const first = n - last21.length + zeroIdx[0].i;
    make(
      "Potential equipment-related issue",
      first,
      n - 1,
      `${zeroIdx.length} day(s) in the last three weeks recorded near-zero generation despite good irradiance. This pattern can be associated with equipment outages or data loss.`,
      0.62,
      0.6,
    );
  }

  // 3) Irregular pattern: high day-to-day variability (excluding near-zero days already captured).
  const recent = rs.slice(-21).filter((x) => x >= 0.12);
  const recentStd = std(recent);
  if (!zeroIdx.length && recentStd > Math.max(0.085, baselineNoise * 2.6)) {
    make(
      "Irregular generation pattern",
      n - 21,
      n - 1,
      `Daily performance has become erratic (variability ${(recentStd * 100).toFixed(1)} pts vs a typical ${(baselineNoise * 100).toFixed(1)} pts), suggesting intermittent losses.`,
      0.56,
      recentStd - baselineNoise,
    );
  }

  // 4) Persistent underperformance / gradual decline (only if not explained by a step).
  if (!stepFlagged) {
    const last30 = rs.slice(-30);
    const med30 = median(last30);
    const slope = trendSlope;
    if (med30 < 0.94 || (slope < -0.0018 && med30 < 0.97)) {
      const decline = slope < -0.0018;
      make(
        "Persistent underperformance",
        Math.max(0, n - (decline ? 45 : 30)),
        n - 1,
        decline
          ? `Performance has declined steadily by ~${Math.abs(slope * 30 * 100).toFixed(1)} pts per month over the last 45 days (now ${(med30 * 100).toFixed(0)}% of expected). Gradual patterns like this are often linked to soiling or shading, but the cause needs on-site confirmation.`
          : `Output has run at about ${(med30 * 100).toFixed(0)}% of weather-adjusted expectation for the last 30 days.`,
        0.6,
        1 - med30,
      );
    }
  }

  return out;
}

/** Combine detected anomalies with persisted status overrides. */
export function withStatus(anoms: Omit<Anomaly, "status">[], overrides: Record<string, AnomalyStatus>): Anomaly[] {
  const prefixes = Object.entries(overrides).filter(([k]) => k.endsWith("*"));
  return anoms.map((a) => {
    const exact = overrides[a.id];
    const pref = prefixes.find(([k]) => a.id.startsWith(k.slice(0, -1)))?.[1];
    return { ...a, status: exact ?? pref ?? "Open" };
  });
}

// ---------------------------------------------------------------------------
// Maintenance prioritisation
// ---------------------------------------------------------------------------

export const DEFAULT_WEIGHTS: PriorityWeights = { recoverable: 30, loss: 20, severity: 20, urgency: 10, travel: 10, access: 10 };

const SEVERITY_SCORE: Record<Severity, number> = { Critical: 1, High: 0.72, Medium: 0.45, Low: 0.2 };
const ACCESS_SCORE: Record<Accessibility, number> = { Easy: 1, Moderate: 0.65, Difficult: 0.3 };
/** Share of the observed shortfall typically recoverable by a maintenance visit (heuristic). */
const RECOVERABILITY: Record<AnomalyType, number> = {
  "Unexpected generation drop": 0.9,
  "Potential equipment-related issue": 0.85,
  "Sudden performance change": 0.8,
  "Persistent underperformance": 0.7,
  "Irregular generation pattern": 0.55,
};

export interface PrioritiseInput {
  site: Site;
  anomalies: Anomaly[];
  last30LossKwh: number;
}

export function prioritise(
  inputs: PrioritiseInput[],
  weights: PriorityWeights,
  overrides: Record<string, { status: RecommendationStatus; assignee?: string; scheduledFor?: string; note?: string }>,
  asOf: string,
): Recommendation[] {
  const candidates = inputs.filter((i) => i.anomalies.some((a) => a.status !== "Resolved"));
  const rows = candidates.map(({ site, anomalies, last30LossKwh }) => {
    const active = anomalies.filter((a) => a.status !== "Resolved");
    const worst = active.reduce((w, a) => (SEVERITY_SCORE[a.severity] > SEVERITY_SCORE[w.severity] ? a : w), active[0]);
    const dailyLoss = last30LossKwh / 30;
    const recoverability = Math.max(...active.map((a) => RECOVERABILITY[a.type]));
    // Recoverable over the next 90 days if addressed now.
    const recoverableKwh = dailyLoss * 90 * recoverability;
    const oldest = active.reduce((o, a) => (a.detectedAt < o ? a.detectedAt : o), active[0].detectedAt);
    const ageDays = Math.max(0, daysBetween(oldest, asOf));
    const urgency = clamp(0.35 * SEVERITY_SCORE[worst.severity] + 0.65 * Math.min(1, ageDays / 30), 0, 1);
    return { site, active, worst, last30LossKwh, recoverableKwh, recoverability, ageDays, urgency };
  });

  const maxRec = Math.max(1, ...rows.map((r) => r.recoverableKwh));
  const maxLoss = Math.max(1, ...rows.map((r) => r.last30LossKwh));
  const maxTravel = Math.max(1, ...rows.map((r) => r.site.travelKm));
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  const scored = rows.map((r) => {
    const parts = {
      recoverable: r.recoverableKwh / maxRec,
      loss: r.last30LossKwh / maxLoss,
      severity: SEVERITY_SCORE[r.worst.severity],
      urgency: r.urgency,
      travel: 1 - r.site.travelKm / maxTravel,
      access: ACCESS_SCORE[r.site.accessibility],
    };
    const labels: Record<keyof PriorityWeights, string> = {
      recoverable: "Recoverable energy",
      loss: "Energy lost (30d)",
      severity: "Anomaly severity",
      urgency: "Urgency",
      travel: "Travel effort",
      access: "Site accessibility",
    };
    const contributions = (Object.keys(parts) as (keyof PriorityWeights)[]).map((k) => ({
      key: k,
      label: labels[k],
      value: +((parts[k] * weights[k]) / totalW * 100).toFixed(1),
    }));
    const score = +contributions.reduce((a, c) => a + c.value, 0).toFixed(1);

    const reasons: string[] = [];
    reasons.push(
      `About ${Math.round(r.last30LossKwh).toLocaleString()} kWh below weather-adjusted expectation over the last 30 days; an estimated ${Math.round(r.recoverableKwh).toLocaleString()} kWh could be recovered over the next 90 days if resolved now.`,
    );
    reasons.push(`${r.active.length} active anomal${r.active.length > 1 ? "ies" : "y"}; most severe: ${r.worst.severity.toLowerCase()} “${r.worst.type.toLowerCase()}” (${Math.round(r.worst.confidence * 100)}% model confidence).`);
    if (r.ageDays >= 14) reasons.push(`Oldest unresolved anomaly is ${r.ageDays} days old — losses are accumulating.`);
    reasons.push(
      `${r.site.travelKm} km from ${r.site.depot.split(" (")[0]}; access rated ${r.site.accessibility.toLowerCase()}${r.site.accessibility === "Difficult" ? " (allow extra crew time)" : ""}.`,
    );

    const o = overrides[r.site.id];
    return {
      id: `rec:${r.site.id}`,
      siteId: r.site.id,
      score,
      rank: 0,
      factors: {
        lossKwh: Math.round(r.last30LossKwh),
        recoverableKwh: Math.round(r.recoverableKwh),
        severityScore: SEVERITY_SCORE[r.worst.severity],
        travelKm: r.site.travelKm,
        accessibility: r.site.accessibility,
        urgencyScore: +r.urgency.toFixed(2),
      },
      contributions,
      reasons,
      anomalyIds: r.active.map((a) => a.id),
      status: o?.status ?? "Pending",
      assignee: o?.assignee,
      scheduledFor: o?.scheduledFor,
      note: o?.note,
    } satisfies Recommendation;
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => (s.rank = i + 1));
  return scored;
}

// ---------------------------------------------------------------------------
// Repair verification
// ---------------------------------------------------------------------------

export interface VerificationResult {
  pre: { performanceIndex: number; actualKwh: number; expectedKwh: number; irradiance: number; days: number };
  post: { performanceIndex: number; actualKwh: number; expectedKwh: number; irradiance: number; days: number };
  rawChangePct: number; // change in raw daily generation
  observedChangePts: number; // change in weather-adjusted performance index (points)
  uncertaintyPts: number; // ± approx 95% band from day-to-day noise
  irradianceChangePct: number;
  outcome: "Improvement observed" | "No clear change" | "Decline observed" | "Insufficient data";
  estimatedDailyGainKwh: number;
  usedOverrides: boolean;
}

export function verifyRepair(m: MaintenanceRecord, records: DailyRecord[]): VerificationResult {
  const preRecs = sliceByDate(records, addDays(m.inspectionDate, -m.windowDays), addDays(m.inspectionDate, -1));
  const postRecs = sliceByDate(records, addDays(m.inspectionDate, 1), addDays(m.inspectionDate, m.windowDays));
  const summarise = (rs: DailyRecord[]) => {
    const v = rs.filter((r) => r.actualKwh !== null);
    const actual = v.reduce((a, r) => a + (r.actualKwh as number), 0);
    const expected = v.reduce((a, r) => a + r.expectedKwh, 0);
    return {
      performanceIndex: expected > 0 ? (actual / expected) * 100 : NaN,
      actualKwh: actual,
      expectedKwh: expected,
      irradiance: v.length ? v.reduce((a, r) => a + r.irradianceKwhM2, 0) / v.length : NaN,
      days: v.length,
      ratios: ratioSeries(v).map((x) => x.r),
    };
  };
  const pre = summarise(preRecs);
  const post = summarise(postRecs);
  const usedOverrides = m.prePerformanceOverride != null || m.postPerformanceOverride != null;
  if (m.prePerformanceOverride != null) pre.performanceIndex = m.prePerformanceOverride;
  if (m.postPerformanceOverride != null) post.performanceIndex = m.postPerformanceOverride;

  const enough = (pre.days >= 5 || m.prePerformanceOverride != null) && (post.days >= 5 || m.postPerformanceOverride != null);
  const sd = std([...pre.ratios, ...post.ratios].filter((x) => x > 0.3)) || 0.03;
  const uncertainty = 1.96 * sd * Math.sqrt(1 / Math.max(pre.days, 1) + 1 / Math.max(post.days, 1)) * 100 + 1.5; // + model error allowance
  const change = post.performanceIndex - pre.performanceIndex;
  const preDaily = pre.days ? pre.actualKwh / pre.days : 0;
  const postDaily = post.days ? post.actualKwh / post.days : 0;
  const expPostDaily = post.days ? post.expectedKwh / post.days : 0;

  let outcome: VerificationResult["outcome"] = "No clear change";
  if (!enough || Number.isNaN(change)) outcome = "Insufficient data";
  else if (change > uncertainty) outcome = "Improvement observed";
  else if (change < -uncertainty) outcome = "Decline observed";

  return {
    pre: { performanceIndex: pre.performanceIndex, actualKwh: pre.actualKwh, expectedKwh: pre.expectedKwh, irradiance: pre.irradiance, days: pre.days },
    post: { performanceIndex: post.performanceIndex, actualKwh: post.actualKwh, expectedKwh: post.expectedKwh, irradiance: post.irradiance, days: post.days },
    rawChangePct: preDaily > 0 ? ((postDaily - preDaily) / preDaily) * 100 : NaN,
    observedChangePts: change,
    uncertaintyPts: uncertainty,
    irradianceChangePct: pre.irradiance > 0 ? ((post.irradiance - pre.irradiance) / pre.irradiance) * 100 : NaN,
    outcome,
    estimatedDailyGainKwh: (change / 100) * expPostDaily,
    usedOverrides,
  };
}
