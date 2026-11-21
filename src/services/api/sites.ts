import type { Site } from "@/types";
import { repository } from "@/services/repository";
import { isMock, mockDelay } from "./config";
import { http } from "./http";

/** Solar site CRUD — backed by DynamoDB (`PK=TENANT#…, SK=SITE#…`) in live mode. */
export const sitesService = {
  async create(site: Site) {
    if (isMock) {
      await mockDelay();
      repository.addSite(site);
      return site;
    }
    return http<Site>("/sites", { method: "POST", body: JSON.stringify(site) });
  },
  async update(site: Site) {
    if (isMock) {
      await mockDelay();
      repository.updateSite(site);
      return site;
    }
    return http<Site>(`/sites/${site.id}`, { method: "PUT", body: JSON.stringify(site) });
  },
  async generateDemoData(siteId: string) {
    await mockDelay(600);
    repository.generateDemoData(siteId);
  },
};
