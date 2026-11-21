/**
 * Report narrative summaries.
 * MOCK: template-based text generated from computed metrics (clearly labelled).
 * LIVE: backend calls Amazon Bedrock (e.g. an Anthropic Claude model) with the
 * structured report payload and guard-railed prompt; only the text returns.
 */
import { fmt } from "@/lib/utils";
import { isMock, mockDelay } from "./config";
import { http } from "./http";

export interface SummaryInput {
  periodLabel: string;
  siteCount: number;
  performanceIndex: number;
  lossKwh: number;
  recoverableKwh: number;
  openAnomalies: number;
  criticalAnomalies: number;
  topSites: { name: string; lossKwh: number; reason: string }[];
  repairs: { site: string; outcome: string; changePts: number }[];
}

export const summariesService = {
  async generate(input: SummaryInput): Promise<{ text: string; source: "simulated" | "bedrock" }> {
    if (!isMock) return http(`/reports/summary`, { method: "POST", body: JSON.stringify(input) });
    await mockDelay(900);
    const parts: string[] = [];
    parts.push(
      `Over ${input.periodLabel}, the ${input.siteCount} monitored sites delivered ${fmt.pct(input.performanceIndex)} of weather-adjusted expected generation, an estimated shortfall of ${fmt.kwh(input.lossKwh)}.`,
    );
    if (input.openAnomalies) {
      parts.push(
        `${input.openAnomalies} anomalies remain open${input.criticalAnomalies ? `, including ${input.criticalAnomalies} rated critical` : ""}. If addressed now, approximately ${fmt.kwh(input.recoverableKwh)} may be recoverable over the next 90 days (simulated estimate).`,
      );
    }
    if (input.topSites.length) {
      parts.push(`Highest inspection priorities: ${input.topSites.map((s) => `${s.name} (${fmt.kwh(s.lossKwh)} lost; ${s.reason})`).join("; ")}.`);
    }
    if (input.repairs.length) {
      const improved = input.repairs.filter((r) => r.outcome === "Improvement observed");
      parts.push(
        `${input.repairs.length} maintenance visit(s) were verified; ${improved.length} showed an improvement in weather-adjusted performance beyond the uncertainty band. Observed changes may also reflect seasonal conditions or other factors and are not attributed solely to the work performed.`,
      );
    }
    parts.push("Anomalies indicate unusual output patterns only; equipment causes should be confirmed by on-site inspection.");
    return { text: parts.join(" "), source: "simulated" };
  },
};
