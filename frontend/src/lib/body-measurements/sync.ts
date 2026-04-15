import { localDb } from "@/lib/db/local-db";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SyncQueueItem } from "@/types/body-measurements";

function toSupabasePayload(item: SyncQueueItem) {
  return {
    id: item.payload.id,
    user_id: item.payload.userId,
    age: item.payload.age,
    gender: item.payload.gender,
    weight_kg: item.payload.weightKg,
    height_cm: item.payload.heightCm,
    femur_length_cm: item.payload.femurLengthCm,
    torso_length_cm: item.payload.torsoLengthCm,
    client_id: item.payload.clientId,
    local_version: item.payload.localVersion,
    updated_at: item.payload.updatedAt,
  };
}

async function markAsFailed(item: SyncQueueItem, reason: unknown) {
  await localDb.syncQueue.update(item.id, {
    status: "failed",
    retryCount: item.retryCount + 1,
    conflictData: reason,
    processedAt: new Date().toISOString(),
  });
  await localDb.bodyMeasurements.update(item.entityId, { syncStatus: "failed" });
}

export async function syncPendingBodyMeasurements(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const pendingItems = await localDb.syncQueue.where("status").equals("pending").toArray();

  for (const item of pendingItems) {
    await localDb.syncQueue.update(item.id, { status: "processing" });

    const { error } = await supabase
      .from("body_measurements")
      .upsert(toSupabasePayload(item), { onConflict: "id" });

    if (error) {
      await markAsFailed(item, {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      continue;
    }

    await localDb.syncQueue.update(item.id, {
      status: "synced",
      processedAt: new Date().toISOString(),
    });

    await localDb.bodyMeasurements.update(item.entityId, { syncStatus: "synced" });
  }
}
