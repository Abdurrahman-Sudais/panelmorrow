import type { AnomalyStatus, MaintenanceRecord, PriorityWeights } from "@/types";
import { repository, type RecOverride } from "@/services/repository";
import { isMock, mockDelay } from "./config";
import { http } from "./http";

/** Alerts, recommendations and maintenance records (DynamoDB in live mode). */
export const operationsService = {
  async setAnomalyStatus(id: string, status: AnomalyStatus) {
    if (isMock) {
      await mockDelay(150);
      return repository.setAnomalyStatus(id, status);
    }
    await http(`/anomalies/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  async updateRecommendation(siteId: string, o: RecOverride) {
    if (isMock) {
      await mockDelay(200);
      return repository.setRecOverride(siteId, o);
    }
    await http(`/recommendations/${siteId}`, { method: "PATCH", body: JSON.stringify(o) });
  },
  async setWeights(w: PriorityWeights) {
    if (isMock) return repository.setWeights(w);
    await http(`/settings/priority-weights`, { method: "PUT", body: JSON.stringify(w) });
  },
  async addMaintenance(m: MaintenanceRecord) {
    if (isMock) {
      await mockDelay(400);
      return repository.addMaintenance(m);
    }
    await http(`/maintenance`, { method: "POST", body: JSON.stringify(m) });
  },
  async deleteMaintenance(id: string) {
    if (isMock) return repository.deleteMaintenance(id);
    await http(`/maintenance/${id}`, { method: "DELETE" });
  },
};
