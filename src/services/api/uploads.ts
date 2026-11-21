import type { DailyRecord, UploadLog } from "@/types";
import { repository } from "@/services/repository";
import { uid } from "@/lib/utils";
import { isMock, mockDelay } from "./config";
import { http } from "./http";

/**
 * Dataset uploads.
 * LIVE flow: request a presigned S3 PUT URL from the backend → upload the raw CSV
 * directly to S3 (`s3://panelmorrow-datasets/{tenant}/{siteId}/{kind}/{ts}.csv`) →
 * an S3 event triggers a Lambda that validates rows and writes to DynamoDB.
 */
export const uploadsService = {
  async ingest(kind: UploadLog["kind"], siteId: string, file: File, rows: DailyRecord[], rejected: number): Promise<UploadLog> {
    const storageKey = `${siteId}/${kind}/${new Date().toISOString().replace(/[:.]/g, "-")}-${file.name}`;
    const log: UploadLog = { id: uid("upl"), kind, fileName: file.name, siteId, rows: rows.length, rejected, uploadedAt: new Date().toISOString(), storageKey };
    if (isMock) {
      await mockDelay(800);
      repository.upsertRecords(siteId, rows, log);
      return log;
    }
    const { url } = await http<{ url: string }>("/uploads/presign", { method: "POST", body: JSON.stringify({ key: storageKey, contentType: "text/csv" }) });
    await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": "text/csv" } });
    return http<UploadLog>("/uploads", { method: "POST", body: JSON.stringify(log) });
  },
};
