import { API_BASE_URL, buildApiHeaders } from "../api";
import type { OfflineScreeningRecord } from "../types";
import { listPendingOfflineCases, markOfflineCaseSyncFailed, markOfflineCaseSynced } from "./db";

export async function syncPendingOfflineCases(): Promise<{ synced: number; failed: number }> {
  const pending = await listPendingOfflineCases();
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await syncOfflineCase(record);
      await markOfflineCaseSynced(record.case_id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markOfflineCaseSyncFailed(record.case_id, error instanceof Error ? error.message : "Sync failed.");
    }
  }

  return { synced, failed };
}

async function syncOfflineCase(record: OfflineScreeningRecord): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sync/cases`, {
    method: "POST",
    headers: buildApiHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      case: record.result,
      images: record.image_data_urls,
      heatmaps: record.heatmap_data_urls,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not sync offline case.");
  }
}
