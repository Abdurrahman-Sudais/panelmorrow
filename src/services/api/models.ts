/**
 * Performance & anomaly models.
 *
 * MOCK: uses the deterministic simulated engine in services/analysis.
 * LIVE: the backend invokes Amazon SageMaker AI endpoints:
 *   - `panelmorrow-expected-gen`  (weather-adjusted expected generation regression)
 *   - `panelmorrow-anomaly`       (anomaly scoring on actual/expected residuals)
 * Lambda (scheduled via EventBridge) runs the batch analysis nightly and writes
 * anomalies to DynamoDB; the frontend only reads results.
 */
import type { Anomaly, DailyRecord, Site } from "@/types";
import { detectAnomalies } from "@/services/analysis/engine";
import { simulatedExpectedKwh } from "@/data/generator";
import { isMock, mockDelay } from "./config";
import { http } from "./http";

export interface ModelInfo {
  name: string;
  endpoint: string;
  version: string;
  kind: "simulated" | "sagemaker";
}

export const MODEL_REGISTRY: ModelInfo[] = [
  { name: "Weather-adjusted expected generation", endpoint: "panelmorrow-expected-gen", version: "sim-0.4", kind: "simulated" },
  { name: "Anomaly detection", endpoint: "panelmorrow-anomaly", version: "sim-0.4", kind: "simulated" },
];

export const modelsService = {
  async predictExpected(site: Site, weather: Pick<DailyRecord, "date" | "irradianceKwhM2" | "ambientTempC">[]) {
    if (isMock) return weather.map((w) => ({ date: w.date, expectedKwh: simulatedExpectedKwh(site, w, w.date) }));
    return http<{ date: string; expectedKwh: number }[]>(`/models/expected`, { method: "POST", body: JSON.stringify({ siteId: site.id, weather }) });
  },
  async runAnomalyDetection(site: Site, records: DailyRecord[], asOf: string): Promise<Omit<Anomaly, "status">[]> {
    if (isMock) {
      await mockDelay(900);
      return detectAnomalies(site, records, asOf);
    }
    return http(`/models/anomalies/run`, { method: "POST", body: JSON.stringify({ siteId: site.id, asOf }) });
  },
};
