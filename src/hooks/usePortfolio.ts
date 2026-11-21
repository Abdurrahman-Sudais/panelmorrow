import { useMemo, useSyncExternalStore } from "react";
import type { Anomaly, DailyRecord, Site, SiteStatus } from "@/types";
import { AS_OF, repository, type RepoState } from "@/services/repository";
import { computeMetrics, detectAnomalies, prioritise, siteStatus, sliceByDate, verifyRepair, withStatus, type SiteMetrics, type VerificationResult } from "@/services/analysis/engine";
import { addDays } from "@/data/generator";

export function useRepo(): RepoState {
  return useSyncExternalStore(repository.subscribe, repository.getState);
}

export interface SiteSummary {
  site: Site;
  metrics30: SiteMetrics;
  status: SiteStatus;
  anomalies: Anomaly[];
  openAnomalies: Anomaly[];
  last30LossKwh: number;
}

// Anomaly detection is the expensive bit — cache per records array identity.
const detectCache = new WeakMap<DailyRecord[], Omit<Anomaly, "status">[]>();
function detectCached(site: Site, records: DailyRecord[]) {
  let hit = detectCache.get(records);
  if (!hit) {
    hit = detectAnomalies(site, records, AS_OF);
    detectCache.set(records, hit);
  }
  return hit;
}

/** Historic (resolved) anomalies around verified repairs, re-detected as of the day before the visit. */
function historicAnomalies(state: RepoState): Anomaly[] {
  const out: Anomaly[] = [];
  for (const m of state.maintenance) {
    const site = state.sites.find((s) => s.id === m.siteId);
    const recs = state.records[m.siteId];
    if (!site || !recs?.length) continue;
    const found = detectAnomalies(site, recs, addDays(m.inspectionDate, -1));
    for (const a of found) out.push({ ...a, id: `${a.id}:hist`, status: "Resolved", windowEnd: addDays(m.inspectionDate, -1) });
  }
  return out;
}

export function usePortfolio() {
  const state = useRepo();
  return useMemo(() => {
    const from30 = addDays(AS_OF, -29);
    const summaries: SiteSummary[] = state.sites.map((site) => {
      const recs = state.records[site.id] ?? [];
      const anomalies = withStatus(detectCached(site, recs), state.anomalyStatus);
      const open = anomalies.filter((a) => a.status !== "Resolved");
      const metrics30 = computeMetrics(site, sliceByDate(recs, from30, AS_OF));
      return {
        site,
        metrics30,
        anomalies,
        openAnomalies: open,
        status: siteStatus(metrics30.performanceIndex, open.map((a) => a.severity)),
        last30LossKwh: metrics30.lossKwh,
      };
    });
    const allAnomalies = [...summaries.flatMap((s) => s.anomalies), ...historicAnomalies(state)].sort((a, b) =>
      b.detectedAt.localeCompare(a.detectedAt),
    );
    const recommendations = prioritise(
      summaries.map((s) => ({ site: s.site, anomalies: s.anomalies, last30LossKwh: s.last30LossKwh })),
      state.weights,
      state.recOverrides,
      AS_OF,
    );
    const verifications = new Map<string, VerificationResult>(
      state.maintenance.map((m) => [m.id, verifyRepair(m, state.records[m.siteId] ?? [])]),
    );
    const siteById = new Map(state.sites.map((s) => [s.id, s]));
    return { state, summaries, allAnomalies, recommendations, verifications, siteById, asOf: AS_OF };
  }, [state]);
}

export type Portfolio = ReturnType<typeof usePortfolio>;
