import Dexie, { type Table } from "dexie";

import type { LocalBodyMeasurements, SyncQueueItem } from "@/types/body-measurements";

class HealthAppDB extends Dexie {
  bodyMeasurements!: Table<LocalBodyMeasurements>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super("HealthAppDB");

    this.version(1).stores({
      bodyMeasurements: "id, userId, syncStatus, updatedAt",
      syncQueue: "id, entityType, entityId, status, createdAt",
    });
  }
}

export const localDb = new HealthAppDB();
