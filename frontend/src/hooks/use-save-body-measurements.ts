"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { syncPendingBodyMeasurements } from "@/lib/body-measurements/sync";
import { getClientId } from "@/lib/client-id";
import { localDb } from "@/lib/db/local-db";
import type { BodyMeasurementsInput, LocalBodyMeasurements, SyncQueueItem } from "@/types/body-measurements";

const BODY_MEASUREMENTS_QUERY_KEY = ["bodyMeasurements"];
const DEFAULT_USER_ID = "local-user";

function createPendingRecord(input: BodyMeasurementsInput): LocalBodyMeasurements {
  return {
    id: crypto.randomUUID(),
    userId: DEFAULT_USER_ID,
    age: input.age,
    gender: input.gender,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    femurLengthCm: input.femurLengthCm,
    torsoLengthCm: input.torsoLengthCm,
    clientId: getClientId(),
    localVersion: 1,
    syncStatus: "pending",
    updatedAt: new Date().toISOString(),
  };
}

function createQueueItem(record: LocalBodyMeasurements): SyncQueueItem {
  return {
    id: crypto.randomUUID(),
    entityType: "body_measurements",
    entityId: record.id,
    operation: "create",
    payload: record,
    status: "pending",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export function useSaveBodyMeasurements() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "offlineFirst",
    mutationFn: async (input: BodyMeasurementsInput) => {
      const record = createPendingRecord(input);
      const syncQueueItem = createQueueItem(record);

      await localDb.transaction("rw", [localDb.bodyMeasurements, localDb.syncQueue], async () => {
        await localDb.bodyMeasurements.put(record);
        await localDb.syncQueue.put(syncQueueItem);
      });

      await syncPendingBodyMeasurements();

      return record;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: BODY_MEASUREMENTS_QUERY_KEY });
      const previous = queryClient.getQueryData<BodyMeasurementsInput>(BODY_MEASUREMENTS_QUERY_KEY);
      queryClient.setQueryData(BODY_MEASUREMENTS_QUERY_KEY, input);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(BODY_MEASUREMENTS_QUERY_KEY, context?.previous);
    },
    onSuccess: (savedRecord) => {
      queryClient.setQueryData(BODY_MEASUREMENTS_QUERY_KEY, savedRecord);
    },
  });
}
